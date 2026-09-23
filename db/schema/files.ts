import { relations } from 'drizzle-orm'
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

import { user } from './auth'
import { fileKindEnum } from './enums'

// Métadonnées des fichiers stockés via lib/storage.ts (fs local en dev,
// Vercel Blob en prod). `storedPath` est l'identifiant/chemin interne à
// storage.ts, jamais une URL publique construite à la main.
export const files = pgTable('files', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  kind: fileKindEnum('kind').notNull(),
  originalName: text('original_name').notNull(),
  storedPath: text('stored_path').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

export const filesRelations = relations(files, ({ one }) => ({
  user: one(user, { fields: [files.userId], references: [user.id] }),
}))
