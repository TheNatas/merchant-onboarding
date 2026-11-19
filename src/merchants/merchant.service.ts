import { randomUUID } from 'node:crypto';
import { Merchant, MerchantRepository } from './merchant.repository';
import { RegisterMerchantInput } from './merchant.schema';

export type Clock = () => Date;

export class MerchantService {
  constructor(
    private readonly repository: MerchantRepository,
    private readonly clock: Clock = () => new Date(),
  ) {}

  register(input: RegisterMerchantInput): Promise<Merchant> {
    return this.repository.create({
      id: randomUUID(),
      ...input,
      status: 'PENDING',
      createdAt: this.clock().toISOString(),
    });
  }
}
