"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, X } from "@phosphor-icons/react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import {
  articleGoalLabels,
  articleGoals,
  articleInputSchema,
  changedArticleFields,
  toArticleFormValues,
  toArticleInput,
  type Article,
  type ArticleFormValues,
} from "@/lib/articles/article";
import {
  ArticleRequestError,
  createArticle,
  deleteArticle,
  updateArticle,
} from "@/lib/articles/client";
import { DEFAULT_AUTH_IDENTITY, type AuthIdentity } from "@/lib/auth/identity";
import styles from "./new-article-form.module.css";

type FieldName = keyof ArticleFormValues;
type FormErrors = Partial<Record<FieldName, string>>;

type NewArticleFormProps = {
  identity?: AuthIdentity;
  article?: Article;
};

const emptyForm: ArticleFormValues = {
  notes: "",
  workingTitle: "",
  targetAudience: [],
  articleGoal: "",
};

const apiToFormField: Record<string, FieldName> = {
  notes: "notes",
  working_title: "workingTitle",
  target_audience: "targetAudience",
  article_goal: "articleGoal",
};

function validateForm(values: ArticleFormValues): FormErrors {
  const result = articleInputSchema.safeParse(toArticleInput(values));
  if (result.success) return {};
  return result.error.issues.reduce<FormErrors>((errors, issue) => {
    const field = apiToFormField[String(issue.path[0])];
    if (field && !errors[field]) errors[field] = issue.message;
    return errors;
  }, {});
}

function apiMessage(error: unknown) {
  if (error instanceof ArticleRequestError) {
    if (error.status === 401)
      return "Your session expired. Please sign in again.";
    if (error.status === 404) return "This article could not be found.";
    if (error.status === 422)
      return "Review the highlighted fields and try again.";
    return error.message;
  }
  return "Articles are temporarily unavailable. Please try again.";
}

