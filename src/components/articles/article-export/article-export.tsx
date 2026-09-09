"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DEFAULT_AUTH_IDENTITY, type AuthIdentity } from "@/lib/auth/identity";
import {
  ArticleRequestError,
  getArticle,
  getArticleDraft,
} from "@/lib/articles/client";
import { ArticleProgress } from "../article-progress/article-progress";
import {
  createDefaultDraft,
  toDraftArticleState,
  type DraftArticleState,
} from "../draft-editor/draft-editor-data";
import {
  DEFAULT_EXPORT_SETTINGS,
  estimatedExportBytes,
  EXPORT_SETTINGS_STORAGE_KEY,
  formatBytes,
  parseExportSettings,
  serializeExport,
  serializePlainText,
  slugifyFilename,
  type ExportFormat,
  type ExportInclusions,
  type ExportSettings,
} from "./export-data";
import { ExportFormats } from "./export-formats";
import { ExportInclusionOptions } from "./export-inclusions";
import { ExportSummary } from "./export-summary";
import styles from "./article-export.module.css";

const articleIdSchema = z.string().uuid();
type LoadFailure = {
  kind: "missing-id" | "not-found" | "missing-draft" | "error";
  message: string;
  retryable: boolean;
};

function persistSettings(settings: ExportSettings) {
  window.sessionStorage.setItem(
    EXPORT_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings),
  );
}

