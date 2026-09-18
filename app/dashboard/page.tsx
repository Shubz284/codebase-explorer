// app/dashboard/page.tsx
'use client'
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DashboardPage() {
  const [input, setInputVal] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  async function handleAnalyze() {
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/repos/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUrl: input.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setIsLoading(false);
        return;
      }

      router.push(`/repo/${data.repoId}`);
      // note: not resetting isLoading here on purpose — the button
      // stays disabled while the navigation transition happens,
      // which prevents a double-click firing a second request
    } catch (err) {
      setError("Network error — check your connection and try again");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen">
      <div>Codebase Explorer</div>
      <div>
        Paste a repo. Get its architecture, file summaries and a chat that knows
        the code.
      </div>
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          placeholder="github.com/owner/repo"
          onChange={(e) => setInputVal(e.target.value)}
          value={input}
          disabled={isLoading}
        />
        <button
          className="border rounded-sm px-2"
          onClick={handleAnalyze}
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? "Analyzing..." : "Analyze"}
        </button>
      </div>
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </div>
  );
}