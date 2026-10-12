// app/repos/[id]/Explorer.tsx
"use client";
import { buildTree } from "@/lib/buildTree";
import { useMemo, useState } from "react";
import { FileTree } from "./FileTree";
import { CodeChunks } from "@/components/CodeChunks";

type FileRow = {
  id: string;
  path: string;
  language: string | null;
  sizeBytes: number;
  summary: string | null;
  functionCount: number;
  exportCount: number;
  hasTestFile: boolean;
  _count: { edgesFrom: number };
};

export default function Explorer({ files, repoId }: { files: FileRow[];repoId: string; }) {
  const tree = useMemo(() => buildTree(files), [files]);
  const [selectedId, setSelectedId] = useState<string>();

  const selected = files.find((f) => f.id === selectedId);

  return (
    <div className="grid grid-cols-[340px_1fr] items-stretch gap-6">
    {/* tree card: same height as the detail card, scrolls inside */}
    <div className="relative min-h-[550px] rounded-2xl border border-neutral-200 bg-white">
      <div className="absolute inset-0 overflow-auto p-3">
        <FileTree
          nodes={tree}
          selectedId={selectedId}
          onSelect={(n) => setSelectedId(n.fileId)}
        />
      </div>
    </div>

      <div className="rounded-xl border bg-white p-6 min-h-50">
        {selected ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-lg">
                {selected.path.split("/").pop()}
              </h2>
              {selected.language && (
                <span className="text-xs rounded bg-blue-50 px-2 py-1 font-mono">
                  {selected.language}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500 font-mono">{selected.path}</p>
            <p className="mt-4 text-sm">
              {selected.summary ?? "No summary yet."}
            </p>
            <CodeChunks repoId={repoId} fileId={selected.id} filePath={selected.path} />
          </>
        ) : (
          <p className="text-sm text-gray-500">Select a file to see its summary.</p>
        )}
      </div>
    </div>
  );
}