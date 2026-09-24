import 'server-only'

/**
 * Validation des fichiers uploadés (justificatifs, logo…) : taille, extension
 * ET signature binaire réelle — le `type` MIME déclaré par le navigateur
 * n'est qu'une indication, jamais une preuve. Aucun SVG (vecteur exécutable
 * côté navigateur) n'est jamais autorisé.
 */

export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024

const SIGNATURES: { mimeType: string; extensions: string[]; matches: (buffer: Buffer) => boolean }[] = [
  { mimeType: 'image/jpeg', extensions: ['.jpg', '.jpeg'], matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mimeType: 'image/png',
    extensions: ['.png'],
    matches: (b) => b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mimeType: 'image/webp',
    extensions: ['.webp'],
    matches: (b) => b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  { mimeType: 'application/pdf', extensions: ['.pdf'], matches: (b) => b.length >= 4 && b.subarray(0, 4).toString('ascii') === '%PDF' },
]

export type UploadValidationResult = { ok: true; mimeType: string } | { ok: false; error: string }

export function validateUpload(originalName: string, sizeBytes: number, buffer: Buffer): UploadValidationResult {
  if (sizeBytes === 0) return { ok: false, error: 'Fichier vide.' }
  if (sizeBytes > MAX_UPLOAD_SIZE_BYTES) return { ok: false, error: 'Fichier trop volumineux (10 Mo maximum).' }

  const ext = originalName.toLowerCase().slice(originalName.lastIndexOf('.'))
  const signature = SIGNATURES.find((s) => s.matches(buffer))
  if (!signature) return { ok: false, error: 'Type de fichier non reconnu (JPEG, PNG, WebP ou PDF uniquement).' }
  if (!signature.extensions.includes(ext)) return { ok: false, error: "L'extension du fichier ne correspond pas à son contenu réel." }

  return { ok: true, mimeType: signature.mimeType }
}
