'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useState } from 'react'
import { Download, Send } from 'lucide-react'

import { ButtonPrimary, ButtonSecondary, SectionLabel } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import { StrongConfirm } from '@/components/ui/strong-confirm'
import type {
  clients as clientsTable,
  invoiceAuditLog as invoiceAuditLogTable,
  invoiceLines as invoiceLinesTable,
  invoicePayments as invoicePaymentsTable,
  invoiceReminders as invoiceRemindersTable,
  invoices as invoicesTable,
} from '@/db/schema'
import {
  cancelInvoiceAction,
  issueInvoiceAction,
  recordPaymentAction,
  sendInvoiceAction,
  sendReminderAction,
  type ActionResult,
} from '@/lib/invoicing/actions'
import { formatEuros } from '@/lib/money'
import { InvoiceForm } from './invoice-form'

type Client = typeof clientsTable.$inferSelect
type Invoice = typeof invoicesTable.$inferSelect & { client: Client | null }
type InvoiceLine = typeof invoiceLinesTable.$inferSelect
type Payment = typeof invoicePaymentsTable.$inferSelect
type Reminder = typeof invoiceRemindersTable.$inferSelect
type AuditEvent = typeof invoiceAuditLogTable.$inferSelect

const statusLabels: Record<string, { label: string; tone: 'ink' | 'blue' | 'pink' }> = {
  draft: { label: 'Brouillon', tone: 'ink' },
  issued: { label: 'Émise', tone: 'blue' },
  sent: { label: 'Envoyée', tone: 'blue' },
  partially_paid: { label: 'Partiellement payée', tone: 'blue' },
  paid: { label: 'Payée', tone: 'blue' },
  overdue: { label: 'En retard', tone: 'pink' },
  cancelled: { label: 'Annulée', tone: 'pink' },
}

const eventLabels: Record<string, string> = {
  created: 'Créée',
  issued: 'Émise',
  sent: 'Envoyée',
  viewed: 'Consultée par le client',
  payment_recorded: 'Paiement enregistré',
  paid: 'Soldée',
  credit_note_issued: 'Avoir émis',
  cancelled: 'Annulée',
  reminder_sent: 'Relance envoyée',
}

const paymentInitial: ActionResult = {}

