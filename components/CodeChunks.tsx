"use client"
import { useEffect, useState } from "react"

type Chunk = {
  id: string
  content: string
  functionName: string | null
  startLine: number
  endLine: number
}

const PREVIEW_LINES = 6
const CHUNKS_SHOWN = 1

export function CodeChunks({
  repoId,
  fileId,
  filePath,
}: {
  repoId: string
  fileId: string
  filePath: string
}) {
  const [chunks, setChunks] = useState<Chunk[] | null>(null)
  const [error, setError] = useState(false)
  const [showAll, setShowAll] = useState(false)

  useEffect(() => {
    let cancelled = false
    setChunks(null)
    setError(false)
    setShowAll(false)

    fetch(`/api/repos/${repoId}/files/${fileId}/chunks`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!cancelled) setChunks(d.chunks)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    // if the user clicks another file before this response arrives,
    // this flag stops the old file's chunks from landing in the new file's view
    return () => {
      cancelled = true
    }
  }, [repoId, fileId])

  if (error) {
    return <p className="mt-4 text-sm text-destructive">Couldn't load code for this file.</p>
  }
  if (chunks === null) {
    return <div className="mt-4 h-24 animate-pulse rounded-lg bg-border/60" />
  }
  if (chunks.length === 0) {
    return (
      <p className="mt-4 text-sm text-muted-foreground">
        No code chunks stored for this file.
      </p>
    )
  }

  const visible = showAll ? chunks : chunks.slice(0, CHUNKS_SHOWN)

  return (
    <div className="mt-4 grid gap-3">
      {visible.map((chunk) => (
        <ChunkBlock key={chunk.id} chunk={chunk} filePath={filePath} />
      ))}
      {chunks.length > CHUNKS_SHOWN && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="justify-self-start font-mono text-xs text-muted-foreground hover:text-foreground"
        >
          {showAll ? "show fewer chunks" : `show ${chunks.length - CHUNKS_SHOWN} more chunks`}
        </button>
      )}
    </div>
  )
}

function ChunkBlock({ chunk, filePath }: { chunk: Chunk; filePath: string }) {
  const [expanded, setExpanded] = useState(false)
  const lines = chunk.content.split("\n")
  const isLong = lines.length > PREVIEW_LINES
  const shown = expanded || !isLong ? lines : lines.slice(0, PREVIEW_LINES)
  const header = `// ${filePath}:${chunk.startLine}${chunk.functionName ? ` · ${chunk.functionName}` : ""}`

  return (
    <div className="overflow-hidden rounded-lg bg-[#0e0f0d] text-[#cbd1c4]">
      <div className="px-4 pt-3 font-mono text-[11.5px] text-[#787c6f]">{header}</div>
      <div
        className={
          "overflow-x-auto px-4 py-3 font-mono text-[12.5px] leading-[1.75] " +
          (expanded ? "max-h-[480px] overflow-y-auto" : "")
        }
      >
        {shown.map((line, i) => (
          <div key={i} className="flex gap-4">
            <span className="w-8 shrink-0 select-none text-right text-[#4a4d44]">
              {chunk.startLine + i}
            </span>
            <span className="whitespace-pre">{line || " "}</span>
          </div>
        ))}
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full border-t border-white/10 px-4 py-2 text-left font-mono text-[11.5px] text-lime hover:bg-white/5"
        >
          {expanded ? "show less" : `show ${lines.length - PREVIEW_LINES} more lines`}
        </button>
      )}
    </div>
  )
}