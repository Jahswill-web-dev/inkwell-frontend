import { z } from "zod";

export const interviewProgressStates = [
  "not_opened",
  "opened",
  "in_progress",
  "completed",
] as const;

export const interviewInvitationSchema = z.object({
  articleId: z.string().min(1),
  articleTitle: z.string().trim().min(1).max(200).optional(),
  clientName: z.string().trim().min(1).max(120).optional(),
  writerName: z.string().trim().min(1).max(120).optional(),
  participantName: z.string().trim().min(1).max(120),
  participantEmail: z.string().trim().email().max(254),
  token: z.string().min(20).max(200),
  status: z.enum(["active", "revoked"]),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime().nullable(),
  progressState: z.enum(interviewProgressStates),
  questionsAnswered: z.number().int().min(0),
  estimatedQuestions: z.number().int().min(1),
  openedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  generation: z.number().int().min(1),
});

export type InterviewInvitation = z.infer<typeof interviewInvitationSchema>;

export const interviewInvitationInputSchema = z
  .object({
    participantName: z
      .string()
      .trim()
      .min(1, "Add the participant's name.")
      .max(120),
    participantEmail: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .max(254),
    expiresOn: z.string(),
  })
  .superRefine((value, context) => {
    if (!value.expiresOn) return;
    const expiration = new Date(`${value.expiresOn}T23:59:59.999Z`);
    if (Number.isNaN(expiration.getTime()) || expiration <= new Date()) {
      context.addIssue({
        code: "custom",
        path: ["expiresOn"],
        message: "Choose a future expiration date.",
      });
    }
  });

export type InterviewInvitationInput = z.infer<
  typeof interviewInvitationInputSchema
>;

function createToken() {
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export function createInterviewInvitation(
  articleId: string,
  input: InterviewInvitationInput,
  options: {
    now?: Date;
    tokenFactory?: () => string;
    generation?: number;
    articleTitle?: string;
    clientName?: string;
    writerName?: string;
  } = {},
): InterviewInvitation {
  const values = interviewInvitationInputSchema.parse(input);
  const now = options.now ?? new Date();
  return interviewInvitationSchema.parse({
    articleId,
    articleTitle: options.articleTitle,
    clientName: options.clientName,
    writerName: options.writerName,
    participantName: values.participantName,
    participantEmail: values.participantEmail.toLowerCase(),
    token: (options.tokenFactory ?? createToken)(),
    status: "active",
    createdAt: now.toISOString(),
    expiresAt: values.expiresOn
      ? new Date(`${values.expiresOn}T23:59:59.999Z`).toISOString()
      : null,
    progressState: "not_opened",
    questionsAnswered: 0,
    estimatedQuestions: 8,
    openedAt: null,
    completedAt: null,
    generation: options.generation ?? 1,
  });
}

export function revokeInterviewInvitation(
  invitation: InterviewInvitation,
): InterviewInvitation {
  return { ...invitation, status: "revoked" };
}

export function isInterviewInvitationExpired(
  invitation: InterviewInvitation,
  now = new Date(),
) {
  return Boolean(
    invitation.expiresAt &&
    new Date(invitation.expiresAt).getTime() < now.getTime(),
  );
}

export function interviewProgressPercent(invitation: InterviewInvitation) {
  if (invitation.progressState === "completed") return 100;
  return Math.min(
    95,
    Math.round(
      (invitation.questionsAnswered / invitation.estimatedQuestions) * 100,
    ),
  );
}

export function interviewInvitationLabel(
  invitation: InterviewInvitation,
  now = new Date(),
) {
  if (invitation.status === "revoked") return "Revoked";
  if (isInterviewInvitationExpired(invitation, now)) return "Expired";
  return {
    not_opened: "Not opened",
    opened: "Opened",
    in_progress: "In progress",
    completed: "Completed",
  }[invitation.progressState];
}

export function interviewInvitationUrl(
  invitation: InterviewInvitation,
  origin: string,
) {
  return `${origin.replace(/\/$/, "")}/interview/${invitation.token}`;
}
