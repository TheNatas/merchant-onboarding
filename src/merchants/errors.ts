import type { SimilarMerchant } from './similarity';

export class DuplicateMerchantError extends Error {
  constructor(public readonly externalMerchantId: string) {
    super(`A merchant with externalMerchantId "${externalMerchantId}" is already registered`);
    this.name = 'DuplicateMerchantError';
  }
}

export class SimilarMerchantError extends Error {
  constructor(public readonly similar: SimilarMerchant[]) {
    super('This merchant looks similar to an existing registration');
    this.name = 'SimilarMerchantError';
  }
}