function downloadExport(
  draft: DraftArticleState,
  format: ExportFormat,
  inclusions: ExportInclusions,
) {
  const serialized = serializeExport(draft, format, inclusions);
  const url = URL.createObjectURL(
    new Blob([serialized.content], { type: serialized.mimeType }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugifyFilename(draft.title)}.${serialized.extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyExport(
  draft: DraftArticleState,
  inclusions: ExportInclusions,
) {
  const html = serializeExport(draft, "copy", inclusions).content;
  const plain = serializePlainText(draft, inclusions);
  if (navigator.clipboard.write && typeof ClipboardItem !== "undefined") {
    await navigator.clipboard.write([
      new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      }),
    ]);
    return;
  }
  await navigator.clipboard.writeText(plain);
}

export function ArticleExport({
  articleId,
  identity = DEFAULT_AUTH_IDENTITY,
}: {
  articleId?: string;
  identity?: AuthIdentity;
}) {
  const { push } = useRouter();
  const validArticleId = articleIdSchema.safeParse(articleId);
  const savedArticleId = validArticleId.success ? validArticleId.data : null;
  const exportPath = savedArticleId
    ? `/articles/new/export?articleId=${encodeURIComponent(savedArticleId)}`
    : "/articles/new/export";
  const loginPath = `/login?next=${encodeURIComponent(exportPath)}`;
  const [draft, setDraft] = useState<DraftArticleState>(() =>
    createDefaultDraft(),
  );
  const [settings, setSettings] = useState<ExportSettings>(
    DEFAULT_EXPORT_SETTINGS,
  );
  const [hydrated, setHydrated] = useState(false);
  const [inclusionsExpanded, setInclusionsExpanded] = useState(true);
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const [loadFailure, setLoadFailure] = useState<LoadFailure | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadFailure(null);
      if (!savedArticleId) {
        setLoadFailure({
          kind: "missing-id",
          message: "Choose an article before opening its export options.",
          retryable: false,
        });
        setHydrated(true);
        return;
      }
      try {
        const [article, saved] = await Promise.all([
          getArticle(savedArticleId),
          getArticleDraft(savedArticleId),
        ]);
        if (!active) return;
        setDraft(toDraftArticleState(article, saved));
        setSettings(
          parseExportSettings(
            window.sessionStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY),
          ) ?? DEFAULT_EXPORT_SETTINGS,
        );
      } catch (caught) {
        if (!active) return;
        if (caught instanceof ArticleRequestError && caught.status === 401) {
          push(loginPath);
          return;
        }
        const code =
          caught instanceof ArticleRequestError ? caught.code : "export_error";
        setLoadFailure({
          kind:
            code === "article_not_found"
              ? "not-found"
              : code === "draft_not_found"
                ? "missing-draft"
                : "error",
          message:
            code === "article_not_found"
              ? "This article could not be found."
              : code === "draft_not_found"
                ? "Start the article draft before opening Export."
                : caught instanceof ArticleRequestError
                  ? caught.message
                  : "We couldn’t load this draft for export.",
          retryable:
            !(caught instanceof ArticleRequestError) ||
            [502, 503, 504].includes(caught.status),
        });
      } finally {
        if (active) setHydrated(true);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [loginPath, push, retryKey, savedArticleId]);

  const estimatedSize = useMemo(
    () =>
      formatBytes(
        estimatedExportBytes(draft, settings.format, settings.inclusions),
      ),
    [draft, settings],
  );

  const selectFormat = (format: ExportFormat) => {
    setSettings((current) => ({ ...current, format }));
    setStatus("");
  };

  const selectInclusions = (inclusions: ExportInclusions) => {
    setSettings((current) => ({ ...current, inclusions }));
    setStatus("");
  };

  const saveDraft = () => {
    const saved = { ...settings, savedAt: new Date().toISOString() };
    setSettings(saved);
    persistSettings(saved);
    setStatus("Export settings saved.");
  };

  const exportArticle = async () => {
    setExporting(true);
    setStatus("");
    try {
      if (settings.format === "copy") {
        await copyExport(draft, settings.inclusions);
        setStatus("Formatted article copied to your clipboard.");
      } else if (settings.format === "markdown" || settings.format === "html") {
        downloadExport(draft, settings.format, settings.inclusions);
        setStatus(
          `${settings.format === "markdown" ? "Markdown" : "HTML"} export downloaded.`,
        );
      }
      persistSettings({ ...settings, savedAt: new Date().toISOString() });
    } catch {
      setStatus(
        settings.format === "copy"
          ? "Clipboard access was blocked. Please allow clipboard access and try again."
          : "The export could not be created. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  };

  if (!hydrated) {
    return <main className={styles.loading}>Preparing your export…</main>;
  }

  if (loadFailure)
    return (
      <main className={styles.loading}>
        <div className={styles.loadState}>
          <span role="alert">{loadFailure.message}</span>
          {loadFailure.kind === "missing-draft" && savedArticleId ? (
            <Link href={`/articles/new/draft?articleId=${savedArticleId}`}>
              Open draft
            </Link>
          ) : null}
          {loadFailure.kind === "missing-id" ||
          loadFailure.kind === "not-found" ? (
            <Link href="/dashboard?section=articles">Back to articles</Link>
          ) : null}
          {loadFailure.retryable ? (
            <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
              Try again
            </button>
          ) : null}
        </div>
      </main>
    );

  return (
    <main className={styles.page}>
      <DashboardSidebar
        activeHref="/dashboard?section=articles"
        identity={identity}
        showSettings={false}
      />
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            aria-label="Back to review"
            className={styles.mobileBack}
            onClick={() =>
              push(`/articles/new/review?articleId=${savedArticleId}`)
            }
            type="button"
          >
            <ArrowLeft size={31} aria-hidden />
          </button>
          <div className={styles.mobileTitle}>
            <Image
              src="/images/inkwell-icon.png"
              alt=""
              width={35}
              height={48}
              priority
            />
            <strong>Export</strong>
          </div>
          <ArticleProgress
            currentStep="publish"
            compact
            articleId={articleId}
          />
        </header>

        <div className={styles.content}>
          <section className={styles.configuration}>
            <header className={styles.intro}>
              <h1>Export your article</h1>
              <p className={styles.desktopDescription}>
                Choose a format and what to include.
              </p>
              <p className={styles.mobileDescription}>
                Choose a format and what to include in your export.
              </p>
            </header>
            <ExportFormats value={settings.format} onChange={selectFormat} />
            <ExportInclusionOptions
              expanded={inclusionsExpanded}
              value={settings.inclusions}
              onExpandedChange={setInclusionsExpanded}
              onChange={selectInclusions}
            />
          </section>

          <ExportSummary
            draft={draft}
            format={settings.format}
            estimatedSize={estimatedSize}
          />
        </div>

        <footer className={styles.actions}>
          <button
            className={styles.backButton}
            onClick={() =>
              push(`/articles/new/review?articleId=${savedArticleId}`)
            }
            type="button"
          >
            Back
          </button>
          <div>
            <button
              className={styles.saveButton}
              onClick={saveDraft}
              type="button"
            >
              Save draft
            </button>
            <button
              className={styles.exportButton}
              disabled={exporting}
              onClick={exportArticle}
              type="button"
            >
              {exporting ? "Exporting…" : "Export article"}
            </button>
          </div>
        </footer>

        <p className={styles.status} role="status" aria-live="polite">
          {status}
        </p>
      </div>
    </main>
  );
}
