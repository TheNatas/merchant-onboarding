import { DuplicateMerchantError } from '../src/errors';
import { InMemoryMerchantRepository, Merchant } from '../src/merchants/merchant.repository';

const make = (externalMerchantId: string): Merchant => ({
  id: externalMerchantId,
  companyName: 'Northstar Ltd',
  contactEmail: 'ops@northstar.example',
  country: 'GB',
  externalMerchantId,
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00.000Z',
});

describe('InMemoryMerchantRepository', () => {
  it('stores a merchant', async () => {
    const m = make('a-1');
    await expect(new InMemoryMerchantRepository().create(m)).resolves.toEqual(m);
  });

  it('rejects an exact duplicate', async () => {
    const repo = new InMemoryMerchantRepository();
    await repo.create(make('a-1'));
    await expect(repo.create(make('a-1'))).rejects.toBeInstanceOf(DuplicateMerchantError);
  });

  it('rejects a duplicate that differs only by case', async () => {
    const repo = new InMemoryMerchantRepository();
    await repo.create(make('Northstar-001'));
    await expect(repo.create(make('northstar-001'))).rejects.toBeInstanceOf(DuplicateMerchantError);
  });

  it('allows different ids', async () => {
    const repo = new InMemoryMerchantRepository();
    await repo.create(make('a-1'));
    await expect(repo.create(make('a-2'))).resolves.toBeDefined();
  });
});
