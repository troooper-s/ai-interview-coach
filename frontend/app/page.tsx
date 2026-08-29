"use client";

import { useState } from "react";

export default function Home() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [questions, setQuestions] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

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
        headers: { "Content-Type": "application/json" },
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

  return (
    <div className="flex min-h-screen flex-col items-center gap-6 bg-black text-white p-10">
      <h1 className="text-4xl font-bold">AI Interview Coach</h1>

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
    </div>
  );
}