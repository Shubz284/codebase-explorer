import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  if (!session) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const repo = await prisma.repo.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    select: {
      status: true,
      errorMessage: true,
    },
  });

  if (!repo) {
    return Response.json(
      { error: "Repository not found" },
      { status: 404 }
    );
  }

  return Response.json({
    status: repo.status,
    errorMessage: repo.errorMessage,
  });
}