'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'

import { globalSearchAction, type SearchResult } from '@/lib/search/actions'

const staticActions = [
  { label: 'Créer une facture', href: '/invoices/new' },
  { label: 'Ajouter un client', href: '/clients' },
  { label: 'Démarrer le chrono', href: '/time' },
  { label: 'Exporter les données', href: '/settings/security' },
]

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- réinitialise la recherche à la fermeture, pas un état dérivable au rendu
      setQuery('')
      setResults([])
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- vide les résultats sous le seuil de recherche, dépend du debounce ci-dessous
      setResults([])
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(() => {
      globalSearchAction(query).then((r) => {
        setResults(r)
        setSearching(false)
      })
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  function go(href: string) {
    router.push(href)
    onClose()
  }

  const filteredActions = staticActions.filter((action) => action.label.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-[var(--ink)]/40 p-4 pt-[15vh]"
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes"
      onClick={onClose}
    >
      <div className="w-full max-w-xl border-[3px] border-[var(--ink)] bg-[var(--paper)] shadow-[10px_10px_0_var(--ink)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b-2 border-[var(--ink)] px-4 py-3">
          <Search aria-hidden="true" className="size-5" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full bg-transparent font-mono text-sm outline-none"
            placeholder="Rechercher un client, un devis, une facture, un projet…"
          />
          <button aria-label="Fermer" onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="max-h-[50vh] overflow-y-auto p-2 font-mono text-sm">
          {query.trim().length >= 2 && (
            <>
              {searching && <p className="px-3 py-2 text-xs text-[var(--ink)]/50">Recherche…</p>}
              {!searching && results.length === 0 && <p className="px-3 py-2 text-xs text-[var(--ink)]/50">Aucun résultat pour &quot;{query}&quot;.</p>}
              {results.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-[var(--pink)]"
                  onClick={() => go(result.href)}
                >
                  <span>{result.label}</span>
                  <span className="text-[10px] uppercase text-[var(--ink)]/50">{result.sublabel}</span>
                </button>
              ))}
              {results.length > 0 && <div className="my-1 border-t border-[var(--ink)]/20" />}
            </>
          )}
          {filteredActions.map((action) => (
            <button key={action.label} className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-[var(--pink)]" onClick={() => go(action.href)}>
              <span>{action.label}</span>
              <span className="text-[10px] text-[var(--ink)]/50">↵</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
