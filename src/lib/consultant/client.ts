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
  voice_phase:
    | "awaiting_readiness"
    | "awaiting_direction_confirmation"
    | "framing"
    | "adaptive_interview"
    | "awaiting_final_contribution"
    | "awaiting_recap_confirmation"
    | "completed"
    | null;
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
export type DraftFinding = {
  id: string;
  classification: "supported" | "interpretation" | "unsupported";
  category: string;
  section_id: string;
  section_index: number;
  paragraph_id: string | null;
  paragraph_index: number | null;
  claim_text: string;
  explanation: string;
  source_turn_ids: string[];
  external_source_ids: string[];
  suggested_replacement: string | null;
  status: "open" | "resolved";
  resolution_reason?: string | null;
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
  findings: DraftFinding[];
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
    review_status?: "needs_attention" | "clear" | null;
    open_finding_count?: number;
  } | null;
  sections: Section[];
  draft_updated_at: string | null;
  findings: DraftFinding[];
  open_finding_count: number;
  revisions: Revision[];
};

export type FindingRepairPreview = {
  finding_id: string;
  before: string;
  after: string;
  classification: "supported" | "interpretation" | "unsupported";
  findings: DraftFinding[];
  target_version: string;
};
