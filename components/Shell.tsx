import Link from 'next/link';

const NAV = [['/', 'Sandbox'], ['/compare', 'Compare'], ['/assumptions', 'Assumptions']];

export default function Shell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 sm:px-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hair py-4">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold tracking-tight">Grid Plan</span>
          <span className="chip">Modeled demo - sample assumptions</span>
        </div>
        <nav className="flex gap-1 text-sm" aria-label="Primary">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} aria-current={active === href ? 'page' : undefined}
              className={`rounded-btn px-3 py-1.5 ${active === href ? 'bg-signal text-white' : 'text-ink-soft hover:text-ink'}`}>
              {label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="flex-1 py-6">{children}</main>
      <footer className="border-t border-hair py-5 text-xs text-ink-faint">
        Independent demo built by Vinil Polepalli. Illustrative planning math from visible assumptions; not engineering advice. Not affiliated with or endorsed by Marengo.
      </footer>
    </div>
  );
}
