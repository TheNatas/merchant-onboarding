export class DuplicateMerchantError extends Error {
  constructor(public readonly externalMerchantId: string) {
    super(`A merchant with externalMerchantId "${externalMerchantId}" is already registered`);
    this.name = 'DuplicateMerchantError';
  }
}
