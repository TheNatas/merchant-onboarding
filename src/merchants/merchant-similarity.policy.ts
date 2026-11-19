import { Merchant, MerchantRepository } from './merchant.repository';
import { normalizeCompanyName, normalizeEmail } from './normalize';

/**
 * Business rule: when does a new merchant look like one that is already registered?
 * The rule lives here, not in the repository, so every storage implementation
 * answers the same way. Repositories only provide plain lookups.
 */

export type SimilarityReason = 'SAME_COMPANY_NAME' | 'SAME_CONTACT_EMAIL';

export interface SimilarMerchant {
  merchant: Merchant;
  reasons: SimilarityReason[];
}

interface Comparable {
  companyName: string;
  contactEmail: string;
}

export function similarityReasons(a: Comparable, b: Comparable): SimilarityReason[] {
  const reasons: SimilarityReason[] = [];
  if (normalizeCompanyName(a.companyName) === normalizeCompanyName(b.companyName)) {
    reasons.push('SAME_COMPANY_NAME');
  }
  if (normalizeEmail(a.contactEmail) === normalizeEmail(b.contactEmail)) {
    reasons.push('SAME_CONTACT_EMAIL');
  }
  return reasons;
}

export async function findSimilarMerchants(
  repository: MerchantRepository,
  candidate: Comparable,
): Promise<SimilarMerchant[]> {
  const [byName, byEmail] = await Promise.all([
    repository.findByNormalizedCompanyName(normalizeCompanyName(candidate.companyName)),
    repository.findByContactEmail(normalizeEmail(candidate.contactEmail)),
  ]);
  const unique = new Map<string, Merchant>();
  for (const merchant of [...byName, ...byEmail]) unique.set(merchant.id, merchant);
  return [...unique.values()].map((merchant) => ({
    merchant,
    reasons: similarityReasons(candidate, merchant),
  }));
}
