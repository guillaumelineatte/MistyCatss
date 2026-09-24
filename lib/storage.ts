import 'server-only'

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { del, get, put } from '@vercel/blob'

export type StoredFile = { storedPath: string }

const UPLOADS_DIR = path.join(process.cwd(), '.uploads')

/**
 * Stockage de fichiers derrière une interface unique : filesystem local en
 * développement, Vercel Blob (accès privé) en production — bascule sur la
 * présence de BLOB_READ_WRITE_TOKEN, jamais un chemin public deviné à la
 * main. `storedPath` est un identifiant opaque propre à chaque pilote,
 * jamais une URL construite par l'appelant (voir app/api/files/[id]/route.ts
 * pour la seule façon de lire un fichier, avec vérification de propriété).
 */
const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN)

export async function saveFile(buffer: Buffer, key: string): Promise<StoredFile> {
  if (useBlob) {
    const blob = await put(key, buffer, { access: 'private', addRandomSuffix: false })
    return { storedPath: blob.pathname }
  }

  const filePath = path.join(UPLOADS_DIR, key)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, buffer)
  return { storedPath: key }
}

export async function readStoredFile(storedPath: string): Promise<Buffer> {
  if (useBlob) {
    const result = await get(storedPath, { access: 'private' })
    if (!result?.stream) throw new Error(`Fichier introuvable dans Blob : ${storedPath}`)
    const reader = result.stream.getReader()
    const chunks: Buffer[] = []
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      chunks.push(Buffer.from(chunk.value))
    }
    return Buffer.concat(chunks)
  }
  return readFile(path.join(UPLOADS_DIR, storedPath))
}

export async function deleteStoredFile(storedPath: string): Promise<void> {
  if (useBlob) {
    await del(storedPath)
    return
  }
  await unlink(path.join(UPLOADS_DIR, storedPath)).catch(() => undefined)
}

export function generateStorageKey(userId: string, originalName: string): string {
  const ext = path.extname(originalName).toLowerCase()
  return `${userId}/${randomUUID()}${ext}`
}
