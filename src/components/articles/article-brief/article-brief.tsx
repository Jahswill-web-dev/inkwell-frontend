"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  Sparkle,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DEFAULT_AUTH_IDENTITY, type AuthIdentity } from "@/lib/auth/identity";
import { ArticleProgress } from "../article-progress/article-progress";
import styles from "./article-brief.module.css";

export type ArticleLength = "short" | "standard" | "long" | "custom";

export type ArticleBriefState = {
  workingTitle: string;
  goal: string;
  mainTopic: string;
  targetAudience: string;
  readerProblem: string;
  examples: string;
  mainArgument: string;
  avoid: string;
  desiredOutcome: string;
  preferredLength: ArticleLength;
};

type BriefTextField = Exclude<keyof ArticleBriefState, "preferredLength">;

const defaultBrief: ArticleBriefState = {
  workingTitle: "Why Great Ideas Are Hard to Write Down",
  goal: "Show why good ideas become difficult to express",
  mainTopic:
    "The nature of great ideas and why they’re difficult to capture in writing.",
  targetAudience:
    "Knowledge workers, students, and creative professionals who write essays, reports, or articles.",
  readerProblem:
    "They have valuable ideas but struggle to translate them into clear, structured writing.",
  examples:
    "Personal writing block moments, before-and-after rewrites, useful analogies, and a short real-world example.",
  mainArgument:
    "Great ideas resist precision; writing forces clarity, and that friction is essential to better thinking.",
  avoid:
    "Vague advice, motivation without method, overly academic theory, and generic writing tips.",
  desiredOutcome:
    "Readers will understand why writing is hard—and use that insight to write with more patience and purpose.",
  preferredLength: "standard",
};

const goalLabels: Record<string, string> = {
  inform: "Inform and inspire",
  educate: "Educate with practical guidance",
  persuade: "Persuade or change a perspective",
  inspire: "Inspire readers to take action",
  entertain: "Entertain with a compelling story",
};

const requiredFields: readonly BriefTextField[] = [
  "mainTopic",
  "targetAudience",
  "readerProblem",
  "mainArgument",
  "desiredOutcome",
];

const fieldIds: Record<BriefTextField, string> = {
  workingTitle: "brief-working-title",
  goal: "brief-goal",
  mainTopic: "main-topic",
  targetAudience: "target-audience",
  readerProblem: "reader-problem",
  examples: "examples",
  mainArgument: "main-argument",
  avoid: "avoid",
  desiredOutcome: "desired-outcome",
};

type BriefFieldProps = {
  field: BriefTextField;
  label: string;
  maxLength: number;
  value: string;
  required?: boolean;
  error?: string;
  onChange: (field: BriefTextField, value: string) => void;
};

function BriefField({
  field,
  label,
  maxLength,
  value,
  required = false,
  error,
  onChange,
}: BriefFieldProps) {
  const id = fieldIds[field];
  const countId = `${id}-count`;
  const errorId = `${id}-error`;

  return (
    <label className={styles.field} htmlFor={id}>
      <span>
        {label} {required ? <b aria-hidden>*</b> : null}
      </span>
      <textarea
        aria-describedby={`${countId}${error ? ` ${errorId}` : ""}`}
        aria-invalid={Boolean(error)}
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(field, event.target.value)}
        value={value}
      />
      <small id={countId}>
        {value.length} / {maxLength}
      </small>
      {error ? (
        <small className={styles.error} id={errorId}>
          {error}
        </small>
      ) : null}
    </label>
  );
}

