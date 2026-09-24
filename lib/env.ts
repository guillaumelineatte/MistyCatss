/**
 * URL publique de l'app, pour construire des liens absolus (emails,
 * consultation publique de devis/factures). `NEXT_PUBLIC_APP_URL` explicite
 * si définie (toujours le cas en Production — domaine stable) ; sinon
 * déduite du déploiement Vercel courant (`VERCEL_URL`, previews) pour que
 * chaque preview envoie des liens qui pointent vers elle-même, jamais une
 * URL de prod figée qui ne correspondrait à aucun déploiement réel.
 * Usage serveur uniquement (`VERCEL_URL` n'est pas exposée au client) — côté
 * client, `lib/auth-client.ts` fait le même repli avec l'équivalent
 * `NEXT_PUBLIC_VERCEL_URL`.
 */
export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
