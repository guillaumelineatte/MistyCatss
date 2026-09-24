'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { ButtonPrimary, ButtonSecondary, SectionLabel } from '@/components/finance-shell'
import type { clients as clientsTable, recurringInvoiceTemplateLines as templateLinesTable, recurringInvoiceTemplates as templatesTable } from '@/db/schema'
import { deleteRecurringTemplateAction, getTemplateForEditAction, toggleRecurringTemplateActiveAction } from '@/lib/recurring/actions'
import { RecurringTemplateForm } from './recurring-template-form'

type Client = typeof clientsTable.$inferSelect
type Template = typeof templatesTable.$inferSelect & { client: Client }

const periodicityLabels: Record<string, string> = { monthly: 'Mensuelle', quarterly: 'Trimestrielle', yearly: 'Annuelle' }

export function RecurringTemplatesScreen({ templates, clients }: { templates: Template[]; clients: Client[] }) {
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function onToggle(template: Template) {
    await toggleRecurringTemplateActiveAction(template.id, !template.active)
    router.refresh()
  }

  async function onDelete(id: string) {
    if (!confirm('Supprimer ce modèle récurrent ? Les factures déjà générées restent inchangées.')) return
    await deleteRecurringTemplateAction(id)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SectionLabel tone="pink">Récurrence</SectionLabel>
          <h2 className="text-3xl">MODÈLES</h2>
        </div>
        <ButtonPrimary onClick={() => setCreating((v) => !v)}>{creating ? 'Annuler' : 'Ajouter un modèle'}</ButtonPrimary>
      </div>

      <p className="max-w-2xl font-mono text-xs text-[var(--ink)]/60">
        Chaque modèle génère une facture BROUILLON à sa date planifiée — jamais d&apos;émission automatique. À toi de la relire et de
        l&apos;émettre depuis <code>/invoices</code>.
      </p>

      {creating && (
        <div className="border-[3px] border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[8px_8px_0_var(--ink)]">
          <RecurringTemplateForm mode="create" clients={clients} onDone={() => setCreating(false)} />
        </div>
      )}

      {templates.length === 0 ? (
        <p className="font-mono text-xs text-[var(--ink)]/60">Aucun modèle récurrent.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {templates.map((template) => (
            <div key={template.id} className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
              <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
                <div>
                  <p className="font-bold">{template.label}</p>
                  <p className="mt-1 text-[var(--ink)]/60">
                    {template.client.name} · {periodicityLabels[template.periodicity]} · prochaine le{' '}
                    {template.nextRunDate.split('-').reverse().join('/')}
                    {!template.active && ' · Inactif'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <ButtonSecondary onClick={() => setEditingId(editingId === template.id ? null : template.id)}>
                    {editingId === template.id ? 'Fermer' : 'Modifier'}
                  </ButtonSecondary>
                  <ButtonSecondary onClick={() => onToggle(template)}>{template.active ? 'Désactiver' : 'Activer'}</ButtonSecondary>
                  <ButtonSecondary onClick={() => onDelete(template.id)}>Supprimer</ButtonSecondary>
                </div>
              </div>

              {editingId === template.id && (
                <EditTemplate templateId={template.id} clients={clients} onDone={() => setEditingId(null)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type TemplateWithLines = Template & { lines: (typeof templateLinesTable.$inferSelect)[] }

function EditTemplate({ templateId, clients, onDone }: { templateId: string; clients: Client[]; onDone: () => void }) {
  const [data, setData] = useState<TemplateWithLines | null>(null)

  useEffect(() => {
    getTemplateForEditAction(templateId).then((result) => setData(result as TemplateWithLines | null))
  }, [templateId])

  if (!data) return <p className="mt-4 font-mono text-xs text-[var(--ink)]/60">Chargement…</p>

  return (
    <div className="mt-5 border-t-2 border-[var(--ink)] pt-5">
      <RecurringTemplateForm mode="edit" clients={clients} template={data} lines={data.lines} onDone={onDone} />
    </div>
  )
}
