import { DuplicateMerchantError } from '../src/merchants/errors';
import { Merchant } from '../src/merchants/merchant';
import { InMemoryMerchantRepository } from '../src/merchants/repository';
import { makeMerchant } from './fixtures';

const make = (externalMerchantId: string): Merchant => makeMerchant({ externalMerchantId, id: externalMerchantId });

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

  it('keeps the original record when a duplicate is rejected', async () => {
    const repo = new InMemoryMerchantRepository();
    const original = make('a-1');
    await repo.create(original);
    await expect(repo.create({ ...make('A-1'), companyName: 'Impostor Inc' })).rejects.toBeInstanceOf(DuplicateMerchantError);
    await expect(repo.findByNormalizedCompanyName('northstar')).resolves.toEqual([original]);
    await expect(repo.findByNormalizedCompanyName('impostor')).resolves.toEqual([]);
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

describe('InMemoryMerchantRepository lookups', () => {
  it('finds by normalized company name', async () => {
    const repo = new InMemoryMerchantRepository();
    const acme = { ...make('a-1'), companyName: 'ACME, Incorporated' };
    await repo.create(acme);
    await repo.create({ ...make('a-2'), companyName: 'Other' });
    await expect(repo.findByNormalizedCompanyName('acme')).resolves.toEqual([acme]);
    await expect(repo.findByNormalizedCompanyName('missing')).resolves.toEqual([]);
  });

  it('finds by normalized contact email', async () => {
    const repo = new InMemoryMerchantRepository();
    const m = { ...make('a-1'), contactEmail: 'HELLO@acme.example' };
    await repo.create(m);
    await expect(repo.findByContactEmail('hello@acme.example')).resolves.toEqual([m]);
    await expect(repo.findByContactEmail('nobody@acme.example')).resolves.toEqual([]);
  });
});
