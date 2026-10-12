'use client'
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AnalyzeForm() {
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
    } catch (err) {
      setError("Network error — check your connection and try again");
      setIsLoading(false);
    }
  }

  return (
    <div>
      <div className="flex border border-foreground rounded-lg overflow-hidden">
        <span className="font-mono text-sm text-muted-foreground pl-4 flex items-center">↳</span>
        <input
          type="text"
          placeholder="https://github.com/owner/repo"
          onChange={(e) => setInputVal(e.target.value)}
          value={input}
          disabled={isLoading}
          className="flex-1 min-w-0 bg-transparent px-3 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground outline-none disabled:opacity-50"
        />
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !input.trim()}
          className="bg-primary text-primary-foreground px-5 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
        >
          {isLoading ? "Analyzing..." : "Analyze"}
        </button>
      </div>
      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    </div>
  );
}