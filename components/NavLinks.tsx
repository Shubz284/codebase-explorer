'use client'
import Link from "next/link"
import { usePathname } from "next/navigation"

export function NavLinks() {
  const pathname = usePathname()
  const repoMatch = pathname.match(/^\/repo\/([^/]+)/)
  const repoId = repoMatch?.[1]

  const links = [
    { href: "/dashboard", label: "Repositories", icon: "▦" },
    ...(repoId
      ? [
          { href: `/repo/${repoId}`, label: "Files", icon: "≡" },
          { href: `/repo/${repoId}/graph`, label: "Graph", icon: "◇" },
          { href: `/repo/${repoId}/chat`, label: "Chat", icon: "?" },
        ]
      : []),
  ]

  return (
    <nav className="flex flex-col gap-0.5">
      {links.map((link) => {
        const active = pathname === link.href
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-[13.5px] " +
              (active ? "bg-sidebar-accent text-lime" : "text-sidebar-foreground/70 hover:text-white")
            }
          >
            <span className="w-4 text-center">{link.icon}</span>
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}