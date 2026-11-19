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
  confirmSimilar: z.boolean().optional(),
});

export type RegisterMerchantRequest = z.infer<typeof registerMerchantSchema>;
/** The merchant data itself, without request flags. */
export type RegisterMerchantInput = Omit<RegisterMerchantRequest, 'confirmSimilar'>;

export interface FieldError {
  field: string;
  message: string;
}

export type ParseResult =
  | { success: true; data: RegisterMerchantRequest }
  | { success: false; errors: FieldError[] };

export function parseRegisterMerchant(body: unknown): ParseResult {
  const result = registerMerchantSchema.safeParse(body);
  if (result.success) return { success: true, data: result.data };
  return {
    success: false,
    errors: result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(body)',
      message: describeIssue(issue),
    })),
  };
}

function describeIssue(issue: z.core.$ZodIssue): string {
  if (issue.code !== 'invalid_type') return issue.message;
  if (issue.path.length === 0) return 'must be a JSON object';
  return issue.message.includes('received undefined') ? 'is required' : `must be of type ${issue.expected}`;
}
