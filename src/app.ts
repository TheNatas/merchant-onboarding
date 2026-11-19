import express, { ErrorRequestHandler } from 'express';
import { DuplicateMerchantError, SimilarMerchantError } from './errors';
import { MerchantRepository } from './merchants/repository';
import { merchantRoutes } from './merchants/routes';
import { Clock, MerchantService } from './merchants/service';

export interface AppDeps {
  repository: MerchantRepository;
  clock?: Clock;
}

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof DuplicateMerchantError) {
    res.status(409).json({ error: 'DUPLICATE_MERCHANT', message: err.message });
    return;
  }
  if (err instanceof SimilarMerchantError) {
    res.status(409).json({
      error: 'SIMILAR_MERCHANT_FOUND',
      message: err.message,
      similarMerchants: err.similar.map(({ merchant, reasons }) => ({
        id: merchant.id,
        companyName: merchant.companyName,
        externalMerchantId: merchant.externalMerchantId,
        reasons,
      })),
    });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'INVALID_JSON', message: 'Request body is not valid JSON' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected error' });
};

export function createApp({ repository, clock }: AppDeps) {
  const app = express();
  app.use(express.json());
  app.use(merchantRoutes(new MerchantService(repository, clock)));
  app.use(errorHandler);
  return app;
}
