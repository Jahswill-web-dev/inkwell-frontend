import { ArrowLeft, ArrowRight, Info, NotePencil } from "@phosphor-icons/react";
import { useState } from "react";
import type { ReviewIssue } from "./review-data";
import styles from "./review-issue-panel.module.css";

export function ReviewIssuePanel({
  issue,
  position,
  total,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  onAccept,
  onIgnore,
  onManualSave,
  onSummary,
}: {
  issue?: ReviewIssue;
  position: number;
  total: number;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onAccept: () => void;
  onIgnore: () => void;
  onManualSave: (value: string) => void;
  onSummary: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [manualValue, setManualValue] = useState(issue?.suggestion ?? "");

  if (!issue) {
    return (
      <aside className={styles.issuePanel} aria-label="Review issue">
        <div className={styles.emptyState}>
          <h2>No open issues here</h2>
          <p>Choose another filter or return to your review summary.</p>
          <button onClick={onSummary} type="button">
            Review summary
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.issuePanel} aria-label="Review issue">
      <header className={styles.issueNavigation}>
        <strong>
          Issue {position} of {total}
        </strong>
        <span>
          <button
            aria-label="Previous issue"
            disabled={!canPrevious}
            onClick={onPrevious}
            type="button"
          >
            <ArrowLeft size={20} aria-hidden />
          </button>
          <button
            aria-label="Next issue"
            disabled={!canNext}
            onClick={onNext}
            type="button"
          >
            <ArrowRight size={20} aria-hidden />
          </button>
        </span>
      </header>

      <div className={styles.issueDescription}>
        <h2>
          <Info size={24} weight="fill" aria-hidden /> {issue.title}
        </h2>
        <p>{issue.explanation}</p>
      </div>

      <div className={styles.revision}>
        <label>Original</label>
        <div>{issue.original}</div>
        <label htmlFor="manual-revision">Suggested revision</label>
        {editing ? (
          <textarea
            autoFocus
            id="manual-revision"
            onChange={(event) => setManualValue(event.target.value)}
            value={manualValue}
          />
        ) : (
          <div className={styles.suggestion}>{issue.suggestion}</div>
        )}
      </div>

      <div className={styles.issueActions}>
        {editing ? (
          <button onClick={() => onManualSave(manualValue)} type="button">
            Save revision
          </button>
        ) : (
          <button onClick={onAccept} type="button">
            Accept suggestion
          </button>
        )}
        <span>
          <button onClick={onIgnore} type="button">
            Ignore
          </button>
          <button onClick={() => setEditing((value) => !value)} type="button">
            <NotePencil size={18} aria-hidden />{" "}
            {editing ? "Cancel" : "Edit manually"}
          </button>
        </span>
      </div>

      <button className={styles.summaryLink} onClick={onSummary} type="button">
        Review summary <ArrowRight size={18} aria-hidden />
      </button>
      <p className={styles.disclaimer}>
        AI suggestions may be inaccurate.{" "}
        <a href="https://openai.com/policies/usage-policies/">Learn more</a>
      </p>
    </aside>
  );
}
