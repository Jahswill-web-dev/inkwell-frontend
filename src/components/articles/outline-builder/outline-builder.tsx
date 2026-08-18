"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowClockwise,
  ArrowLeft,
  CaretDown,
  Check,
  DotsSixVertical,
  DotsThree,
  ListBullets,
  Plus,
  Sparkle,
  Warning,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { z } from "zod";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import type { Article } from "@/lib/articles/article";
import {
  ArticleRequestError,
  deleteArticleOutline,
  generateArticleOutline,
  getArticle,
  getArticleOutline,
  updateArticleOutline,
} from "@/lib/articles/client";
import type {
  ArticleOutline,
  ArticleOutlineSection,
} from "@/lib/articles/outline";
import { DEFAULT_AUTH_IDENTITY, type AuthIdentity } from "@/lib/auth/identity";
import { ArticleProgress } from "../article-progress/article-progress";
import styles from "./outline-builder.module.css";

type EditableSection = ArticleOutlineSection & { clientId: string };
type ViewState =
  "loading" | "generating" | "ready" | "missing-id" | "not-found" | "error";
type OutlineError = { code: string; message: string };
const articleIdSchema = z.string().uuid();

function clientId(section: ArticleOutlineSection, index: number) {
  const slug = section.heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "section"}-${index}`;
}

function editableSections(outline: ArticleOutline): EditableSection[] {
  return outline.sections.map((section, index) => ({
    ...section,
    clientId: clientId(section, index),
  }));
}

function apiSections(sections: EditableSection[]): ArticleOutlineSection[] {
  return sections.map(({ heading, purpose, key_points }) => ({
    heading,
    purpose,
    key_points,
  }));
}

function outlineError(error: unknown): OutlineError {
  if (error instanceof ArticleRequestError)
    return { code: error.code, message: error.message };
  return {
    code: "outline_generation_failed",
    message: "We couldn’t load this outline. Please try again.",
  };
}

function OutlineHealth({ sections }: { sections: EditableSection[] }) {
  const checks = useMemo(() => {
    const last = sections.at(-1);
    return [
      {
        label: "Clear progression",
        description:
          "The outline has enough sections to develop a complete argument.",
        passed: sections.length >= 3,
      },
      {
        label: "Strong conclusion",
        description: "The final section reinforces a conclusion or takeaway.",
        passed: Boolean(
          last &&
          /conclusion|takeaway|close|next step/i.test(
            `${last.heading} ${last.purpose}`,
          ),
        ),
      },
    ];
  }, [sections]);

  return (
    <div className={styles.healthContent}>
      <h2>Outline health</h2>
      <div className={styles.healthChecks}>
        {checks.map((check) => (
          <div className={styles.healthCheck} key={check.label}>
            <span
              className={check.passed ? styles.passed : styles.pending}
              aria-hidden
            >
              <Check size={17} weight="bold" />
            </span>
            <div>
              <strong>{check.label}</strong>
              <p>{check.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OutlineBuilder({
  articleId,
  identity = DEFAULT_AUTH_IDENTITY,
}: {
  articleId?: string;
  identity?: AuthIdentity;
}) {
  const { push } = useRouter();
  const validArticleId = articleIdSchema.safeParse(articleId);
  const [article, setArticle] = useState<Article | null>(null);
  const [savedOutline, setSavedOutline] = useState<ArticleOutline | null>(null);
  const [sections, setSections] = useState<EditableSection[]>([]);
  const [viewState, setViewState] = useState<ViewState>(
    validArticleId.success ? "loading" : "missing-id",
  );
  const [error, setError] = useState<OutlineError | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [openSectionId, setOpenSectionId] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHealth, setShowHealth] = useState(false);
  const closeHealthRef = useRef<HTMLButtonElement>(null);

  const outlinePath = validArticleId.success
    ? `/articles/new/outline?articleId=${encodeURIComponent(validArticleId.data)}`
    : "/articles/new/outline";
  const loginPath = `/login?next=${encodeURIComponent(outlinePath)}`;
  const dirty =
    Boolean(savedOutline) &&
    JSON.stringify(apiSections(sections)) !==
      JSON.stringify(savedOutline?.sections);

  const applyOutline = (outline: ArticleOutline) => {
    const next = editableSections(outline);
    setSavedOutline(outline);
    setSections(next);
    setOpenSectionId(next[0]?.clientId ?? "");
    setViewState("ready");
    setError(null);
  };

  useEffect(() => {
    if (!validArticleId.success) return;
    const savedArticleId = validArticleId.data;
    let active = true;
    const fail = (caught: unknown) => {
      if (!active) return;
      const nextError = outlineError(caught);
      if (caught instanceof ArticleRequestError && caught.status === 401)
        push(loginPath);
      else if (nextError.code === "article_not_found")
        setViewState("not-found");
      else {
        setError(nextError);
        setViewState("error");
      }
    };
    const load = async () => {
      setViewState("loading");
      setError(null);
      try {
        const loadedArticle = await getArticle(savedArticleId);
        if (!active) return;
        setArticle(loadedArticle);
        try {
          const outline = await getArticleOutline(savedArticleId);
          if (active) applyOutline(outline);
        } catch (caught) {
          if (
            caught instanceof ArticleRequestError &&
            caught.status === 404 &&
            caught.code === "outline_not_found"
          ) {
            setViewState("generating");
            const outline = await generateArticleOutline(savedArticleId);
            if (active) applyOutline(outline);
          } else fail(caught);
        }
      } catch (caught) {
        fail(caught);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [loginPath, push, retryKey, validArticleId.data, validArticleId.success]);

  useEffect(() => {
    if (!showHealth) return;
    closeHealthRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowHealth(false);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [showHealth]);

  const updateSection = (id: string, patch: Partial<EditableSection>) => {
    setSections((current) =>
      current.map((section) =>
        section.clientId === id ? { ...section, ...patch } : section,
      ),
    );
    setStatus("");
  };

  const updateKeyPoint = (id: string, index: number, value: string) => {
    const section = sections.find((item) => item.clientId === id);
    if (!section) return;
    const points = [...section.key_points];
    points[index] = value;
    updateSection(id, { key_points: points });
  };

  const addSection = () => {
    if (sections.length >= 10) return;
    const id = `new-section-${Date.now()}`;
    setSections((current) => [
      ...current,
      {
        clientId: id,
        heading: "New section",
        purpose: "Describe what this section should accomplish",
        key_points: ["Add a key point"],
      },
    ]);
    setOpenSectionId(id);
  };

  const duplicateSection = (id: string) => {
    if (sections.length >= 10) return;
    setSections((current) => {
      const index = current.findIndex((section) => section.clientId === id);
      if (index < 0) return current;
      const copy = {
        ...current[index],
        clientId: `section-copy-${Date.now()}`,
        heading: `${current[index].heading} (copy)`,
        key_points: [...current[index].key_points],
      };
      const next = [...current];
      next.splice(index + 1, 0, copy);
      return next;
    });
    setOpenMenuId(null);
  };

  const removeSection = (id: string) => {
    if (sections.length <= 3) return;
    setSections((current) =>
      current.filter((section) => section.clientId !== id),
    );
    setOpenMenuId(null);
  };

  const moveSection = (id: string, direction: -1 | 1) => {
    setSections((current) => {
      const index = current.findIndex((section) => section.clientId === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length)
        return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
    setOpenMenuId(null);
  };

  const dropSection = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setSections((current) => {
      const next = [...current];
      const from = next.findIndex((section) => section.clientId === draggedId);
      const to = next.findIndex((section) => section.clientId === targetId);
      if (from < 0 || to < 0) return current;
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
    setDraggedId(null);
  };

  const saveOutline = async (): Promise<ArticleOutline | null> => {
    if (!articleId || !savedOutline || isSaving) return null;
    if (!dirty) {
      setStatus("No changes to save.");
      return savedOutline;
    }
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateArticleOutline(articleId, {
        sections: apiSections(sections),
      });
      applyOutline(updated);
      setStatus("Outline saved.");
      return updated;
    } catch (caught) {
      if (caught instanceof ArticleRequestError && caught.status === 401)
        push(loginPath);
      else setError(outlineError(caught));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const regenerate = async () => {
    if (!articleId || dirty || isRegenerating) return;
    setIsRegenerating(true);
    setError(null);
    try {
      applyOutline(await generateArticleOutline(articleId));
    } catch (caught) {
      if (caught instanceof ArticleRequestError && caught.status === 401)
        push(loginPath);
      else setError(outlineError(caught));
    } finally {
      setIsRegenerating(false);
    }
  };

  const removeOutline = async () => {
    if (!articleId || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteArticleOutline(articleId);
      window.sessionStorage.removeItem("inkwell:article-outline");
      push(`/articles/new/brief?articleId=${articleId}`);
    } catch (caught) {
      setError(outlineError(caught));
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const startDrafting = async () => {
    if (!article || !savedOutline) return;
    const persisted = dirty ? await saveOutline() : savedOutline;
    if (!persisted) return;
    window.sessionStorage.setItem(
      "inkwell:article-outline",
      JSON.stringify({
        workingTitle: article.working_title,
        targetAudience: article.target_audience.join(", "),
        sections: persisted.sections.map((section, index) => ({
          id: clientId(section, index),
          title: section.heading,
        })),
      }),
    );
    push(`/articles/new/draft?articleId=${article.id}`);
  };

  const briefHref = articleId
    ? `/articles/new/brief?articleId=${articleId}`
    : "/articles/new/brief";

  if (viewState !== "ready" || !article || !savedOutline) {
    return (
      <main className={styles.page}>
        <DashboardSidebar
          activeHref="/dashboard?section=articles"
          identity={identity}
          showSettings={false}
        />
        <div className={styles.workspace}>
          <ArticleProgress currentStep="outline" articleId={articleId} />
          <div
            className={styles.state}
            role={
              viewState === "loading" || viewState === "generating"
                ? "status"
                : "alert"
            }
          >
            {viewState === "loading" || viewState === "generating" ? (
              <Sparkle size={38} aria-hidden />
            ) : (
              <Warning size={38} aria-hidden />
            )}
            <h1>
              {viewState === "loading"
                ? "Preparing your outline…"
                : viewState === "generating"
                  ? "Generating your outline…"
                  : viewState === "missing-id"
                    ? articleId
                      ? "Invalid article link"
                      : "No article selected"
                    : viewState === "not-found"
                      ? "Article not found"
                      : "We couldn’t load your outline"}
            </h1>
            <p>
              {error?.message ??
                (viewState === "generating"
                  ? "This can take several seconds."
                  : "Choose an article and try again.")}
            </p>
            {error?.code === "brief_not_found" ? (
              <Link href={briefHref}>Generate a brief first</Link>
            ) : viewState === "error" ? (
              <button
                type="button"
                onClick={() => setRetryKey((key) => key + 1)}
              >
                Try again
              </button>
            ) : viewState === "missing-id" ? (
              <Link href="/articles/new">Start a new article</Link>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <DashboardSidebar
        activeHref="/dashboard?section=articles"
        identity={identity}
        showSettings={false}
      />
      <div className={styles.workspace}>
        <header className={styles.mobileHeader}>
          <Link href={briefHref} aria-label="Back to article brief">
            <ArrowLeft size={31} aria-hidden />
          </Link>
          <div className={styles.mobileTitle}>
            <Image
              src="/images/inkwell-icon.png"
              alt=""
              width={43}
              height={60}
              priority
            />
            <strong>Outline</strong>
          </div>
          <button
            type="button"
            onClick={() => void saveOutline()}
            disabled={!dirty || isSaving}
          >
            {isSaving ? "Saving…" : "Save"}
          </button>
        </header>

        <ArticleProgress currentStep="outline" articleId={articleId} />

        <div className={styles.layout}>
          <section className={styles.mainContent}>
            <header className={styles.intro}>
              <h1>Build your article’s structure</h1>
              <div className={styles.desktopMetadata}>
                <div>
                  <span>Working title</span>
                  <strong>{article.working_title}</strong>
                </div>
                <div>
                  <span>Audience</span>
                  <strong>{article.target_audience.join(", ")}</strong>
                </div>
                <div>
                  <span>Sections</span>
                  <strong>{sections.length}</strong>
                </div>
              </div>
              <div className={styles.mobileMetadata}>
                <span>
                  <i aria-hidden>
                    <ListBullets size={20} />
                  </i>
                  {sections.length} sections
                </span>
                <span aria-hidden className={styles.divider} />
                <button type="button" onClick={() => setShowHealth(true)}>
                  Outline health
                </button>
              </div>
            </header>

            {savedOutline.is_stale ? (
              <div className={styles.stale}>
                <Warning size={20} aria-hidden />
                <span>This outline is based on an older brief.</span>
                <button
                  type="button"
                  disabled={dirty || isRegenerating}
                  onClick={() => void regenerate()}
                >
                  Regenerate
                </button>
              </div>
            ) : null}
            {error ? (
              <div className={styles.inlineError} role="alert">
                <span>{error.message}</span>
              </div>
            ) : null}
            {dirty ? (
              <div className={styles.dirtyNotice}>
                <span>You have unsaved outline changes.</span>
                <button
                  type="button"
                  onClick={() => applyOutline(savedOutline)}
                >
                  Discard changes
                </button>
              </div>
            ) : null}

            <div className={styles.sections} aria-label="Outline sections">
              {sections.map((section, index) => {
                const open = section.clientId === openSectionId;
                return (
                  <article
                    className={`${styles.sectionCard} ${open ? styles.openSection : ""} ${draggedId === section.clientId ? styles.dragging : ""}`}
                    draggable
                    key={section.clientId}
                    onDragStart={() => setDraggedId(section.clientId)}
                    onDragEnd={() => setDraggedId(null)}
                    onDragOver={(event: DragEvent<HTMLElement>) =>
                      event.preventDefault()
                    }
                    onDrop={() => dropSection(section.clientId)}
                  >
                    <div className={styles.sectionHeader}>
                      <span className={styles.dragHandle} aria-hidden>
                        <DotsSixVertical size={25} weight="bold" />
                      </span>
                      <span className={styles.sectionNumber}>{index + 1}</span>
                      <h2>{section.heading}</h2>
                      <div className={styles.sectionActions}>
                        <div className={styles.menuWrap}>
                          <button
                            aria-expanded={openMenuId === section.clientId}
                            aria-haspopup="menu"
                            aria-label={`More actions for ${section.heading}`}
                            className={styles.desktopMenuButton}
                            onClick={() =>
                              setOpenMenuId((current) =>
                                current === section.clientId
                                  ? null
                                  : section.clientId,
                              )
                            }
                            type="button"
                          >
                            <DotsThree size={25} weight="bold" aria-hidden />
                          </button>
                          {openMenuId === section.clientId ? (
                            <div className={styles.actionMenu} role="menu">
                              <button
                                disabled={index === 0}
                                onClick={() =>
                                  moveSection(section.clientId, -1)
                                }
                                role="menuitem"
                                type="button"
                              >
                                Move up
                              </button>
                              <button
                                disabled={index === sections.length - 1}
                                onClick={() => moveSection(section.clientId, 1)}
                                role="menuitem"
                                type="button"
                              >
                                Move down
                              </button>
                              <button
                                disabled={sections.length >= 10}
                                onClick={() =>
                                  duplicateSection(section.clientId)
                                }
                                role="menuitem"
                                type="button"
                              >
                                Duplicate
                              </button>
                              <button
                                disabled={sections.length <= 3}
                                onClick={() => removeSection(section.clientId)}
                                role="menuitem"
                                type="button"
                              >
                                Delete section
                              </button>
                            </div>
                          ) : null}
                        </div>
                        <button
                          aria-controls={`section-content-${section.clientId}`}
                          aria-expanded={open}
                          aria-label={`${open ? "Collapse" : "Expand"} ${section.heading}`}
                          className={styles.expandButton}
                          onClick={() =>
                            setOpenSectionId(open ? "" : section.clientId)
                          }
                          type="button"
                        >
                          <CaretDown size={22} aria-hidden />
                        </button>
                      </div>
                    </div>
                    {open ? (
                      <div
                        className={styles.sectionContent}
                        id={`section-content-${section.clientId}`}
                      >
                        <label className={styles.notes}>
                          <span>Heading</span>
                          <textarea
                            rows={2}
                            value={section.heading}
                            onChange={(event) =>
                              updateSection(section.clientId, {
                                heading: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className={styles.notes}>
                          <span>Purpose</span>
                          <textarea
                            rows={3}
                            value={section.purpose}
                            onChange={(event) =>
                              updateSection(section.clientId, {
                                purpose: event.target.value,
                              })
                            }
                          />
                        </label>
                        <div className={styles.keyPoints}>
                          <h3>Key points</h3>
                          {section.key_points.map((point, pointIndex) => (
                            <div key={`${section.clientId}-${pointIndex}`}>
                              <input
                                aria-label={`Key point ${pointIndex + 1} for ${section.heading}`}
                                value={point}
                                onChange={(event) =>
                                  updateKeyPoint(
                                    section.clientId,
                                    pointIndex,
                                    event.target.value,
                                  )
                                }
                              />
                              <button
                                type="button"
                                aria-label={`Remove key point ${pointIndex + 1}`}
                                disabled={section.key_points.length <= 1}
                                onClick={() =>
                                  updateSection(section.clientId, {
                                    key_points: section.key_points.filter(
                                      (_, itemIndex) =>
                                        itemIndex !== pointIndex,
                                    ),
                                  })
                                }
                              >
                                <X size={17} aria-hidden />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            disabled={section.key_points.length >= 5}
                            onClick={() =>
                              updateSection(section.clientId, {
                                key_points: [
                                  ...section.key_points,
                                  "New key point",
                                ],
                              })
                            }
                          >
                            <Plus size={17} aria-hidden /> Add key point
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <button
              className={styles.addSection}
              type="button"
              disabled={sections.length >= 10}
              onClick={addSection}
            >
              <Plus size={19} aria-hidden /> Add section
            </button>
            <div className={styles.outlineDanger}>
              {confirmDelete ? (
                <>
                  <span>Delete this outline permanently?</span>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeOutline()}
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting…" : "Confirm delete"}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setConfirmDelete(true)}>
                  Delete outline
                </button>
              )}
            </div>
            <p className={styles.status} role="status" aria-live="polite">
              {status}
            </p>
            <div className={styles.mobileDraftAction}>
              <button
                onClick={() => void startDrafting()}
                disabled={isSaving}
                type="button"
              >
                {isSaving ? "Saving…" : "Start drafting"}
              </button>
            </div>
          </section>

          <aside className={styles.healthPanel} aria-label="Outline health">
            <OutlineHealth sections={sections} />
            <button
              className={styles.regenerateApproach}
              disabled={dirty || isRegenerating}
              onClick={() => void regenerate()}
              type="button"
            >
              <ArrowClockwise size={21} aria-hidden />
              {isRegenerating
                ? "Generating another approach…"
                : "Generate another approach"}
            </button>
          </aside>
        </div>

        <footer className={styles.desktopFooter}>
          <Link href={briefHref}>
            <ArrowLeft size={19} aria-hidden /> Back to brief
          </Link>
          <div>
            <button
              type="button"
              onClick={() => void saveOutline()}
              disabled={!dirty || isSaving}
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void startDrafting()}
              disabled={isSaving}
            >
              {isSaving ? "Saving…" : "Start drafting"}
            </button>
          </div>
        </footer>
      </div>

      {showHealth ? (
        <div
          className={styles.healthOverlay}
          onMouseDown={() => setShowHealth(false)}
        >
          <section
            aria-label="Outline health details"
            aria-modal="true"
            className={styles.healthDialog}
            onMouseDown={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Close outline health"
              className={styles.closeHealth}
              onClick={() => setShowHealth(false)}
              ref={closeHealthRef}
              type="button"
            >
              <X size={24} aria-hidden />
            </button>
            <OutlineHealth sections={sections} />
          </section>
        </div>
      ) : null}
    </main>
  );
}
