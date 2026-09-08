import {
  clientInterviewSessionSchema,
  type ClientInterviewSession,
} from "./client-interview-session";

const SESSION_PREFIX = "inkwell:guest-interview:";

function storageAvailable() {
  return typeof window !== "undefined";
}

export function loadClientInterviewSession(
  token: string,
): ClientInterviewSession | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.sessionStorage.getItem(`${SESSION_PREFIX}${token}`);
    if (!raw) return null;
    const result = clientInterviewSessionSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveClientInterviewSession(session: ClientInterviewSession) {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(
    `${SESSION_PREFIX}${session.token}`,
    JSON.stringify(session),
  );
}
