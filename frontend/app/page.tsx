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
  const [scoreError, setScoreError] = useState(false);
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
        setAuthError("Account created. Please log in.");
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
    setScoreError(false);
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
    setScoreError(false);

    try {
      const res = await fetch(`${API_URL}/score-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: questionsList[currentIndex], answer }),
      });
      if (!res.ok) throw new Error("failed");
      const data = await res.json();
      setScoreResult(data);
      setAllScores((prev) => {
        const updated = [...prev];
        updated[currentIndex] = data;
        return updated;
      });
    } catch (err) {
      setScoreError(true);
    }

    setScoring(false);
  };

  const goToNextQuestion = () => {
    setTranscribedText("");
    setManualAnswer("");
    setScoreResult(null);
    setTranscribeError(false);
    setScoreError(false);
    setCurrentIndex((i) => i + 1);
  };

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 text-white p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">AI Interview Coach</h1>
            <p className="text-neutral-500 text-sm mt-1">Practice interviews with AI-powered feedback</p>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <div className="flex gap-1 mb-5 bg-neutral-950 rounded-lg p-1">
              <button
                onClick={() => setAuthMode("login")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                  authMode === "login"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Log in
              </button>
              <button
                onClick={() => setAuthMode("signup")}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
                  authMode === "signup"
                    ? "bg-neutral-800 text-white"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                Sign up
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {authMode === "signup" && (
                <input
                  type="text"
                  placeholder="Name"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="px-3 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />

              {authError && (
                <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-900 rounded-lg px-3 py-2">
                  {authError}
                </p>
              )}

              <button
                onClick={handleAuth}
                className="mt-1 rounded-lg bg-white text-neutral-950 px-4 py-2.5 text-sm font-medium hover:bg-neutral-200 transition"
              >
                {authMode === "login" ? "Log in" : "Create account"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasQuestions = questionsList.length > 0;
  const isLastQuestion = currentIndex === questionsList.length - 1;
  const isInterviewDone = hasQuestions && currentIndex >= questionsList.length;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-lg mx-auto px-5 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-xl font-semibold tracking-tight">AI Interview Coach</h1>
          <button
            onClick={handleLogout}
            className="text-xs text-neutral-500 hover:text-neutral-300 transition"
          >
            Log out
          </button>
        </div>

        {!hasQuestions && (
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-sm font-medium text-neutral-400 mb-4">Set up your interview</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Company (e.g. Google)"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />
              <input
                type="text"
                placeholder="Role (e.g. Software Engineer)"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="px-3 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600"
              />

              <label className="flex flex-col gap-2">
                <span className="text-xs text-neutral-500">Resume (PDF, optional)</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleResumeUpload}
                  className="text-xs text-neutral-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:bg-neutral-800 file:text-neutral-300 hover:file:bg-neutral-700"
                />
              </label>

              {uploading && <p className="text-xs text-neutral-500">Extracting resume text...</p>}
              {resumeFileName && !uploading && (
                <p className="text-xs text-emerald-400">{resumeFileName} loaded</p>
              )}

              <button
                onClick={handleGenerate}
                disabled={loading || !company || !role}
                className="mt-2 rounded-lg bg-white text-neutral-950 px-4 py-2.5 text-sm font-medium hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-white transition"
              >
                {loading ? "Generating questions..." : "Generate questions"}
              </button>
            </div>
          </div>
        )}

        {hasQuestions && !isInterviewDone && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Question {currentIndex + 1} of {questionsList.length}
              </span>
              <div className="flex gap-1">
                {questionsList.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1 w-6 rounded-full ${
                      i < currentIndex ? "bg-emerald-500" : i === currentIndex ? "bg-white" : "bg-neutral-800"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
              <p className="text-[15px] leading-relaxed text-neutral-100">
                {questionsList[currentIndex]}
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => speakText(questionsList[currentIndex])}
                  className="text-xs px-3 py-1.5 rounded-md bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition"
                >
                  Read aloud
                </button>
                <button
                  onClick={stopSpeaking}
                  className="text-xs px-3 py-1.5 rounded-md bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition"
                >
                  Stop
                </button>
              </div>
            </div>

            <button
              onClick={recording ? stopRecording : startRecording}
              className={`rounded-xl px-6 py-3.5 text-sm font-medium transition ${
                recording
                  ? "bg-red-500/10 text-red-400 border border-red-900"
                  : "bg-violet-500/10 text-violet-300 border border-violet-900 hover:bg-violet-500/20"
              }`}
            >
              {recording ? "Stop recording" : "Record your answer"}
            </button>

            {transcribing && (
              <p className="text-xs text-neutral-500 text-center">Transcribing your answer...</p>
            )}
            {transcribeError && (
              <p className="text-xs text-amber-400 bg-amber-950/40 border border-amber-900 rounded-lg px-3 py-2 text-center">
                Voice transcription didn't work this time — no worries, just type your answer below.
              </p>
            )}

            {transcribedText && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3">
                <p className="text-xs text-neutral-500 mb-1">Transcribed answer</p>
                <p className="text-sm text-neutral-300">{transcribedText}</p>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-neutral-500">
                {transcribedText ? "Or edit / type your answer instead" : "Or type your answer"}
              </span>
              <textarea
                value={manualAnswer}
                onChange={(e) => setManualAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={4}
                className="px-3 py-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-600 resize-none"
              />
            </div>

            <button
              onClick={handleScoreAnswer}
              disabled={scoring || !getCurrentAnswer()}
              className="rounded-xl bg-white text-neutral-950 px-4 py-3 text-sm font-medium hover:bg-neutral-200 disabled:opacity-30 disabled:hover:bg-white transition"
            >
              {scoring ? "Scoring..." : "Score my answer"}
            </button>

            {scoreError && (
              <div className="bg-amber-950/40 border border-amber-900 rounded-lg p-3 text-center">
                <p className="text-xs text-amber-400 mb-2">
                  The AI is temporarily busy — this happens occasionally. Please try again.
                </p>
                <button
                  onClick={handleScoreAnswer}
                  className="text-xs px-3 py-1.5 rounded-md bg-amber-900/60 text-amber-200 hover:bg-amber-900 transition"
                >
                  Try again
                </button>
              </div>
            )}

            {scoreResult && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-semibold">{scoreResult.communication_score}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Communication</p>
                  </div>
                  <div className="text-center border-x border-neutral-800">
                    <p className="text-2xl font-semibold">{scoreResult.technical_score}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Technical</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-semibold">{scoreResult.confidence_score}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Confidence</p>
                  </div>
                </div>
                <div className="border-t border-neutral-800 pt-3">
                  <p className="text-xs text-neutral-500 mb-1">Feedback</p>
                  <p className="text-sm text-neutral-300 leading-relaxed">{scoreResult.feedback}</p>
                </div>

                <button
                  onClick={goToNextQuestion}
                  className="mt-4 w-full rounded-lg bg-white text-neutral-950 px-4 py-2.5 text-sm font-medium hover:bg-neutral-200 transition"
                >
                  {isLastQuestion ? "Finish interview" : "Next question"}
                </button>
              </div>
            )}
          </div>
        )}

        {isInterviewDone && (
          <div className="flex flex-col gap-4">
            <div className="text-center py-4">
              <h2 className="text-xl font-semibold">Interview complete</h2>
              <p className="text-neutral-500 text-sm mt-1">Here's how you did across all questions</p>
            </div>

            {allScores.map((score, i) => (
              <div key={i} className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                <p className="text-xs text-neutral-500 mb-2">Question {i + 1}</p>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="text-center">
                    <p className="text-lg font-semibold">{score.communication_score}</p>
                    <p className="text-[10px] text-neutral-500">Communication</p>
                  </div>
                  <div className="text-center border-x border-neutral-800">
                    <p className="text-lg font-semibold">{score.technical_score}</p>
                    <p className="text-[10px] text-neutral-500">Technical</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold">{score.confidence_score}</p>
                    <p className="text-[10px] text-neutral-500">Confidence</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">{score.feedback}</p>
              </div>
            ))}

            <button
              onClick={resetInterview}
              className="rounded-xl bg-white text-neutral-950 px-4 py-3 text-sm font-medium hover:bg-neutral-200 transition"
            >
              Start new interview
            </button>
          </div>
        )}
      </div>
    </div>
  );
}