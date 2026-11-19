import request from 'supertest';
import { createApp } from '../src/app';
import { InMemoryMerchantRepository } from '../src/merchants/merchant.repository';

const valid = {
  companyName: 'Northstar Ltd',
  contactEmail: 'ops@northstar.example',
  country: 'GB',
  externalMerchantId: 'northstar-001',
};

const newApp = () =>
  createApp({
    repository: new InMemoryMerchantRepository(),
    clock: () => new Date('2026-11-19T12:00:00.000Z'),
  });

describe('POST /merchants', () => {
  it('returns 201 with a normalized PENDING merchant', async () => {
    const res = await request(newApp())
      .post('/merchants')
      .send({ ...valid, companyName: '  Northstar Ltd ', country: 'gb', extra: 'ignored' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      ...valid,
      id: expect.any(String),
      status: 'PENDING',
      createdAt: '2026-11-19T12:00:00.000Z',
    });
  });

  it('returns 400 listing every invalid field', async () => {
    const res = await request(newApp()).post('/merchants').send({ companyName: 'A', country: 'GBR' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
    expect(res.body.details.map((d: { field: string }) => d.field).sort()).toEqual([
      'companyName',
      'contactEmail',
      'country',
      'externalMerchantId',
    ]);
  });

  it('returns 400 when there is no body', async () => {
    const res = await request(newApp()).post('/merchants');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for malformed JSON', async () => {
    const res = await request(newApp())
      .post('/merchants')
      .set('Content-Type', 'application/json')
      .send('{"companyName": ');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_JSON');
  });

  it('returns 409 for a duplicate externalMerchantId', async () => {
    const app = newApp();
    await request(app).post('/merchants').send(valid).expect(201);
    const res = await request(app).post('/merchants').send(valid);
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('DUPLICATE_MERCHANT');
  });

  it('returns 409 for a case-variant or whitespace-padded duplicate', async () => {
    const app = newApp();
    await request(app).post('/merchants').send({ ...valid, externalMerchantId: 'Northstar-001' }).expect(201);
    await request(app).post('/merchants').send({ ...valid, externalMerchantId: ' northstar-001 ' }).expect(409);
  });

  it('does not save invalid requests', async () => {
    const app = newApp();
    await request(app).post('/merchants').send({ ...valid, country: 'XXX' }).expect(400);
    await request(app).post('/merchants').send(valid).expect(201);
  });

  it('lets only one of several concurrent identical requests succeed', async () => {
    const app = newApp();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => request(app).post('/merchants').send(valid)),
    );
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
  });
});
