"use client";
import { useState } from "react";
import type { TreeNode } from "@/lib/buildTree";

function TreeItem({
  node,
  depth,
  selectedId,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedId?: string;
  onSelect: (n: TreeNode) => void;
}) {
  const [open, setOpen] = useState(depth < 1); // top-level folders start expanded
  const isFolder = node.type === "folder";
  const active = !isFolder && node.fileId === selectedId;

  return (
  <div>
    <div style={{ paddingLeft: depth * 32 }}>
      <button
        type="button"
        onClick={() => (isFolder ? setOpen(!open) : onSelect(node))}
        className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left font-mono text-sm ${
          active ? "bg-black text-[#c8f560]" : "hover:bg-neutral-100"
        }`}
      >
        <span className={`w-3 text-[10px] ${active ? "text-[#c8f560]" : "text-neutral-500"}`}>
          {isFolder ? (open ? "▼" : "▶") : "●"}
        </span>
        <span className="truncate">{node.name}</span>
      </button>
    </div>

    {isFolder &&
      open &&
      node.children.map((child) => (
        <TreeItem
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
  </div>
);
}

export function FileTree({
  nodes,
  selectedId,
  onSelect,
}: {
  nodes: TreeNode[];
  selectedId?: string;
  onSelect: (n: TreeNode) => void;
}) {
  return (
    <div>
      {nodes.map((n) => (
        <TreeItem
          key={n.path}
          node={n}
          depth={0}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}