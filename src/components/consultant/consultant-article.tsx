"use client";
import {
  CaretDown,
  CheckCircle,
  Code,
  Copy,
  DownloadSimple,
  Export,
  PencilSimple,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  consultantRequest as api,
  type Article,
  type Revision,
  type Section,
} from "@/lib/consultant/client";
import { DraftRichSection } from "@/components/articles/draft-editor/draft-rich-section";
import styles from "./consultant.module.css";
type ExportNode = {
  type?: string;
  text?: string;
  url?: string;
  children?: ExportNode[];
};
function safeSourceUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}
function markdownNode(node: ExportNode): string {
  const content =
    (node.children ?? []).map(markdownNode).join("") || node.text || "";
  if (node.type === "link") {
    const url = safeSourceUrl(node.url);
    return url ? `[${content}](${url})` : content;
  }
  return node.type === "paragraph" ? `${content}\n\n` : content;
}
function htmlNode(node: ExportNode): string {
  const content =
    (node.children ?? []).map(htmlNode).join("") || escapeHtml(node.text || "");
  if (node.type === "link") {
    const url = safeSourceUrl(node.url);
    return url
      ? `<a href="${escapeHtml(url)}" rel="noopener noreferrer">${content}</a>`
      : content;
  }
  return node.type === "paragraph" ? `<p>${content}</p>` : content;
}
function markdown(title: string, sections: Section[]) {
  return (
    `# ${title}\n\n` +
    sections
      .map(
        (s) =>
          `## ${s.title}\n\n${markdownNode(JSON.parse(s.editor_state).root).trim()}`,
      )
      .join("\n\n")
  );
}
function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function withoutHeadingNumber(title: string) {
  return title.replace(/^\s*\d+[.)]\s+/, "");
}

function normalizeArticleHeadings(article: Article): Article {
  const normalize = (section: Section) => ({
    ...section,
    title: withoutHeadingNumber(section.title).trim(),
  });
  return {
    ...article,
    sections: article.sections.map(normalize),
    revisions: article.revisions.map((revision) => ({
      ...revision,
      sections: revision.sections.map(normalize),
    })),
  };
}

function revisionLabel(kind: string) {
  if (kind === "proposal") return "Rewrite proposal";
  if (kind === "generated") return "Generated draft";
  return `${kind.charAt(0).toUpperCase()}${kind.slice(1)} draft`;
}

function sectionsMatch(left: Section[], right: Section[]) {
  return (
    left.length === right.length &&
    left.every(
      (section, index) =>
        section.title === right[index]?.title &&
        section.editor_state === right[index]?.editor_state,
    )
  );
}

function sectionText(section: Section): string {
  const walk = (node: ExportNode): string =>
    (node.text ?? "") +
    (node.children ?? []).map(walk).join(node.type === "root" ? "\n" : "");
  return walk(JSON.parse(section.editor_state).root);
}

function wordChanges(before: string, after: string) {
  const left = before.match(/\s+|\S+/g) ?? [];
  const right = after.match(/\s+|\S+/g) ?? [];
  const rows = Array.from({ length: left.length + 1 }, () =>
    Array<number>(right.length + 1).fill(0),
  );
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      rows[i][j] =
        left[i] === right[j]
          ? rows[i + 1][j + 1] + 1
          : Math.max(rows[i + 1][j], rows[i][j + 1]);
    }
  }
  if (rows[0][0] < Math.max(left.length, right.length) * 0.35) {
    return [
      { kind: "removed_block", text: before },
      { kind: "added_block", text: after },
    ];
  }
  const changes: { kind: "same" | "added" | "removed"; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      changes.push({ kind: "same", text: left[i++] });
      j++;
    } else if (
      j < right.length &&
      (i === left.length || rows[i][j + 1] >= rows[i + 1][j])
    ) {
      changes.push({ kind: "added", text: right[j++] });
    } else {
      changes.push({ kind: "removed", text: left[i++] });
    }
  }
  return changes;
}

