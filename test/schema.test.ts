import { MAX_LENGTHS, parseRegisterMerchant } from '../src/merchants/schema';
import { validInput } from './fixtures';

const valid = validInput;

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

  it('uses clear messages for missing, wrongly typed and non-object input', () => {
    const messages = (body: unknown) => {
      const r = parseRegisterMerchant(body);
      return r.success ? [] : r.errors.map((e) => `${e.field}: ${e.message}`);
    };
    expect(messages({ ...valid, companyName: undefined })).toEqual(['companyName: is required']);
    expect(messages({ ...valid, companyName: 5 })).toEqual(['companyName: must be a string']);
    expect(messages({ ...valid, confirmSimilar: 'yes' })).toEqual(['confirmSimilar: must be a boolean']);
    expect(messages(null)).toEqual(['(body): must be a JSON object']);
  });

  it.each(Object.entries(MAX_LENGTHS))('accepts %s at its maximum length and rejects one more', (field, max) => {
    const value = field === 'contactEmail' ? `${'a'.repeat(max - 'x@b.example'.length)}x@b.example` : 'a'.repeat(max);
    expect(fieldsOf({ ...valid, [field]: value })).toEqual([]);
    expect(fieldsOf({ ...valid, [field]: `${value}a` })).toEqual([field]);
  });
});
