import { z } from "zod";
import {
  clientInterviewProgress,
  clientInterviewSessionSchema,
  createClientInterviewSession,
  type ClientInterviewSession,
} from "./client-interview-session";

const WRITER_INTERVIEW_PREFIX = "inkwell:writer-interview:";
export const WRITER_INTERVIEW_UPDATED_EVENT =
  "inkwell:writer-interview-updated";

export const writerInterviewMaterialSchema = z.object({
  articleId: z.string().uuid(),
  sourceType: z.literal("writer"),
  sourceLabel: z.literal("Writer-supplied material"),
  scope: z.literal("whole_article"),
  session: clientInterviewSessionSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WriterInterviewMaterial = z.infer<
  typeof writerInterviewMaterialSchema
>;

function storageAvailable() {
  return typeof window !== "undefined";
}

export function createWriterInterviewMaterial(
  articleId: string,
  now = new Date(),
): WriterInterviewMaterial {
  const timestamp = now.toISOString();
  return writerInterviewMaterialSchema.parse({
    articleId,
    sourceType: "writer",
    sourceLabel: "Writer-supplied material",
    scope: "whole_article",
    session: createClientInterviewSession(`writer-interview:${articleId}`, now),
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}

export function loadWriterInterviewMaterial(
  articleId: string,
): WriterInterviewMaterial | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.localStorage.getItem(
      `${WRITER_INTERVIEW_PREFIX}${articleId}`,
    );
    if (!raw) return null;
    const result = writerInterviewMaterialSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveWriterInterviewMaterial(
  material: WriterInterviewMaterial,
  session: ClientInterviewSession = material.session,
): WriterInterviewMaterial {
  const next = writerInterviewMaterialSchema.parse({
    ...material,
    session,
    updatedAt: session.updatedAt,
  });
  if (!storageAvailable()) return next;
  window.localStorage.setItem(
    `${WRITER_INTERVIEW_PREFIX}${material.articleId}`,
    JSON.stringify(next),
  );
  window.dispatchEvent(
    new CustomEvent(WRITER_INTERVIEW_UPDATED_EVENT, {
      detail: { articleId: material.articleId },
    }),
  );
  return next;
}

export function writerInterviewSummary(
  material: WriterInterviewMaterial | null,
) {
  const session = material?.session;
  if (!session) {
    return { state: "not_started" as const, progress: 0, responses: 0 };
  }
  return {
    state:
      session.state === "completed"
        ? ("completed" as const)
        : session.state === "welcome"
          ? ("not_started" as const)
          : ("in_progress" as const),
    progress: clientInterviewProgress(session),
    responses: session.answers.length,
  };
}
