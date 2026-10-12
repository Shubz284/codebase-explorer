"use client";

import { useEffect, useState } from "react";

type RepoStatus =
  | "PENDING"
  | "FETCHING"
  | "PARSING"
  | "EMBEDDING"
  | "SUMMARIZING"
  | "DONE"
  | "FAILED";

type Props = {
  repoId: string;
  initialStatus: RepoStatus;
  initialErrorMessage: string | null;
};

const stages: RepoStatus[] = ["FETCHING", "PARSING", "EMBEDDING", "SUMMARIZING", "DONE"];

// short, matches the mockup's own wording exactly — not the longer
// labels used elsewhere, this row is too narrow for full sentences
const shortLabel: Record<RepoStatus, string> = {
  PENDING: "pending",
  FETCHING: "fetched",
  PARSING: "parsed",
  EMBEDDING: "embedded",
  SUMMARIZING: "summarized",
  DONE: "ready",
  FAILED: "failed",
};

export default function RepoProgress({ repoId, initialStatus, initialErrorMessage }: Props) {
  const [status, setStatus] = useState<RepoStatus>(initialStatus);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialErrorMessage);

  useEffect(() => {
    if (status === "DONE" || status === "FAILED") return;

    const checkStatus = async () => {
      try {
        const response = await fetch(`/api/repos/${repoId}/status`);
        if (!response.ok) return;
        const data = await response.json();
        setStatus(data.status);
        setErrorMessage(data.errorMessage);
      } catch {
        // Ignore temporary polling/network errors.
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [repoId, status]);

  if (status === "FAILED") {
    return (
      <div className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 rounded-lg px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        <span className="font-mono text-[11.5px] text-destructive">
          failed{errorMessage ? ` — ${errorMessage}` : ""}
        </span>
      </div>
    );
  }

  // PENDING hasn't technically reached FETCHING yet, but there's no earlier
  // segment to point at — treat it as "about to start fetching" visually
  const currentIndex = stages.indexOf(status === "PENDING" ? "FETCHING" : status);

  return (
    <div className="flex border border-border rounded-lg overflow-hidden w-fit">
      {stages.map((stage, i) => {
        const isComplete = status === "DONE" || i < currentIndex;
        const isActive = i === currentIndex && status !== "DONE";

        return (
          <div
            key={stage}
            className={
              "flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] " +
              (i < stages.length - 1 ? "border-r border-border" : "")
            }
          >
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (isComplete
                  ? "bg-accent-foreground"
                  : isActive
                    ? "bg-[#7a4c0f] animate-pulse motion-reduce:animate-none"
                    : "bg-border")
              }
            />
            <span
              className={
                isActive
                  ? "font-medium text-foreground"
                  : isComplete
                    ? "text-foreground"
                    : "text-muted-foreground"
              }
            >
              {shortLabel[stage]}
            </span>
          </div>
        );
      })}
    </div>
  );
}