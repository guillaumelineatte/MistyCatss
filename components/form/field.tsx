import { cn } from '@/lib/utils'

export const inputClassName =
  'mt-2 h-12 w-full border-2 border-[var(--ink)] bg-[var(--paper)] px-3 font-mono text-sm outline-none focus:border-[var(--blue)] focus:shadow-[3px_3px_0_var(--blue)]'

export function Field({
  label,
  htmlFor,
  error,
  children,
  className,
}: {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <label htmlFor={htmlFor} className="font-mono text-xs uppercase">
        {label}
      </label>
      {children}
      {error && <p className="mt-2 font-mono text-xs text-[var(--pink)]">{error}</p>}
    </div>
  )
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--pink)] px-3 py-2 font-mono text-xs text-[var(--paper)]">
      {message}
    </div>
  )
}
