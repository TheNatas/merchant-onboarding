import { ErrorRequestHandler, RequestHandler } from 'express';
import { DuplicateMerchantError, SimilarMerchantError } from './merchants/errors';

/**
 * Every error response has the same envelope: { error, message, details? }.
 * `error` is a stable code for clients, `message` is for people.
 */

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'NOT_FOUND', message: 'Route not found' });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof DuplicateMerchantError) {
    res.status(409).json({ error: 'DUPLICATE_MERCHANT', message: err.message });
    return;
  }
  if (err instanceof SimilarMerchantError) {
    res.status(409).json({
      error: 'SIMILAR_MERCHANT_FOUND',
      message: `${err.message}. Resend with "confirmSimilar": true to register it anyway`,
      similarMerchants: err.similar.map(({ merchant, reasons }) => ({
        id: merchant.id,
        companyName: merchant.companyName,
        externalMerchantId: merchant.externalMerchantId,
        reasons,
      })),
    });
    return;
  }
  // Errors raised by Express/body-parser before our code runs (malformed JSON, body too large, ...).
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'INVALID_JSON', message: 'Request body is not valid JSON' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' });
    return;
  }
  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: 'BAD_REQUEST', message: 'The request could not be processed' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected error' });
};
