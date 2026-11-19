import { DuplicateMerchantError } from '../errors';
import { normalizeCompanyName, normalizeEmail, normalizeExternalId } from './normalize';

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
  exists(externalMerchantId: string): Promise<boolean>;
  /** Plain lookups used by the similarity policy. Arguments are already normalized. */
  findByNormalizedCompanyName(normalizedName: string): Promise<Merchant[]>;
  findByContactEmail(normalizedEmail: string): Promise<Merchant[]>;
  /** Checks uniqueness and inserts atomically. Throws DuplicateMerchantError. */
  create(merchant: Merchant): Promise<Merchant>;
}

export class InMemoryMerchantRepository implements MerchantRepository {
  private readonly merchants = new Map<string, Merchant>();

  async exists(externalMerchantId: string): Promise<boolean> {
    return this.merchants.has(normalizeExternalId(externalMerchantId));
  }

  async findByNormalizedCompanyName(normalizedName: string): Promise<Merchant[]> {
    return [...this.merchants.values()].filter((m) => normalizeCompanyName(m.companyName) === normalizedName);
  }

  async findByContactEmail(email: string): Promise<Merchant[]> {
    return [...this.merchants.values()].filter((m) => normalizeEmail(m.contactEmail) === email);
  }

  async create(merchant: Merchant): Promise<Merchant> {
    const key = normalizeExternalId(merchant.externalMerchantId);
    // No await between check and set, so this is atomic within one process.
    if (this.merchants.has(key)) throw new DuplicateMerchantError(merchant.externalMerchantId);
    this.merchants.set(key, merchant);
    return merchant;
  }
}
