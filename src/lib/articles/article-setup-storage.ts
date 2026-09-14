import {
  articleSetupSchema,
  type ArticleSetupValues,
} from "./article-setup";

const DRAFT_KEY = "inkwell:article-setup-draft";

function storageAvailable() {
  return typeof window !== "undefined";
}

export function loadArticleSetupDraft(): ArticleSetupValues | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const result = articleSetupSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function saveArticleSetupDraft(values: ArticleSetupValues) {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values));
}

export function clearArticleSetupDraft() {
  if (!storageAvailable()) return;
  window.sessionStorage.removeItem(DRAFT_KEY);
}
