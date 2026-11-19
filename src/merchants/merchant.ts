export type MerchantStatus = 'PENDING';

export interface Merchant {
  id: string;
  companyName: string;
  contactEmail: string;
  country: string;
  externalMerchantId: string;
  status: MerchantStatus;
  createdAt: string;
}
