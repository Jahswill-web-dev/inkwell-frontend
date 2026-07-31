import { z } from "zod";

export const waitlistSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Name must be 80 characters or fewer."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254, "Email must be 254 characters or fewer.")
    .email("Enter a valid email address."),
});

export type WaitlistInput = z.infer<typeof waitlistSchema>;

export type WaitlistResponse =
  | { success: true; message: string }
  | {
      success: false;
      message: string;
      fieldErrors?: Record<string, string[]>;
    };
