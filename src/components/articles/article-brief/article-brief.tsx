"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowClockwise,
  ArrowLeft,
  ArrowRight,
  Sparkle,
  Warning,
} from "@phosphor-icons/react";
import { useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { articleGoalLabels, type Article } from "@/lib/articles/article";
import type { ArticleBrief as GeneratedBrief } from "@/lib/articles/brief";
import {
  ArticleRequestError,
  generateArticleBrief,
  getArticle,
  getArticleBrief,
  updateArticleBrief,
} from "@/lib/articles/client";
import { DEFAULT_AUTH_IDENTITY, type AuthIdentity } from "@/lib/auth/identity";
import { ArticleProgress } from "../article-progress/article-progress";
import {
  changedBriefFields,
  createBriefEditState,
  type BriefEditState,
} from "./brief-edit";
import styles from "./article-brief.module.css";

type ViewState =
  "loading" | "generating" | "ready" | "missing-id" | "not-found" | "error";
type BriefError = { code: string; message: string };
const articleIdSchema = z.string().uuid();

function displayError(error: unknown): BriefError {
  if (error instanceof ArticleRequestError) {
    return { code: error.code, message: error.message };
  }
  return {
    code: "brief_generation_failed",
    message: "We couldn’t generate this brief. Please try again.",
  };
}

function DetailCard({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`${styles.card} ${wide ? styles.wide : ""}`}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function EditField({
  label,
  value,
  onChange,
  rows = 4,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  hint?: string;
}) {
  return (
    <label className={styles.editField}>
      <span>{label}</span>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function ArticleBrief({
  articleId,
  identity = DEFAULT_AUTH_IDENTITY,
}: {
  articleId?: string;
  identity?: AuthIdentity;
}) {
  const { push } = useRouter();
  const validArticleId = articleIdSchema.safeParse(articleId);
  const [article, setArticle] = useState<Article | null>(null);
  const [brief, setBrief] = useState<GeneratedBrief | null>(null);
  const [viewState, setViewState] = useState<ViewState>(
    validArticleId.success ? "loading" : "missing-id",
  );
  const [error, setError] = useState<BriefError | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editDraft, setEditDraft] = useState<BriefEditState | null>(null);

  const briefPath = validArticleId.success
    ? `/articles/new/brief?articleId=${encodeURIComponent(validArticleId.data)}`
    : "/articles/new/brief";
  const loginPath = `/login?next=${encodeURIComponent(briefPath)}`;

  useEffect(() => {
    if (!validArticleId.success) return;
    const savedArticleId = validArticleId.data;
    let active = true;

    const fail = (caught: unknown) => {
      if (!active) return;
      const nextError = displayError(caught);
      if (caught instanceof ArticleRequestError && caught.status === 401) {
        push(loginPath);
      } else if (nextError.code === "article_not_found") {
        setViewState("not-found");
      } else {
        setError(nextError);
        setViewState("error");
      }
    };

    const load = async () => {
      setViewState("loading");
      setError(null);
      try {
        const savedArticle = await getArticle(savedArticleId);
        if (!active) return;
        setArticle(savedArticle);
        try {
          const savedBrief = await getArticleBrief(savedArticleId);
          if (!active) return;
          setBrief(savedBrief);
          setViewState("ready");
        } catch (caught) {
          if (
            caught instanceof ArticleRequestError &&
            caught.status === 404 &&
            caught.code === "brief_not_found"
          ) {
            setViewState("generating");
            const generated = await generateArticleBrief(savedArticleId);
            if (!active) return;
            setBrief(generated);
            setViewState("ready");
          } else {
            fail(caught);
          }
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

  const regenerate = async () => {
    if (!articleId || isRegenerating || isEditing) return;
    setIsRegenerating(true);
    setError(null);
    try {
      const generated = await generateArticleBrief(articleId);
      setBrief(generated);
      setViewState("ready");
    } catch (caught) {
      if (caught instanceof ArticleRequestError && caught.status === 401) {
        push(loginPath);
      } else {
        setError(displayError(caught));
        if (!brief) setViewState("error");
      }
    } finally {
      setIsRegenerating(false);
    }
  };

  const beginEditing = () => {
    if (!brief) return;
    setError(null);
    setEditDraft(createBriefEditState(brief));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditDraft(null);
    setError(null);
    setIsEditing(false);
  };

  const saveBrief = async () => {
    if (!articleId || !brief || !editDraft || isSaving) return;
    let patch;
    try {
      patch = changedBriefFields(brief, editDraft);
    } catch {
      setError({
        code: "validation_error",
        message: "Complete the required brief fields before saving.",
      });
      return;
    }
    if (!patch) {
      cancelEditing();
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const updated = await updateArticleBrief(articleId, patch);
      setBrief(updated);
      setEditDraft(null);
      setIsEditing(false);
    } catch (caught) {
      if (caught instanceof ArticleRequestError && caught.status === 401) {
        push(loginPath);
      } else {
        setError(displayError(caught));
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateDraft = (field: keyof BriefEditState, value: string) => {
    setEditDraft((current) =>
      current ? { ...current, [field]: value } : current,
    );
    setError(null);
  };

  const generateOutline = () => {
    if (!article || isGeneratingOutline || isEditing) return;
    setIsGeneratingOutline(true);
    push(`/articles/new/outline?articleId=${article.id}`);
  };

  const backHref = article ? `/articles/${article.id}` : "/articles/new";
  const isBlocked = error?.code === "brief_generation_blocked";

  return (
    <main className={styles.page}>
      <DashboardSidebar
        activeHref="/dashboard?section=articles"
        identity={identity}
      />
      <div className={styles.workspace}>
        <header className={styles.mobileHeader}>
          <Link href={backHref} aria-label="Back to article intake">
            <ArrowLeft size={28} aria-hidden />
          </Link>
          <div className={styles.mobileTitle}>
            <Image
              src="/images/inkwell-icon.png"
              alt=""
              width={43}
              height={60}
              priority
            />
            <strong>Brief</strong>
          </div>
          <button
            type="button"
            disabled={!brief || isSaving}
            onClick={() => (isEditing ? void saveBrief() : beginEditing())}
          >
            {isSaving ? "Saving…" : isEditing ? "Save" : "Edit"}
          </button>
        </header>

        <ArticleProgress currentStep="brief" articleId={articleId} />

        <div className={styles.content}>
          {viewState === "missing-id" ? (
            <div className={styles.state} role="alert">
              <h1>
                {articleId ? "Invalid article link" : "No article selected"}
              </h1>
              <p>
                {articleId
                  ? "This brief link does not contain a valid article ID."
                  : "Start a new article before generating its brief."}
              </p>
              <Link href="/articles/new">Start a new article</Link>
            </div>
          ) : null}

          {viewState === "loading" || viewState === "generating" ? (
            <div className={styles.state} role="status" aria-live="polite">
              <Sparkle className={styles.pulse} size={38} aria-hidden />
              <h1>
                {viewState === "loading"
                  ? "Preparing your article brief…"
                  : "Generating your article brief…"}
              </h1>
              <p>
                {viewState === "loading"
                  ? "We’re checking for a saved brief."
                  : "This can take several seconds while Inkwell shapes your source material."}
              </p>
            </div>
          ) : null}

          {viewState === "not-found" ? (
            <div className={styles.state} role="alert">
              <h1>Article not found</h1>
              <p>
                This article is unavailable or does not belong to your account.
              </p>
              <Link href="/dashboard?section=articles">Return to articles</Link>
            </div>
          ) : null}

          {viewState === "error" ? (
            <div className={styles.state} role="alert">
              <Warning size={38} aria-hidden />
              <h1>We couldn’t generate your brief</h1>
              <p>{error?.message}</p>
              <div className={styles.stateActions}>
                {isBlocked && article ? (
                  <Link href={`/articles/${article.id}`}>
                    Revise article intake
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    article ? void regenerate() : setRetryKey((key) => key + 1)
                  }
                  disabled={isRegenerating}
                >
                  {isRegenerating ? "Retrying…" : "Try again"}
                </button>
              </div>
            </div>
          ) : null}

          {viewState === "ready" && article && brief ? (
            <>
              <section className={styles.summary} aria-label="Article summary">
                <div>
                  <span>Working title</span>
                  <strong>{article.working_title}</strong>
                </div>
                <div className={styles.goalSummary}>
                  <span>Goal</span>
                  <strong>{articleGoalLabels[article.article_goal]}</strong>
                </div>
                <div className={styles.audienceSummary}>
                  <span>Audience</span>
                  <strong>{article.target_audience.join(", ")}</strong>
                </div>
              </section>

              <header className={styles.intro}>
                <div>
                  <h1>Your article brief</h1>
                  <p>
                    Generated from your saved notes and planning choices. Review
                    the direction before moving to the outline.
                  </p>
                </div>
                <div className={styles.introActions}>
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveBrief()}
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving…" : "Save changes"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button type="button" onClick={beginEditing}>
                        Edit brief
                      </button>
                      <button
                        type="button"
                        onClick={() => void regenerate()}
                        disabled={isRegenerating}
                      >
                        <ArrowClockwise size={19} aria-hidden />
                        {isRegenerating ? "Regenerating…" : "Regenerate brief"}
                      </button>
                    </>
                  )}
                </div>
              </header>

              {brief.is_stale ? (
                <div className={styles.stale} role="status">
                  <Warning size={21} aria-hidden />
                  <p>
                    Your article intake changed after this brief was generated.
                    Regenerate it to use the latest inputs.
                  </p>
                  <button
                    type="button"
                    onClick={() => void regenerate()}
                    disabled={isRegenerating || isEditing}
                  >
                    Regenerate
                  </button>
                </div>
              ) : null}

              {error ? (
                <div className={styles.inlineError} role="alert">
                  <span>{error.message}</span>
                  <button
                    type="button"
                    onClick={() =>
                      isEditing ? void saveBrief() : void regenerate()
                    }
                  >
                    Try again
                  </button>
                </div>
              ) : null}

              {isEditing && editDraft ? (
                <div className={styles.editGrid}>
                  <EditField
                    label="Summary"
                    value={editDraft.summary}
                    onChange={(value) => updateDraft("summary", value)}
                  />
                  <EditField
                    label="Core angle"
                    value={editDraft.coreAngle}
                    onChange={(value) => updateDraft("coreAngle", value)}
                  />
                  <EditField
                    label="Audience insights"
                    value={editDraft.audienceInsights}
                    onChange={(value) => updateDraft("audienceInsights", value)}
                    hint="One insight per line"
                  />
                  <EditField
                    label="Tone and style"
                    value={editDraft.toneAndStyle}
                    onChange={(value) => updateDraft("toneAndStyle", value)}
                  />
                  <EditField
                    label="Key takeaways"
                    value={editDraft.keyTakeaways}
                    onChange={(value) => updateDraft("keyTakeaways", value)}
                    hint="One takeaway per line"
                  />
                  <EditField
                    label="Evidence gaps"
                    value={editDraft.evidenceGaps}
                    onChange={(value) => updateDraft("evidenceGaps", value)}
                    hint="One gap per line"
                  />
                  <EditField
                    label="Call to action"
                    value={editDraft.callToAction}
                    onChange={(value) => updateDraft("callToAction", value)}
                  />
                  <div className={styles.editSeo}>
                    <h2>SEO direction</h2>
                    <EditField
                      label="Suggested titles"
                      value={editDraft.suggestedTitles}
                      onChange={(value) =>
                        updateDraft("suggestedTitles", value)
                      }
                      hint="One title per line"
                    />
                    <EditField
                      label="Primary keyword"
                      value={editDraft.primaryKeyword}
                      onChange={(value) => updateDraft("primaryKeyword", value)}
                      rows={2}
                    />
                    <EditField
                      label="Secondary keywords"
                      value={editDraft.secondaryKeywords}
                      onChange={(value) =>
                        updateDraft("secondaryKeywords", value)
                      }
                      hint="One keyword per line"
                    />
                    <EditField
                      label="Meta description"
                      value={editDraft.metaDescription}
                      onChange={(value) =>
                        updateDraft("metaDescription", value)
                      }
                    />
                  </div>
                  <button
                    className={styles.mobileCancelEdit}
                    type="button"
                    onClick={cancelEditing}
                    disabled={isSaving}
                  >
                    Cancel changes
                  </button>
                </div>
              ) : (
                <div className={styles.cards}>
                  <DetailCard title="Summary" wide>
                    <p>{brief.summary}</p>
                  </DetailCard>
                  <DetailCard title="Core angle">
                    <p>{brief.core_angle}</p>
                  </DetailCard>
                  <DetailCard title="Tone and style">
                    <p>{brief.tone_and_style}</p>
                  </DetailCard>
                  <DetailCard title="Audience insights">
                    <ul>
                      {brief.audience_insights.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </DetailCard>
                  <DetailCard title="Key takeaways">
                    <ul>
                      {brief.key_takeaways.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </DetailCard>
                  <DetailCard title="Evidence gaps">
                    {brief.evidence_gaps.length ? (
                      <ul>
                        {brief.evidence_gaps.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p>No significant evidence gaps identified.</p>
                    )}
                  </DetailCard>
                  <DetailCard title="Call to action">
                    <p>{brief.call_to_action}</p>
                  </DetailCard>
                  <DetailCard title="SEO direction" wide>
                    <div className={styles.seoGrid}>
                      <div>
                        <h3>Suggested titles</h3>
                        <ul>
                          {brief.seo.suggested_titles.map((title) => (
                            <li key={title}>{title}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h3>Keywords</h3>
                        <p>
                          <strong>Primary:</strong> {brief.seo.primary_keyword}
                        </p>
                        <p>{brief.seo.secondary_keywords.join(", ")}</p>
                      </div>
                      <div className={styles.metaDescription}>
                        <h3>Meta description</h3>
                        <p>{brief.seo.meta_description}</p>
                      </div>
                    </div>
                  </DetailCard>
                </div>
              )}

              <button
                className={styles.mobileRegenerate}
                type="button"
                onClick={() => void regenerate()}
                disabled={isEditing || isRegenerating}
              >
                <ArrowClockwise size={19} aria-hidden />
                {isRegenerating ? "Regenerating…" : "Regenerate brief"}
              </button>

              <div className={styles.mobileGenerate}>
                <button
                  type="button"
                  disabled={isGeneratingOutline || isEditing}
                  onClick={generateOutline}
                >
                  <Sparkle size={25} aria-hidden />
                  {isGeneratingOutline
                    ? "Generating outline…"
                    : "Generate outline"}
                </button>
              </div>
            </>
          ) : null}
        </div>

        {viewState === "ready" && article && brief ? (
          <footer className={styles.desktopFooter}>
            <Link href={`/articles/${article.id}`}>
              <ArrowLeft size={18} aria-hidden /> Back to intake
            </Link>
            <button
              type="button"
              onClick={generateOutline}
              disabled={isGeneratingOutline || isEditing}
            >
              {isGeneratingOutline ? "Generating outline…" : "Generate outline"}
              <ArrowRight size={19} aria-hidden />
            </button>
          </footer>
        ) : null}
      </div>
    </main>
  );
}
