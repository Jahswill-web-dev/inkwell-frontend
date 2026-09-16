import { z } from "zod";

export const brandProfileSchema = z.object({
  id: z.string().uuid(),
  client_id: z.string().uuid(),
  default_audience: z.string().nullable(),
  brand_voice: z.string().nullable(),
  preferred_terminology: z.array(z.string()),
  avoided_terminology: z.array(z.string()),
  default_calls_to_action: z.array(z.string()),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

const uniqueTextList = (maxLength: number) =>
  z
    .array(z.string().trim().min(1).max(maxLength))
    .max(20)
    .refine(
      (values) =>
        new Set(values.map((value) => value.toLocaleLowerCase())).size ===
        values.length,
      "Values must be unique",
    );

export const brandProfileInputSchema = z.object({
  default_audience: z.string().trim().max(2_000).nullable().optional(),
  brand_voice: z.string().trim().max(2_000).nullable().optional(),
  preferred_terminology: uniqueTextList(200).optional(),
  avoided_terminology: uniqueTextList(200).optional(),
  default_calls_to_action: uniqueTextList(500).optional(),
});

export const agencyClientInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  website: z
    .string()
    .url()
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol))
    .nullable()
    .optional(),
  industry: z.string().trim().min(1).max(120).nullable().optional(),
  brand_profile: brandProfileInputSchema.nullable().optional(),
});

export const agencyClientPatchSchema = agencyClientInputSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one client field is required",
  );

export const agencyClientSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  name: z.string(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  brand_profile: brandProfileSchema.nullable(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const agencyClientListSchema = z.object({
  items: z.array(agencyClientSchema),
  total: z.number().int().nonnegative(),
  offset: z.number().int().nonnegative(),
  limit: z.number().int().min(1).max(100),
});

export const workspaceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  role: z.enum(["owner", "member"]),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export type AgencyClient = z.infer<typeof agencyClientSchema>;
export type AgencyClientInput = z.infer<typeof agencyClientInputSchema>;
export type AgencyClientPatch = z.infer<typeof agencyClientPatchSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
