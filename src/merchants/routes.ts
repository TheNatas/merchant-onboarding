import { Router } from 'express';
import { parseRegisterMerchant } from './schema';
import { MerchantService } from './service';

/** Mounted at /merchants by the app. */
export function merchantRoutes(service: MerchantService): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const parsed = parseRegisterMerchant(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'The request body is invalid. See details for each field',
        details: parsed.errors,
      });
      return;
    }
    const { confirmSimilar, ...input } = parsed.data;
    const merchant = await service.register(input, { confirmSimilar });
    res.status(201).json(merchant);
  });

  return router;
}
