import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'

import { files } from '@/db/schema'
import { withCurrentUserScope } from '@/lib/db/scope'
import { readStoredFile } from '@/lib/storage'

/**
 * Seul point d'accès aux fichiers uploadés (justificatifs…) : jamais d'URL
 * publique. La RLS (scope courant) garantit qu'on ne peut lire que ses
 * propres fichiers — la requête ci-dessous ne peut pas retourner celui d'un
 * autre utilisateur même en devinant un id.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const file = await withCurrentUserScope((tx) => tx.query.files.findFirst({ where: eq(files.id, id) }))
  if (!file) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const buffer = await readStoredFile(file.storedPath)

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': file.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
      'Content-Length': String(file.sizeBytes),
    },
  })
}
