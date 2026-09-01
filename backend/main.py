from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import bcrypt
from datetime import datetime, timedelta
from jose import jwt
import os

from database import engine, SessionLocal, Base
import models
import schemas

from google import genai

from fastapi import UploadFile, File
from pypdf import PdfReader
import io

from faster_whisper import WhisperModel
import asyncio
import tempfile

import json

from fastapi.security import OAuth2PasswordBearer
import re

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://ai-interview-coach-eosin-one.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

whisper_model = None

def get_whisper_model():
    global whisper_model
    if whisper_model is None:
        whisper_model = WhisperModel("tiny.en", device="cpu", compute_type="int8")
    return whisper_model

def _run_transcription(tmp_path: str) -> str:
    model = get_whisper_model()
    segments, _ = model.transcribe(tmp_path)
    return " ".join(seg.text for seg in segments).strip()

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

@app.get("/")
def read_root():
    return {"message": "AI Interview Coach backend is running"}

@app.post("/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user.password)
    new_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@app.post("/login", response_model=schemas.Token)
def login(credentials: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/generate-questions", response_model=schemas.QuestionResponse)
def generate_questions(request: schemas.QuestionRequest, current_user: models.User = Depends(get_current_user)):
    resume_section = f"\nCandidate's resume:\n{request.resume_text}\n" if request.resume_text else ""
    prompt = f"""
You are a senior technical interviewer at {request.company}.
Generate exactly 5 interview questions for a {request.role} candidate.
Cover a mix of: data structures/algorithms, system design basics, and behavioral questions.
{resume_section}
If resume information is provided above, make at least 1-2 questions specifically reference
real projects, skills, or experience mentioned in the resume.
Return ONLY a numbered list of questions, one per line, no introduction, no extra commentary,
no markdown formatting like bold or bullet points.
"""

    response = gemini_client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    raw_text = response.text.strip()
    print("RAW GEMINI RESPONSE:", repr(raw_text))

    questions_list = re.split(r'(?:^|\n)\s*\d+\.\s+', raw_text)
    questions_list = [q.strip() for q in questions_list if q.strip() and len(q.strip()) > 20]

    if not questions_list:
        questions_list = [raw_text]

    return {"questions": questions_list}

@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    contents = await file.read()
    pdf_reader = PdfReader(io.BytesIO(contents))

    extracted_text = ""
    for page in pdf_reader.pages:
        extracted_text += page.extract_text()

    return {"filename": file.filename, "extracted_text": extracted_text}

@app.post("/transcribe")
async def transcribe_audio(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    contents = await file.read()

    with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
        tmp.write(contents)
        tmp_path = tmp.name

    try:
        text = await asyncio.to_thread(_run_transcription, tmp_path)
        if not text:
            raise HTTPException(status_code=422, detail="Could not transcribe audio")
        return {"transcribed_text": text}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Transcription failed")
    finally:
        os.remove(tmp_path)

@app.post("/score-answer", response_model=schemas.ScoreResponse)
def score_answer(request: schemas.ScoreRequest, current_user: models.User = Depends(get_current_user)):
    prompt = f"""
You are an expert interview coach evaluating a candidate's spoken answer.

Question asked: {request.question}
Candidate's answer (transcribed from speech): {request.answer}

Evaluate the answer and score it from 1 to 10 on each of these:
- communication_score: clarity, structure, how well they expressed their thoughts
- technical_score: correctness and depth of the technical content (if the question is behavioral, judge relevance and substance instead)
- confidence_score: how confident and decisive the answer sounds, based on wording (avoid vague hedging, filler words, uncertainty)

Also provide brief, constructive feedback (2-3 sentences) on how they could improve.

Respond with ONLY valid JSON in exactly this format, no extra text, no markdown code blocks:
{{"communication_score": <number>, "technical_score": <number>, "confidence_score": <number>, "feedback": "<text>"}}
"""

    response = gemini_client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    result_text = response.text.strip()
    if result_text.startswith("```"):
        result_text = result_text.split("```")[1]
        if result_text.startswith("json"):
            result_text = result_text[4:]

    result_json = json.loads(result_text)
    return result_json