import { DuplicateMerchantError } from '../errors';

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

export interface MerchantRepository {
  /** Checks uniqueness and inserts atomically. Throws DuplicateMerchantError. */
  create(merchant: Merchant): Promise<Merchant>;
}

export const uniquenessKey = (externalMerchantId: string): string =>
  externalMerchantId.trim().toLowerCase();

export class InMemoryMerchantRepository implements MerchantRepository {
  private readonly merchants = new Map<string, Merchant>();

  async create(merchant: Merchant): Promise<Merchant> {
    const key = uniquenessKey(merchant.externalMerchantId);
    // No await between check and set, so this is atomic within one process.
    if (this.merchants.has(key)) throw new DuplicateMerchantError(merchant.externalMerchantId);
    this.merchants.set(key, merchant);
    return merchant;
  }
}
