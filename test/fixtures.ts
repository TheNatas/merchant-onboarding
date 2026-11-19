import { Merchant } from '../src/merchants/merchant';

export const validInput = {
  companyName: 'Northstar Ltd',
  contactEmail: 'ops@northstar.example',
  country: 'GB',
  externalMerchantId: 'northstar-001',
};

export const makeMerchant = (overrides: Partial<Merchant> = {}): Merchant => ({
  id: overrides.externalMerchantId ?? 'm-1',
  ...validInput,
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});
