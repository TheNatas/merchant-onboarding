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

describe('InMemoryMerchantRepository.exists', () => {
  it('ignores case and surrounding whitespace', async () => {
    const repo = new InMemoryMerchantRepository();
    await repo.create(make('Northstar-001'));
    await expect(repo.exists(' northstar-001 ')).resolves.toBe(true);
    await expect(repo.exists('northstar-002')).resolves.toBe(false);
  });
});

describe('InMemoryMerchantRepository.findSimilar', () => {
  const candidate = { companyName: 'Acme Inc', contactEmail: 'hello@acme.example' };

  it('returns nothing when the repository is empty or nothing matches', async () => {
    const repo = new InMemoryMerchantRepository();
    await expect(repo.findSimilar(candidate)).resolves.toEqual([]);
    await repo.create(make('a-1'));
    await expect(repo.findSimilar(candidate)).resolves.toEqual([]);
  });

  it('returns every matching merchant with its reasons', async () => {
    const repo = new InMemoryMerchantRepository();
    const byName = { ...make('a-1'), companyName: 'ACME, Incorporated' };
    const byEmail = { ...make('a-2'), companyName: 'Different', contactEmail: 'HELLO@acme.example' };
    await repo.create(byName);
    await repo.create(byEmail);
    await repo.create(make('a-3'));
    const found = await repo.findSimilar(candidate);
    expect(found).toEqual([
      { merchant: byName, reasons: ['SAME_COMPANY_NAME'] },
      { merchant: byEmail, reasons: ['SAME_CONTACT_EMAIL'] },
    ]);
  });
});
