import { z } from 'zod';

export const registerMerchantSchema = z.object({
  companyName: z.string().trim().min(2, 'must be at least 2 characters'),
  contactEmail: z.string().trim().pipe(z.email('must be a valid email address')),
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'must be a two-letter country code')
    .transform((c) => c.toUpperCase()),
  externalMerchantId: z.string().trim().min(1, 'must not be empty'),
});

export type RegisterMerchantInput = z.infer<typeof registerMerchantSchema>;

export interface FieldError {
  field: string;
  message: string;
}

export type ParseResult =
  | { success: true; data: RegisterMerchantInput }
  | { success: false; errors: FieldError[] };

export function parseRegisterMerchant(body: unknown): ParseResult {
  const result = registerMerchantSchema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(body)',
      message:
        issue.code !== 'invalid_type'
          ? issue.message
          : issue.path.length === 0
            ? 'must be a JSON object'
            : 'is required and must be a string',
    })),
  };
}