export function NewArticleForm({
  identity = DEFAULT_AUTH_IDENTITY,
  article,
}: NewArticleFormProps) {
  const router = useRouter();
  const isEditing = Boolean(article);
  const initialValues = useMemo(
    () => (article ? toArticleFormValues(article) : emptyForm),
    [article],
  );
  const [form, setForm] = useState<ArticleFormValues>(initialValues);
  const [audienceInput, setAudienceInput] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const updateField = <K extends FieldName>(
    field: K,
    value: ArticleFormValues[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field])
      setErrors((current) => ({ ...current, [field]: undefined }));
    setStatus("");
  };

  const addAudience = (value: string) => {
    const audiences = value
      .split(/\s+/)
      .map((audience) => audience.trim())
      .filter(Boolean);

    if (audiences.length === 0) return;
    updateField("targetAudience", [
      ...form.targetAudience,
      ...audiences.filter(
        (audience) =>
          !form.targetAudience.some(
            (existing) =>
              existing.toLocaleLowerCase() === audience.toLocaleLowerCase(),
          ),
      ),
    ]);
    setAudienceInput("");
  };

  const removeAudience = (audience: string) => {
    updateField(
      "targetAudience",
      form.targetAudience.filter((item) => item !== audience),
    );
  };

  const validInput = () => {
    const pendingAudience = audienceInput.trim();
    const values = pendingAudience
      ? {
          ...form,
          targetAudience: [
            ...form.targetAudience,
            ...pendingAudience.split(/\s+/).filter(Boolean),
          ],
        }
      : form;
    if (pendingAudience) {
      setForm(values);
      setAudienceInput("");
    }
    const nextErrors = validateForm(values);
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0] as FieldName | undefined;
    if (firstError) {
      document.getElementById(`article-${firstError}`)?.focus();
      return null;
    }
    return articleInputSchema.parse(toArticleInput(values));
  };

  const save = async (continueToBrief: boolean) => {
    const input = validInput();
    if (!input) return;
    setIsSubmitting(true);
    setStatus("");
    try {
      if (article) {
        const patch = changedArticleFields(article, form);
        if (Object.keys(patch).length === 0) {
          setStatus("No changes to save.");
          return;
        }
        const updated = await updateArticle(article.id, patch);
        setForm(toArticleFormValues(updated));
        setStatus("Article saved.");
        router.refresh();
        return;
      }

      const created = await createArticle(input);
      if (continueToBrief) {
        router.push(`/articles/new/brief?articleId=${created.id}`);
      } else {
        router.push(`/articles/${created.id}`);
      }
    } catch (error) {
      if (error instanceof ArticleRequestError && error.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(article ? `/articles/${article.id}` : "/articles/new")}`,
        );
        return;
      }
      setStatus(apiMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const remove = async () => {
    if (!article) return;
    setIsSubmitting(true);
    setStatus("");
    try {
      await deleteArticle(article.id);
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setStatus(apiMessage(error));
      setIsConfirmingDelete(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <DashboardSidebar
        activeHref="/dashboard?section=articles"
        identity={identity}
      />
      <div className={styles.workspace}>
        <header className={styles.desktopHeader}>
          <div className={styles.headerInner}>
            <Link href="/dashboard?section=articles">Articles</Link>
            <span aria-hidden>/</span>
            <span>{isEditing ? "Edit article" : "New article"}</span>
          </div>
        </header>
        <header className={styles.mobileHeader}>
          <Link href="/dashboard" aria-label="Back to dashboard">
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
            <strong>{isEditing ? "Edit article" : "New article"}</strong>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void save(false)}
          >
            Save
          </button>
        </header>

        <div className={styles.content}>
          <section
            className={styles.intro}
            aria-labelledby="article-form-title"
          >
            <p className={styles.eyebrow}>
              {isEditing ? "Article intake" : "Start a new article"}
            </p>
            <h1 id="article-form-title">
              {isEditing
                ? "Refine your article intake."
                : "Turn your notes into a clear article."}
            </h1>
            <p>
              {isEditing
                ? "Update the notes and planning choices for this article."
                : "Add your notes and planning choices. We’ll help shape them into a useful brief."}
            </p>
          </section>

          <form
            className={styles.form}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void save(!isEditing);
            }}
          >
            <div className={styles.sourceField}>
              <label className={styles.visuallyHidden} htmlFor="article-notes">
                Your notes
              </label>
              <textarea
                id="article-notes"
                maxLength={20_000}
                aria-invalid={Boolean(errors.notes)}
                aria-describedby={`notes-helper${errors.notes ? " notes-error" : ""}`}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Paste rough notes, bullet points, quotes, research, or fragments here…"
                value={form.notes}
              />
              <div className={styles.sourceMeta} id="notes-helper">
                <span>Notes are required.</span>
                <span>{form.notes.length.toLocaleString()} / 20,000</span>
              </div>
              {errors.notes ? (
                <p className={styles.error} id="notes-error">
                  {errors.notes}
                </p>
              ) : null}
            </div>

            <div className={styles.detailsGrid}>
              <label className={styles.field} htmlFor="article-workingTitle">
                <span>Working title *</span>
                <input
                  id="article-workingTitle"
                  maxLength={200}
                  aria-invalid={Boolean(errors.workingTitle)}
                  onChange={(event) =>
                    updateField("workingTitle", event.target.value)
                  }
                  value={form.workingTitle}
                />
                {errors.workingTitle ? (
                  <small className={styles.error}>{errors.workingTitle}</small>
                ) : (
                  <small>Up to 200 characters.</small>
                )}
              </label>
              <div className={styles.field}>
                <label htmlFor="article-targetAudience">
                  Target audience *
                </label>
                <div
                  className={styles.tagInput}
                  data-invalid={Boolean(errors.targetAudience)}
                  onClick={() =>
                    document.getElementById("article-targetAudience")?.focus()
                  }
                >
                  {form.targetAudience.map((audience) => (
                    <span className={styles.tag} key={audience}>
                      {audience}
                      <button
                        type="button"
                        aria-label={`Remove ${audience}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeAudience(audience);
                        }}
                      >
                        <X size={12} weight="bold" aria-hidden />
                      </button>
                    </span>
                  ))}
                  <input
                    id="article-targetAudience"
                    aria-invalid={Boolean(errors.targetAudience)}
                    aria-describedby="target-audience-helper"
                    autoComplete="off"
                    onChange={(event) => {
                      const value = event.target.value;
                      if (/\s/.test(value)) addAudience(value);
                      else setAudienceInput(value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && audienceInput.trim()) {
                        event.preventDefault();
                        addAudience(audienceInput);
                      } else if (
                        event.key === "Backspace" &&
                        !audienceInput &&
                        form.targetAudience.length > 0
                      ) {
                        removeAudience(form.targetAudience.at(-1)!);
                      }
                    }}
                    onBlur={() => addAudience(audienceInput)}
                    value={audienceInput}
                  />
                </div>
                {errors.targetAudience ? (
                  <small className={styles.error} id="target-audience-helper">
                    {errors.targetAudience}
                  </small>
                ) : (
                  <small id="target-audience-helper">
                    Type a word, then press space to add it.
                  </small>
                )}
              </div>
              <label
                className={`${styles.field} ${styles.goalField}`}
                htmlFor="article-articleGoal"
              >
                <span>Article goal *</span>
                <select
                  id="article-articleGoal"
                  aria-invalid={Boolean(errors.articleGoal)}
                  onChange={(event) =>
                    updateField(
                      "articleGoal",
                      event.target.value as ArticleFormValues["articleGoal"],
                    )
                  }
                  value={form.articleGoal}
                >
                  <option value="" disabled>
                    Select what readers should take away
                  </option>
                  {articleGoals.map((goal) => (
                    <option value={goal} key={goal}>
                      {articleGoalLabels[goal]}
                    </option>
                  ))}
                </select>
                {errors.articleGoal ? (
                  <small className={styles.error}>{errors.articleGoal}</small>
                ) : (
                  <small>What should readers take away?</small>
                )}
              </label>
            </div>

            <p
              className={
                status.includes("saved") || status.includes("No changes")
                  ? styles.status
                  : styles.requestError
              }
              role="status"
              aria-live="polite"
            >
              {status}
            </p>

            {article ? (
              <div className={styles.deletePanel}>
                {isConfirmingDelete ? (
                  <div
                    className={styles.deleteConfirm}
                    role="group"
                    aria-label="Confirm article deletion"
                  >
                    <span>Delete permanently?</span>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.dangerAction}
                      type="button"
                      onClick={() => void remove()}
                      disabled={isSubmitting}
                    >
                      Confirm delete
                    </button>
                  </div>
                ) : (
                  <button
                    className={styles.dangerAction}
                    type="button"
                    onClick={() => setIsConfirmingDelete(true)}
                    disabled={isSubmitting}
                  >
                    Delete article
                  </button>
                )}
              </div>
            ) : null}

            <div className={styles.desktopActions}>
              <button
                type="button"
                onClick={() => void save(false)}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving…" : "Save as draft"}
              </button>
              {!article ? (
                <button
                  className={styles.primaryAction}
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Saving…" : "Build my article brief"}
                </button>
              ) : null}
            </div>
            <div className={styles.mobileActions}>
              <button
                className={styles.primaryAction}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Saving…"
                  : isEditing
                    ? "Save changes"
                    : "Build my article brief"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
