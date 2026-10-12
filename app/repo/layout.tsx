import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/Sidebar"

export default async function RepoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/")

  return (
    <div className="grid grid-cols-[224px_1fr] min-h-screen">
      <Sidebar userName={session.user.name} />
      <main>{children}</main>
    </div>
  )
}