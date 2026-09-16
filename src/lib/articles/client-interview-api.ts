import { z } from "zod";
import {
  clientInterviewSessionSchema,
  type ClientInterviewSession,
} from "./client-interview-session";
import {
  interviewInvitationInputSchema,
  interviewInvitationSchema,
  type InterviewInvitation,
  type InterviewInvitationInput,
} from "./client-interview-invitation";
import { articleApiErrorSchema } from "./article";

export class InterviewInvitationRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "InterviewInvitationRequestError";
  }
}

const backendInvitationSchema = z
  .object({
    id: z.string().uuid(),
    article_id: z.string().uuid(),
    article_title: z.string().nullable(),
    client_name: z.string().nullable(),
    writer_name: z.string().nullable(),
    participant_name: z.string().min(1).max(120),
    participant_email: z.string().email().max(254),
    token: z.string().min(20).max(200),
    status: z.enum(["active", "revoked"]),
    expires_at: z.string().datetime({ offset: true }).nullable(),
    progress_state: z.enum([
      "not_opened",
      "opened",
      "in_progress",
      "completed",
    ]),
    questions_answered: z.number().int().min(0),
    estimated_questions: z.number().int().min(1),
    opened_at: z.string().datetime({ offset: true }).nullable(),
    completed_at: z.string().datetime({ offset: true }).nullable(),
    created_at: z.string().datetime({ offset: true }),
    updated_at: z.string().datetime({ offset: true }),
  })
  .strict();

const backendAnswerSchema = z
  .object({
    question_id: z.string().min(1),
    question: z.string().min(1).max(1_000),
    answer: z.string().trim().min(1).max(10_000),
    answered_at: z.string().datetime({ offset: true }),
  })
  .strict();

