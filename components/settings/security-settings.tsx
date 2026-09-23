'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useActionState, useState } from 'react'
import QRCode from 'qrcode'

import { ButtonPrimary, ButtonSecondary, SectionLabel } from '@/components/finance-shell'
import { Field, FormError, inputClassName } from '@/components/form/field'
import { authClient } from '@/lib/auth-client'
import { changePasswordAction, type ActionResult } from '@/lib/auth/actions'
import type { auth } from '@/lib/auth'

type SessionList = Awaited<ReturnType<typeof auth.api.listSessions>>

const initialActionState: ActionResult = {}

export function SecuritySettings({
  userName,
  userEmail,
  twoFactorEnabled,
  currentSessionId,
  initialSessions,
}: {
  userName: string
  userEmail: string
  twoFactorEnabled: boolean
  currentSessionId: string
  initialSessions: SessionList
}) {
  return (
    <div className="flex flex-col gap-8">
      <ProfileSummary userName={userName} userEmail={userEmail} />
      <ChangePasswordCard />
      <TwoFactorCard enabled={twoFactorEnabled} />
      <SessionsCard currentSessionId={currentSessionId} initialSessions={initialSessions} />
      <ChangeEmailCard currentEmail={userEmail} />
      <DataExportCard />
      <DeleteAccountCard userEmail={userEmail} />
    </div>
  )
}

function Card({ title, tone, children }: { title: string; tone?: 'pink' | 'blue'; children: React.ReactNode }) {
  return (
    <div className="border-2 border-[var(--ink)] bg-[var(--paper)] p-6 shadow-[6px_6px_0_var(--ink)]">
      <SectionLabel tone={tone}>{title}</SectionLabel>
      {children}
    </div>
  )
}

function ProfileSummary({ userName, userEmail }: { userName: string; userEmail: string }) {
  return (
    <Card title="Compte">
      <h2 className="mt-4 text-4xl">{userName}</h2>
      <p className="mt-2 font-mono text-sm text-[var(--ink)]/70">{userEmail}</p>
    </Card>
  )
}

function ChangePasswordCard() {
  const [state, action, pending] = useActionState(changePasswordAction, initialActionState)
  return (
    <Card title="Mot de passe" tone="blue">
      <h2 className="mt-4 text-3xl">CHANGER LE MOT DE PASSE</h2>
      <form action={action} className="mt-5 flex flex-col gap-4">
        {state.error && <FormError message={state.error} />}
        {state.success && (
          <p className="font-mono text-xs text-[var(--blue)]">
            Mot de passe mis à jour. Tes autres sessions ont été déconnectées.
          </p>
        )}
        <Field label="Mot de passe actuel" htmlFor="currentPassword">
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            className={inputClassName}
          />
        </Field>
        <Field label="Nouveau mot de passe" htmlFor="newPassword">
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={12}
            required
            className={inputClassName}
          />
        </Field>
        <div>
          <ButtonSecondary>{pending ? 'Mise à jour…' : 'Mettre à jour'}</ButtonSecondary>
        </div>
      </form>
    </Card>
  )
}

