import { z } from "zod";

export const registrationMessages = {
  email: "Enter a valid email address.",
  username: "Use 3-30 lowercase letters, numbers, or underscores only.",
  password: "Use between 8 and 128 characters.",
} as const;

export const registrationSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, registrationMessages.email)
    .email(registrationMessages.email),
  username: z
    .string()
    .min(3, registrationMessages.username)
    .max(30, registrationMessages.username)
    .regex(/^[a-z0-9_]+$/, registrationMessages.username),
  password: z
    .string()
    .min(8, registrationMessages.password)
    .max(128, registrationMessages.password),
});

export const loginMessages = {
  email: "Enter a valid email address.",
  password: "Enter your password.",
} as const;

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, loginMessages.email)
    .email(loginMessages.email),
  password: z
    .string()
    .min(1, loginMessages.password)
    .max(128, "Password must be 128 characters or fewer."),
});

export const publicUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string(),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
});

export const backendRegistrationResponseSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal("bearer"),
  user: publicUserSchema,
});

export const authErrorDetailSchema = z.object({
  type: z.string(),
  loc: z.array(z.union([z.string(), z.number()])),
  msg: z.string(),
});

export const authErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(authErrorDetailSchema).optional(),
  }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PublicUser = z.infer<typeof publicUserSchema>;
export type RegistrationSuccess = { user: PublicUser };
export type AuthErrorResponse = z.infer<typeof authErrorResponseSchema>;
