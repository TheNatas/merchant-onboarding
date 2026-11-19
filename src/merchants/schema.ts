import { z } from 'zod';

export const MAX_LENGTHS = { companyName: 200, contactEmail: 254, externalMerchantId: 100 } as const;

/** Error message for a wrong type: "is required" when the field is absent, otherwise the expected type. */
const typeError = (expected: string) => ({
  error: (issue: { input?: unknown }) => (issue.input === undefined ? 'is required' : `must be ${expected}`),
});

export const registerMerchantSchema = z.object(
  {
    companyName: z
      .string(typeError('a string'))
      .trim()
      .min(2, 'must be at least 2 characters')
      .max(MAX_LENGTHS.companyName, `must be at most ${MAX_LENGTHS.companyName} characters`),
    contactEmail: z
      .string(typeError('a string'))
      .trim()
      .max(MAX_LENGTHS.contactEmail, `must be at most ${MAX_LENGTHS.contactEmail} characters`)
      .pipe(z.email('must be a valid email address')),
    country: z
      .string(typeError('a string'))
      .trim()
      .regex(/^[A-Za-z]{2}$/, 'must be a two-letter country code')
      .transform((c) => c.toUpperCase()),
    externalMerchantId: z
      .string(typeError('a string'))
      .trim()
      .min(1, 'must not be empty')
      .max(MAX_LENGTHS.externalMerchantId, `must be at most ${MAX_LENGTHS.externalMerchantId} characters`),
    confirmSimilar: z.boolean(typeError('a boolean')).optional(),
  },
  { error: () => 'must be a JSON object' },
);

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
      message: issue.message,
    })),
  };
}
