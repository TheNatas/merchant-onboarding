import { DuplicateMerchantError } from '../src/errors';
import { InMemoryMerchantRepository } from '../src/merchants/merchant.repository';
import { MerchantService } from '../src/merchants/merchant.service';

const input = {
  companyName: 'Northstar Ltd',
  contactEmail: 'ops@northstar.example',
  country: 'GB',
  externalMerchantId: 'northstar-001',
};

describe('MerchantService', () => {
  const clock = () => new Date('2026-11-19T12:00:00.000Z');

  it('creates a PENDING merchant with id and timestamp', async () => {
    const m = await new MerchantService(new InMemoryMerchantRepository(), clock).register(input);
    expect(m).toEqual({
      ...input,
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      status: 'PENDING',
      createdAt: '2026-11-19T12:00:00.000Z',
    });
  });

  it('propagates duplicates', async () => {
    const service = new MerchantService(new InMemoryMerchantRepository(), clock);
    await service.register(input);
    await expect(service.register({ ...input, externalMerchantId: 'NORTHSTAR-001' })).rejects.toBeInstanceOf(
      DuplicateMerchantError,
    );
  });
});
