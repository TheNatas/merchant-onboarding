import express from 'express';
import { errorHandler, notFoundHandler } from './error-handling';
import { MerchantRepository } from './merchants/repository';
import { merchantRoutes } from './merchants/routes';
import { Clock, MerchantService } from './merchants/service';

export interface AppDeps {
  repository: MerchantRepository;
  clock?: Clock;
}

export function createApp({ repository, clock }: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json());
  app.use('/merchants', merchantRoutes(new MerchantService(repository, clock)));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
