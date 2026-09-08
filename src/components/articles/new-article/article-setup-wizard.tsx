"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check } from "@phosphor-icons/react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import {
  articleSetupSchema,
  emptyArticleSetup,
  nextArticlePath,
  toArticleInputFromSetup,
  toArticleSetupMetadata,
  validateArticleSetupStep,
  type ArticleSetupErrors,
  type ArticleSetupField,
  type ArticleSetupStep,
  type ArticleSetupValues,
} from "@/lib/articles/article-setup";
import {
  clearArticleSetupDraft,
  loadArticleSetupDraft,
  saveArticleSetupDraft,
  saveArticleSetupMetadata,
} from "@/lib/articles/article-setup-storage";
import { ArticleRequestError, createArticle } from "@/lib/articles/client";
import type { AuthIdentity } from "@/lib/auth/identity";
import {
  ClientArticleStep,
  EditorialDirectionStep,
  InterviewSetupStep,
} from "./article-setup-step";
import { ArticleSetupReview } from "./article-setup-review";
import styles from "./article-setup-wizard.module.css";

const steps = [
  {
    number: 1 as const,
    label: "Client & article",
    title: "Set the article foundation",
  },
  {
    number: 2 as const,
    label: "Direction",
    title: "Define the editorial direction",
  },
  {
    number: 3 as const,
    label: "Interview",
    title: "Choose how to collect expertise",
  },
  { number: 4 as const, label: "Review", title: "Review the setup" },
];

function requestMessage(error: unknown) {
  if (error instanceof ArticleRequestError) {
    if (error.status === 401)
      return "Your session expired. Please sign in again.";
    if (error.status === 422) return "Review the setup and try again.";
    return error.message;
  }
  return "Articles are temporarily unavailable. Please try again.";
}

function submitLabel(values: ArticleSetupValues) {
  if (values.interviewMethod === "client")
    return "Create article & prepare interview";
  if (values.interviewMethod === "self") return "Create article & interview me";
  return "Create article & build brief";
}

export function ArticleSetupWizard({ identity }: { identity: AuthIdentity }) {
  const router = useRouter();
  const [step, setStep] = useState<ArticleSetupStep>(1);
  const [values, setValues] = useState<ArticleSetupValues>(
    () => loadArticleSetupDraft() ?? emptyArticleSetup,
  );
  const [errors, setErrors] = useState<ArticleSetupErrors>({});
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    saveArticleSetupDraft(values);
  }, [values]);

  const update = <K extends ArticleSetupField>(
    field: K,
    value: ArticleSetupValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
    setRequestError("");
  };

  const focusFirstError = () => {
    window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  };

  const continueForward = () => {
    if (step === 4) return;
    const nextErrors = validateArticleSetupStep(values, step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstError();
      return;
    }
    setStep((step + 1) as ArticleSetupStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setErrors({});
    setRequestError("");
    setStep((step - 1) as ArticleSetupStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const create = async () => {
    const parsed = articleSetupSchema.safeParse(values);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const field = firstIssue?.path[0] as ArticleSetupField | undefined;
      if (field) setErrors({ [field]: firstIssue.message });
      setRequestError(
        "Some setup details are incomplete. Go back and review them.",
      );
      return;
    }

    setIsSubmitting(true);
    setRequestError("");
    try {
      const created = await createArticle(toArticleInputFromSetup(parsed.data));
      saveArticleSetupMetadata(created.id, toArticleSetupMetadata(parsed.data));
      clearArticleSetupDraft();
      router.push(nextArticlePath(created.id, parsed.data.interviewMethod));
    } catch (error) {
      if (error instanceof ArticleRequestError && error.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/articles/new")}`);
        return;
      }
      setRequestError(requestMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const current = steps[step - 1];

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
            <span>New article</span>
          </div>
        </header>

        <div className={styles.content}>
          <section className={styles.intro} aria-labelledby="setup-title">
            <p className={styles.eyebrow}>Agency article setup</p>
            <h1 id="setup-title">Create a client article</h1>
            <p>
              Give Inkwell the editorial context it needs, then choose who
              should contribute the expertise.
            </p>
          </section>

          <ol className={styles.progress} aria-label="Article setup progress">
            {steps.map((item) => (
              <li
                aria-current={item.number === step ? "step" : undefined}
                data-active={item.number === step}
                data-complete={item.number < step}
                key={item.number}
              >
                <strong aria-hidden>
                  {item.number < step ? (
                    <Check size={14} weight="bold" />
                  ) : (
                    item.number
                  )}
                </strong>
                <span>{item.label}</span>
              </li>
            ))}
          </ol>

          <form
            className={styles.card}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (step === 4) void create();
              else continueForward();
            }}
          >
            <header className={styles.stepHeader}>
              <p>Step {step} of 4</p>
              <h2>{current.title}</h2>
            </header>

            {step === 1 ? (
              <ClientArticleStep
                values={values}
                errors={errors}
                update={update}
              />
            ) : null}
            {step === 2 ? (
              <EditorialDirectionStep
                values={values}
                errors={errors}
                update={update}
              />
            ) : null}
            {step === 3 ? (
              <InterviewSetupStep
                values={values}
                errors={errors}
                update={update}
              />
            ) : null}
            {step === 4 ? <ArticleSetupReview values={values} /> : null}

            <p className={styles.requestError} role="status" aria-live="polite">
              {requestError}
            </p>

            <div className={styles.actions}>
              {step === 1 ? (
                <Link href="/dashboard?section=articles">Cancel</Link>
              ) : (
                <button type="button" onClick={goBack} disabled={isSubmitting}>
                  <ArrowLeft size={16} aria-hidden /> Back
                </button>
              )}
              <button
                className={styles.primary}
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "Creating article…"
                ) : step === 4 ? (
                  submitLabel(values)
                ) : (
                  <>
                    Continue <ArrowRight size={16} aria-hidden />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
