import {
  Info,
  Lightbulb,
  ListBullets,
  Quotes,
  SquaresFour,
  User,
} from "@phosphor-icons/react";
import {
  categoryCount,
  type ReviewCategory,
  type ReviewState,
} from "./review-data";
import styles from "./review-filters.module.css";

const filters = [
  ["all", "All issues", ListBullets],
  ["important", "Important", Info],
  ["clarity", "Clarity", Lightbulb],
  ["structure", "Structure", SquaresFour],
  ["voice", "Voice", User],
  ["sources", "Sources", Quotes],
] as const;

export function ReviewFilters({
  review,
  onSelect,
}: {
  review: ReviewState;
  onSelect: (category: ReviewCategory) => void;
}) {
  return (
    <aside className={styles.filters} aria-label="Review filters">
      <h2>Review filters</h2>
      <div>
        {filters.map(([category, label, Icon]) => (
          <button
            aria-pressed={review.activeFilter === category}
            className={
              review.activeFilter === category ? styles.activeFilter : ""
            }
            key={category}
            onClick={() => onSelect(category)}
            type="button"
          >
            <Icon size={23} aria-hidden />
            <span>{label}</span>
            <strong>{categoryCount(review, category)}</strong>
          </button>
        ))}
      </div>
    </aside>
  );
}
