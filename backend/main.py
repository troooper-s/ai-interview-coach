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

Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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
def generate_questions(request: schemas.QuestionRequest):
    resume_section = f"\nCandidate's resume:\n{request.resume_text}\n" if request.resume_text else ""
    prompt = f"""
You are a senior technical interviewer at {request.company}.
Generate exactly 5 interview questions for a {request.role} candidate.
Cover a mix of: data structures/algorithms, system design basics, and behavioral questions.
{resume_section}
If resume information is provided above, make at least 1-2 questions specifically reference
real projects, skills, or experience mentioned in the resume.
Return ONLY a numbered list of questions, no introduction, no extra commentary.
"""

    response = gemini_client.models.generate_content(
        model="gemini-3.6-flash",
        contents=prompt
    )

    return {"questions": response.text}

@app.post("/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    contents = await file.read()
    pdf_reader = PdfReader(io.BytesIO(contents))

    extracted_text = ""
    for page in pdf_reader.pages:
        extracted_text += page.extract_text()

    return {"filename": file.filename, "extracted_text": extracted_text}