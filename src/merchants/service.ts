import { randomUUID } from 'node:crypto';
import { SimilarMerchantError } from '../errors';
import { findSimilarMerchants } from './similarity.policy';
import { Merchant, MerchantRepository } from './repository';
import { RegisterMerchantInput } from './schema';

export type Clock = () => Date;

export class MerchantService {
  constructor(
    private readonly repository: MerchantRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  async register(input: RegisterMerchantInput, options: { confirmSimilar?: boolean } = {}): Promise<Merchant> {
    // An exact (case-insensitive) ID duplicate always wins over the advisory similarity warning.
    // create() below still enforces uniqueness atomically.
    if (!options.confirmSimilar && !(await this.repository.exists(input.externalMerchantId))) {
      const similar = await findSimilarMerchants(this.repository, input);
      if (similar.length > 0) throw new SimilarMerchantError(similar);
    }
    return this.repository.create({
      id: randomUUID(),
      ...input,
      status: 'PENDING',
      createdAt: this.clock().toISOString(),
    });
  }
}
