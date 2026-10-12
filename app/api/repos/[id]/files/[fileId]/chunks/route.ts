import { NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 })

  const { id, fileId } = await params

  // one query checks three things: file exists, belongs to this repo, repo belongs to this user
  const file = await prisma.file.findFirst({
    where: { id: fileId, repoId: id, repo: { userId: session.user.id } },
    select: { id: true },
  })
  if (!file) return Response.json({ error: "Not found" }, { status: 404 })

  const chunks = await prisma.chunk.findMany({
    where: { fileId },
    orderBy: { startLine: "asc" },
    select: { id: true, content: true, functionName: true, startLine: true, endLine: true },
  })

  return Response.json({ chunks })
}