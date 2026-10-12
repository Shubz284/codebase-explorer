// components/RepoRow.tsx — no "use client" needed, purely presentational
import { Repo } from "@/app/generated/prisma/client"
import Link from "next/link"

const STAGE_LABEL: Record<string, string> = {
  PENDING: "pending",
  FETCHING: "fetching",
  PARSING: "parsing",
  EMBEDDING: "embedding",
  SUMMARIZING: "summarizing",
  DONE: "ready",
  FAILED: "failed",
}

export function RepoRow({ repo }: { repo: Repo }) {
  const inProgress = !["DONE", "FAILED"].includes(repo.status)

  return (
    <Link
      href={`/repo/${repo.id}`}
      className="bg-card hover:bg-background grid grid-cols-[1fr_auto_auto] items-center gap-5 px-5 py-4"
    >
      <div>
        <b className="font-mono text-sm">
          {repo.owner}/{repo.name}
        </b>
        <br />
        <span className="text-muted-foreground text-sm">
          {repo.fileCount} files
        </span>
      </div>

      <span
        className={
          "font-mono text-[11px] px-2 py-1 rounded " +
          (repo.status === "FAILED"
            ? "bg-destructive/10 text-destructive"
            : inProgress
              ? "bg-[#f7efdd] text-[#6b4708]"
              : "bg-accent text-accent-foreground")
        }
      >
        {STAGE_LABEL[repo.status]}
      </span>

      <span className="text-muted-foreground text-xs">
        {timeAgo(repo.createdAt)}
      </span>
    </Link>
  )
}

function timeAgo(date: Date): string {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000)
  if (mins < 1) return "now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}