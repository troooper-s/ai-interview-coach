"use client";

export default function Home() {
  const questions = [
    "Tell me about yourself",
    "What is your biggest strength?",
    "Why do you want to join this company?",
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
      <h1 className="text-4xl font-bold">Interview Questions</h1>
      <ul className="flex flex-col gap-2">
        {questions.map((q, index) => (
          <li key={index} className="rounded border border-zinc-700 p-3 w-96">
            {index + 1}. {q}
          </li>
        ))}
      </ul>
    </div>
  );
}