import Link from 'next/link'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[var(--paper)] px-5 py-12 text-[var(--ink)]">
      <Link href="/" className="block text-center">
        <span className="font-anton text-4xl uppercase leading-[.75] tracking-[-.04em]">
          ARGENT<br />
          <span className="text-[var(--pink)]">BRUT</span>
        </span>
      </Link>
      <div className="w-full max-w-md border-[3px] border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[8px_8px_0_var(--ink)] md:p-8">
        {children}
      </div>
    </div>
  )
}
