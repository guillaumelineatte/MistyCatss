'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, X } from 'lucide-react'

import { SectionLabel } from '@/components/finance-shell'
import { ONBOARDING_STEPS, onboardingCompletion } from '@/lib/onboarding/steps'
import { setOnboardingStepAction } from '@/lib/settings/actions'

export function OnboardingChecklist({ completedSteps }: { completedSteps: string[] }) {
  const [steps, setSteps] = useState(new Set(completedSteps))
  const { done, total } = onboardingCompletion([...steps])

  async function mark(stepId: string, action: 'complete' | 'skip') {
    const key = action === 'complete' ? stepId : `${stepId}:skipped`
    setSteps((prev) => new Set(prev).add(key))
    await setOnboardingStepAction(stepId, action)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[6px_6px_0_var(--ink)]">
        <div className="flex items-center justify-between">
          <SectionLabel tone="blue">Complétude</SectionLabel>
          <span className="font-anton text-3xl">{done} / {total}</span>
        </div>
        <div className="mt-4 h-4 border-2 border-[var(--ink)]">
          <div className="h-full bg-[var(--blue)]" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {ONBOARDING_STEPS.map((step) => {
          const isDone = steps.has(step.id)
          const isSkipped = steps.has(`${step.id}:skipped`)
          const resolved = isDone || isSkipped
          return (
            <div
              key={step.id}
              className="flex flex-col gap-3 border-2 border-[var(--ink)] bg-[var(--paper)] p-5 shadow-[4px_4px_0_var(--ink)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-bold">{step.label}</p>
                <p className="mt-1 font-mono text-xs text-[var(--ink)]/60">{step.description}</p>
              </div>
              <div className="flex items-center gap-2">
                {resolved ? (
                  <span className="flex items-center gap-1 font-mono text-[10px] uppercase text-[var(--ink)]/60">
                    {isDone ? <Check className="size-3" /> : <X className="size-3" />}
                    {isDone ? 'Fait' : 'Ignoré'}
                  </span>
                ) : (
                  <button onClick={() => mark(step.id, 'skip')} className="font-mono text-[10px] uppercase underline">
                    Passer
                  </button>
                )}
                <Link
                  href={step.href}
                  onClick={() => mark(step.id, 'complete')}
                  className="border-2 border-[var(--ink)] bg-[var(--pink)] px-3 py-2 font-anton text-xs uppercase text-[var(--paper)] shadow-[3px_3px_0_var(--ink)]"
                >
                  Configurer
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
