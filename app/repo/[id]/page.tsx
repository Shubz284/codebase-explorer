// app/repos/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import RepoProgress from "./RepoProgress";
import Explorer from "./Explorer";

export default async function RepoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/");

  const repo = await prisma.repo.findUnique({
    where: { id },
    include: {
      files: {
      orderBy: { path: "asc" },
      select: {
        id: true,
        path: true,
        language: true,
        sizeBytes: true,
        summary: true,
        functionCount: true,
        exportCount: true,
        hasTestFile: true,
        _count: { select: { edgesFrom: true } }, // number of files this one imports
      },
   },
    },
  });

  if (!repo || repo.userId !== session.user.id) notFound();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-medium">
            {repo.owner}/{repo.name}
          </h1>
          <p className="text-sm text-gray-500">{repo.fileCount} files</p>
        </div>
        <RepoProgress
          repoId={repo.id}
          initialStatus={repo.status}
          initialErrorMessage={repo.errorMessage}
        />
      </div>

      <Explorer files={repo.files}  repoId={repo.id} />
    </div>
  );
}