// app/repos/[id]/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";

export default async function RepoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/");
  }

  const repo = await prisma.repo.findUnique({
    where: { id },
    include: {
      files: { orderBy: { path: "asc" } },
    },
  });

  // Two different failure cases collapsed into one response on purpose:
  // "doesn't exist" and "exists but belongs to someone else" should look
  // identical from the outside — otherwise you'd leak which repo IDs are real.
  if (!repo || repo.userId !== session.user.id) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-medium">
            {repo.owner}/{repo.name}
          </h1>
          <p className="text-sm text-gray-500">{repo.fileCount} files</p>
        </div>
        <StatusBadge status={repo.status} />
      </div>  

      {repo.status === "FAILED" && repo.errorMessage && (
        <div className="text-red-500 text-sm mb-4">{repo.errorMessage}</div>
      )}

      <div className="border rounded-sm divide-y">
        {repo.files.map((file) => (
          <div key={file.id} className="px-3 py-2 text-sm font-mono">
            {file.path}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DONE: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
    PENDING: "bg-gray-100 text-gray-700",
    FETCHING: "bg-yellow-100 text-yellow-700",
    PARSING: "bg-yellow-100 text-yellow-700",
    EMBEDDING: "bg-yellow-100 text-yellow-700",
    SUMMARIZING: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`text-xs px-2 py-1 rounded-sm ${styles[status] ?? ""}`}>
      {status}
    </span>
  );
}
