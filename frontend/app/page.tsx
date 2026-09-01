"use client";

import { useState, useRef } from "react";


const API_URL = "https://ai-interview-coach-sp.onrender.com";
type ScoreData = {
  communication_score: number;
  technical_score: number;
  confidence_score: number;
  feedback: string;
};

export default function Home() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [questionsList, setQuestionsList] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [recording, setRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState(false);
  const [manualAnswer, setManualAnswer] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreData | null>(null);
  const [allScores, setAllScores] = useState<ScoreData[]>([]);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");
  const [token, setToken] = useState("");

  const handleAuth = async () => {
    setAuthError("");
    const endpoint = authMode === "login" ? "/login" : "/signup";
    const body =
      authMode === "login"
        ? { email: authEmail, password: authPassword }
        : { name: authName, email: authEmail, password: authPassword };

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        setAuthError(errorData.detail || "Something went wrong");
        return;
      }

      if (authMode === "signup") {
        setAuthMode("login");
        setAuthError("Account created! Please log in.");
        return;
      }

      const data = await res.json();
      setToken(data.access_token);
      setIsLoggedIn(true);
    } catch (err) {
      setAuthError("Could not connect to backend.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken("");
    resetInterview();
  };

  const resetInterview = () => {
    setQuestionsList([]);
    setCurrentIndex(0);
    setTranscribedText("");
    setManualAnswer("");
    setScoreResult(null);
    setAllScores([]);
    setTranscribeError(false);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResumeFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_URL}/upload-resume`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setResumeText(data.extracted_text);
    } catch (err) {
      setResumeFileName("Upload failed");
    }

    setUploading(false);
  };

  const handleGenerate = async () => {
    setLoading(true);
    resetInterview();

    try {
      const res = await fetch(`${API_URL}/generate-questions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ company, role, resume_text: resumeText }),
      });
      const data = await res.json();
      setQuestionsList(data.questions);
    } catch (err) {
      setQuestionsList([]);
    }

    setLoading(false);
  };

  const speakText = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
  };

  const startRecording = async () => {
    setTranscribeError(false);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunksRef.current.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      await sendAudioForTranscription(audioBlob);
    };

    mediaRecorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendAudioForTranscription = async (audioBlob: Blob) => {
    setTranscribing(true);
    setTranscribeError(false);

    const formData = new FormData();
    formData.append("file", audioBlob, "answer.webm");

    try {
      const res = await fetch(`${API_URL}/transcribe`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      if (!data.transcribed_text || !data.transcribed_text.trim()) {
        throw new Error("empty");
      }
      setTranscribedText(data.transcribed_text);
    } catch (err) {
      setTranscribeError(true);
    }

    setTranscribing(false);
  };

  const getCurrentAnswer = () => {
    return transcribedText.trim() || manualAnswer.trim();
  };

  const handleScoreAnswer = async () => {
    const answer = getCurrentAnswer();
    if (!answer) return;

    setScoring(true);
    setScoreResult(null);

    try {
      const res = await fetch(`${API_URL}/score-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: questionsList[currentIndex], answer }),
      });
      const data = await res.json();
      setScoreResult(data);
      setAllScores((prev) => {
        const updated = [...prev];
        updated[currentIndex] = data;
        return updated;
      });
    } catch (err) {
      setScoreResult(null);
    }

    setScoring(false);
  };

  const goToNextQuestion = () => {
    setTranscribedText("");
    setManualAnswer("");
    setScoreResult(null);
    setTranscribeError(false);
    setCurrentIndex((i) => i + 1);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white p-10">
        <h1 className="text-3xl font-bold mb-4">AI Interview Coach</h1>
        <div className="flex flex-col gap-3 w-80">
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setAuthMode("login")}
              className={`flex-1 rounded px-3 py-2 font-medium ${
                authMode === "login" ? "bg-blue-600" : "bg-zinc-800"
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              className={`flex-1 rounded px-3 py-2 font-medium ${
                authMode === "signup" ? "bg-blue-600" : "bg-zinc-800"
              }`}
            >
              Sign Up
            </button>
          </div>

          {authMode === "signup" && (
            <input
              type="text"
              placeholder="Name"
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              className="p-2 rounded bg-zinc-900 border border-zinc-700 text-white"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            className="p-2 rounded bg-zinc-900 border border-zinc-700 text-white"
          />
          <input
            type="password"
            placeholder="Password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            className="p-2 rounded bg-zinc-900 border border-zinc-700 text-white"
          />

          {authError && <p className="text-sm text-yellow-400">{authError}</p>}

          <button
            onClick={handleAuth}
            className="rounded bg-green-600 px-4 py-2 font-medium hover:bg-green-700"
          >
            {authMode === "login" ? "Log In" : "Sign Up"}
          </button>
        </div>
      </div>
    );
  }

  const hasQuestions = questionsList.length > 0;
  const isLastQuestion = currentIndex === questionsList.length - 1;
  const isInterviewDone = hasQuestions && currentIndex >= questionsList.length;

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-black text-white p-10">
      <div className="w-96 flex justify-between items-center">
        <h1 className="text-4xl font-bold">AI Interview Coach</h1>
        <button onClick={handleLogout} className="text-sm text-zinc-400 hover:text-white underline">
          Logout
        </button>
      </div>

      {!hasQuestions && (
        <div className="flex flex-col gap-3 w-96">
          <input
            type="text"
            placeholder="Company (e.g. Google)"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="p-2 rounded bg-zinc-900 border border-zinc-700 text-white"
          />
          <input
            type="text"
            placeholder="Role (e.g. Software Engineer)"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="p-2 rounded bg-zinc-900 border border-zinc-700 text-white"
          />

          <label className="flex flex-col gap-1">
            <span className="text-sm text-zinc-400">Upload resume (PDF, optional)</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleResumeUpload}
              className="text-sm text-zinc-300"
            />
          </label>

          {uploading && <p className="text-sm text-zinc-500">Extracting resume text...</p>}
          {resumeFileName && !uploading && (
            <p className="text-sm text-green-400">✓ {resumeFileName} loaded</p>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !company || !role}
            className="rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Questions"}
          </button>
        </div>
      )}

      {hasQuestions && !isInterviewDone && (
        <div className="flex flex-col items-center gap-4 w-96">
          <p className="text-sm text-zinc-500">
            Question {currentIndex + 1} of {questionsList.length}
          </p>

          <div className="w-full rounded border border-zinc-700 p-4 text-sm text-zinc-200">
            {questionsList[currentIndex]}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => speakText(questionsList[currentIndex])}
              className="rounded bg-green-600 px-3 py-2 text-sm font-medium hover:bg-green-700"
            >
              🔊 Read Aloud
            </button>
            <button
              onClick={stopSpeaking}
              className="rounded bg-red-600 px-3 py-2 text-sm font-medium hover:bg-red-700"
            >
              ⏹ Stop
            </button>
          </div>

          <button
            onClick={recording ? stopRecording : startRecording}
            className={`rounded px-6 py-3 font-medium w-full ${
              recording ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {recording ? "⏹ Stop Recording" : "🎤 Record Your Answer"}
          </button>

          {transcribing && <p className="text-sm text-zinc-500">Transcribing your answer...</p>}
          {transcribeError && (
            <p className="text-sm text-yellow-400">
              Voice transcription didn't work — no worries, just type your answer below instead.
            </p>
          )}

          {transcribedText && (
            <div className="w-full rounded border border-zinc-700 p-3 text-sm text-zinc-300">
              <p className="text-zinc-500 mb-1">Transcribed answer:</p>
              {transcribedText}
            </div>
          )}

          <div className="w-full flex flex-col gap-1">
            <span className="text-sm text-zinc-400">
              Or type your answer {transcribedText ? "(overrides voice answer)" : ""}
            </span>
            <textarea
              value={manualAnswer}
              onChange={(e) => setManualAnswer(e.target.value)}
              placeholder="Type your answer here..."
              rows={4}
              className="p-2 rounded bg-zinc-900 border border-zinc-700 text-white text-sm"
            />
          </div>

          <button
            onClick={handleScoreAnswer}
            disabled={scoring || !getCurrentAnswer()}
            className="rounded bg-yellow-600 px-4 py-2 font-medium hover:bg-yellow-700 disabled:opacity-50 w-full"
          >
            {scoring ? "Scoring..." : "📊 Score My Answer"}
          </button>

          {scoreResult && (
            <div className="w-full rounded border border-zinc-700 p-4 text-sm">
              <div className="flex justify-between mb-2">
                <span className="text-zinc-400">Communication</span>
                <span className="font-bold text-blue-400">{scoreResult.communication_score}/10</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-zinc-400">Technical</span>
                <span className="font-bold text-blue-400">{scoreResult.technical_score}/10</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-zinc-400">Confidence</span>
                <span className="font-bold text-blue-400">{scoreResult.confidence_score}/10</span>
              </div>
              <p className="text-zinc-500 mt-3 mb-1">Feedback:</p>
              <p className="text-zinc-300">{scoreResult.feedback}</p>

              <button
                onClick={goToNextQuestion}
                className="mt-4 rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700 w-full"
              >
                {isLastQuestion ? "Finish Interview →" : "Next Question →"}
              </button>
            </div>
          )}
        </div>
      )}

      {isInterviewDone && (
        <div className="flex flex-col items-center gap-4 w-96">
          <h2 className="text-2xl font-bold">Interview Complete! 🎉</h2>
          <p className="text-zinc-400 text-sm">Here's how you did across all questions:</p>

          {allScores.map((score, i) => (
            <div key={i} className="w-full rounded border border-zinc-700 p-4 text-sm">
              <p className="text-zinc-500 mb-2">Question {i + 1}</p>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-400">Communication</span>
                <span className="font-bold text-blue-400">{score.communication_score}/10</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-zinc-400">Technical</span>
                <span className="font-bold text-blue-400">{score.technical_score}/10</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-zinc-400">Confidence</span>
                <span className="font-bold text-blue-400">{score.confidence_score}/10</span>
              </div>
              <p className="text-zinc-300 text-xs">{score.feedback}</p>
            </div>
          ))}

          <button
            onClick={resetInterview}
            className="rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700 w-full"
          >
            Start New Interview
          </button>
        </div>
      )}
    </div>
  );
}