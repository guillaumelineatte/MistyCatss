'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { X } from 'lucide-react'

type Toast = {
  id: string
  message: string
  action?: { label: string; onClick: () => void }
}

type ToastInput = { message: string; action?: { label: string; onClick: () => void }; durationMs?: number }

const ToastContext = createContext<{ showToast: (toast: ToastInput) => void } | null>(null)

/** Toasts brutalistes (mêmes tokens/bordures/ombres que le reste de l'UI), avec annulation optionnelle pour les actions réversibles. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timers.current.delete(id)
    }
  }, [])

  const showToast = useCallback(
    ({ message, action, durationMs = 6000 }: ToastInput) => {
      const id = crypto.randomUUID()
      setToasts((current) => [...current, { id, message, action }])
      const timer = setTimeout(() => dismiss(id), durationMs)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 sm:bottom-6 sm:right-6" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center justify-between gap-3 border-2 border-[var(--ink)] bg-[var(--ink)] px-4 py-3 font-mono text-xs text-[var(--paper)] shadow-[4px_4px_0_var(--pink)]"
          >
            <span>{toast.message}</span>
            <div className="flex shrink-0 items-center gap-3">
              {toast.action && (
                <button
                  className="font-bold uppercase underline underline-offset-4"
                  onClick={() => {
                    toast.action?.onClick()
                    dismiss(toast.id)
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button aria-label="Fermer" onClick={() => dismiss(toast.id)}>
                <X className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé sous ToastProvider')
  return ctx
}
