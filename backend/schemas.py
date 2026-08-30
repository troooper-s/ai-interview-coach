from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str   

class QuestionRequest(BaseModel):
    company: str
    role: str
    resume_text: str = ""

class QuestionResponse(BaseModel):
    questions: str   

class ScoreRequest(BaseModel):
    question: str
    answer: str

class ScoreResponse(BaseModel):
    communication_score: int
    technical_score: int
    confidence_score: int
    feedback: str