export function InvoiceDetailScreen({
  invoice,
  lines,
  clients,
  payments,
  reminders,
  auditLog,
}: {
  invoice: Invoice
  lines: InvoiceLine[]
  clients: Client[]
  payments: Payment[]
  reminders: Reminder[]
  auditLog: AuditEvent[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const [paymentState, paymentAction, paymentPending] = useActionState(recordPaymentAction, paymentInitial)

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/public/invoices/${invoice.publicToken}` : ''
  const isCredit = invoice.type === 'credit_note'
  const dueCents = invoice.totalTtcCents - invoice.paidAmountCents

  const issuedEvent = auditLog.find((e) => e.event === 'issued')
  const missingMentions = (issuedEvent?.metadata as { missingMentions?: string[] } | null)?.missingMentions

  async function handleIssue() {
    setBusy(true)
    setError(null)
    const result = await issueInvoiceAction(invoice.id)
    setBusy(false)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  async function handleSend() {
    setBusy(true)
    setError(null)
    const result = await sendInvoiceAction(invoice.id)
    setBusy(false)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  async function handleRemind() {
    setBusy(true)
    setError(null)
    const result = await sendReminderAction(invoice.id)
    setBusy(false)
    if (result.error) setError(result.error)
    else router.refresh()
  }

  async function handleCancel() {
    setBusy(true)
    setError(null)
    const result = await cancelInvoiceAction(invoice.id)
    setBusy(false)
    setConfirmingCancel(false)
    if (result.creditNoteId) router.push(`/invoices/${result.creditNoteId}`)
    else if (result.error) setError(result.error)
  }

  if (editing) {
    return (
      <div className="flex flex-col gap-6">
        <button onClick={() => setEditing(false)} className="self-start font-mono text-xs underline">
          ← Annuler l&apos;édition
        </button>
        <InvoiceForm mode="edit" clients={clients} invoice={invoice} lines={lines} />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-end">
        <Link href="/invoices" className="font-mono text-xs underline underline-offset-4">
          ← Retour aux devis & factures
        </Link>
      </div>

      <div className="border-[3px] border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[8px_8px_0_var(--ink)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-[var(--ink)] pb-5">
          <SectionLabel tone={statusLabels[invoice.status].tone === 'ink' ? undefined : statusLabels[invoice.status].tone}>
            {isCredit ? 'Avoir' : statusLabels[invoice.status].label}
          </SectionLabel>
          <div className="flex flex-wrap gap-2">
            {invoice.status === 'draft' && (
              <>
                <ButtonSecondary onClick={() => setEditing(true)}>Modifier</ButtonSecondary>
                <ButtonPrimary onClick={handleIssue}>{busy ? '…' : 'Émettre'}</ButtonPrimary>
              </>
            )}
            {!isCredit && ['issued', 'sent', 'partially_paid', 'overdue'].includes(invoice.status) && (
              <ButtonSecondary onClick={handleSend}>
                <Send className="size-4" /> {busy ? '…' : 'Envoyer'}
              </ButtonSecondary>
            )}
            {!isCredit && invoice.status === 'overdue' && (
              <ButtonSecondary onClick={handleRemind}>{busy ? '…' : 'Relancer'}</ButtonSecondary>
            )}
            {!isCredit && ['issued', 'sent', 'partially_paid', 'overdue'].includes(invoice.status) && (
              <ButtonSecondary onClick={() => setConfirmingCancel((v) => !v)}>
                {confirmingCancel ? 'Fermer' : 'Annuler (avoir total)'}
              </ButtonSecondary>
            )}
            {invoice.status !== 'draft' && (
              <a href={`/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer">
                <ButtonSecondary>
                  <Download className="size-4" /> PDF
                </ButtonSecondary>
              </a>
            )}
          </div>
        </div>

        {error && <p className="mt-4 font-mono text-xs text-[var(--pink)]">{error}</p>}
        {confirmingCancel && (
          <div className="mt-4">
            <StrongConfirm
              title="ANNULER CETTE FACTURE"
              warning="Génère un avoir total et marque la facture annulée — cette action est irréversible, elle ne peut pas être défaite."
              promptLabel={`Tape ${invoice.fullNumber ?? "le numéro de la facture"} pour confirmer`}
              matchValue={invoice.fullNumber ?? ''}
              confirmLabel={busy ? '…' : "Confirmer l'annulation"}
              onConfirm={handleCancel}
            />
          </div>
        )}
        {missingMentions && missingMentions.length > 0 && (
          <div className="mt-4 border-2 border-dashed border-[var(--ink)] p-3 font-mono text-xs">
            Mentions manquantes à l&apos;émission (facture émise quand même) : {missingMentions.join(', ')}.{' '}
            <Link href="/settings" className="underline">
              Compléter
            </Link>
          </div>
        )}

        {invoice.status !== 'draft' && (
          <div className="mt-4 flex items-center gap-2 font-mono text-xs">
            <span className="text-[var(--ink)]/60">Lien public :</span>
            <button type="button" onClick={() => navigator.clipboard.writeText(publicUrl)} className="underline">
              Copier le lien
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="font-mono text-[10px] uppercase text-[var(--ink)]/60">Client</p>
            <p className="mt-1 font-bold">{invoice.client?.name ?? '—'}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase text-[var(--ink)]/60">Émise le</p>
            <p className="mt-1 font-mono text-sm">{invoice.issueDate ? invoice.issueDate.split('-').reverse().join('/') : '—'}</p>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase text-[var(--ink)]/60">Échéance</p>
            <p className="mt-1 font-mono text-sm">{invoice.dueDate ? invoice.dueDate.split('-').reverse().join('/') : '—'}</p>
          </div>
        </div>

        <div className="mt-6 border-t-2 border-[var(--ink)] pt-4">
          <table className="w-full font-mono text-xs">
            <thead>
              <tr className="border-b-2 border-[var(--ink)] text-left uppercase">
                <th className="py-2">Description</th>
                <th className="py-2 text-right">Qté</th>
                <th className="py-2 text-right">PU HT</th>
                <th className="py-2 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b border-[var(--ink)]/30">
                  <td className="py-2">{line.description}</td>
                  <td className="py-2 text-right">{line.quantity}</td>
                  <td className="py-2 text-right">{formatEuros(line.unitPriceCents)}</td>
                  <td className="py-2 text-right">{formatEuros(line.lineTotalHtCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 flex flex-col items-end gap-1 font-mono text-sm">
            <span>HT : {formatEuros(invoice.totalHtCents)}</span>
            <span>TVA : {formatEuros(invoice.totalVatCents)}</span>
            <span className="font-anton text-2xl">TTC : {formatEuros(invoice.totalTtcCents)}</span>
            {!isCredit && invoice.paidAmountCents > 0 && <span>Réglé : {formatEuros(invoice.paidAmountCents)}</span>}
            {!isCredit && dueCents > 0 && invoice.status !== 'paid' && invoice.status !== 'draft' && (
              <span className="text-[var(--pink)]">Solde dû : {formatEuros(dueCents)}</span>
            )}
          </div>
        </div>
      </div>

      {!isCredit && ['issued', 'sent', 'partially_paid', 'overdue'].includes(invoice.status) && (
        <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
          <h3 className="text-2xl">ENREGISTRER UN PAIEMENT</h3>
          <form action={paymentAction} className="mt-4 flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={invoice.id} />
            {paymentState.error && <FormError message={paymentState.error} />}
            <Field label="Montant — €" htmlFor="amount">
              <input id="amount" name="amount" type="number" step="0.01" max={dueCents / 100} required className={inputClassName} />
            </Field>
            <Field label="Date" htmlFor="paidAt">
              <input id="paidAt" name="paidAt" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required className={inputClassName} />
            </Field>
            <Field label="Moyen" htmlFor="method">
              <input id="method" name="method" placeholder="Virement" className={inputClassName} />
            </Field>
            <ButtonSecondary>{paymentPending ? '…' : 'Enregistrer'}</ButtonSecondary>
          </form>
          {payments.length > 0 && (
            <div className="mt-4 flex flex-col gap-2 border-t border-[var(--ink)]/30 pt-4 font-mono text-xs">
              {payments.map((payment) => (
                <div key={payment.id} className="flex justify-between">
                  <span>{payment.paidAt.split('-').reverse().join('/')} · {payment.method ?? '—'}</span>
                  <span>{formatEuros(payment.amountCents)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {reminders.length > 0 && (
        <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
          <h3 className="text-2xl">RELANCES</h3>
          <div className="mt-3 flex flex-col gap-2 font-mono text-xs">
            {reminders.map((reminder) => (
              <span key={reminder.id}>{new Date(reminder.sentAt).toLocaleDateString('fr-FR')} · {reminder.channel}</span>
            ))}
          </div>
        </div>
      )}

      <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
        <h3 className="text-2xl">JOURNAL D&apos;AUDIT</h3>
        <div className="mt-3 flex flex-col gap-2 font-mono text-xs">
          {auditLog.map((event) => (
            <div key={event.id} className="flex justify-between border-b border-[var(--ink)]/20 pb-2">
              <span>{eventLabels[event.event] ?? event.event}</span>
              <span className="text-[var(--ink)]/60">{new Date(event.occurredAt).toLocaleString('fr-FR')}</span>
            </div>
          ))}
        </div>
      </div>

      {invoice.status === 'draft' && (
        <p className="font-mono text-[10px] uppercase text-[var(--ink)]/50">
          Un brouillon n&apos;a pas de numéro — attribué uniquement à l&apos;émission.
        </p>
      )}
    </div>
  )
}
