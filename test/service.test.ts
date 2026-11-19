import { DuplicateMerchantError, SimilarMerchantError } from '../src/merchants/errors';
import { InMemoryMerchantRepository } from '../src/merchants/repository';
import { MerchantService } from '../src/merchants/service';
import { validInput } from './fixtures';

const input = validInput;

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

describe('MerchantService similarity', () => {
  const clock = () => new Date('2026-11-19T12:00:00.000Z');
  const similar = { ...input, externalMerchantId: 'northstar-002' };

  it('throws SimilarMerchantError with the matches and saves nothing', async () => {
    const repo = new InMemoryMerchantRepository();
    const service = new MerchantService(repo, clock);
    const first = await service.register(input);
    const error = await service.register(similar).catch((e) => e);
    expect(error).toBeInstanceOf(SimilarMerchantError);
    expect(error.similar).toEqual([{ merchant: first, reasons: ['SAME_COMPANY_NAME', 'SAME_CONTACT_EMAIL'] }]);
    await expect(repo.exists('northstar-002')).resolves.toBe(false);
  });

  it('registers a similar merchant when confirmSimilar is true', async () => {
    const service = new MerchantService(new InMemoryMerchantRepository(), clock);
    await service.register(input);
    await expect(service.register(similar, { confirmSimilar: true })).resolves.toMatchObject(similar);
  });

  it('reports a duplicate ID rather than similarity, with or without confirmSimilar', async () => {
    const service = new MerchantService(new InMemoryMerchantRepository(), clock);
    await service.register(input);
    await expect(service.register(input)).rejects.toBeInstanceOf(DuplicateMerchantError);
    await expect(service.register(input, { confirmSimilar: true })).rejects.toBeInstanceOf(DuplicateMerchantError);
  });
});
