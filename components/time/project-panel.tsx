'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { ButtonPrimary, ButtonSecondary, SectionLabel } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import type { clients as clientsTable, projects as projectsTable } from '@/db/schema'
import { formatEuros } from '@/lib/money'
import { archiveProjectAction, createProjectAction, unarchiveProjectAction, type ActionResult } from '@/lib/time/actions'

type Client = typeof clientsTable.$inferSelect
type Project = typeof projectsTable.$inferSelect & { client: Client }

const initialState: ActionResult = {}

export function ProjectPanel({ projects, clients }: { projects: Project[]; clients: Client[] }) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(createProjectAction, initialState)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (state.success) {
      router.refresh()
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ferme le formulaire après confirmation serveur, pas un état dérivable au rendu
      setCreating(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  async function onToggleArchive(project: Project) {
    if (project.active) await archiveProjectAction(project.id)
    else await unarchiveProjectAction(project.id)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SectionLabel>Projets</SectionLabel>
          <h2 className="text-3xl">PROJETS</h2>
        </div>
        <ButtonPrimary onClick={() => setCreating((v) => !v)}>{creating ? 'Annuler' : 'Ajouter un projet'}</ButtonPrimary>
      </div>

      {creating && (
        <form action={formAction} className="flex flex-wrap items-end gap-3 border-2 border-[var(--ink)] p-4">
          {state.error && <FormError message={state.error} />}
          <Field label="Nom du projet" htmlFor="name">
            <input id="name" name="name" required className={inputClassName} />
          </Field>
          <Field label="Client" htmlFor="clientId">
            <select id="clientId" name="clientId" required defaultValue="" className={inputClassName}>
              <option value="" disabled>
                Choisir un client
              </option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="TJM cible — €" htmlFor="targetDailyRate">
            <input id="targetDailyRate" name="targetDailyRate" type="number" step="0.01" className={inputClassName} />
          </Field>
          <ButtonPrimary>{pending ? 'Création…' : 'Créer'}</ButtonPrimary>
        </form>
      )}

      {projects.length === 0 ? (
        <p className="font-mono text-xs text-[var(--ink)]/60">Aucun projet.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="flex items-center justify-between border-2 border-[var(--ink)] p-4 font-mono text-xs">
              <div>
                <p className="font-bold">{project.name}</p>
                <p className="mt-1 text-[var(--ink)]/60">
                  {project.client.name}
                  {!project.active && ' · Archivé'}
                </p>
                {project.targetDailyRateCents != null && <p className="mt-2">TJM cible {formatEuros(project.targetDailyRateCents)}</p>}
              </div>
              <ButtonSecondary onClick={() => onToggleArchive(project)}>{project.active ? 'Archiver' : 'Réactiver'}</ButtonSecondary>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
