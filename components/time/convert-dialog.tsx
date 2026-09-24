'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ButtonPrimary, ButtonSecondary, SectionLabel } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import type { clients as clientsTable, projects as projectsTable, timeEntries as timeEntriesTable } from '@/db/schema'
import { convertTimeEntriesToInvoiceAction, listUnconvertedEntriesAction } from '@/lib/time/actions'

type Client = typeof clientsTable.$inferSelect
type Project = typeof projectsTable.$inferSelect & { client: Client }
type TimeEntry = typeof timeEntriesTable.$inferSelect

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

export function ConvertDialog({ projects }: { projects: Project[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [vatRate, setVatRate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    if (!projectId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- vide la sélection quand le projet change, avant le fetch ci-dessous
      setEntries([])
      return
    }
    listUnconvertedEntriesAction(projectId).then((rows) => {
      setEntries(rows)
      setSelectedIds(new Set(rows.map((r) => r.id)))
    })
  }, [projectId])

  const totalMinutes = entries.filter((e) => selectedIds.has(e.id)).reduce((sum, e) => sum + e.durationMinutes, 0)

  async function onSubmit() {
    if (selectedIds.size === 0) {
      setError('Sélectionne au moins une entrée.')
      return
    }
    if (vatRate.trim() === '') {
      setError('Le taux de TVA est requis.')
      return
    }
    setPending(true)
    setError(null)
    const formData = new FormData()
    formData.set('projectId', projectId)
    formData.set('vatRatePercent', vatRate)
    for (const id of selectedIds) formData.append('entryIds', id)

    const result = await convertTimeEntriesToInvoiceAction({}, formData)
    setPending(false)
    if (result.error) {
      setError(result.error)
      return
    }
    router.push(`/invoices/${result.invoiceId}`)
  }

  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SectionLabel tone="pink">Conversion</SectionLabel>
          <h2 className="text-3xl">TEMPS → FACTURE</h2>
        </div>
        <ButtonPrimary onClick={() => setOpen((v) => !v)}>{open ? 'Fermer' : 'Convertir du temps'}</ButtonPrimary>
      </div>

      {open && (
        <div className="mt-5 flex flex-col gap-4">
          {error && <FormError message={error} />}
          <Field label="Projet" htmlFor="convertProjectId">
            <select
              id="convertProjectId"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className={inputClassName}
            >
              <option value="">Choisir un projet</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name} · {project.client.name}
                </option>
              ))}
            </select>
          </Field>

          {projectId && entries.length === 0 && (
            <p className="font-mono text-xs text-[var(--ink)]/60">Aucune entrée facturable non convertie pour ce projet.</p>
          )}

          {entries.length > 0 && (
            <div className="flex flex-col gap-2 font-mono text-xs">
              {entries.map((entry) => (
                <label key={entry.id} className="flex items-center gap-2 border-b border-[var(--ink)]/20 pb-2">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(entry.id)}
                    onChange={(event) => {
                      const next = new Set(selectedIds)
                      if (event.target.checked) next.add(entry.id)
                      else next.delete(entry.id)
                      setSelectedIds(next)
                    }}
                  />
                  <span>{entry.date.split('-').reverse().join('/')}</span>
                  <span>{formatHours(entry.durationMinutes)}</span>
                  <span className="text-[var(--ink)]/60">{entry.description}</span>
                </label>
              ))}
              <p className="mt-1">Total sélectionné : {formatHours(totalMinutes)}</p>
              <Field label="Taux de TVA — %" htmlFor="vatRate">
                <input
                  id="vatRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  required
                  value={vatRate}
                  onChange={(event) => setVatRate(event.target.value)}
                  className={inputClassName}
                />
              </Field>
              <div className="flex gap-3">
                <ButtonPrimary onClick={onSubmit}>{pending ? 'Création…' : 'Créer la facture brouillon'}</ButtonPrimary>
                <ButtonSecondary onClick={() => setOpen(false)}>Annuler</ButtonSecondary>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
