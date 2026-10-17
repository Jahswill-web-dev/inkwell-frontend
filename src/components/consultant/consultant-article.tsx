"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  consultantRequest as api,
  type Article,
  type Interview,
  type Revision,
  type Section,
} from "@/lib/consultant/client";
import { DraftRichSection } from "@/components/articles/draft-editor/draft-rich-section";
import { ConsultantVoice } from "./consultant-voice";
import styles from "./consultant.module.css";
function plainText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const node = value as { text?: string; children?: unknown[]; type?: string };
  return (
    (node.text ?? "") +
    (node.children?.map(plainText).join(node.type === "root" ? "\n\n" : "") ??
      "")
  );
}
function markdown(title: string, sections: Section[]) {
  return (
    `# ${title}\n\n` +
    sections
      .map(
        (s) => `## ${s.title}\n\n${plainText(JSON.parse(s.editor_state).root)}`,
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
export function ConsultantArticleScreen({ articleId }: { articleId: string }) {
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Revision | null>(null);
  const [transcripts, setTranscripts] = useState<Interview[] | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const reload = useCallback(async () => {
    const a = await api<Article>(`articles/${articleId}`);
    setArticle(a);
    if (!dirtyRef.current) setSections(a.sections);
    return a;
  }, [articleId]);
  useEffect(() => {
    let active = true;
    api<Article>(`articles/${articleId}`)
      .then((a) => {
        if (active) {
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
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  async function run(action: () => Promise<void>) {
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
    await reload();
    setNotice("Draft saved.");
  }
  async function start() {
    const i = await api<{ id: string }>(
      `articles/${articleId}/interviews`,
      "POST",
    );
    router.push(`/consultant/interviews/${i.id}`);
  }
  async function generate(instruction: string) {
    if (dirty) await save();
    const interview = article?.interviews.at(-1);
    if (!interview) return;
    await api(`interviews/${interview.id}/generate`, "POST", {
      request_key: crypto.randomUUID(),
      instruction,
    });
    await reload();
  }
  async function exportDraft(format: "copy" | "markdown" | "html") {
    if (!article) return;
    if (dirty) await save();
    const md = markdown(article.title, sections);
    if (format === "copy") {
      await navigator.clipboard.writeText(md);
      setNotice("Draft copied.");
      return;
    }
    const content =
      format === "markdown"
        ? md
        : `<!doctype html><html lang="en"><meta charset="utf-8"><title>${escapeHtml(article.title)}</title><body><h1>${escapeHtml(article.title)}</h1>${sections
            .map(
              (s) =>
                `<h2>${escapeHtml(s.title)}</h2>${plainText(
                  JSON.parse(s.editor_state).root,
                )
                  .split("\n\n")
                  .map((p) => `<p>${escapeHtml(p)}</p>`)
                  .join("")}`,
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
  return (
    <>
      <p className={styles.eyebrow}>My article</p>
      <h1>{article.title}</h1>
      <details>
        <summary>Edit article details</summary>
        <form
          className={`${styles.form} ${styles.card}`}
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            void run(async () => {
              await api(`articles/${articleId}/details`, "PUT", {
                title: data.get("title"),
                description: data.get("description"),
              });
              await reload();
              setNotice("Article details saved.");
            });
          }}
        >
          <label>
            Working title
            <input
              name="title"
              defaultValue={article.title}
              required
              maxLength={200}
            />
          </label>
          <label>
            What is it about?
            <textarea
              name="description"
              defaultValue={article.description}
              required
              maxLength={20000}
            />
          </label>
          <button className={styles.secondary} disabled={busy || !!generating}>
            Save article details
          </button>
        </form>
      </details>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {generating && (
        <section className={styles.card} aria-live="polite">
          <h2>
            {article.job?.state === "queued"
              ? "Your draft is queued"
              : ({
                  understand: "Finding your argument and voice",
                  write: "Writing your article",
                  check: "Checking the draft against your interview",
                }[article.job!.stage] ?? "Creating your draft")}
          </h2>
          <p>
            You can leave this page. Your interview is saved, and drafting
            continues in the background.
          </p>
        </section>
      )}
      {article.job?.state === "failed" && (
        <section className={styles.card}>
          <p>{article.job.error}</p>
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
              className={styles.secondary}
              disabled={busy || !!generating || dirty}
              onClick={() => void run(start)}
            >
              Add more detail
            </button>
            <button
              className={styles.secondary}
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  setTranscripts(
                    await Promise.all(
                      article.interviews.map((i) =>
                        api<Interview>(`interviews/${i.id}`),
                      ),
                    ),
                  );
                })
              }
            >
              View interview
            </button>
            <details>
              <summary>Export</summary>
              <div className={styles.actions}>
                {(["copy", "markdown", "html"] as const).map((format) => (
                  <button
                    key={format}
                    className={styles.secondary}
                    disabled={busy}
                    onClick={() => void run(() => exportDraft(format))}
                  >
                    {format === "copy"
                      ? "Copy draft"
                      : `Download ${format.toUpperCase()}`}
                  </button>
                ))}
              </div>
            </details>
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
          <div className={styles.actions}>
            {(
              [
                ["clearer", "Make this clearer"],
                ["concise", "Make this more concise"],
                ["closer", "Closer to my interview wording"],
              ] as const
            ).map(([instruction, label]) => (
              <button
                className={styles.secondary}
                key={instruction}
                disabled={busy || !!generating}
                onClick={() => void run(() => generate(instruction))}
              >
                {label}
              </button>
            ))}
          </div>
          <p className={styles.muted}>
            Rewrites create a proposal for you to review. Your current draft
            stays intact.
          </p>
          <ConsultantVoice
            compact
            key={article.job?.id + (article.job?.state ?? "")}
          />
        </>
      )}
      {transcripts && (
        <section className={styles.card}>
          <h2>Interview source material</h2>
          <p>
            Corrections apply to future drafts. Exclude anything you do not want
            used.
          </p>
          {transcripts.map((interview) => (
            <div key={interview.id}>
              {interview.turns.map((turn) => (
                <div key={turn.item_id} className={styles.turn}>
                  <strong>
                    {turn.speaker === "participant" ? "You" : "Inkwell"}
                  </strong>
                  <textarea
                    className={styles.input}
                    aria-label={`${turn.speaker} transcript correction`}
                    value={
                      interview.corrections[turn.item_id]?.text ?? turn.text
                    }
                    onChange={(e) =>
                      setTranscripts((current) =>
                        current!.map((i) =>
                          i.id !== interview.id
                            ? i
                            : {
                                ...i,
                                corrections: {
                                  ...i.corrections,
                                  [turn.item_id]: {
                                    excluded:
                                      i.corrections[turn.item_id]?.excluded ??
                                      false,
                                    text: e.target.value,
                                  },
                                },
                              },
                        ),
                      )
                    }
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={
                        interview.corrections[turn.item_id]?.excluded ?? false
                      }
                      onChange={(e) =>
                        setTranscripts((current) =>
                          current!.map((i) =>
                            i.id !== interview.id
                              ? i
                              : {
                                  ...i,
                                  corrections: {
                                    ...i.corrections,
                                    [turn.item_id]: {
                                      text:
                                        i.corrections[turn.item_id]?.text ??
                                        null,
                                      excluded: e.target.checked,
                                    },
                                  },
                                },
                          ),
                        )
                      }
                    />{" "}
                    Do not use
                  </label>
                </div>
              ))}
            </div>
          ))}
          <button
            className={styles.primary}
            disabled={busy || !!generating}
            onClick={() =>
              void run(async () => {
                for (const i of transcripts)
                  await api(`interviews/${i.id}/corrections`, "PUT", {
                    corrections: i.corrections,
                  });
                await generate("updated");
                setNotice("Corrections saved. Creating a new proposal.");
              })
            }
          >
            Save corrections and create proposal
          </button>
        </section>
      )}
      {article.revisions.length > 0 && (
        <section className={styles.card}>
          <h2>Draft versions</h2>
          {article.revisions.slice(0, 20).map((r) => (
            <div className={styles.row} key={r.id}>
              <span>
                {r.kind === "proposal" ? "New draft proposal" : r.kind} ·{" "}
                {new Date(r.created_at).toLocaleString()}
              </span>
              <button
                className={styles.secondary}
                onClick={() => setPreview(r)}
              >
                Review version
              </button>
            </div>
          ))}
        </section>
      )}
      {preview && (
        <section className={styles.card}>
          <h2>Review draft version</h2>
          {preview.sections.map((s, index) => (
            <DraftRichSection
              key={`preview:${preview.id}:${s.id}`}
              section={{
                ...s,
                outlineSectionId: s.outline_section_id,
                editorState: s.editor_state,
              }}
              index={index}
              readOnly
            />
          ))}
          {preview.gaps.length > 0 && (
            <>
              <h3>Useful details to add</h3>
              <ul>
                {preview.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </>
          )}
          <div className={styles.actions}>
            <button
              className={styles.primary}
              disabled={busy || dirty}
              onClick={() =>
                void run(async () => {
                  await api(
                    `articles/${articleId}/revisions/${preview.id}/apply`,
                    "POST",
                    undefined,
                    { "If-Unmodified-Since": article.draft_updated_at ?? "" },
                  );
                  await reload();
                  setEditorVersion((v) => v + 1);
                  setPreview(null);
                  setNotice(
                    "Version applied. Your previous draft remains in version history.",
                  );
                })
              }
            >
              Use this version
            </button>
            <button
              className={styles.secondary}
              onClick={() => setPreview(null)}
            >
              Close preview
            </button>
          </div>
          {dirty && (
            <p>Save your current changes before applying another version.</p>
          )}
        </section>
      )}
      {article.revisions[0]?.gaps.length > 0 && (
        <section className={styles.card}>
          <h2>Useful details to add</h2>
          <ul>
            {article.revisions[0].gaps.map((gap, index) => (
              <li key={index}>{gap}</li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
