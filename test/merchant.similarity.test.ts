import { normalizeCompanyName, similarityReasons } from '../src/merchants/merchant.similarity';

describe('normalizeCompanyName', () => {
  it.each([
    ['Northstar Ltd', 'northstar'],
    ['  NORTHSTAR, Limited. ', 'northstar'],
    ['Café  Münch GmbH', 'cafe munch'],
    ['Smith & Sons Inc', 'smith and sons'],
    ['Ltd', 'ltd'],
    ['North-Star', 'north star'],
  ])('%p -> %p', (input, expected) => {
    expect(normalizeCompanyName(input)).toBe(expected);
  });
});

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