function TwoFactorCard({ enabled: initialEnabled }: { enabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [step, setStep] = useState<'idle' | 'password' | 'verify'>('idle')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function startEnable() {
    setError(null)
    setStep('password')
  }

  async function submitPassword() {
    setBusy(true)
    setError(null)
    const { data, error: err } = await authClient.twoFactor.enable({ password })
    setBusy(false)
    if (err || !data || data.method !== 'totp') {
      setError('Mot de passe incorrect.')
      return
    }
    setBackupCodes(data.backupCodes)
    setQrDataUrl(await QRCode.toDataURL(data.totpURI))
    setStep('verify')
  }

  async function submitVerify() {
    setBusy(true)
    setError(null)
    const { error: err } = await authClient.twoFactor.verifyTotp({ code })
    setBusy(false)
    if (err) {
      setError('Code invalide.')
      return
    }
    setEnabled(true)
    setStep('idle')
    setPassword('')
    setCode('')
  }

  async function disable() {
    const confirmPassword = window.prompt('Mot de passe pour désactiver la double authentification :')
    if (!confirmPassword) return
    const { error: err } = await authClient.twoFactor.disable({ password: confirmPassword })
    if (err) {
      setError('Mot de passe incorrect.')
      return
    }
    setEnabled(false)
  }

  return (
    <Card title="Double authentification" tone="pink">
      <h2 className="mt-4 text-3xl">APPLICATION D&apos;AUTHENTIFICATION (TOTP)</h2>
      <p className="mt-3 max-w-xl font-mono text-xs text-[var(--ink)]/70">
        Ajoute un code à 6 chiffres à chaque connexion, généré par une application comme Google Authenticator ou
        Aegis.
      </p>
      {error && <div className="mt-4"><FormError message={error} /></div>}

      {enabled && step === 'idle' && (
        <div className="mt-5 flex items-center gap-3">
          <span className="border-2 border-[var(--ink)] bg-[var(--blue)] px-3 py-2 font-mono text-xs text-[var(--paper)]">
            ACTIVÉE
          </span>
          <ButtonSecondary onClick={disable}>Désactiver</ButtonSecondary>
        </div>
      )}

      {!enabled && step === 'idle' && (
        <div className="mt-5">
          <ButtonSecondary onClick={startEnable}>Activer la double authentification</ButtonSecondary>
        </div>
      )}

      {step === 'password' && (
        <div className="mt-5 flex flex-col gap-4 border-t-2 border-[var(--ink)] pt-5">
          <Field label="Confirme ton mot de passe" htmlFor="2fa-password">
            <input
              id="2fa-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={inputClassName}
            />
          </Field>
          <div className="flex gap-3">
            <ButtonPrimary onClick={submitPassword}>{busy ? 'Vérification…' : 'Continuer'}</ButtonPrimary>
            <ButtonSecondary onClick={() => setStep('idle')}>Annuler</ButtonSecondary>
          </div>
        </div>
      )}

      {step === 'verify' && (
        <div className="mt-5 flex flex-col gap-4 border-t-2 border-[var(--ink)] pt-5">
          {qrDataUrl && (
            <div className="flex flex-col items-start gap-2">
              <p className="font-mono text-xs uppercase">Scanne ce QR code</p>
              <Image src={qrDataUrl} alt="QR code TOTP" width={180} height={180} className="border-2 border-[var(--ink)]" unoptimized />
            </div>
          )}
          {backupCodes && (
            <div>
              <p className="font-mono text-xs uppercase">Codes de récupération (à usage unique)</p>
              <div className="mt-2 grid grid-cols-2 gap-2 border-2 border-[var(--ink)] p-3 font-mono text-xs">
                {backupCodes.map((backupCode) => (
                  <span key={backupCode}>{backupCode}</span>
                ))}
              </div>
              <p className="mt-2 font-mono text-[11px] text-[var(--ink)]/60">
                Note-les précieusement : ils ne seront plus affichés.
              </p>
            </div>
          )}
          <Field label="Code de vérification" htmlFor="2fa-code">
            <input
              id="2fa-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className={inputClassName}
            />
          </Field>
          <div>
            <ButtonPrimary onClick={submitVerify}>{busy ? 'Validation…' : 'Confirmer et activer'}</ButtonPrimary>
          </div>
        </div>
      )}
    </Card>
  )
}

function SessionsCard({
  currentSessionId,
  initialSessions,
}: {
  currentSessionId: string
  initialSessions: SessionList
}) {
  const [sessions, setSessions] = useState(initialSessions)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function refresh() {
    const { data } = await authClient.listSessions()
    if (data) setSessions(data)
  }

  async function revoke(token: string, id: string) {
    setBusyId(id)
    await authClient.revokeSession({ token })
    await refresh()
    setBusyId(null)
  }

  async function revokeOthers() {
    setBusyId('__others__')
    await authClient.revokeOtherSessions()
    await refresh()
    setBusyId(null)
  }

  return (
    <Card title="Sessions">
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-3xl">SESSIONS ACTIVES</h2>
        <ButtonSecondary onClick={revokeOthers}>
          {busyId === '__others__' ? 'Déconnexion…' : 'Déconnecter les autres sessions'}
        </ButtonSecondary>
      </div>
      <div className="mt-5 flex flex-col gap-3 font-mono text-xs">
        {sessions.map((item) => {
          const isCurrent = item.id === currentSessionId
          return (
            <div key={item.id} className="flex items-center justify-between border-b border-[var(--ink)]/30 pb-3">
              <div>
                <p className="font-bold">{item.userAgent ?? 'Appareil inconnu'}</p>
                <p className="text-[var(--ink)]/60">
                  {item.ipAddress ?? 'IP inconnue'} · depuis le{' '}
                  {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                  {isCurrent && ' · session actuelle'}
                </p>
              </div>
              {!isCurrent && (
                <button
                  onClick={() => revoke(item.token, item.id)}
                  disabled={busyId === item.id}
                  className="border-2 border-[var(--ink)] px-3 py-2 uppercase hover:bg-[var(--pink)] hover:text-[var(--paper)]"
                >
                  {busyId === item.id ? '…' : 'Révoquer'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ChangeEmailCard({ currentEmail }: { currentEmail: string }) {
  const [newEmail, setNewEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  async function submit() {
    setStatus('idle')
    const { error } = await authClient.changeEmail({ newEmail, callbackURL: '/settings/security' })
    setStatus(error ? 'error' : 'sent')
  }

  return (
    <Card title="Adresse email" tone="blue">
      <h2 className="mt-4 text-3xl">CHANGER D&apos;EMAIL</h2>
      <p className="mt-2 font-mono text-xs text-[var(--ink)]/60">Actuelle : {currentEmail}</p>
      {status === 'sent' && (
        <p className="mt-4 font-mono text-xs text-[var(--blue)]">
          Emails de confirmation envoyés à l&apos;ancienne et à la nouvelle adresse.
        </p>
      )}
      {status === 'error' && <div className="mt-4"><FormError message="Impossible de traiter cette demande." /></div>}
      <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
        <Field label="Nouvelle adresse email" htmlFor="newEmail" className="flex-1">
          <input
            id="newEmail"
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            className={inputClassName}
          />
        </Field>
        <ButtonSecondary onClick={submit}>Envoyer la confirmation</ButtonSecondary>
      </div>
    </Card>
  )
}

function DataExportCard() {
  return (
    <Card title="Données">
      <h2 className="mt-4 text-3xl">EXPORTER MES DONNÉES</h2>
      <p className="mt-2 max-w-xl font-mono text-xs text-[var(--ink)]/70">
        Télécharge une copie de tes données de compte au format JSON (RGPD).
      </p>
      <div className="mt-5">
        {/* Téléchargement de fichier, pas une navigation de page : <a> natif volontaire. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/account/export">
          <ButtonSecondary>Télécharger l&apos;export</ButtonSecondary>
        </a>
      </div>
    </Card>
  )
}

function DeleteAccountCard({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const canConfirm = confirmText === userEmail

  async function submit() {
    setStatus('idle')
    const { error } = await authClient.deleteUser({ callbackURL: '/login?deleted=1' })
    setStatus(error ? 'error' : 'sent')
    if (!error) router.refresh()
  }

  return (
    <div className="border-[3px] border-[var(--ink)] bg-[var(--pink)] p-6 shadow-[8px_8px_0_var(--ink)]">
      <h2 className="text-4xl text-[var(--paper)]">SUPPRIMER LE COMPTE</h2>
      <p className="mt-4 max-w-2xl font-mono text-sm text-[var(--paper)]">
        Action irréversible. Un email de confirmation te sera envoyé — le compte n&apos;est supprimé qu&apos;après
        avoir cliqué sur le lien qu&apos;il contient. Pense à exporter tes données avant de continuer.
      </p>
      {status === 'sent' && (
        <p className="mt-4 font-mono text-xs text-[var(--paper)]">
          Email de confirmation envoyé à {userEmail}.
        </p>
      )}
      {status === 'error' && <div className="mt-4"><FormError message="Une erreur est survenue." /></div>}
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <Field label={`Tape ton email (${userEmail}) pour confirmer`} htmlFor="confirmEmail">
          <input
            id="confirmEmail"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            className={inputClassName}
          />
        </Field>
        <button
          onClick={submit}
          disabled={!canConfirm}
          className="flex h-11 items-center gap-2 border-2 border-[var(--ink)] bg-[var(--ink)] px-4 font-anton text-sm uppercase text-[var(--paper)] shadow-[4px_4px_0_var(--paper)] disabled:opacity-40"
        >
          Supprimer définitivement
        </button>
      </div>
    </div>
  )
}
