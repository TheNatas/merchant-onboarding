import { createApp } from './app';
import { InMemoryMerchantRepository } from './merchants/repository';

const port = Number(process.env.PORT ?? 3000);
createApp({ repository: new InMemoryMerchantRepository() }).listen(port, () => {
  console.log(`Merchant onboarding API listening on http://localhost:${port}`);
});
