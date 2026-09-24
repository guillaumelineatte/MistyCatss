'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Clock3, Square, X } from 'lucide-react'

import type { activeTimers as activeTimersTable, clients as clientsTable, projects as projectsTable } from '@/db/schema'
import { discardTimerAction, getTimerWidgetDataAction, startTimerAction, stopTimerAction } from '@/lib/time/actions'

type Project = typeof projectsTable.$inferSelect & { client: typeof clientsTable.$inferSelect }
type Timer = (typeof activeTimersTable.$inferSelect & { project: Project | null }) | null

function formatElapsed(startedAt: Date): string {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000))
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

/** Chrono persistant, démarrable/arrêtable depuis n'importe quel écran (rendu par FinanceShell). */
export function GlobalTimer() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [timer, setTimer] = useState<Timer>(null)
  const [elapsed, setElapsed] = useState('00:00:00')
  const [starting, setStarting] = useState(false)
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [loaded, setLoaded] = useState(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    getTimerWidgetDataAction().then(({ timer: t, projects: p }) => {
      setTimer(t as Timer)
      setProjects(p)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    if (timer?.startedAt) {
      const startedAt = new Date(timer.startedAt)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- affichage initial avant le premier tick de l'intervalle ci-dessous
      setElapsed(formatElapsed(startedAt))
      tickRef.current = setInterval(() => setElapsed(formatElapsed(startedAt)), 1000)
    }
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [timer?.startedAt])

  if (!loaded) return null

  async function onStart() {
    if (!projectId) return
    await startTimerAction(projectId, description || null)
    const data = await getTimerWidgetDataAction()
    setTimer(data.timer as Timer)
    setStarting(false)
    setDescription('')
    router.refresh()
  }

  async function onStop() {
    await stopTimerAction()
    setTimer(null)
    router.refresh()
  }

  async function onDiscard() {
    await discardTimerAction()
    setTimer(null)
  }

  if (timer?.startedAt) {
    return (
      <div className="flex h-11 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--pink)] px-3 font-mono text-xs text-[var(--paper)] shadow-[4px_4px_0_var(--ink)]">
        <Clock3 aria-hidden="true" className="size-4" />
        <span className="font-bold tabular-nums">{elapsed}</span>
        <span className="hidden max-w-[10rem] truncate sm:inline">{timer.project?.name ?? 'Projet'}</span>
        <button aria-label="Arrêter le chrono" onClick={onStop} className="ml-1">
          <Square className="size-3.5" />
        </button>
        <button aria-label="Annuler le chrono sans enregistrer" onClick={onDiscard}>
          <X className="size-3.5" />
        </button>
      </div>
    )
  }

  if (starting) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Projet du chrono"
          value={projectId}
          onChange={(event) => setProjectId(event.target.value)}
          className="h-11 border-2 border-[var(--ink)] bg-[var(--paper)] px-2 font-mono text-xs"
        >
          <option value="">Choisir un projet</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name} · {project.client.name}
            </option>
          ))}
        </select>
        <input
          aria-label="Description du chrono"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Description (optionnel)"
          className="h-11 w-32 border-2 border-[var(--ink)] bg-[var(--paper)] px-2 font-mono text-xs"
        />
        <button
          disabled={!projectId}
          onClick={onStart}
          className="flex h-11 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--blue)] px-3 font-anton text-sm uppercase text-[var(--paper)] shadow-[4px_4px_0_var(--ink)] disabled:opacity-40"
        >
          Démarrer
        </button>
        <button aria-label="Annuler" onClick={() => setStarting(false)}>
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setStarting(true)}
      className="flex h-11 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--paper)] px-3 font-anton text-sm uppercase shadow-[4px_4px_0_var(--ink)]"
    >
      <Clock3 aria-hidden="true" className="size-4" /> Chrono
    </button>
  )
}
