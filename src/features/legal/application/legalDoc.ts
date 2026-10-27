export type LegalDocType = "privacy" | "terms" | "refund" | "imprint";

export const LEGAL_DOC_EVENT = "maparte:legal-doc";

/**
 * Static pages generated at build time by the `legal-pages` Vite plugin.
 * Links point here so the policies have a real, crawlable URL (ad networks
 * require it); the click handler opens the in-app modal instead for users.
 */
export const LEGAL_DOC_PAGES: Record<LegalDocType, string> = {
  privacy: "/privacy",
  terms: "/terms",
  refund: "/refund",
  imprint: "/imprint",
};

export interface LegalDocDetail {
  doc: LegalDocType;
}

/** Open the in-app legal modal for the given document. */
export function openLegalDoc(doc: LegalDocType): void {
  window.dispatchEvent(
    new CustomEvent<LegalDocDetail>(LEGAL_DOC_EVENT, { detail: { doc } }),
  );
}
