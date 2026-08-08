"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, ClipboardText, Lightbulb } from "@phosphor-icons/react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import styles from "./new-article-form.module.css";

export type NewArticleMode = "idea" | "notes";

export type NewArticleFormState = {
  idea: string;
  notes: string;
  workingTitle: string;
  targetAudience: string;
  articleGoal: string;
};

type NewArticleFormProps = {
  initialMode?: NewArticleMode;
};

const modes: readonly NewArticleMode[] = ["idea", "notes"];

const modeContent = {
  idea: {
    label: "Start with an idea",
    shortLabel: "Idea",
    heading: "What would you like to write about?",
    description:
      "Capture your rough idea, and we’ll help shape it into a clear, compelling article.",
    placeholder:
      "Describe the idea you want to explore. It can be a question, observation, argument, or early thought…",
    helper: "Write freely—this doesn’t have to be perfect.",
  },
  notes: {
    label: "Paste your notes",
    shortLabel: "Notes",
    heading: "Turn your notes into a clear article.",
    description:
      "Paste anything you have—we’ll help find the story and shape it into a useful brief.",
    placeholder:
      "Paste rough notes, bullet points, quotes, research, or fragments here…\n\n• Key thought or observation\n• Supporting example or quote\n• Questions you still want to explore",
    helper: "Formatting doesn’t need to be clean. We’ll organize it later.",
  },
} as const;

const initialState: NewArticleFormState = {
  idea: "",
  notes: "",
  workingTitle: "",
  targetAudience: "",
  articleGoal: "",
};

