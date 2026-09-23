/**
 * Interface commune de génération de PDF, derrière laquelle toute
 * implémentation (classique aujourd'hui, Factur-X plus tard pour les
 * factures — cf. PROMPT.md) peut être substituée sans toucher au code
 * appelant. `InvoiceExporter` (Phase 6) l'implémentera pour les factures.
 */
export interface DocumentExporter<T> {
  export(data: T): Promise<Buffer>
}
