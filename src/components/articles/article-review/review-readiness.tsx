import {
  ArrowRight,
  Check,
  CircleNotch,
  Info,
  Lightbulb,
  Quotes,
  SquaresFour,
  User,
} from "@phosphor-icons/react";
import {
  categoryCount,
  openIssues,
  readinessScore,
  type ReviewState,
} from "./review-data";
import styles from "./review-readiness.module.css";

export function ReviewReadiness({
  review,
  onReview,
  onBack,
}: {
  review: ReviewState;
  onReview: () => void;
  onBack: () => void;
}) {
  const score = readinessScore(review);
  const important = review.issues.filter(
    (issue) => issue.category === "important" && issue.status === "open",
  );
  const rows = [
    ["Clarity", Lightbulb, categoryCount(review, "clarity")],
    ["Structure", SquaresFour, categoryCount(review, "structure")],
    ["Voice", User, categoryCount(review, "voice")],
    ["Sources", Quotes, categoryCount(review, "sources")],
  ] as const;

  return (
    <section className={styles.readiness} aria-label="Review readiness">
      <div className={styles.readinessIntro}>
        <div className={styles.score}>
          <CircleNotch size={116} weight="bold" aria-hidden />
          <strong>{score}%</strong>
        </div>
        <div>
          <h2>
            {score === 100 ? "Ready to publish" : "Almost ready to publish"}
          </h2>
          <p>
            Your article is clear, well-structured, and on-brand. Resolve the
            remaining issues to publish with confidence.
          </p>
        </div>
      </div>

      <div className={styles.checklist}>
        <h3>Readiness checklist</h3>
        {rows.map(([label, Icon, count]) => (
          <div key={label}>
            <Icon size={24} aria-hidden />
            <strong>{label}</strong>
            {count ? (
              <span>
                {count} {label === "Structure" ? "important" : "suggestions"}
              </span>
            ) : (
              <span className={styles.good}>
                Looks good <Check size={20} aria-hidden />
              </span>
            )}
          </div>
        ))}
      </div>

      <div className={styles.resolve}>
        <h3>Resolve before publishing</h3>
        {(important.length ? important : openIssues(review).slice(0, 2)).map(
          (issue) => (
            <button key={issue.id} onClick={onReview} type="button">
              <Info size={24} weight="fill" aria-hidden />
              <span>
                <strong>{issue.title}</strong>
                <small>{issue.explanation}</small>
              </span>
              <ArrowRight size={20} aria-hidden />
            </button>
          ),
        )}
      </div>

      <footer className={styles.readinessActions}>
        <button onClick={onBack} type="button">
          Back to draft
        </button>
        <button onClick={onReview} type="button">
          Review {openIssues(review).length} suggestions
        </button>
      </footer>
    </section>
  );
}
