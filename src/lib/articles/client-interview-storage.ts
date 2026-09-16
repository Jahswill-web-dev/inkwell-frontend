import {
  interviewInvitationSchema,
  type InterviewInvitation,
} from "./client-interview-invitation";

const INVITATION_PREFIX = "inkwell:client-interview:";

function storageAvailable() {
  return typeof window !== "undefined";
}

export function loadInterviewInvitation(
  articleId: string,
): InterviewInvitation | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.sessionStorage.getItem(
      `${INVITATION_PREFIX}${articleId}`,
    );
    if (!raw) return null;
    const result = interviewInvitationSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveInterviewInvitation(invitation: InterviewInvitation) {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(
    `${INVITATION_PREFIX}${invitation.articleId}`,
    JSON.stringify(invitation),
  );
}

export function findInterviewInvitationByToken(
  token: string,
): InterviewInvitation | null {
  if (!storageAvailable() || !token) return null;
  for (let index = 0; index < window.sessionStorage.length; index += 1) {
    const key = window.sessionStorage.key(index);
    if (!key?.startsWith(INVITATION_PREFIX)) continue;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) continue;
      const result = interviewInvitationSchema.safeParse(JSON.parse(raw));
      if (result.success && result.data.token === token) return result.data;
    } catch {
      continue;
    }
  }
  return null;
}
