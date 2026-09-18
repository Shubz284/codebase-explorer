// lib/github.ts
import { Octokit } from "octokit"

export function getOctokit(token: string) {
  return new Octokit({ auth: token })
}

export async function fetchRepoTree(octokit: Octokit, owner: string, repo: string) {
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo })
  const branch = repoData.default_branch

  const { data: refData } = await octokit.rest.git.getRef({
    owner, repo, ref: `heads/${branch}`,
  })

  const { data: treeData } = await octokit.rest.git.getTree({
    owner, repo, tree_sha: refData.object.sha, recursive: "true",
  })

  // GitHub silently truncates very large trees instead of erroring —
  // if this is true, we got a partial file list and shouldn't pretend otherwise
  if (treeData.truncated) {
    throw new Error("Repo too large — file tree was truncated by GitHub's API")
  }

  return { branch, isPrivate: repoData.private, tree: treeData.tree }
}

const IGNORE_DIRS = ["node_modules", ".git", "dist", "build", ".next", "vendor", "coverage"]
const IGNORE_EXTENSIONS = [
  ".png", ".jpg", ".jpeg", ".svg", ".gif", ".ico", ".woff", ".woff2",
  ".lock", ".map", ".min.js",
]
const MAX_FILE_SIZE = 50_000 // 50KB — matches the cap from your build plan

export function shouldInclude(path: string, size = 0): boolean {
  if (IGNORE_DIRS.some(dir => path.includes(`${dir}/`))) return false
  if (IGNORE_EXTENSIONS.some(ext => path.endsWith(ext))) return false
  if (size > MAX_FILE_SIZE) return false
  return true
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript", tsx: "typescript",
  js: "javascript", jsx: "javascript",
  py: "python", go: "go", rs: "rust",
  json: "json", md: "markdown", css: "css",
}

export function guessLanguage(path: string): string | null {
  const ext = path.split(".").pop()
  return ext ? LANGUAGE_MAP[ext] ?? null : null
}

export async function fetchFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string
): Promise<string | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path })
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) {
      return null // it's a directory, not a file — skip it
    }
    return Buffer.from(data.content, "base64").toString("utf-8")
  } catch {
    return null // one file failing to fetch shouldn't crash the whole run
  }
}