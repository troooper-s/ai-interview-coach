# 🎤 AI Interview Coach

An AI-powered mock interview platform that generates personalized interview questions based on your resume, conducts voice-based interviews, and provides AI-scored feedback on your answers.

**🔗 Live Demo:** [https://ai-interview-coach-eosin-one.vercel.app](https://ai-interview-coach-eosin-one.vercel.app)

## ✨ Features

- **📄 Resume-Aware Question Generation** — Upload your resume; questions are personalized to reference your real projects and skills
- **🏢 Company & Role Targeting** — Get interview questions tailored to a specific company and role
- **🔊 Voice Interaction** — AI reads questions aloud (Text-to-Speech) and listens to your spoken answers (Speech-to-Text via OpenAI Whisper)
- **📊 AI-Powered Scoring** — Get scored on communication, technical accuracy, and confidence, with constructive written feedback
- **🔐 Secure Authentication** — JWT-based auth with hashed passwords

## 🛠️ Tech Stack

**Frontend:** Next.js, React, TypeScript, Tailwind CSS
**Backend:** FastAPI (Python)
**Database:** PostgreSQL with SQLAlchemy ORM
**AI/ML:** Google Gemini (question generation & scoring), OpenAI Whisper (speech-to-text), Web Speech API (text-to-speech)
**Auth:** JWT tokens, bcrypt password hashing
**Deployment:** Render (backend + PostgreSQL), Vercel (frontend)

## 🏗️ Architecture

Frontend (Next.js) → Backend API (FastAPI) → PostgreSQL (user data, interviews)
→ Google Gemini (questions, scoring)
→ OpenAI Whisper (speech-to-text)


## 🚀 Getting Started Locally

### Prerequisites
- Node.js, Python 3.11+, PostgreSQL

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/Scripts/activate  # Windows
pip install -r requirements.txt
# Create a .env file with DATABASE_URL, SECRET_KEY, GEMINI_API_KEY
uvicorn main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📝 Known Limitations

- Voice transcription (Whisper) occasionally hits memory limits on the free-tier deployment due to the resource-intensive nature of running ML models on limited hardware. The full voice pipeline works reliably in local development. A production deployment would use a dedicated ML inference service or a paid compute tier.

## 📖 Development Journey

This project was built and documented step-by-step, including real debugging challenges (CORS errors, memory management, authentication, deployment). See [PROGRESS.md](./PROGRESS.md) for the full build log.

## 👤 Author

