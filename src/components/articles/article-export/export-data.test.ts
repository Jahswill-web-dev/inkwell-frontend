import { describe, expect, it } from "vitest";
import { createDefaultDraft } from "../draft-editor/draft-editor-data";
import {
  articleParagraphs,
  articleSummary,
  DEFAULT_EXPORT_SETTINGS,
  estimatedExportBytes,
  formatBytes,
  parseExportSettings,
  readingMinutes,
  serializeExport,
  serializePlainText,
  slugifyFilename,
} from "./export-data";

describe("article export data", () => {
  const draft = createDefaultDraft();
  const inclusions = DEFAULT_EXPORT_SETTINGS.inclusions;

  it("extracts article copy and calculates export metadata", () => {
    expect(articleParagraphs(draft)).toHaveLength(11);
    expect(articleSummary(draft)).toMatch(/^We.ve all had them/u);
    expect(readingMinutes(draft)).toBeGreaterThan(0);
    expect(formatBytes(2048)).toBe("~2 KB");
    expect(estimatedExportBytes(draft, "markdown", inclusions)).toBeGreaterThan(
      100,
    );
  });

  it("serializes Markdown, HTML, and clipboard text with inclusions", () => {
    const markdown = serializeExport(draft, "markdown", inclusions);
    expect(markdown.extension).toBe("md");
    expect(markdown.content).toContain(`# ${draft.title}`);
    expect(markdown.content).toContain("*By Nina Koskinen*");
    expect(markdown.content).toContain("## Article summary");

    const html = serializeExport(draft, "html", {
      ...inclusions,
      author: false,
      summary: false,
      publishingMetadata: true,
    });
    expect(html.extension).toBe("html");
    expect(html.content).toContain("<!doctype html>");
    expect(html.content).not.toContain("By Nina Koskinen");
    expect(html.content).toContain("Publishing metadata");

    const plain = serializePlainText(draft, inclusions);
    expect(plain).toContain(draft.title);
    expect(plain).not.toContain(`# ${draft.title}`);
  });

  it("sanitizes filenames and validates stored settings", () => {
    expect(slugifyFilename("  Héllo, Great Idea!  ")).toBe("hello-great-idea");
    expect(
      parseExportSettings(JSON.stringify(DEFAULT_EXPORT_SETTINGS)),
    ).toEqual(DEFAULT_EXPORT_SETTINGS);
    expect(parseExportSettings('{"schemaVersion":2}')).toBeNull();
    expect(
      parseExportSettings(
        JSON.stringify({ ...DEFAULT_EXPORT_SETTINGS, format: "pdf" }),
      ),
    ).toBeNull();
    expect(
      parseExportSettings(
        JSON.stringify({
          ...DEFAULT_EXPORT_SETTINGS,
          inclusions: { title: true },
        }),
      ),
    ).toBeNull();
  });
});
