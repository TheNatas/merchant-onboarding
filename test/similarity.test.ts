import { Merchant } from '../src/merchants/merchant';
import { InMemoryMerchantRepository } from '../src/merchants/repository';
import { makeMerchant } from './fixtures';
import { findSimilarMerchants, similarityReasons } from '../src/merchants/similarity';

describe('similarityReasons', () => {
  const base = { companyName: 'Northstar Ltd', contactEmail: 'ops@northstar.example' };

  it('matches the same name regardless of case, punctuation and legal suffix', () => {
    expect(similarityReasons(base, { companyName: 'NORTHSTAR limited', contactEmail: 'x@y.example' })).toEqual([
      'SAME_COMPANY_NAME',
    ]);
  });

  it('matches the same email regardless of case', () => {
    expect(similarityReasons(base, { companyName: 'Other', contactEmail: 'OPS@northstar.example' })).toEqual([
      'SAME_CONTACT_EMAIL',
    ]);
  });

  it('reports both reasons', () => {
    expect(similarityReasons(base, base)).toEqual(['SAME_COMPANY_NAME', 'SAME_CONTACT_EMAIL']);
  });

  it('does not match different merchants', () => {
    expect(similarityReasons(base, { companyName: 'Southstar Ltd', contactEmail: 'a@b.example' })).toEqual([]);
  });
});

describe('findSimilarMerchants', () => {
  const make = (externalMerchantId: string, companyName: string, contactEmail: string): Merchant =>
    makeMerchant({ id: externalMerchantId, externalMerchantId, companyName, contactEmail });
  const candidate = { companyName: 'Acme Inc', contactEmail: 'hello@acme.example' };

  it('returns nothing when the repository is empty or nothing matches', async () => {
    const repo = new InMemoryMerchantRepository();
    await expect(findSimilarMerchants(repo, candidate)).resolves.toEqual([]);
    await repo.create(make('a-1', 'Other', 'other@x.example'));
    await expect(findSimilarMerchants(repo, candidate)).resolves.toEqual([]);
  });

  it('returns each matching merchant once, with all its reasons', async () => {
    const repo = new InMemoryMerchantRepository();
    const byName = make('a-1', 'ACME, Incorporated', 'x@x.example');
    const byEmail = make('a-2', 'Different', 'HELLO@acme.example');
    const both = make('a-3', 'acme', 'hello@acme.example');
    for (const m of [byName, byEmail, both, make('a-4', 'Nope', 'nope@x.example')]) await repo.create(m);
    await expect(findSimilarMerchants(repo, candidate)).resolves.toEqual([
      { merchant: byName, reasons: ['SAME_COMPANY_NAME'] },
      { merchant: both, reasons: ['SAME_COMPANY_NAME', 'SAME_CONTACT_EMAIL'] },
      { merchant: byEmail, reasons: ['SAME_CONTACT_EMAIL'] },
    ]);
  });

  it('never treats names made only of punctuation as similar', async () => {
    const repo = new InMemoryMerchantRepository();
    await repo.create(make('j-1', '!!', 'one@x.example'));
    await expect(findSimilarMerchants(repo, { companyName: '??', contactEmail: 'two@x.example' })).resolves.toEqual([]);
    expect(similarityReasons({ companyName: '!!', contactEmail: 'a@x.example' }, { companyName: '??', contactEmail: 'b@x.example' })).toEqual([]);
  });
});
