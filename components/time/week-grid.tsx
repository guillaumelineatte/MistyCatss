'use client'

import { useRouter } from 'next/navigation'
import { useQueryState } from 'nuqs'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'

import { ButtonSecondary, StatCard } from '@/components/finance-shell'
import { useToast } from '@/components/ui/toast'
import type { clients as clientsTable, projects as projectsTable, timeEntries as timeEntriesTable } from '@/db/schema'
import { createTimeEntryAction, deleteTimeEntryAction, restoreTimeEntryAction } from '@/lib/time/actions'
import { addDays, getWeekDays } from '@/lib/time/week'

type Client = typeof clientsTable.$inferSelect
type Project = typeof projectsTable.$inferSelect & { client: Client }
type TimeEntry = typeof timeEntriesTable.$inferSelect & { project: Project }

const dayLabels = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM']

function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`
}

export function WeekGrid({ weekStart, entries, projects }: { weekStart: string; entries: TimeEntry[]; projects: Project[] }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [, setWeek] = useQueryState('week', { defaultValue: '', shallow: false })
  const [addingDate, setAddingDate] = useState<string | null>(null)

  const days = getWeekDays(weekStart)
  const entriesByDay = new Map<string, TimeEntry[]>()
  for (const entry of entries) entriesByDay.set(entry.date, [...(entriesByDay.get(entry.date) ?? []), entry])

  const billableMinutes = entries.filter((e) => e.billable).reduce((sum, e) => sum + e.durationMinutes, 0)
  const nonBillableMinutes = entries.filter((e) => !e.billable).reduce((sum, e) => sum + e.durationMinutes, 0)
  const totalMinutes = billableMinutes + nonBillableMinutes
  const fillRate = totalMinutes > 0 ? Math.round((billableMinutes / totalMinutes) * 100) : 0

  async function onDelete(entry: TimeEntry) {
    const result = await deleteTimeEntryAction(entry.id)
    if (result.error) {
      alert(result.error)
      return
    }
    router.refresh()
    showToast({
      message: `Entrée du ${entry.date.split('-').reverse().join('/')} supprimée.`,
      action: {
        label: 'Annuler',
        onClick: async () => {
          await restoreTimeEntryAction(entry)
          router.refresh()
        },
      },
    })
  }

  return (
    <div className="flex flex-col gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-4xl">SEMAINE DU {weekStart.split('-').reverse().join('/')}</h2>
        <div className="flex gap-2">
          <ButtonSecondary onClick={() => setWeek(addDays(weekStart, -7))}>
            <ChevronLeft className="size-4" />
          </ButtonSecondary>
          <ButtonSecondary onClick={() => setWeek(addDays(weekStart, 7))}>
            <ChevronRight className="size-4" />
          </ButtonSecondary>
        </div>
      </div>

      {projects.length === 0 ? (
        <p className="font-mono text-xs text-[var(--ink)]/60">Crée d&apos;abord un projet pour saisir du temps.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
          {days.map((date, index) => (
            <div key={date} className="border-2 border-[var(--ink)]">
              <div className="flex items-center justify-between border-b-2 border-[var(--ink)] bg-[var(--ink)] p-2 text-center font-mono text-[10px] text-[var(--paper)]">
                <span>
                  {dayLabels[index]} {date.slice(8, 10)}
                </span>
                <button aria-label="Ajouter une entrée" onClick={() => setAddingDate(addingDate === date ? null : date)}>
                  <Plus className="size-3.5" />
                </button>
              </div>
              <div className="flex min-h-28 flex-col gap-2 p-2 font-mono text-[11px]">
                {(entriesByDay.get(date) ?? []).map((entry) => (
                  <div key={entry.id} className="flex items-start justify-between gap-1 border-b border-[var(--ink)]/20 pb-1">
                    <div>
                      <p className={entry.billable ? '' : 'text-[var(--ink)]/50'}>{formatHours(entry.durationMinutes)}</p>
                      <p className="text-[var(--ink)]/60">{entry.project.name}</p>
                    </div>
                    {!entry.invoiceLineId && (
                      <button aria-label="Supprimer l'entrée" onClick={() => onDelete(entry)}>
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </div>
                ))}
                {addingDate === date && (
                  <AddEntryForm date={date} projects={projects} onDone={() => setAddingDate(null)} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Temps facturé" value={formatHours(billableMinutes)} note="Cette semaine" tone="blue" />
        <StatCard label="Temps non facturé" value={formatHours(nonBillableMinutes)} note="À convertir en valeur" tone="pink" />
        <StatCard label="Taux de remplissage" value={`${fillRate} %`} note={`${formatHours(totalMinutes)} saisies`} />
      </div>
    </div>
  )
}

function AddEntryForm({ date, projects, onDone }: { date: string; projects: Project[]; onDone: () => void }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(formData: FormData) {
    setPending(true)
    setError(null)
    const result = await createTimeEntryAction({}, formData)
    setPending(false)
    if (result.error) setError(result.error)
    else {
      router.refresh()
      onDone()
    }
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-1 border-t border-dashed border-[var(--ink)]/40 pt-2">
      <input type="hidden" name="date" value={date} />
      {error && <p className="text-[var(--pink)]">{error}</p>}
      <select name="projectId" required defaultValue="" className="h-8 border border-[var(--ink)] bg-[var(--paper)] text-[10px]">
        <option value="" disabled>
          Projet
        </option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      <input name="hours" type="number" step="0.25" min="0.25" placeholder="Heures" required className="h-8 border border-[var(--ink)] bg-[var(--paper)] px-1 text-[10px]" />
      <input name="description" placeholder="Description" className="h-8 border border-[var(--ink)] bg-[var(--paper)] px-1 text-[10px]" />
      <label className="flex items-center gap-1">
        <input type="checkbox" name="billable" defaultChecked /> Facturable
      </label>
      <button disabled={pending} className="h-8 border-2 border-[var(--ink)] bg-[var(--pink)] text-[10px] font-bold uppercase text-[var(--paper)]">
        {pending ? '…' : 'Ajouter'}
      </button>
    </form>
  )
}
