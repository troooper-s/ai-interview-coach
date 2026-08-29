"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage("Could not connect to backend"));
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
      <h1 className="text-4xl font-bold">AI Interview Coach</h1>
      <p className="text-lg text-zinc-400">Backend says: {message}</p>
    </div>
  );
}