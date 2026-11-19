import { Router } from 'express';
import { parseRegisterMerchant } from './merchant.schema';
import { MerchantService } from './merchant.service';

export function merchantRoutes(service: MerchantService): Router {
  const router = Router();

  router.post('/merchants', async (req, res) => {
    const parsed = parseRegisterMerchant(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.errors });
      return;
    }
    const { confirmSimilar, ...input } = parsed.data;
    const merchant = await service.register(input, { confirmSimilar });
    res.status(201).json(merchant);
  });

  return router;
}
