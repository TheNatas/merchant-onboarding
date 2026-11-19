import { parseRegisterMerchant } from '../src/merchants/merchant.schema';

const valid = {
  companyName: 'Northstar Ltd',
  contactEmail: 'ops@northstar.example',
  country: 'GB',
  externalMerchantId: 'northstar-001',
};

const fieldsOf = (body: unknown) => {
  const r = parseRegisterMerchant(body);
  return r.success ? [] : r.errors.map((e) => e.field);
};

describe('parseRegisterMerchant', () => {
  it('accepts valid input', () => {
    expect(parseRegisterMerchant(valid)).toEqual({ success: true, data: valid });
  });

  it('trims strings and uppercases the country', () => {
    const r = parseRegisterMerchant({
      companyName: '  Northstar Ltd ',
      contactEmail: ' ops@northstar.example ',
      country: ' gb ',
      externalMerchantId: ' northstar-001 ',
    });
    expect(r).toEqual({ success: true, data: valid });
  });

  it('strips unknown fields', () => {
    const r = parseRegisterMerchant({ ...valid, status: 'APPROVED' });
    expect(r.success && 'status' in r.data).toBe(false);
  });

  it.each(Object.keys(valid))('reports %s when missing', (field) => {
    const { [field as keyof typeof valid]: _omit, ...rest } = valid;
    expect(fieldsOf(rest)).toEqual([field]);
  });

  it.each([
    ['companyName', 'A'],
    ['companyName', '   '],
    ['contactEmail', 'not-an-email'],
    ['contactEmail', 'a@b'],
    ['country', 'GBR'],
    ['country', 'G1'],
    ['country', ''],
    ['externalMerchantId', '   '],
    ['externalMerchantId', 42],
  ])('rejects %s = %p', (field, value) => {
    expect(fieldsOf({ ...valid, [field]: value })).toEqual([field]);
  });

  it('rejects a non-object body', () => {
    expect(fieldsOf(undefined)).toEqual(['(body)']);
    expect(fieldsOf('x')).toEqual(['(body)']);
  });

  it('reports all invalid fields at once', () => {
    expect(fieldsOf({})).toHaveLength(4);
  });

  it('accepts an optional boolean confirmSimilar and rejects other types', () => {
    expect(parseRegisterMerchant({ ...valid, confirmSimilar: true })).toEqual({
      success: true,
      data: { ...valid, confirmSimilar: true },
    });
    expect(fieldsOf({ ...valid, confirmSimilar: 'true' })).toEqual(['confirmSimilar']);
    expect(fieldsOf({ ...valid, confirmSimilar: null })).toEqual(['confirmSimilar']);
  });

  it('rejects an array body', () => {
    expect(fieldsOf([valid])).toEqual(['(body)']);
  });
});