export function ArticleBrief({
  identity = DEFAULT_AUTH_IDENTITY,
}: {
  identity?: AuthIdentity;
}) {
  const router = useRouter();
  const [brief, setBrief] = useState<ArticleBriefState>(defaultBrief);
  const [errors, setErrors] = useState<Partial<Record<BriefTextField, string>>>(
    {},
  );
  const [status, setStatus] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [openOptional, setOpenOptional] = useState({
    examples: false,
    avoid: false,
  });
  useEffect(() => {
    const saved = window.sessionStorage.getItem("inkwell:new-article");
    if (!saved) return;

    try {
      const seed = JSON.parse(saved) as Record<string, unknown>;
      const source =
        seed.mode === "notes"
          ? String(seed.notes ?? "")
          : String(seed.idea ?? "");
      const timer = window.setTimeout(() => {
        setBrief((current) => ({
          ...current,
          workingTitle:
            String(seed.workingTitle ?? "").trim() || current.workingTitle,
          goal: goalLabels[String(seed.articleGoal ?? "")] || current.goal,
          mainTopic: source.trim() || current.mainTopic,
          targetAudience: Array.isArray(seed.targetAudience)
            ? seed.targetAudience.filter((item) => typeof item === "string").join(", ") ||
              current.targetAudience
            : String(seed.targetAudience ?? "").trim() || current.targetAudience,
        }));
      }, 0);

      return () => window.clearTimeout(timer);
    } catch {
      window.sessionStorage.removeItem("inkwell:new-article");
    }
  }, []);

  const updateField = (field: BriefTextField, value: string) => {
    setBrief((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  };

  const saveDraft = () => {
    window.sessionStorage.setItem(
      "inkwell:article-brief",
      JSON.stringify(brief),
    );
    setStatus("Article brief saved.");
  };

  const generateOutline = () => {
    const nextErrors: Partial<Record<BriefTextField, string>> = {};
    requiredFields.forEach((field) => {
      if (brief[field].trim().length < 10) {
        nextErrors[field] = "Add at least 10 characters.";
      }
    });
    setErrors(nextErrors);
    setStatus("");

    const firstInvalid = requiredFields.find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(fieldIds[firstInvalid])?.focus();
      return;
    }

    setIsGenerating(true);
    window.sessionStorage.setItem(
      "inkwell:article-brief",
      JSON.stringify(brief),
    );
    window.setTimeout(() => {
      setIsGenerating(false);
      setStatus("Outline generated.");
      router.push("/articles/new/outline");
    }, 600);
  };

  return (
    <main className={styles.page}>
      <DashboardSidebar
        activeHref="/dashboard?section=articles"
        identity={identity}
      />
      <div className={styles.workspace}>
        <header className={styles.mobileHeader}>
          <Link href="/articles/new" aria-label="Back to new article">
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
          <button type="button" onClick={saveDraft}>
            Save
          </button>
        </header>

        <ArticleProgress currentStep="brief" />

        <div className={styles.content}>
          <section className={styles.summary} aria-label="Article summary">
            <div>
              <span>Working title</span>
              <strong>{brief.workingTitle}</strong>
            </div>
            <div className={styles.goalSummary}>
              <span>Goal</span>
              <strong>{brief.goal}</strong>
            </div>
          </section>

          <header className={styles.intro}>
            <h1>Shape your article brief</h1>
            <p>
              Inkwell prefilled this brief based on your rough idea. Refine the
              details to help us craft the right outline.
            </p>
          </header>

          <form
            className={styles.form}
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              generateOutline();
            }}
          >
            <div className={styles.mainTopic}>
              <BriefField
                field="mainTopic"
                label="Main topic"
                maxLength={200}
                value={brief.mainTopic}
                required
                error={errors.mainTopic}
                onChange={updateField}
              />
            </div>
            <div className={styles.audience}>
              <BriefField
                field="targetAudience"
                label="Target audience"
                maxLength={200}
                value={brief.targetAudience}
                required
                error={errors.targetAudience}
                onChange={updateField}
              />
            </div>
            <div className={styles.problem}>
              <BriefField
                field="readerProblem"
                label="Reader problem"
                maxLength={200}
                value={brief.readerProblem}
                required
                error={errors.readerProblem}
                onChange={updateField}
              />
            </div>
            <div
              className={`${styles.optionalDetails} ${styles.examples} ${openOptional.examples ? styles.expanded : ""}`}
            >
              <button
                aria-controls="examples-content"
                aria-expanded={openOptional.examples}
                className={styles.optionalToggle}
                onClick={() =>
                  setOpenOptional((current) => ({
                    ...current,
                    examples: !current.examples,
                  }))
                }
                type="button"
              >
                Examples to include <small>(optional)</small>
                <CaretDown size={18} aria-hidden />
              </button>
              <div className={styles.optionalContent} id="examples-content">
                <BriefField
                  field="examples"
                  label="Examples or experiences to include"
                  maxLength={300}
                  value={brief.examples}
                  onChange={updateField}
                />
              </div>
            </div>
            <div className={styles.argument}>
              <BriefField
                field="mainArgument"
                label="Main argument or insight"
                maxLength={300}
                value={brief.mainArgument}
                required
                error={errors.mainArgument}
                onChange={updateField}
              />
            </div>
            <div
              className={`${styles.optionalDetails} ${styles.avoid} ${openOptional.avoid ? styles.expanded : ""}`}
            >
              <button
                aria-controls="avoid-content"
                aria-expanded={openOptional.avoid}
                className={styles.optionalToggle}
                onClick={() =>
                  setOpenOptional((current) => ({
                    ...current,
                    avoid: !current.avoid,
                  }))
                }
                type="button"
              >
                What to avoid <small>(optional)</small>
                <CaretDown size={18} aria-hidden />
              </button>
              <div className={styles.optionalContent} id="avoid-content">
                <BriefField
                  field="avoid"
                  label="What should this article avoid?"
                  maxLength={300}
                  value={brief.avoid}
                  onChange={updateField}
                />
              </div>
            </div>
            <div className={styles.outcome}>
              <BriefField
                field="desiredOutcome"
                label="Desired reader outcome"
                maxLength={300}
                value={brief.desiredOutcome}
                required
                error={errors.desiredOutcome}
                onChange={updateField}
              />
            </div>
            <fieldset className={styles.length}>
              <legend>Preferred length</legend>
              <div className={styles.lengthOptions}>
                {(
                  [
                    ["short", "Short", "~800 words"],
                    ["standard", "Standard", "~1,500 words"],
                    ["long", "Long", "~2,500 words"],
                    ["custom", "Custom", "Set your own"],
                  ] as const
                ).map(([value, label, detail]) => (
                  <label
                    className={
                      brief.preferredLength === value
                        ? styles.selectedLength
                        : ""
                    }
                    key={value}
                  >
                    <input
                      checked={brief.preferredLength === value}
                      name="preferred-length"
                      onChange={() =>
                        setBrief((current) => ({
                          ...current,
                          preferredLength: value,
                        }))
                      }
                      type="radio"
                      value={value}
                    />
                    <span>{label}</span>
                    <small>{detail}</small>
                  </label>
                ))}
              </div>
              <p>
                A standard-length article is ideal for in-depth insights with
                actionable takeaways.
              </p>
            </fieldset>

            <p className={styles.status} role="status" aria-live="polite">
              {status}
            </p>

            <div className={styles.mobileGenerate}>
              <button type="submit" disabled={isGenerating}>
                <Sparkle size={25} aria-hidden />
                {isGenerating ? "Generating outline…" : "Generate outline"}
              </button>
            </div>
          </form>
        </div>

        <footer className={styles.desktopFooter}>
          <Link href="/articles/new">
            <ArrowLeft size={18} aria-hidden /> Back
          </Link>
          <div>
            <button type="button" onClick={saveDraft}>
              Save as draft
            </button>
            <button
              type="button"
              onClick={generateOutline}
              disabled={isGenerating}
            >
              {isGenerating ? "Generating outline…" : "Generate outline"}
              <ArrowRight size={19} aria-hidden />
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
