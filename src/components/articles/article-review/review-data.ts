import type { DraftArticleState } from "../draft-editor/draft-editor-data";

export const REVIEW_STORAGE_KEY = "inkwell:article-review";
export const REVIEW_SCHEMA_VERSION = 1;

export type ReviewCategory =
  "all" | "important" | "clarity" | "structure" | "voice" | "sources";
export type ReviewIssueStatus = "open" | "applied" | "ignored" | "obsolete";

export type ReviewIssue = {
  id: string;
  category: Exclude<ReviewCategory, "all" | "sources">;
  title: string;
  explanation: string;
  sectionId: string;
  original: string;
  suggestion: string;
  status: ReviewIssueStatus;
};

export type ReviewState = {
  schemaVersion: 1;
  activeFilter: ReviewCategory;
  activeIssueId: string;
  view: "summary" | "triage";
  completed: boolean;
  issues: ReviewIssue[];
};

const seeds: Omit<ReviewIssue, "status">[] = [
  {
    id: "important-claim",
    category: "important",
    title: "Unsupported central claim",
    explanation:
      "This statement is central to the argument and needs more support.",
    sectionId: "introduction",
    original:
      "We’ve all had them—that spark of insight in the shower, the half-formed observation on a late-night walk, the mental lightning bolt that feels brilliant in the moment and evaporates by morning.",
    suggestion:
      "We’ve all had them—that spark of insight that feels brilliant in the moment but can evaporate before we find the words to preserve it.",
  },
  {
    id: "abrupt-transition",
    category: "important",
    title: "Abrupt transition",
    explanation:
      "The shift from the challenge of capturing ideas to the need for structure feels sudden.",
    sectionId: "introduction",
    original:
      "Great ideas are elusive because they live in the realm of possibility, not precision. They arrive as splinters, fragments, and flashes—not as fully formed arguments.",
    suggestion:
      "Great ideas are elusive because they live in the realm of possibility, not precision. They arrive as splinters, fragments, and flashes—not as fully formed arguments—and that’s what makes capturing them so difficult.",
  },
  {
    id: "vague-chaos",
    category: "clarity",
    title: "Vague phrasing",
    explanation:
      "“The chaos” is broad. A more specific phrase makes the point easier to follow.",
    sectionId: "messy-nature",
    original: "The chaos is part of the process.",
    suggestion: "That early uncertainty is a natural part of shaping an idea.",
  },
  {
    id: "abstract-accountable",
    category: "clarity",
    title: "Abstract sentence",
    explanation:
      "The metaphor is strong, but its meaning could be made more explicit.",
    sectionId: "writing-creates-structure",
    original: "A sentence makes an idea accountable.",
    suggestion:
      "A sentence forces an idea to become specific enough for someone else to examine.",
  },
  {
    id: "section-bridge",
    category: "structure",
    title: "Section needs a bridge",
    explanation:
      "Connect curiosity and exploration more directly to the next section about structure.",
    sectionId: "messy-nature",
    original: "Before structure comes exploration.",
    suggestion:
      "Before structure comes exploration—and those discoveries give structure something meaningful to organize.",
  },
  {
    id: "conclusion-order",
    category: "structure",
    title: "Conclusion arrives quickly",
    explanation:
      "The final instruction would land better with a short bridge from the previous claim.",
    sectionId: "conclusion",
    original:
      "Capture the fragments, give them an order, and return to them with patience.",
    suggestion:
      "Once you accept that shaping is part of the work, capture the fragments, give them an order, and return to them with patience.",
  },
  {
    id: "voice-formality",
    category: "voice",
    title: "Tone becomes formal",
    explanation:
      "This phrase sounds more academic than the article’s otherwise conversational voice.",
    sectionId: "clarity-through-iteration",
    original: "It is how the idea becomes sturdy enough to share.",
    suggestion: "It’s how the idea becomes clear enough to share.",
  },
];

export function createDefaultReview(): ReviewState {
  return {
    schemaVersion: REVIEW_SCHEMA_VERSION,
    activeFilter: "all",
    activeIssueId: "abrupt-transition",
    view: "triage",
    completed: false,
    issues: seeds.map((issue) => ({ ...issue, status: "open" })),
  };
}

export function parseReview(value: string | null): ReviewState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as ReviewState;
    return parsed.schemaVersion === REVIEW_SCHEMA_VERSION &&
      Array.isArray(parsed.issues) &&
      typeof parsed.activeIssueId === "string"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export function openIssues(review: ReviewState, filter = review.activeFilter) {
  return review.issues.filter(
    (issue) =>
      issue.status === "open" &&
      (filter === "all" || issue.category === filter),
  );
}

export function categoryCount(review: ReviewState, category: ReviewCategory) {
  return openIssues(review, category).length;
}

export function readinessScore(review: ReviewState) {
  const unresolved = openIssues(review).length;
  return Math.min(100, 82 + (7 - unresolved) * 3);
}

function replaceInNode(
  node: unknown,
  original: string,
  replacement: string,
): boolean {
  if (!node || typeof node !== "object") return false;
  const record = node as { text?: unknown; children?: unknown[] };
  if (typeof record.text === "string" && record.text.includes(original)) {
    record.text = record.text.replace(original, replacement);
    return true;
  }
  return Array.isArray(record.children)
    ? record.children.some((child) =>
        replaceInNode(child, original, replacement),
      )
    : false;
}

export function applyIssueToDraft(
  draft: DraftArticleState,
  issue: ReviewIssue,
  replacement = issue.suggestion,
): { draft: DraftArticleState; applied: boolean } {
  const sections = draft.sections.map((section) => {
    if (section.id !== issue.sectionId) return section;
    try {
      const editorState = JSON.parse(section.editorState) as unknown;
      const root = (editorState as { root?: unknown }).root;
      if (!replaceInNode(root, issue.original, replacement)) return section;
      return { ...section, editorState: JSON.stringify(editorState) };
    } catch {
      return section;
    }
  });
  const applied = sections.some(
    (section, index) =>
      section.editorState !== draft.sections[index]?.editorState,
  );
  return { draft: applied ? { ...draft, sections } : draft, applied };
}

export function ensureIssueAnchors(
  draft: DraftArticleState,
  review: ReviewState,
): ReviewState {
  const issues = review.issues.map((issue) => {
    if (issue.status !== "open") return issue;
    const section = draft.sections.find(
      (candidate) => candidate.id === issue.sectionId,
    );
    if (!section) return { ...issue, status: "obsolete" as const };
    try {
      return JSON.stringify(JSON.parse(section.editorState)).includes(
        issue.original,
      )
        ? issue
        : { ...issue, status: "obsolete" as const };
    } catch {
      return { ...issue, status: "obsolete" as const };
    }
  });
  return { ...review, issues };
}
