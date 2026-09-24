import 'server-only'

/**
 * Vérifie qu'une requête vers une route de tâche planifiée vient bien de
 * Vercel Cron : en-tête `Authorization: Bearer $CRON_SECRET` (convention
 * Vercel — ajouté automatiquement à l'appel programmé quand `CRON_SECRET`
 * est déclarée). Rejette tout appel sans ce secret, y compris en local.
 */
export function verifyCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}
