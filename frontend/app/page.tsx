"use client";

import { useState } from "react";

export default function Home() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black text-white">
      <h1 className="text-4xl font-bold">Welcome to AI Interview Coach</h1>
      <p className="text-lg text-zinc-400">You clicked {count} times</p>
      <button
        onClick={() => setCount(count + 1)}
        className="rounded bg-blue-600 px-4 py-2 font-medium hover:bg-blue-700"
      >
        Click me
      </button>
    </div>
  );
}