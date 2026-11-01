const LINKS = [
  { href: "#lab", label: "Lab" },
  { href: "#how", label: "How it works" },
  { href: "#compare", label: "Compare" },
  { href: "#why", label: "Why it matters" },
];

export function Wordmark() {
  return (
    <a href="#top" className="flex items-center gap-2.5" aria-label="Optimum Network Observatory, top of page">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="" width="32" height="32" className="h-8 w-8 rounded-[9px] border border-line" />
      <span className="text-[15px] font-semibold tracking-tight">Optimum</span>
      <span className="hidden text-[15px] text-ink-3 sm:inline">Network Observatory</span>
    </a>
  );
}

export function Nav() {
  return (
    <header id="top" className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Wordmark />
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3.5 py-1.5 text-sm text-ink-2 transition-colors hover:bg-white hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <details className="relative md:hidden">
          <summary className="flex h-10 cursor-pointer list-none items-center gap-2 rounded-full border border-line bg-white px-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
            Menu
            <svg width="10" height="6" viewBox="0 0 10 6" aria-hidden="true">
              <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </summary>
          <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-line bg-white p-2 shadow-panel">
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} className="block rounded-xl px-3 py-2.5 text-sm text-ink-2 hover:bg-paper">
                {l.label}
              </a>
            ))}
          </div>
        </details>
      </div>
    </header>
  );
}
