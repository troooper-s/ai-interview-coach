"use client";

import { useState, useRef } from "react";

export default function Home() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [questions, setQuestions] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [recording, setRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<{
    communication_score: number;
    technical_score: number;
    confidence_score: number;
    feedback: string;
  } | null>(null);

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
      const res = await fetch(`http://127.0.0.1:8000${endpoint}`, {
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
    setQuestions("");
    setTranscribedText("");
    setScoreResult(null);
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setResumeFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://127.0.0.1:8000/upload-resume", {
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
    setQuestions("");

    try {
      const res = await fetch("http://127.0.0.1:8000/generate-questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ company, role, resume_text: resumeText }),
      });
      const data = await res.json();
      setQuestions(data.questions);
    } catch (err) {
      setQuestions("Something went wrong. Is the backend running?");
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

    const formData = new FormData();
    formData.append("file", audioBlob, "answer.webm");

    try {
      const res = await fetch("http://127.0.0.1:8000/transcribe", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      setTranscribedText(data.transcribed_text);
    } catch (err) {
      setTranscribedText("Transcription failed.");
    }

    setTranscribing(false);
  };

  const handleScoreAnswer = async () => {
    setScoring(true);
    setScoreResult(null);

    try {
      const res = await fetch("http://127.0.0.1:8000/score-answer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: questions, answer: transcribedText }),
      });
      const data = await res.json();
      setScoreResult(data);
    } catch (err) {
      setScoreResult(null);
    }

    setScoring(false);
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

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-black text-white p-10">
      <div className="w-96 flex justify-between items-center">
        <h1 className="text-4xl font-bold">AI Interview Coach</h1>
        <button
          onClick={handleLogout}
          className="text-sm text-zinc-400 hover:text-white underline"
        >
          Logout
        </button>
      </div>

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

      {questions && (
        <div className="flex gap-2">
          <button
            onClick={() => speakText(questions)}
            className="rounded bg-green-600 px-4 py-2 font-medium hover:bg-green-700"
          >
            🔊 Read Questions Aloud
          </button>
          <button
            onClick={stopSpeaking}
            className="rounded bg-red-600 px-4 py-2 font-medium hover:bg-red-700"
          >
            ⏹ Stop
          </button>
        </div>
      )}

      {questions && (
        <pre className="whitespace-pre-wrap w-96 rounded border border-zinc-700 p-4 text-sm text-zinc-300">
          {questions}
        </pre>
      )}

      {questions && (
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={recording ? stopRecording : startRecording}
            className={`rounded px-6 py-3 font-medium ${
              recording ? "bg-red-600 hover:bg-red-700" : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            {recording ? "⏹ Stop Recording" : "🎤 Record Your Answer"}
          </button>

          {transcribing && <p className="text-sm text-zinc-500">Transcribing your answer...</p>}

          {transcribedText && (
            <div className="w-96 rounded border border-zinc-700 p-4 text-sm text-zinc-300">
              <p className="text-zinc-500 mb-1">Your answer:</p>
              {transcribedText}
            </div>
          )}

          {transcribedText && (
            <button
              onClick={handleScoreAnswer}
              disabled={scoring}
              className="rounded bg-yellow-600 px-4 py-2 font-medium hover:bg-yellow-700 disabled:opacity-50"
            >
              {scoring ? "Scoring..." : "📊 Score My Answer"}
            </button>
          )}

          {scoreResult && (
            <div className="w-96 rounded border border-zinc-700 p-4 text-sm">
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}