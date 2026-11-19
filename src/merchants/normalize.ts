const LEGAL_SUFFIXES = new Set([
  'ltd', 'limited', 'llc', 'inc', 'incorporated', 'corp', 'corporation',
  'plc', 'gmbh', 'ag', 'sa', 'srl', 'bv',
]);

/**
 * Lowercases, removes accents and punctuation, collapses whitespace and drops
 * trailing legal suffixes ("Northstar, Ltd." -> "northstar").
 */
export function normalizeCompanyName(name: string): string {
  const tokens = name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  while (tokens.length > 1 && LEGAL_SUFFIXES.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(' ');
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Key used to compare externalMerchantId values (case-insensitive, trimmed). */
export const normalizeExternalId = (externalMerchantId: string): string =>
  externalMerchantId.trim().toLowerCase();
