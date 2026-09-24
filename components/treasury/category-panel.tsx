'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

import { ButtonPrimary, ButtonSecondary, SectionLabel } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import { useToast } from '@/components/ui/toast'
import type { categoryRules as categoryRulesTable, transactionCategories as categoriesTable } from '@/db/schema'
import {
  createCategoryAction,
  createCategoryRuleAction,
  deleteCategoryAction,
  deleteCategoryRuleAction,
  restoreCategoryAction,
  restoreCategoryRuleAction,
  type ActionResult,
} from '@/lib/treasury/actions'

type Category = typeof categoriesTable.$inferSelect
type CategoryRule = typeof categoryRulesTable.$inferSelect & { category: Category | null }

const initialState: ActionResult = {}

export function CategoryPanel({ categories, rules }: { categories: Category[]; rules: CategoryRule[] }) {
  const router = useRouter()
  const { showToast } = useToast()
  const [categoryState, categoryFormAction, categoryPending] = useActionState(createCategoryAction, initialState)
  const [ruleState, ruleFormAction, rulePending] = useActionState(createCategoryRuleAction, initialState)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (categoryState.success || ruleState.success) router.refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryState.success, ruleState.success])

  async function onDeleteCategory(category: Category) {
    const orphanedRules = rules.filter((rule) => rule.categoryId === category.id)
    await deleteCategoryAction(category.id)
    router.refresh()
    showToast({
      message: `Catégorie "${category.name}" supprimée.`,
      action: {
        label: 'Annuler',
        onClick: async () => {
          await restoreCategoryAction(category, orphanedRules)
          router.refresh()
        },
      },
    })
  }

  async function onDeleteRule(rule: CategoryRule) {
    await deleteCategoryRuleAction(rule.id)
    router.refresh()
    showToast({
      message: `Règle "${rule.matchPattern}" supprimée.`,
      action: {
        label: 'Annuler',
        onClick: async () => {
          await restoreCategoryRuleAction(rule)
          router.refresh()
        },
      },
    })
  }

  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SectionLabel tone="blue">Catégorisation</SectionLabel>
          <h2 className="text-3xl">CATÉGORIES & RÈGLES</h2>
        </div>
        <ButtonSecondary onClick={() => setOpen((v) => !v)}>{open ? 'Fermer' : 'Gérer'}</ButtonSecondary>
      </div>

      {open && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs uppercase text-[var(--ink)]/60">Catégories</p>
            <form action={categoryFormAction} className="flex flex-col gap-3">
              {categoryState.error && <FormError message={categoryState.error} />}
              <div className="grid grid-cols-2 gap-3">
                <input name="name" placeholder="Nom" required className={inputClassName} />
                <select name="kind" defaultValue="expense" className={inputClassName}>
                  <option value="income">Entrée</option>
                  <option value="expense">Sortie</option>
                </select>
              </div>
              <ButtonPrimary>{categoryPending ? 'Création…' : 'Ajouter'}</ButtonPrimary>
            </form>
            <div className="flex flex-col gap-2 font-mono text-xs">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between border-b border-[var(--ink)]/30 pb-2">
                  <span>{category.name} <span className="text-[var(--ink)]/50">· {category.kind === 'income' ? 'entrée' : 'sortie'}</span></span>
                  <button aria-label={`Supprimer ${category.name}`} onClick={() => onDeleteCategory(category)}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-[var(--ink)]/60">Aucune catégorie.</p>}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <p className="font-mono text-xs uppercase text-[var(--ink)]/60">Règles d&apos;auto-catégorisation</p>
            <form action={ruleFormAction} className="flex flex-col gap-3">
              {ruleState.error && <FormError message={ruleState.error} />}
              <Field label="Motif contenu dans le libellé" htmlFor="matchPattern">
                <input id="matchPattern" name="matchPattern" placeholder="ex : URSSAF" required className={inputClassName} />
              </Field>
              <select name="categoryId" required className={inputClassName} defaultValue="">
                <option value="" disabled>
                  Catégorie appliquée
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <ButtonPrimary>{rulePending ? 'Création…' : 'Ajouter la règle'}</ButtonPrimary>
            </form>
            <div className="flex flex-col gap-2 font-mono text-xs">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between border-b border-[var(--ink)]/30 pb-2">
                  <span>&quot;{rule.matchPattern}&quot; → {rule.category?.name ?? '—'}</span>
                  <button aria-label="Supprimer la règle" onClick={() => onDeleteRule(rule)}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
              {rules.length === 0 && <p className="text-[var(--ink)]/60">Aucune règle.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