export function NewArticleForm({ initialMode = "idea" }: NewArticleFormProps) {
  const router = useRouter();
  const [mode, setMode] = useState<NewArticleMode>(initialMode);
  const [form, setForm] = useState<NewArticleFormState>(initialState);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const ideaTabRef = useRef<HTMLButtonElement>(null);
  const notesTabRef = useRef<HTMLButtonElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const content = modeContent[mode];
  const sourceValue = form[mode];
  const wordCount = sourceValue.trim()
    ? sourceValue.trim().split(/\s+/).length
    : 0;

  const updateField = <K extends keyof NewArticleFormState>(
    field: K,
    value: NewArticleFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === mode && error) setError("");
  };

  const selectMode = (nextMode: NewArticleMode) => {
    setMode(nextMode);
    setError("");
    setStatus("");
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }

    event.preventDefault();
    const currentIndex = modes.indexOf(mode);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? modes.length - 1
          : event.key === "ArrowRight"
            ? (currentIndex + 1) % modes.length
            : (currentIndex - 1 + modes.length) % modes.length;
    const nextMode = modes[nextIndex];
    selectMode(nextMode);
    (nextMode === "idea" ? ideaTabRef : notesTabRef).current?.focus();
  };

  const saveDraft = () => {
    setError("");
    setStatus("Draft saved.");
  };

  const buildBrief = () => {
    if (sourceValue.trim().length < 20) {
      setStatus("");
      setError(
        mode === "idea"
          ? "Add at least 20 characters so we can understand your idea."
          : "Paste at least 20 characters so we have enough notes to work with.",
      );
      sourceRef.current?.focus();
      return;
    }

    setError("");
    window.sessionStorage.setItem(
      "inkwell:new-article",
      JSON.stringify({ mode, ...form }),
    );
    router.push("/articles/new/brief");
  };

  return (
    <main className={styles.page}>
      <DashboardSidebar activeHref="/dashboard?section=articles" />

      <div className={styles.workspace}>
        <header className={styles.desktopHeader}>
          <div className={styles.headerInner}>
            <Link href="/dashboard?section=articles">Articles</Link>
            <span aria-hidden>/</span>
            <span>New article</span>
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
            <strong>New article</strong>
          </div>
          <button type="button" onClick={saveDraft}>
            Save
          </button>
        </header>

        <div className={styles.content}>
          <section className={styles.intro} aria-labelledby="new-article-title">
            <p className={styles.eyebrow}>Start a new article</p>
            <h1 id="new-article-title">{content.heading}</h1>
            <p>{content.description}</p>
          </section>

          <div
            className={styles.tabs}
            role="tablist"
            aria-label="Starting method"
          >
            {modes.map((item) => {
              const isActive = item === mode;
              const Icon = item === "idea" ? Lightbulb : ClipboardText;

              return (
                <button
                  aria-controls="new-article-panel"
                  aria-selected={isActive}
                  className={isActive ? styles.activeTab : ""}
                  id={`${item}-tab`}
                  key={item}
                  onClick={() => selectMode(item)}
                  onKeyDown={handleTabKeyDown}
                  ref={item === "idea" ? ideaTabRef : notesTabRef}
                  role="tab"
                  tabIndex={isActive ? 0 : -1}
                  type="button"
                >
                  <Icon size={23} aria-hidden />
                  <span className={styles.desktopTabLabel}>
                    {modeContent[item].label}
                  </span>
                  <span className={styles.mobileTabLabel}>
                    {modeContent[item].shortLabel}
                  </span>
                </button>
              );
            })}
          </div>

          <form
            className={styles.form}
            id="new-article-panel"
            role="tabpanel"
            aria-labelledby={`${mode}-tab`}
            onSubmit={(event) => {
              event.preventDefault();
              buildBrief();
            }}
          >
            <div className={styles.sourceField}>
              <label className={styles.visuallyHidden} htmlFor="article-source">
                {mode === "idea" ? "Your article idea" : "Your notes"}
              </label>
              <textarea
                aria-describedby={`source-helper${error ? " source-error" : ""}`}
                aria-invalid={Boolean(error)}
                id="article-source"
                maxLength={5000}
                onChange={(event) => updateField(mode, event.target.value)}
                placeholder={content.placeholder}
                ref={sourceRef}
                value={sourceValue}
              />
              <div className={styles.sourceMeta} id="source-helper">
                <span>{content.helper}</span>
                {mode === "notes" ? <span>{wordCount} words</span> : null}
              </div>
              {error ? (
                <p className={styles.error} id="source-error">
                  {error}
                </p>
              ) : null}
            </div>

            <div className={styles.detailsGrid}>
              <label className={styles.field}>
                <span>
                  Working title <small>(optional)</small>
                </span>
                <input
                  maxLength={120}
                  onChange={(event) =>
                    updateField("workingTitle", event.target.value)
                  }
                  placeholder="e.g., Why Good Ideas Are Hard to Write Down"
                  value={form.workingTitle}
                />
                <small>You can change this later.</small>
              </label>

              <label className={styles.field}>
                <span>Target audience</span>
                <input
                  maxLength={160}
                  onChange={(event) =>
                    updateField("targetAudience", event.target.value)
                  }
                  placeholder="Who are you writing for?"
                  value={form.targetAudience}
                />
                <small>Who is this article for?</small>
              </label>

              <label className={`${styles.field} ${styles.goalField}`}>
                <span>Article goal</span>
                <select
                  onChange={(event) =>
                    updateField("articleGoal", event.target.value)
                  }
                  value={form.articleGoal}
                >
                  <option value="" disabled>
                    Select what readers should take away
                  </option>
                  <option value="inform">Inform and inspire</option>
                  <option value="educate">
                    Educate with practical guidance
                  </option>
                  <option value="persuade">
                    Persuade or change a perspective
                  </option>
                  <option value="inspire">
                    Inspire readers to take action
                  </option>
                  <option value="entertain">
                    Entertain with a compelling story
                  </option>
                </select>
                <small>What should readers take away from this article?</small>
              </label>
            </div>

            <p className={styles.status} role="status" aria-live="polite">
              {status}
            </p>

            <div className={styles.desktopActions}>
              <button type="button" onClick={saveDraft}>
                Save as draft
              </button>
              <button className={styles.primaryAction} type="submit">
                Build my article brief
              </button>
            </div>

            <div className={styles.mobileActions}>
              <button className={styles.primaryAction} type="submit">
                Build my article brief
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
