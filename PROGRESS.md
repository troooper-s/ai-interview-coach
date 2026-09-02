# AI Interview Coach — Build Log

## Phase 1: Environment Setup
- Installed Git, Node.js, Python, VS Code, PostgreSQL on Windows
- Debugged and fixed PATH issues for Python and PostgreSQL
- Created GitHub repo, connected local project to it

## Phase 2: Frontend Basics (Next.js/React)
- Created Next.js app with TypeScript, Tailwind CSS, App Router
- Learned: components, JSX, useState (state), props, useEffect, list rendering with .map()
- Verified each concept with hands-on practice examples

## Phase 3: Backend Basics (FastAPI)
- Built FastAPI app with a Python virtual environment
- Created first API route, ran with Uvicorn
- Connected frontend to backend using fetch()
- **Bug fixed:** CORS error — resolved with CORSMiddleware, whitelisting allowed origins

## Phase 4: Database (PostgreSQL + SQLAlchemy) + Authentication
- Created PostgreSQL database, defined User/Resume/Interview models with relationships
- Built /signup endpoint: bcrypt password hashing, saves user to DB
- **Bug fixed:** passlib + newer bcrypt version conflict — resolved by calling bcrypt directly
- Built /login endpoint: verifies password, returns a JWT access token

## Phase 5: AI/LLM Fundamentals
- Learned what an LLM is and how prompt engineering works (role, context, instructions, format)
- Connected to Google Gemini API using the google-genai Python library
- Verified a working AI connection with a test script

## Phase 6: AI Feature — Personalized Interview Questions
- Built /generate-questions endpoint: engineered prompt generates real interview questions
- Built /upload-resume endpoint: extracts text from uploaded PDF using pypdf
- Combined both: questions are personalized using real resume content
- Built frontend UI: company/role inputs, resume upload, formatted question display
- Verified real personalization — AI referenced specific resume projects and skills

## Phase 7: Voice — Text-to-Speech, Recording, Whisper
- Text-to-speech: browser's Web Speech API reads questions aloud
- Voice recording: MediaRecorder API captures microphone audio in-browser
- Speech-to-text: recorded audio sent to backend, transcribed via OpenAI Whisper
- **Debugging story:** a Gemini API 503 (server overload) error was mistaken for a mic/recording bug, since it silently blocked question generation before reaching the recording step
- Full voice loop verified end-to-end locally

## Phase 8: AI Scoring Engine
- Built /score-answer endpoint: prompts Gemini to score communication, technical accuracy, and confidence (1-10), plus written feedback
- Learned: prompting an AI for structured JSON output, cleaning/parsing AI responses
- Connected scoring to frontend — full loop verified: question → voice answer → transcription → AI-scored feedback, all from the real UI

## Phase 9: Authentication Hardening
- Built get_current_user dependency: verifies JWT tokens, rejects invalid/missing tokens with 401
- Protected all core endpoints (questions, resume upload, transcription, scoring)
- Built frontend login/signup screen, token stored in React state, sent via Authorization header on every protected request
- **Major fix:** permanently resolved recurring PostgreSQL "connection refused" issue by registering it as a proper auto-starting Windows service

## Phase 10: Deployment
- Backend deployed to Render: https://ai-interview-coach-sp.onrender.com
- Frontend deployed to Vercel: https://ai-interview-coach-eosin-one.vercel.app
- Cloud PostgreSQL database provisioned on Render
- **Bug fixed:** OOM crash (exit code 137) — Whisper's "base" model exceeded free-tier 512MB memory at startup; fixed by lazy-loading a smaller "tiny" model only when /transcribe is first called
- **Bug fixed:** CORS blocked the deployed frontend's origin — updated allow_origins to include the live Vercel URL
- Full application verified live and working end-to-end on the internet

## Known Limitation: Voice Transcription on Free-Tier Deployment
- Whisper (even "tiny") combined with FastAPI, database connections, and Gemini calls occasionally exceeds Render's free-tier 512MB memory limit during active transcription, causing temporary service restarts
- **Locally, the full voice pipeline works reliably and was extensively tested end-to-end**
- This is a known trade-off of running ML models on free-tier hosting
- Production fix: dedicated ML microservice with more RAM, a paid compute tier, or a hosted transcription API instead of running the model in-process

## Tech Stack
- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Backend:** FastAPI, Python
- **Database:** PostgreSQL, SQLAlchemy ORM
- **AI:** Google Gemini (question generation, scoring), OpenAI Whisper (speech-to-text), Web Speech API (text-to-speech)
- **Auth:** JWT tokens, bcrypt password hashing
- **Deployment:** Render (backend + database), Vercel (frontend)

## Skills Demonstrated
- Full-stack development (React/Next.js + FastAPI + PostgreSQL)
- REST API design, authentication, and security (JWT, password hashing, protected routes)
- AI integration and prompt engineering (LLM question generation, structured JSON scoring)
- Real-time browser APIs (microphone access, speech synthesis)
- Environment setup and debugging (Windows-specific issues, PATH configuration, service management)
- Production deployment across multiple platforms, with real memory/CORS debugging
- Git version control and structured commit history throughout development

## Known Limitation: Gemini Free-Tier Daily Quota
- Google Gemini's free tier allows only 20 requests per day per model
- Extensive testing during development can exhaust this quota, causing temporary 500 errors on /generate-questions and /score-answer
- This is an expected constraint of free-tier AI API usage, not a code bug
- Production use would require a paid Gemini tier for higher limits