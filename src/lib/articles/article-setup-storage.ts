import {
  articleSetupMetadataSchema,
  articleSetupSchema,
  type ArticleSetupMetadata,
  type ArticleSetupValues,
} from "./article-setup";

const DRAFT_KEY = "inkwell:article-setup-draft";
const METADATA_PREFIX = "inkwell:article-setup:";

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

export function saveArticleSetupMetadata(
  articleId: string,
  metadata: ArticleSetupMetadata,
) {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(
    `${METADATA_PREFIX}${articleId}`,
    JSON.stringify(metadata),
  );
}

export function loadArticleSetupMetadata(
  articleId: string,
): ArticleSetupMetadata | null {
  if (!storageAvailable()) return null;
  try {
    const raw = window.sessionStorage.getItem(`${METADATA_PREFIX}${articleId}`);
    if (!raw) return null;
    const result = articleSetupMetadataSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}
