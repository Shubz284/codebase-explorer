import { NavLinks } from "./NavLinks"

export function Sidebar({ userName }: { userName: string }) {
  const initial = userName?.[0]?.toUpperCase() ?? "?"
  return (
    <aside className="bg-sidebar text-sidebar-foreground flex flex-col gap-0.5 p-3 sticky top-0 h-screen border-r border-sidebar-border">
      <div className="flex items-center gap-2 text-white font-serif font-semibold text-lg px-2 pt-1 pb-5">
        <span className="w-2.5 h-2.5 bg-lime rounded-sm" />
        Atlas
      </div>
      <div className="font-mono text-[10px] text-sidebar-foreground/50 px-2 pt-3 pb-1">WORKSPACE</div>
      <NavLinks />
      <div className="mt-auto flex items-center gap-2 p-2 rounded-lg bg-sidebar-accent text-sm">
        <div className="w-7 h-7 rounded-full bg-lime text-black grid place-items-center font-bold text-xs">
          {initial}
        </div>
        <div>
          <b className="text-white block leading-tight">{userName}</b>
          <span className="text-sidebar-foreground/50 text-xs">GitHub</span>
        </div>
      </div>
    </aside>
  )
}