import {
  countDraftWords,
  type DraftArticleState,
} from "../draft-editor/draft-editor-data";

export const EXPORT_SETTINGS_STORAGE_KEY = "inkwell:article-export";
export const EXPORT_SETTINGS_SCHEMA_VERSION = 1;
export const EXPORT_AUTHOR = "Nina Koskinen";

export type ExportFormat = "copy" | "markdown" | "html" | "pdf" | "docx";

export type ExportInclusions = {
  title: boolean;
  author: boolean;
  sources: boolean;
  summary: boolean;
  publishingMetadata: boolean;
};

export type ExportSettings = {
  schemaVersion: 1;
  format: ExportFormat;
  inclusions: ExportInclusions;
  savedAt: string | null;
};

export type SerializedExport = {
  content: string;
  mimeType: string;
  extension: "md" | "html";
};

export const DEFAULT_EXPORT_SETTINGS: ExportSettings = {
  schemaVersion: EXPORT_SETTINGS_SCHEMA_VERSION,
  format: "copy",
  inclusions: {
    title: true,
    author: true,
    sources: true,
    summary: true,
    publishingMetadata: false,
  },
  savedAt: null,
};

export function parseExportSettings(
  value: string | null,
): ExportSettings | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<ExportSettings>;
    const inclusions = parsed.inclusions;
    const inclusionKeys: readonly (keyof ExportInclusions)[] = [
      "title",
      "author",
      "sources",
      "summary",
      "publishingMetadata",
    ];
    if (
      parsed.schemaVersion !== EXPORT_SETTINGS_SCHEMA_VERSION ||
      !["copy", "markdown", "html"].includes(parsed.format ?? "") ||
      !inclusions ||
      inclusionKeys.some((key) => typeof inclusions[key] !== "boolean")
    ) {
      return null;
    }
    return parsed as ExportSettings;
  } catch {
    return null;
  }
}

function collectNodeText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const value = node as { text?: unknown; children?: unknown[] };
  return [
    typeof value.text === "string" ? value.text : "",
    ...(value.children?.map(collectNodeText) ?? []),
  ]
    .filter(Boolean)
    .join("");
}

export function extractArticleSections(draft: DraftArticleState) {
  return draft.sections.map((section) => {
    try {
      const state = JSON.parse(section.editorState) as {
        root?: { children?: unknown[] };
      };
      return {
        id: section.id,
        title: section.title,
        paragraphs:
          state.root?.children?.map(collectNodeText).filter(Boolean) ?? [],
      };
    } catch {
      return { id: section.id, title: section.title, paragraphs: [] };
    }
  });
}

export function articleParagraphs(draft: DraftArticleState) {
  return extractArticleSections(draft).flatMap((section) => section.paragraphs);
}

export function articleSummary(draft: DraftArticleState) {
  return articleParagraphs(draft)[0] ?? "";
}

export function readingMinutes(draft: DraftArticleState) {
  return Math.max(1, Math.ceil(countDraftWords(draft) / 200));
}

export function slugifyFilename(title: string) {
  return (
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-+|-+$/gu, "") || "inkwell-article"
  );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"]/gu,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ??
      character,
  );
}

function markdownExport(
  draft: DraftArticleState,
  inclusions: ExportInclusions,
) {
  const sections = extractArticleSections(draft);
  const lines: string[] = [];
  if (inclusions.title) lines.push(`# ${draft.title}`);
  if (inclusions.author) lines.push(`*By ${EXPORT_AUTHOR}*`);
  if (inclusions.summary && articleSummary(draft)) {
    lines.push("## Article summary", articleSummary(draft));
  }
  sections.forEach((section, index) => {
    if (index > 0) lines.push(`## ${section.title}`);
    lines.push(...section.paragraphs);
  });
  if (inclusions.sources) {
    // Source records are not part of the current draft schema, so nothing is fabricated.
  }
  if (inclusions.publishingMetadata) {
    lines.push(
      "## Publishing metadata",
      `- Word count: ${countDraftWords(draft).toLocaleString("en-US")}`,
      `- Estimated reading time: ${readingMinutes(draft)} min`,
    );
  }
  return `${lines.filter(Boolean).join("\n\n")}\n`;
}

function articleBodyHtml(
  draft: DraftArticleState,
  inclusions: ExportInclusions,
) {
  const sections = extractArticleSections(draft);
  const parts: string[] = [];
  if (inclusions.title) parts.push(`<h1>${escapeHtml(draft.title)}</h1>`);
  if (inclusions.author)
    parts.push(`<p class="author">By ${escapeHtml(EXPORT_AUTHOR)}</p>`);
  if (inclusions.summary && articleSummary(draft)) {
    parts.push(
      `<section aria-labelledby="article-summary"><h2 id="article-summary">Article summary</h2><p>${escapeHtml(articleSummary(draft))}</p></section>`,
    );
  }
  sections.forEach((section, index) => {
    parts.push("<section>");
    if (index > 0) parts.push(`<h2>${escapeHtml(section.title)}</h2>`);
    parts.push(
      ...section.paragraphs.map(
        (paragraph) => `<p>${escapeHtml(paragraph)}</p>`,
      ),
    );
    parts.push("</section>");
  });
  if (inclusions.publishingMetadata) {
    parts.push(
      `<section aria-labelledby="publishing-metadata"><h2 id="publishing-metadata">Publishing metadata</h2><dl><dt>Word count</dt><dd>${countDraftWords(draft).toLocaleString("en-US")}</dd><dt>Estimated reading time</dt><dd>${readingMinutes(draft)} min</dd></dl></section>`,
    );
  }
  return parts.join("\n");
}

export function serializePlainText(
  draft: DraftArticleState,
  inclusions: ExportInclusions,
) {
  return markdownExport(draft, inclusions)
    .replace(/^#{1,6}\s+/gmu, "")
    .replace(/^\*By (.+)\*$/gmu, "By $1")
    .replace(/^- /gmu, "");
}

export function serializeExport(
  draft: DraftArticleState,
  format: ExportFormat,
  inclusions: ExportInclusions,
): SerializedExport {
  if (format === "markdown") {
    return {
      content: markdownExport(draft, inclusions),
      mimeType: "text/markdown;charset=utf-8",
      extension: "md",
    };
  }

  const body = articleBodyHtml(draft, inclusions);
  if (format === "copy") {
    return { content: body, mimeType: "text/html", extension: "html" };
  }
  const title = escapeHtml(draft.title);
  return {
    content: `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${title}</title>\n<style>body{max-width:720px;margin:60px auto;padding:0 24px;color:#07194f;font:18px/1.65 Georgia,serif}h1{font-size:2.7rem;line-height:1.1}h2{margin-top:2em}.author{font-style:italic}dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 18px}dd{margin:0}</style>\n</head>\n<body>\n<article>\n${body}\n</article>\n</body>\n</html>\n`,
    mimeType: "text/html;charset=utf-8",
    extension: "html",
  };
}

export function estimatedExportBytes(
  draft: DraftArticleState,
  format: ExportFormat,
  inclusions: ExportInclusions,
) {
  return new TextEncoder().encode(
    serializeExport(draft, format, inclusions).content,
  ).byteLength;
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `~${Math.max(1, Math.round(bytes / 1024))} KB`;
}