export function ConsultantArticleScreen({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailTitle, setDetailTitle] = useState("");
  const [detailDescription, setDetailDescription] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const assistantInputRef = useRef<HTMLTextAreaElement>(null);
  const assistantTriggerRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [preview, setPreview] = useState<Revision | null>(null);
  const [previewMode, setPreviewMode] = useState<"version" | "compare">(
    "version",
  );
  const previewDialogRef = useRef<HTMLElement>(null);
  const previewCloseButtonRef = useRef<HTMLButtonElement>(null);
  const previewTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const reload = useCallback(async () => {
    const a = normalizeArticleHeadings(
      await api<Article>(`articles/${articleId}`),
    );
    setArticle(a);
    if (!dirtyRef.current) setSections(a.sections);
    return a;
  }, [articleId]);
  useEffect(() => {
    let active = true;
    api<Article>(`articles/${articleId}`)
      .then((response) => {
        if (active) {
          const a = normalizeArticleHeadings(response);
          setArticle(a);
          setSections(a.sections);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [articleId]);
  useEffect(() => {
    if (!article?.job || !["queued", "running"].includes(article.job.state))
      return;
    const timer = setInterval(() => {
      void reload().catch((e) => setError(e.message));
    }, 2500);
    return () => clearInterval(timer);
  }, [article?.job, reload]);
  useEffect(() => {
    if (!exportOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [exportOpen]);
  useEffect(() => {
    if (!assistantOpen || preview) return;
    assistantInputRef.current?.focus();
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAssistantOpen(false);
        assistantTriggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [assistantOpen, preview]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    if (!preview) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() =>
      previewCloseButtonRef.current?.focus(),
    );
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setPreview(null);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = previewDialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      window.requestAnimationFrame(() => previewTriggerRef.current?.focus());
    };
  }, [preview]);

  function openPreview(revision: Revision, trigger: HTMLButtonElement) {
    previewTriggerRef.current = trigger;
    setPreviewMode("compare");
    setPreview(revision);
  }

  function closePreview() {
    setPreview(null);
  }
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    await api(
      `articles/${articleId}/draft`,
      "PUT",
      { sections },
      { "If-Unmodified-Since": article?.draft_updated_at ?? "" },
    );
    dirtyRef.current = false;
    setDirty(false);
    const updated = await reload();
    setNotice("Draft saved.");
    return updated;
  }
  async function requestAIChange() {
    const requestText = instruction.trim();
    if (requestText.length < 3) return;
    const current = dirty ? await save() : article;
    if (!current?.draft_updated_at) return;
    await api(
      `articles/${articleId}/ai-requests`,
      "POST",
      {
        instruction: requestText,
        request_key: crypto.randomUUID(),
      },
      { "If-Unmodified-Since": current.draft_updated_at },
    );
    await reload();
    setNotice("Your suggestion is being prepared.");
  }
  async function start() {
    const i = await api<{ id: string }>(
      `articles/${articleId}/interviews`,
      "POST",
    );
    router.push(`/consultant/interviews/${i.id}`);
  }
  async function exportDraft(format: "copy" | "markdown" | "html") {
    if (!article) return;
    if (dirty) await save();
    const md = markdown(article.title, sections);
    if (format === "copy") {
      await navigator.clipboard.writeText(md);
      setCopied(true);
      setNotice("Article copied to clipboard.");
      return;
    }
    const content =
      format === "markdown"
        ? md
        : `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escapeHtml(article.title)}</title><body><h1>${escapeHtml(article.title)}</h1>${sections
            .map(
              (s) =>
                `<h2>${escapeHtml(s.title)}</h2>${htmlNode(JSON.parse(s.editor_state).root)}`,
            )
            .join("")}</body></html>`;
    const url = URL.createObjectURL(
      new Blob([content], {
        type:
          format === "html"
            ? "text/html;charset=utf-8"
            : "text/markdown;charset=utf-8",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${article.title.replace(/[^a-z0-9]+/gi, "-").slice(0, 80)}.${format === "html" ? "html" : "md"}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setExportOpen(false);
    setNotice("Draft exported.");
  }
  if (!article)
    return (
      <p role={error ? "alert" : "status"}>
        {error || "Loading your article…"}
      </p>
    );
  const generating =
    article.job && ["queued", "running"].includes(article.job.state);
  const aiJob =
    article.job?.request_kind === "ask_ai" ||
    (article.job &&
      !article.job.request_kind &&
      !["initial", "clearer", "concise", "closer", "updated"].includes(
        article.job.instruction ?? "initial",
      ));
  const proposal = article.revisions[0];
  const generationSteps = [
    { id: "understand", label: "Understand your argument and voice" },
    { id: "write", label: "Write the article" },
    { id: "check", label: "Check it against your interview" },
  ];
  const activeStage = generationSteps.findIndex(
    (step) => step.id === article.job?.stage,
  );
  const previewHasDifferences = preview
    ? !sectionsMatch(sections, preview.sections)
    : false;
  const savedDetailTitle = article.title;
  const savedDetailDescription = article.description;
  const detailsDirty =
    detailTitle !== savedDetailTitle ||
    detailDescription !== savedDetailDescription;

  function resetArticleDetails() {
    setDetailTitle(savedDetailTitle);
    setDetailDescription(savedDetailDescription);
  }

  return (
    <>
      <p className={styles.eyebrow}>My article</p>
      <h1>{article.title}</h1>
      <div className={styles.articleDetails}>
        <button
          aria-controls="article-details-panel"
          aria-expanded={detailsOpen}
          className={styles.articleDetailsTrigger}
          onClick={() => {
            resetArticleDetails();
            setDetailsOpen((open) => !open);
          }}
          type="button"
        >
          <PencilSimple aria-hidden="true" size={19} weight="bold" />
          <span>Article details</span>
          <CaretDown
            aria-hidden="true"
            className={detailsOpen ? styles.articleDetailsCaretOpen : ""}
            size={16}
            weight="bold"
          />
        </button>
        {detailsOpen && (
          <form
            className={styles.articleDetailsPanel}
            id="article-details-panel"
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                await api(`articles/${articleId}/details`, "PUT", {
                  title: detailTitle,
                  description: detailDescription,
                });
                await reload();
                setNotice("Article details saved.");
              });
            }}
          >
            <header className={styles.articleDetailsHeader}>
              <h2>Article details</h2>
              <p>
                Set the title and short brief used when drafting and exporting.
              </p>
            </header>
            <div className={styles.articleDetailsBody}>
              <label className={styles.articleDetailsField}>
                <span className={styles.articleDetailsLabel}>
                  <span>Working title</span>
                  <span aria-hidden="true">{detailTitle.length}/200</span>
                </span>
                <input
                  aria-label="Working title"
                  name="title"
                  value={detailTitle}
                  onChange={(event) => setDetailTitle(event.target.value)}
                  required
                  maxLength={200}
                />
              </label>
              <label className={styles.articleDetailsField}>
                <span className={styles.articleDetailsLabel}>
                  <span>Article brief</span>
                  <span aria-hidden="true">
                    {detailDescription.length.toLocaleString()}/20,000
                  </span>
                </span>
                <textarea
                  aria-label="Article brief"
                  name="description"
                  value={detailDescription}
                  onChange={(event) => setDetailDescription(event.target.value)}
                  required
                  maxLength={20000}
                />
                <small>
                  A short summary to guide the drafting process and keep the
                  content focused.
                </small>
              </label>
            </div>
            <footer className={styles.articleDetailsFooter}>
              <span aria-live="polite" className={styles.articleDetailsStatus}>
                {detailsDirty ? "Unsaved changes" : ""}
              </span>
              <div className={styles.articleDetailsActions}>
                <button
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() => {
                    resetArticleDetails();
                    setDetailsOpen(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>
                <button
                  className={styles.primary}
                  disabled={busy || !!generating || !detailsDirty}
                  type="submit"
                >
                  Save changes
                </button>
              </div>
            </footer>
          </form>
        )}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {generating && !aiJob && (
        <section
          className={`${styles.card} ${styles.generationCard}`}
          aria-live="polite"
          role="status"
        >
          <div className={styles.generationHeading}>
            <span className={styles.spinner} aria-hidden="true" />
            <div>
              <p className={styles.eyebrow}>Draft in progress</p>
              <h2>
                {article.job?.state === "queued"
                  ? article.job.attempts > 0
                    ? "Your draft will retry shortly"
                    : "Your draft is waiting to begin"
                  : ({
                      understand: "Finding your argument and voice",
                      write: "Writing your article",
                      check: "Checking the draft against your interview",
                    }[article.job!.stage] ?? "Creating your draft")}
              </h2>
            </div>
          </div>
          <ol className={styles.generationSteps}>
            {generationSteps.map((step, index) => {
              const complete =
                article.job?.state === "running" && index < activeStage;
              const current =
                article.job?.state === "running" && index === activeStage;
              return (
                <li
                  key={step.id}
                  className={
                    complete
                      ? styles.stepComplete
                      : current
                        ? styles.stepCurrent
                        : styles.stepPending
                  }
                >
                  <span aria-hidden="true">{complete ? "✓" : index + 1}</span>
                  {step.label}
                </li>
              );
            })}
          </ol>
          <p>
            You can leave this page. Your interview is saved, and drafting
            continues in the background.
          </p>
        </section>
      )}
      {article.job?.state === "failed" && !aiJob && (
        <section className={styles.card} role="alert">
          <p className={styles.generationFailureText}>{article.job.error}</p>
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await api(`jobs/${article.job!.id}/retry`, "POST");
                await reload();
              })
            }
          >
            Retry generation
          </button>
        </section>
      )}
      {article.job?.state === "succeeded" &&
        !aiJob &&
        (article.job.writing_suggestions?.length ?? 0) > 0 && (
          <section className={`${styles.card} ${styles.writingNotes}`}>
            <h2>Writing notes</h2>
            <p>
              Your article is ready. These optional ideas may help you polish
              it.
            </p>
            <ul>
              {article.job.writing_suggestions?.map((suggestion, index) => (
                <li key={`${suggestion.section}-${index}`}>
                  <strong>{suggestion.section}:</strong> {suggestion.text}
                </li>
              ))}
            </ul>
          </section>
        )}
      {!sections.length && !generating && !article.job && (
        <section className={styles.card}>
          <p>{article.description}</p>
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() => void run(start)}
          >
            {article.interviews.length
              ? "Resume interview"
              : "Prepare my interview"}
          </button>
        </section>
      )}
      {sections.length > 0 && (
        <>
          <div className={styles.actions}>
            <button
              className={styles.primary}
              disabled={busy || !dirty}
              onClick={() => void run(save)}
            >
              {dirty ? "Save changes" : "Saved"}
            </button>
            <button
              aria-controls="consultant-ai-drawer"
              aria-expanded={assistantOpen}
              className={`${styles.primary} ${styles.assistantTrigger}`}
              onClick={() => setAssistantOpen((open) => !open)}
              ref={assistantTriggerRef}
              type="button"
            >
              <Sparkle aria-hidden="true" size={18} weight="fill" />
              {proposal
                ? "Review AI suggestion"
                : generating && aiJob
                  ? "AI is working"
                  : "Ask AI"}
            </button>
            <div className={styles.exportMenu} ref={exportMenuRef}>
              <button
                aria-expanded={exportOpen}
                aria-haspopup="menu"
                className={styles.exportTrigger}
                disabled={busy}
                onClick={() => {
                  setCopied(false);
                  setExportOpen((open) => !open);
                }}
              >
                <Export aria-hidden="true" size={20} />
                Export
                <CaretDown
                  aria-hidden="true"
                  className={exportOpen ? styles.exportCaretOpen : ""}
                  size={16}
                />
              </button>
              {exportOpen && (
                <section
                  aria-label="Export article"
                  className={styles.exportPopover}
                  role="menu"
                >
                  <header className={styles.exportHeader}>
                    <h2>Export article</h2>
                    <p>Choose how you’d like to use your draft.</p>
                  </header>
                  <button
                    className={`${styles.exportOption} ${styles.exportOptionPrimary}`}
                    disabled={busy}
                    onClick={() => void run(() => exportDraft("copy"))}
                    role="menuitem"
                  >
                    <Copy aria-hidden="true" size={24} />
                    <span>
                      <strong>Copy to clipboard</strong>
                      <small>Paste into Docs, Notion, or your CMS</small>
                    </span>
                    {copied && (
                      <span className={styles.exportSuccess} role="status">
                        <CheckCircle
                          aria-hidden="true"
                          size={20}
                          weight="fill"
                        />
                        Copied
                      </span>
                    )}
                  </button>
                  <button
                    className={styles.exportOption}
                    disabled={busy}
                    onClick={() => void run(() => exportDraft("markdown"))}
                    role="menuitem"
                  >
                    <DownloadSimple aria-hidden="true" size={24} />
                    <span>
                      <strong>Download Markdown</strong>
                      <small>
                        Best for writing tools and publishing workflows
                      </small>
                    </span>
                  </button>
                  <button
                    className={styles.exportOption}
                    disabled={busy}
                    onClick={() => void run(() => exportDraft("html"))}
                    role="menuitem"
                  >
                    <Code aria-hidden="true" size={24} />
                    <span>
                      <strong>Download HTML</strong>
                      <small>Ready for websites and email editors</small>
                    </span>
                  </button>
                </section>
              )}
            </div>
          </div>
          <p className={styles.muted}>
            {dirty
              ? "You have unsaved changes. Save before leaving this page."
              : "Your accepted draft is saved."}
          </p>
          <div className={styles.editor}>
            {sections.map((s, index) => (
              <DraftRichSection
                key={`${editorVersion}:${s.id}`}
                section={{
                  ...s,
                  outlineSectionId: s.outline_section_id,
                  editorState: s.editor_state,
                }}
                index={index}
                onTitleChange={(id, title) => {
                  setSections((current) =>
                    current.map((section) =>
                      section.id === id
                        ? { ...section, title: withoutHeadingNumber(title) }
                        : section,
                    ),
                  );
                  dirtyRef.current = true;
                  setDirty(true);
                }}
                showSectionNumber={false}
                onChange={(id, state) => {
                  setSections((current) => {
                    const next = current.map((s) =>
                      s.id === id ? { ...s, editor_state: state } : s,
                    );
                    return next;
                  });
                  dirtyRef.current = true;
                  setDirty(true);
                }}
              />
            ))}
          </div>
          <p className={styles.muted}>
            Ask AI to improve this article. You will review the full suggestion
            before it replaces your draft.
          </p>
        </>
      )}
      {assistantOpen && sections.length > 0 && (
        <aside
          aria-label="Ask AI to improve this article"
          className={styles.assistantDrawer}
          id="consultant-ai-drawer"
        >
          <header className={styles.assistantHeader}>
            <div>
              <p className={styles.eyebrow}>Your writing partner</p>
              <h2>Ask AI to improve this draft</h2>
            </div>
            <button
              aria-label="Close Ask AI"
              className={styles.previewClose}
              onClick={() => {
                setAssistantOpen(false);
                assistantTriggerRef.current?.focus();
              }}
              type="button"
            >
              <X aria-hidden="true" size={20} />
            </button>
          </header>
          <div className={styles.assistantBody}>
            {proposal ? (
              <div className={styles.assistantResult} role="status">
                <span className={styles.assistantResultIcon}>
                  <CheckCircle size={20} weight="fill" />
                </span>
                <h3>Your suggestion is ready</h3>
                <p>
                  {proposal.summary ||
                    "Review the proposed article before replacing your current draft."}
                </p>
                {proposal.request && (
                  <p className={styles.assistantRequest}>
                    Your request: “{proposal.request}”
                  </p>
                )}
                {(proposal.sources?.length ?? 0) > 0 && (
                  <div className={styles.assistantSources}>
                    <strong>Sources used</strong>
                    {proposal.sources?.map((source) => (
                      <a
                        href={source.url}
                        key={source.id}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {source.title}
                      </a>
                    ))}
                  </div>
                )}
                {proposal.request &&
                  /\b(source|citation|research|real.world|study|statistics?)\b/i.test(
                    proposal.request,
                  ) &&
                  !proposal.sources?.length && (
                    <p className={styles.assistantSourceNote}>
                      No verifiable public source was found. Check the full
                      proposal for any omitted examples.
                    </p>
                  )}
                <button
                  className={styles.primary}
                  onClick={(event) =>
                    openPreview(proposal, event.currentTarget)
                  }
                  type="button"
                >
                  Review full article
                </button>
              </div>
            ) : generating && aiJob ? (
              <div
                aria-live="polite"
                className={styles.assistantProgress}
                role="status"
              >
                <p className={styles.assistantRequest}>
                  Your request: “{article.job?.instruction}”
                </p>
                <span className={styles.spinner} aria-hidden="true" />
                <h3>Preparing your preview</h3>
                <ol>
                  <li
                    className={
                      article.job?.stage === "plan" ? styles.stepCurrent : ""
                    }
                  >
                    Understanding the requested changes
                  </li>
                  <li
                    className={
                      article.job?.stage === "understand"
                        ? styles.stepCurrent
                        : styles.stepComplete
                    }
                  >
                    Reading your draft and interview
                  </li>
                  <li
                    className={
                      article.job?.stage === "research"
                        ? styles.stepCurrent
                        : ""
                    }
                  >
                    Finding sources when needed
                  </li>
                  <li
                    className={
                      article.job?.stage === "write" ? styles.stepCurrent : ""
                    }
                  >
                    Writing the suggestion
                  </li>
                  <li
                    className={
                      ["check", "repair"].includes(article.job?.stage ?? "")
                        ? styles.stepCurrent
                        : ""
                    }
                  >
                    Checking the result
                  </li>
                </ol>
                <p>Your saved draft stays unchanged while this runs.</p>
              </div>
            ) : (
              <form
                id="consultant-ai-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void run(requestAIChange);
                }}
              >
                {aiJob && article.job?.state === "needs_clarification" && (
                  <div className={styles.assistantClarification} role="status">
                    <strong>One detail before I make the change</strong>
                    <p>{article.job.clarification_question}</p>
                    <p>
                      Add the detail to your request below, then generate a new
                      preview.
                    </p>
                  </div>
                )}
                {aiJob && article.job?.state === "failed" && (
                  <div className={styles.assistantFailure} role="alert">
                    <strong>We couldn’t prepare the suggestion.</strong>
                    <p className={styles.generationFailureText}>
                      {article.job.error}
                    </p>
                    {!article.job.error?.startsWith(
                      "Your draft changed while this suggestion was generated.",
                    ) && (
                      <button
                        className={styles.secondary}
                        disabled={busy}
                        onClick={() =>
                          void run(async () => {
                            await api(`jobs/${article.job!.id}/retry`, "POST");
                            await reload();
                          })
                        }
                        type="button"
                      >
                        Retry request
                      </button>
                    )}
                  </div>
                )}
                <label
                  className={styles.assistantLabel}
                  htmlFor="consultant-ai-instruction"
                >
                  What would you like to change?
                </label>
                <textarea
                  id="consultant-ai-instruction"
                  maxLength={1200}
                  onChange={(event) => setInstruction(event.target.value)}
                  placeholder="Describe a change you’d like to see in the article…"
                  ref={assistantInputRef}
                  required
                  value={instruction}
                />
                <div className={styles.assistantSuggestions}>
                  <span>Try asking</span>
                  {[
                    "Make the article more structured",
                    "Add real-world examples with sources",
                    "Make the opening clearer",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInstruction(suggestion);
                        assistantInputRef.current?.focus();
                      }}
                      type="button"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </form>
            )}
          </div>
          <footer className={styles.assistantFooter}>
            {!proposal && !(generating && aiJob) && (
              <button
                className={styles.primary}
                disabled={busy || !!generating || instruction.trim().length < 3}
                form="consultant-ai-form"
                type="submit"
              >
                <Sparkle aria-hidden="true" size={18} /> Generate preview
              </button>
            )}
            <span>Your draft changes only when you approve a preview.</span>
          </footer>
        </aside>
      )}
      {preview && (
        <div
          className={styles.previewBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closePreview();
          }}
        >
          <section
            aria-labelledby="consultant-version-preview-title"
            aria-modal="true"
            className={styles.previewDialog}
            ref={previewDialogRef}
            role="dialog"
          >
            <header className={styles.previewHeader}>
              <div>
                <p className={styles.eyebrow}>Suggested rewrite</p>
                <h2 id="consultant-version-preview-title">
                  Preview suggested rewrite
                </h2>
                <div className={styles.previewMetadata}>
                  <span>{preview.request || revisionLabel(preview.kind)}</span>
                  <span aria-hidden="true">·</span>
                  <time dateTime={preview.created_at}>
                    {new Date(preview.created_at).toLocaleString()}
                  </time>
                </div>
              </div>
              <button
                aria-label="Close rewrite preview"
                className={styles.previewClose}
                onClick={closePreview}
                ref={previewCloseButtonRef}
              >
                <X aria-hidden="true" size={22} />
              </button>
            </header>

            {(preview.summary || (preview.sources?.length ?? 0) > 0) && (
              <div className={styles.previewSummary}>
                {preview.summary && <p>{preview.summary}</p>}
                {(preview.sources?.length ?? 0) > 0 && (
                  <p>
                    Sources:{" "}
                    {preview.sources?.map((source, index) => (
                      <span key={source.id}>
                        {index > 0 ? " · " : ""}
                        <a
                          href={source.url}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {source.title}
                        </a>
                      </span>
                    ))}
                  </p>
                )}
              </div>
            )}

            {previewHasDifferences && (
              <div
                aria-label="Rewrite preview view"
                className={styles.previewToggle}
                role="group"
              >
                <button
                  aria-pressed={previewMode === "version"}
                  className={previewMode === "version" ? styles.active : ""}
                  onClick={() => setPreviewMode("version")}
                >
                  Rewrite only
                </button>
                <button
                  aria-pressed={previewMode === "compare"}
                  className={previewMode === "compare" ? styles.active : ""}
                  onClick={() => setPreviewMode("compare")}
                >
                  Compare with current
                </button>
              </div>
            )}

            <div className={styles.previewBody}>
              {previewMode === "compare" && previewHasDifferences ? (
                <div className={styles.comparisonGrid}>
                  <article className={styles.comparisonPane}>
                    <h3>Current draft</h3>
                    {sections.map((section, index) => (
                      <DraftRichSection
                        key={`current:${section.id}`}
                        section={{
                          ...section,
                          outlineSectionId: section.outline_section_id,
                          editorState: section.editor_state,
                        }}
                        index={index}
                        readOnly
                        showSectionNumber={false}
                      />
                    ))}
                  </article>
                  <article
                    className={`${styles.comparisonPane} ${styles.proposedPane}`}
                  >
                    <h3>Suggested rewrite</h3>
                    {preview.sections.map((section, index) => {
                      const original = sections.find(
                        (item) => item.id === section.id,
                      );
                      const originalIndex = sections.findIndex(
                        (item) => item.id === section.id,
                      );
                      const moved =
                        originalIndex >= 0 && originalIndex !== index;
                      const changed =
                        !original ||
                        original.title !== section.title ||
                        original.editor_state !== section.editor_state;
                      return (
                        <div
                          className={changed || moved ? styles.changedSection : ""}
                          key={`compare:${preview.id}:${section.id}`}
                        >
                          {(changed || moved) && (
                            <span className={styles.changeLabel}>
                              {moved
                                ? `Moved from section ${originalIndex + 1}`
                                : "Edited"}
                            </span>
                          )}
                          <DraftRichSection
                            section={{
                              ...section,
                              outlineSectionId: section.outline_section_id,
                              editorState: section.editor_state,
                            }}
                            index={index}
                            readOnly
                            showSectionNumber={false}
                          />
                          {original && changed && (
                            <div
                              className={styles.wordChanges}
                              aria-label={`Text changes in ${section.title}`}
                            >
                              <strong>Exact text changes</strong>
                              <p>
                                {wordChanges(
                                  original.title === section.title
                                    ? sectionText(original)
                                    : `${original.title}\n${sectionText(original)}`,
                                  original.title === section.title
                                    ? sectionText(section)
                                    : `${section.title}\n${sectionText(section)}`,
                                ).map((part, partIndex) =>
                                  part.kind === "added" ||
                                  part.kind === "added_block" ? (
                                    <ins
                                      className={
                                        part.kind === "added_block"
                                          ? styles.changeBlock
                                          : ""
                                      }
                                      key={partIndex}
                                    >
                                      {part.text}
                                    </ins>
                                  ) : part.kind === "removed" ||
                                    part.kind === "removed_block" ? (
                                    <del
                                      className={
                                        part.kind === "removed_block"
                                          ? styles.changeBlock
                                          : ""
                                      }
                                      key={partIndex}
                                    >
                                      {part.text}
                                    </del>
                                  ) : (
                                    <span key={partIndex}>{part.text}</span>
                                  ),
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </article>
                </div>
              ) : (
                <article className={styles.versionPreview}>
                  {preview.sections.map((section, index) => (
                    <DraftRichSection
                      key={`preview:${preview.id}:${section.id}`}
                      section={{
                        ...section,
                        outlineSectionId: section.outline_section_id,
                        editorState: section.editor_state,
                      }}
                      index={index}
                      readOnly
                      showSectionNumber={false}
                    />
                  ))}
                </article>
              )}
            </div>

            <footer className={styles.previewFooter}>
              <div>
                <strong>Ready to switch?</strong>
                <span>This will replace your current draft.</span>
                {dirty && (
                  <span className={styles.previewWarning}>
                    Save your current changes before applying this version.
                  </span>
                )}
              </div>
              <div className={styles.previewActions}>
                <button
                  className={styles.secondary}
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await api(
                        `articles/${articleId}/revisions/${preview.id}`,
                        "DELETE",
                      );
                      await reload();
                      setPreview(null);
                      setInstruction("");
                      setNotice(
                        "Suggestion rejected. Your draft is unchanged.",
                      );
                    })
                  }
                >
                  Reject change
                </button>
                <button
                  className={styles.primary}
                  disabled={busy || dirty}
                  onClick={() =>
                    void run(async () => {
                      await api(
                        `articles/${articleId}/revisions/${preview.id}/apply`,
                        "POST",
                        undefined,
                        {
                          "If-Unmodified-Since": article.draft_updated_at ?? "",
                        },
                      );
                      await reload();
                      setEditorVersion((v) => v + 1);
                      setPreview(null);
                      setAssistantOpen(false);
                      setInstruction("");
                      setNotice("Draft updated with the suggested rewrite.");
                    })
                  }
                >
                  Use this version
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}
