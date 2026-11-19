import { normalizeCompanyName, normalizeEmail, normalizeExternalId } from '../src/merchants/normalize';

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

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    expect(normalizeEmail(' Ops@Northstar.EXAMPLE ')).toBe('ops@northstar.example');
  });
});

describe('normalizeExternalId', () => {
  it('trims and lowercases', () => {
    expect(normalizeExternalId(' Northstar-001 ')).toBe('northstar-001');
  });
});
