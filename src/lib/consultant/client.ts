export async function consultantRequest<T>(
  path: string,
  method = "GET",
  data?: unknown,
  headers?: Record<string, string>,
): Promise<T> {
  const response = await fetch(`/api/consultant/${path}`, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...headers },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const value = await response.json();
  if (!response.ok)
    throw new Error(
      value.error?.message ??
        "We couldn't complete that request. Please try again.",
    );
  return value as T;
}
export type Profile = {
  display_name: string;
  specialty: string;
  audience: string;
  onboarding_complete: boolean;
};
export type Turn = {
  item_id: string;
  speaker: "participant" | "interviewer";
  text: string;
};
export type Interview = {
  id: string;
  article_id: string;
  title: string;
  description: string;
  state: string;
  questions: { id: string; text: string }[];
  turns: Turn[];
  corrections: Record<string, { text: string | null; excluded: boolean }>;
};
export type Section = {
  id: string;
  outline_section_id: string | null;
  title: string;
  goal: string;
  checklist: { id: string; label: string; completed: boolean }[];
  editor_state: string;
};
export type Revision = {
  id: string;
  kind: string;
  sections: Section[];
  gaps: string[];
  created_at: string;
  request?: string;
  summary?: string;
  sources?: { id: string; title: string; url: string }[];
};
export type Article = {
  id: string;
  title: string;
  description: string;
  status: string;
  interviews: { id: string; state: string }[];
  job: {
    id: string;
    state: string;
    stage: string;
    error: string | null;
    attempts: number;
    instruction?: string;
    request_kind?: "ask_ai" | "generation";
    clarification_question?: string | null;
    writing_suggestions?: { section: string; text: string }[];
  } | null;
  sections: Section[];
  draft_updated_at: string | null;
  revisions: Revision[];
};
