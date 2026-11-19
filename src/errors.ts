export class DuplicateMerchantError extends Error {
  constructor(public readonly externalMerchantId: string) {
    super(`A merchant with externalMerchantId "${externalMerchantId}" is already registered`);
    this.name = 'DuplicateMerchantError';
  }
}

export class SimilarMerchantError extends Error {
  constructor(public readonly similar: import('./merchants/merchant.repository').SimilarMerchant[]) {
    super('This merchant looks similar to an existing registration. Resend with "confirmSimilar": true to register it anyway');
    this.name = 'SimilarMerchantError';
  }
}
