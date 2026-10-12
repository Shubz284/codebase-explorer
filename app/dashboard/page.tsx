import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { AnalyzeForm } from "@/components/AnalyzeForm"
import { RepoRow } from "@/components/RepoRow"

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/")

  const repos = await prisma.repo.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  const filesSummarized = await prisma.file.count({
    where: { repo: { userId: session.user.id }, summary: { not: null } },
  })

  const questionsAsked = await prisma.chatMessage.count({
    where: { repo: { userId: session.user.id }, role: "USER" },
  })

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <p className="font-mono text-xs text-muted-foreground mb-5">
        workspace / <b className="text-foreground">repositories</b>
      </p>

      <h1 className="font-serif text-4xl mb-2">Repositories</h1>
      <p className="text-muted-foreground mb-6">Paste a GitHub link to map a new codebase.</p>

      <AnalyzeForm />

      <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-lg overflow-hidden my-6">
        <Stat value={repos.length} label="repos analyzed" />
        <Stat value={filesSummarized} label="files summarized" />
        <Stat value={questionsAsked} label="questions asked" />
      </div>

      <div className="grid gap-px bg-border border border-border rounded-lg overflow-hidden">
        {repos.length === 0 ? (
          <div className="bg-card p-8 text-center text-muted-foreground text-sm">
            No repos yet — paste one above to get started.
          </div>
        ) : (
          repos.map((repo) => <RepoRow key={repo.id} repo={repo} />)
        )}
      </div>
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-card p-5">
      <b className="font-serif text-3xl block">{value}</b>
      <span className="text-muted-foreground text-sm">{label}</span>
    </div>
  )
}