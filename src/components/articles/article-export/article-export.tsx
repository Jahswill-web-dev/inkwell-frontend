"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { ArticleProgress } from "../article-progress/article-progress";
import {
  createDefaultDraft,
  DRAFT_STORAGE_KEY,
  parseDraft,
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

export function ArticleExport() {
  const router = useRouter();
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

  useEffect(() => {
    const savedDraft =
      parseDraft(window.sessionStorage.getItem(DRAFT_STORAGE_KEY)) ??
      createDefaultDraft();
    const savedSettings =
      parseExportSettings(
        window.sessionStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY),
      ) ?? DEFAULT_EXPORT_SETTINGS;
    const timer = window.setTimeout(() => {
      setDraft(savedDraft);
      setSettings(savedSettings);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

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

  return (
    <main className={styles.page}>
      <DashboardSidebar
        activeHref="/dashboard?section=articles"
        showSettings={false}
      />
      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <button
            aria-label="Back to review"
            className={styles.mobileBack}
            onClick={() => router.push("/articles/new/review")}
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
          <ArticleProgress currentStep="export" compact />
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
            onClick={() => router.push("/articles/new/review")}
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