const backendSessionSchema = z
  .object({
    token: z.string().min(20).max(200),
    state: z.enum(["welcome", "active", "paused", "completed"]),
    questions: z
      .array(
        z
          .object({
            id: z.string().min(1),
            text: z.string().min(1).max(1_000),
            kind: z.enum(["core", "follow_up", "final_detail"]),
          })
          .strict(),
      )
      .min(1)
      .max(14),
    current_question_index: z.number().int().min(0),
    answers: z.array(backendAnswerSchema).max(10),
    completion_reason: z
      .enum(["sufficient", "participant_finished", "question_limit"])
      .nullable(),
    final_detail_added: z.boolean(),
    draft_answer: z.string().max(10_000),
    updated_at: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

const guestInterviewResponseSchema = z
  .object({
    invitation: backendInvitationSchema,
    session: backendSessionSchema,
  })
  .strict();

const realtimeCallResponseSchema = z
  .object({
    sdp: z.string().min(1),
  })
  .strict();

const transcriptTurnSchema = z
  .object({
    itemId: z.string().min(1).max(200),
    speaker: z.enum(["participant", "interviewer"]),
    text: z.string().trim().min(1).max(10_000),
  })
  .strict();

export type InterviewTranscriptTurn = z.infer<typeof transcriptTurnSchema>;

const interviewInsightsSchema = z
  .object({
    summary: z.string(),
    key_insights: z.array(
      z.object({ text: z.string(), source_item_ids: z.array(z.string()) }),
    ),
    examples_and_evidence: z.array(
      z.object({ text: z.string(), source_item_ids: z.array(z.string()) }),
    ),
    claims_to_verify: z.array(
      z.object({ text: z.string(), source_item_ids: z.array(z.string()) }),
    ),
    open_questions: z.array(z.string()),
  })
  .strict();

const interviewTranscriptSchema = z
  .object({
    id: z.string().uuid(),
    invitation_id: z.string().uuid(),
    turns: z.array(
      z
        .object({
          item_id: z.string(),
          speaker: z.enum(["participant", "interviewer"]),
          text: z.string(),
        })
        .strict(),
    ),
    insight_status: z.enum(["pending", "ready", "failed"]),
    insights: interviewInsightsSchema.nullable(),
    model_id: z.string().nullable(),
    generation_error: z.string().nullable(),
  })
  .strict();

export type InterviewTranscript = z.infer<typeof interviewTranscriptSchema>;

function toInvitation(value: unknown): InterviewInvitation {
  const invitation = backendInvitationSchema.parse(value);
  return interviewInvitationSchema.parse({
    id: invitation.id,
    articleId: invitation.article_id,
    articleTitle: invitation.article_title ?? undefined,
    clientName: invitation.client_name ?? undefined,
    writerName: invitation.writer_name ?? undefined,
    participantName: invitation.participant_name,
    participantEmail: invitation.participant_email,
    token: invitation.token,
    status: invitation.status,
    expiresAt: invitation.expires_at,
    progressState: invitation.progress_state,
    questionsAnswered: invitation.questions_answered,
    estimatedQuestions: invitation.estimated_questions,
    openedAt: invitation.opened_at,
    completedAt: invitation.completed_at,
    createdAt: invitation.created_at,
    updatedAt: invitation.updated_at,
  });
}

function toSession(
  value: z.infer<typeof backendSessionSchema>,
): ClientInterviewSession {
  return clientInterviewSessionSchema.parse({
    token: value.token,
    state: value.state,
    questions: value.questions,
    currentQuestionIndex: value.current_question_index,
    answers: value.answers.map((answer) => ({
      questionId: answer.question_id,
      question: answer.question,
      answer: answer.answer,
      answeredAt: answer.answered_at,
    })),
    completionReason: value.completion_reason,
    finalDetailAdded: value.final_detail_added,
    draftAnswer: value.draft_answer,
    updatedAt: value.updated_at ?? new Date().toISOString(),
  });
}

function toGuestInterview(value: unknown) {
  const response = guestInterviewResponseSchema.parse(value);
  return {
    invitation: toInvitation(response.invitation),
    session: toSession(response.session),
  };
}

function toBackendSession(session: ClientInterviewSession) {
  return {
    state: session.state,
    questions: session.questions,
    current_question_index: session.currentQuestionIndex,
    answers: session.answers.map((answer) => ({
      question_id: answer.questionId,
      question: answer.question,
      answer: answer.answer,
      answered_at: answer.answeredAt,
    })),
    completion_reason: session.completionReason,
    final_detail_added: session.finalDetailAdded,
    draft_answer: session.draftAnswer,
  };
}

async function request<T>(
  url: string,
  init: RequestInit,
  parse: (payload: unknown) => T,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    const error = articleApiErrorSchema.safeParse(payload);
    throw new InterviewInvitationRequestError(
      response.status,
      error.success ? error.data.error.code : "interview_unavailable",
      error.success
        ? error.data.error.message
        : "The interview is temporarily unavailable.",
    );
  }
  try {
    return parse(payload);
  } catch {
    throw new InterviewInvitationRequestError(
      502,
      "invalid_interview_response",
      "The interview is temporarily unavailable.",
    );
  }
}

export function getInterviewInvitation(articleId: string) {
  return request(`/api/articles/${articleId}/invitations`, {}, (payload) =>
    payload === null ? null : toInvitation(payload),
  );
}

export function createInterviewInvitationRequest(
  articleId: string,
  input: InterviewInvitationInput,
) {
  const values = interviewInvitationInputSchema.parse(input);
  return request(
    `/api/articles/${articleId}/invitations`,
    {
      method: "POST",
      body: JSON.stringify({
        participant_name: values.participantName,
        participant_email: values.participantEmail,
        expires_on: values.expiresOn || null,
      }),
    },
    toInvitation,
  );
}

export function revokeInterviewInvitationRequest(
  articleId: string,
  invitationId: string,
) {
  return request(
    `/api/articles/${articleId}/invitations/${invitationId}`,
    { method: "DELETE" },
    toInvitation,
  );
}

export function getGuestInterview(token: string) {
  return request(
    `/api/interviews/${encodeURIComponent(token)}`,
    {},
    toGuestInterview,
  );
}

export function updateGuestInterview(
  token: string,
  session: ClientInterviewSession,
) {
  return request(
    `/api/interviews/${encodeURIComponent(token)}`,
    { method: "PATCH", body: JSON.stringify(toBackendSession(session)) },
    toGuestInterview,
  );
}
export function createRealtimeInterviewCall(token: string, sdp: string) {
  return request(
    `/api/interviews/${encodeURIComponent(token)}/realtime`,
    {
      method: "POST",
      body: JSON.stringify({ sdp }),
    },
    (payload) => realtimeCallResponseSchema.parse(payload),
  );
}

export function recordInterviewTranscriptTurn(
  token: string,
  turn: InterviewTranscriptTurn,
) {
  const value = transcriptTurnSchema.parse(turn);
  return request(
    `/api/interviews/${encodeURIComponent(token)}/transcript`,
    {
      method: "POST",
      body: JSON.stringify({
        turns: [
          {
            item_id: value.itemId,
            speaker: value.speaker,
            text: value.text,
          },
        ],
      }),
    },
    (payload) =>
      z.object({ id: z.string().uuid() }).passthrough().parse(payload),
  );
}

export function finalizeInterviewTranscript(token: string) {
  return request(
    `/api/interviews/${encodeURIComponent(token)}/transcript/finalize`,
    { method: "POST" },
    (payload) =>
      z.object({ id: z.string().uuid() }).passthrough().parse(payload),
  );
}

export function getInterviewTranscript(
  articleId: string,
  invitationId: string,
) {
  return request(
    `/api/articles/${encodeURIComponent(articleId)}/invitations/${encodeURIComponent(invitationId)}/transcript`,
    {},
    (payload) => interviewTranscriptSchema.parse(payload),
  );
}
