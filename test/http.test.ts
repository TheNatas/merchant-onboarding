import request from 'supertest';
import { createApp } from '../src/app';
import { InMemoryMerchantRepository } from '../src/merchants/repository';
import { validInput } from './fixtures';

const valid = validInput;

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
    expect(res.body.message).toEqual(expect.any(String));
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

  it('leaves the original merchant unchanged after a conflicting duplicate', async () => {
    const app = newApp();
    const original = (await request(app).post('/merchants').send(valid).expect(201)).body;
    await request(app)
      .post('/merchants')
      .send({ companyName: 'Impostor Inc', contactEmail: 'evil@example.com', country: 'US', externalMerchantId: 'NORTHSTAR-001', confirmSimilar: true })
      .expect(409);
    // The ID is still taken, and a similar request still reveals the original, unmodified record.
    const res = await request(app).post('/merchants').send({ ...valid, externalMerchantId: 'northstar-002' }).expect(409);
    expect(res.body.similarMerchants).toEqual([
      {
        id: original.id,
        companyName: original.companyName,
        externalMerchantId: original.externalMerchantId,
        reasons: ['SAME_COMPANY_NAME', 'SAME_CONTACT_EMAIL'],
      },
    ]);
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

describe('POST /merchants similarity warning', () => {
  const other = { ...valid, externalMerchantId: 'northstar-002' };

  it('returns 409 SIMILAR_MERCHANT_FOUND and saves nothing', async () => {
    const app = newApp();
    const first = await request(app).post('/merchants').send(valid).expect(201);
    const res = await request(app).post('/merchants').send({ ...other, companyName: 'NORTHSTAR limited' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('SIMILAR_MERCHANT_FOUND');
    expect(res.body.similarMerchants).toEqual([
      {
        id: first.body.id,
        companyName: 'Northstar Ltd',
        externalMerchantId: 'northstar-001',
        reasons: ['SAME_COMPANY_NAME', 'SAME_CONTACT_EMAIL'],
      },
    ]);
    // nothing was saved, so the same ID is still free
    await request(app).post('/merchants').send({ ...other, confirmSimilar: true }).expect(201);
  });

  it('warns on same contact email alone', async () => {
    const app = newApp();
    await request(app).post('/merchants').send(valid).expect(201);
    const res = await request(app).post('/merchants').send({ ...other, companyName: 'Completely Different' });
    expect(res.status).toBe(409);
    expect(res.body.similarMerchants[0].reasons).toEqual(['SAME_CONTACT_EMAIL']);
  });

  it('creates the merchant when confirmSimilar is true', async () => {
    const app = newApp();
    await request(app).post('/merchants').send(valid).expect(201);
    const res = await request(app).post('/merchants').send({ ...other, confirmSimilar: true });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('confirmSimilar');
  });

  it('a duplicate ID is still 409 DUPLICATE_MERCHANT, even when confirmed', async () => {
    const app = newApp();
    await request(app).post('/merchants').send(valid).expect(201);
    const plain = await request(app).post('/merchants').send(valid);
    expect(plain.body.error).toBe('DUPLICATE_MERCHANT');
    const confirmed = await request(app).post('/merchants').send({ ...valid, confirmSimilar: true });
    expect(confirmed.status).toBe(409);
    expect(confirmed.body.error).toBe('DUPLICATE_MERCHANT');
  });

  it('returns 400 when confirmSimilar is not a boolean', async () => {
    const res = await request(newApp()).post('/merchants').send({ ...valid, confirmSimilar: 'yes' });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([{ field: 'confirmSimilar', message: 'must be a boolean' }]);
  });
});

describe('POST /merchants robustness', () => {
  it('returns 400 for a non-JSON content type', async () => {
    const res = await request(newApp()).post('/merchants').set('Content-Type', 'text/plain').send('hello');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('VALIDATION_ERROR');
  });

  it('returns 500 without leaking internals when the repository fails', async () => {
    const failing = new InMemoryMerchantRepository();
    failing.exists = async () => {
      throw new Error('database password is hunter2');
    };
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const res = await request(createApp({ repository: failing })).post('/merchants').send(valid);
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'INTERNAL_ERROR', message: 'Unexpected error' });
  });

  it('does not report merchants that only share part of a name as similar', async () => {
    const app = newApp();
    await request(app).post('/merchants').send(valid).expect(201);
    await request(app)
      .post('/merchants')
      .send({ ...valid, companyName: 'Northstar Logistics', contactEmail: 'a@b.example', externalMerchantId: 'x-1' })
      .expect(201);
  });
});

describe('error responses', () => {
  const expectEnvelope = (body: Record<string, unknown>, code: string) => {
    expect(body.error).toBe(code);
    expect(body.message).toEqual(expect.any(String));
  };

  it('returns 413 for a body over the size limit', async () => {
    const res = await request(newApp())
      .post('/merchants')
      .send({ ...valid, companyName: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
    expectEnvelope(res.body, 'PAYLOAD_TOO_LARGE');
  });

  it('returns 400 for an overlong field that fits in the body', async () => {
    const res = await request(newApp())
      .post('/merchants')
      .send({ ...valid, companyName: 'x'.repeat(201) });
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([{ field: 'companyName', message: 'must be at most 200 characters' }]);
  });

  it('passes through other client errors from the body parser as 4xx', async () => {
    const res = await request(newApp())
      .post('/merchants')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'x-bogus')
      .send('{}');
    expect(res.status).toBe(415);
    expectEnvelope(res.body, 'BAD_REQUEST');
  });

  it.each([
    ['GET', '/merchants'],
    ['POST', '/nope'],
    ['GET', '/'],
  ])('returns a JSON 404 for %s %s', async (method, path) => {
    const res = await request(newApp())[method.toLowerCase() as 'get' | 'post'](path);
    expect(res.status).toBe(404);
    expect(res.type).toBe('application/json');
    expectEnvelope(res.body, 'NOT_FOUND');
  });

  it('uses the same envelope for every error code', async () => {
    const app = newApp();
    await request(app).post('/merchants').send(valid).expect(201);
    expectEnvelope((await request(app).post('/merchants').send(valid)).body, 'DUPLICATE_MERCHANT');
    expectEnvelope(
      (await request(app).post('/merchants').send({ ...valid, externalMerchantId: 'other' })).body,
      'SIMILAR_MERCHANT_FOUND',
    );
    expectEnvelope(
      (await request(app).post('/merchants').set('Content-Type', 'application/json').send('{')).body,
      'INVALID_JSON',
    );
  });

  it('does not advertise the framework', async () => {
    const res = await request(newApp()).post('/merchants').send(valid);
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('keeps junk company names from triggering a similarity warning', async () => {
    const app = newApp();
    await request(app).post('/merchants').send({ ...valid, companyName: '!!' }).expect(201);
    await request(app)
      .post('/merchants')
      .send({ ...valid, companyName: '??', contactEmail: 'b@b.example', externalMerchantId: 'j-2' })
      .expect(201);
  });
});
