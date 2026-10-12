// app/api/repos/analyze/route.ts
import { after, NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  getOctokit,
  fetchRepoTree,
  shouldInclude,
  guessLanguage,
} from "@/lib/github"
import { parseRepo } from "@/lib/pipeline/parse-repo"
import { embedRepo } from "@/lib/pipeline/embed-repo"
import { summarizeRepo } from "@/lib/pipeline/summarize-repo"

export async function POST(req: NextRequest) {
  // 1. Auth check — safe to read the session here since this only runs server-side
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Parse + validate the request body
  const body = await req.json()
  const githubUrl = body.githubUrl as string | undefined

  if (!githubUrl || !githubUrl.startsWith("https://github.com/")) {
    return Response.json({ error: "Invalid GitHub URL" }, { status: 400 })
  }

  const [owner, name] = new URL(githubUrl).pathname.slice(1).split("/")
  if (!owner || !name) {
    return Response.json({ error: "URL must be github.com/owner/repo" }, { status: 400 })
  }

  // 3. Get the user's GitHub token so we can call the API on their behalf
  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, providerId: "github" },
  })
  if (!account?.accessToken) {
    return Response.json({ error: "GitHub account not connected properly" }, { status: 400 })
  }
  const accessToken = account.accessToken;

  // 4. Don't re-analyze a repo the user already has — matches the
  //    @@unique([userId, githubUrl]) in your schema
  const existing = await prisma.repo.findUnique({
    where: { userId_githubUrl: { userId: session.user.id, githubUrl } },
  })
  if (existing) {
    console.log("⚠️ REPO ALREADY EXISTS:", existing.id);
    return Response.json({ repoId: existing.id })
  }

  const repo = await prisma.repo.create({
    data: { userId: session.user.id, githubUrl, owner, name, status: "FETCHING" },
  })

  // Part 1 — fast, stays inside the request: if the URL is bad or the repo
  // doesn't exist, the user finds out in seconds instead of minutes
  // Part 1 — fast, stays inside the request: if the URL is bad or the repo
  // doesn't exist, the user finds out in seconds instead of minutes
  try {
    const octokit = getOctokit(accessToken)
    const { branch, isPrivate, tree } = await fetchRepoTree(octokit, owner, name)
    const files = tree.filter((f) => f.type === "blob" && shouldInclude(f.path!, f.size))

    await prisma.file.createMany({
      data: files.map((f) => ({
        repoId: repo.id,
        path: f.path!,
        sizeBytes: f.size ?? 0,
        language: guessLanguage(f.path!),
      })),
    })

    await prisma.repo.update({
      where: { id: repo.id },
      data: { defaultBranch: branch, isPrivate, fileCount: files.length },
    })
  } catch (err) {
    console.error("FETCH FAILED:", err)
    await prisma.repo
      .update({
        where: { id: repo.id },
        data: { status: "FAILED", errorMessage: (err as Error).message },
      })
      .catch(() => {})
    return Response.json({ error: "Failed to fetch repo" }, { status: 500 })
  }

  // Part 2 — slow, runs AFTER the response has been sent
  after(async () => {
    try {
      await parseRepo(repo.id, accessToken)
      await embedRepo(repo.id, accessToken)
      await summarizeRepo(repo.id, accessToken)
      await prisma.repo.update({
        where: { id: repo.id },
        data: { analyzedAt: new Date() },
      })
    } catch (err) {
      console.error("PIPELINE FAILED:", err)
      await prisma.repo
        .update({
          where: { id: repo.id },
          data: { status: "FAILED", errorMessage: (err as Error).message },
        })
        .catch(() => {})
    }
  })

  return Response.json({ repoId: repo.id })
}