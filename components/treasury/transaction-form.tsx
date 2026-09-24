'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { ButtonPrimary, ButtonSecondary } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import type { bankAccounts as bankAccountsTable, transactionCategories as categoriesTable, transactions as transactionsTable } from '@/db/schema'
import { createTransactionAction, updateTransactionAction, type ActionResult } from '@/lib/treasury/actions'

type BankAccount = typeof bankAccountsTable.$inferSelect
type Category = typeof categoriesTable.$inferSelect
type Transaction = typeof transactionsTable.$inferSelect

const initialState: ActionResult = {}
const today = () => new Date().toISOString().slice(0, 10)

export function TransactionForm({
  mode,
  bankAccounts,
  categories,
  transaction,
  onDone,
}: {
  mode: 'create' | 'edit'
  bankAccounts: BankAccount[]
  categories: Category[]
  transaction?: Transaction
  onDone?: () => void
}) {
  const action = mode === 'create' ? createTransactionAction : updateTransactionAction
  const [state, formAction, pending] = useActionState(action, initialState)
  const router = useRouter()

  useEffect(() => {
    if (state.success) {
      router.refresh()
      onDone?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {mode === 'edit' && transaction && <input type="hidden" name="id" value={transaction.id} />}
      {state.error && <FormError message={state.error} />}
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Compte" htmlFor="bankAccountId">
          <select id="bankAccountId" name="bankAccountId" defaultValue={transaction?.bankAccountId ?? bankAccounts[0]?.id ?? ''} required className={inputClassName}>
            {bankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date" htmlFor="date">
          <input id="date" name="date" type="date" defaultValue={transaction?.date ?? today()} required className={inputClassName} />
        </Field>
        <Field label="Sens" htmlFor="direction">
          <select id="direction" name="direction" defaultValue={transaction ? (transaction.amountCents < 0 ? 'expense' : 'income') : 'income'} className={inputClassName}>
            <option value="income">Entrée</option>
            <option value="expense">Sortie</option>
          </select>
        </Field>
      </div>
      <Field label="Libellé" htmlFor="label">
        <input id="label" name="label" defaultValue={transaction?.label ?? ''} required className={inputClassName} />
      </Field>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Montant — €" htmlFor="amount">
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0.01"
            defaultValue={transaction ? Math.abs(transaction.amountCents) / 100 : ''}
            required
            className={inputClassName}
          />
        </Field>
        <Field label="Catégorie" htmlFor="categoryId">
          <select id="categoryId" name="categoryId" defaultValue={transaction?.categoryId ?? ''} className={inputClassName}>
            <option value="">Auto (règles) / aucune</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Justificatif" htmlFor="receipt">
          <input id="receipt" name="receipt" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" className={inputClassName} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes">
        <textarea id="notes" name="notes" defaultValue={transaction?.notes ?? ''} rows={2} className={inputClassName} />
      </Field>
      <div className="flex gap-3">
        <ButtonPrimary>{pending ? 'Enregistrement…' : mode === 'create' ? 'Ajouter la transaction' : 'Enregistrer'}</ButtonPrimary>
        {onDone && <ButtonSecondary onClick={onDone}>Annuler</ButtonSecondary>}
      </div>
    </form>
  )
}
