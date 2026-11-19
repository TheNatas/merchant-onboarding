import { DuplicateMerchantError } from '../errors';
import { SimilarityReason, similarityReasons } from './similarity';

export type MerchantStatus = 'PENDING';

export interface Merchant {
  id: string;
  companyName: string;
  contactEmail: string;
  country: string;
  externalMerchantId: string;
  status: MerchantStatus;
  createdAt: string;
}

export interface SimilarMerchant {
  merchant: Merchant;
  reasons: SimilarityReason[];
}

export interface MerchantRepository {
  exists(externalMerchantId: string): Promise<boolean>;
  /** Advisory lookup of merchants that look like the candidate (not by externalMerchantId). */
  findSimilar(candidate: { companyName: string; contactEmail: string }): Promise<SimilarMerchant[]>;
  /** Checks uniqueness and inserts atomically. Throws DuplicateMerchantError. */
  create(merchant: Merchant): Promise<Merchant>;
}

export const uniquenessKey = (externalMerchantId: string): string =>
  externalMerchantId.trim().toLowerCase();

export class InMemoryMerchantRepository implements MerchantRepository {
  private readonly merchants = new Map<string, Merchant>();

  async exists(externalMerchantId: string): Promise<boolean> {
    return this.merchants.has(uniquenessKey(externalMerchantId));
  }

  async findSimilar(candidate: { companyName: string; contactEmail: string }): Promise<SimilarMerchant[]> {
    const found: SimilarMerchant[] = [];
    for (const merchant of this.merchants.values()) {
      const reasons = similarityReasons(candidate, merchant);
      if (reasons.length > 0) found.push({ merchant, reasons });
    }
    return found;
  }

  async create(merchant: Merchant): Promise<Merchant> {
    const key = uniquenessKey(merchant.externalMerchantId);
    // No await between check and set, so this is atomic within one process.
    if (this.merchants.has(key)) throw new DuplicateMerchantError(merchant.externalMerchantId);
    this.merchants.set(key, merchant);
    return merchant;
  }
}
