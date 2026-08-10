import { CaretUp } from "@phosphor-icons/react";
import type { ExportInclusions } from "./export-data";
import styles from "./export-inclusions.module.css";

const inclusionOptions: readonly {
  id: keyof ExportInclusions;
  label: string;
}[] = [
  { id: "title", label: "Title" },
  { id: "author", label: "Author" },
  { id: "sources", label: "Sources" },
  { id: "summary", label: "Article summary" },
  { id: "publishingMetadata", label: "Publishing metadata" },
];

export function ExportInclusionOptions({
  expanded,
  value,
  onExpandedChange,
  onChange,
}: {
  expanded: boolean;
  value: ExportInclusions;
  onExpandedChange: (expanded: boolean) => void;
  onChange: (inclusions: ExportInclusions) => void;
}) {
  return (
    <section className={styles.section} aria-labelledby="include-heading">
      <button
        aria-expanded={expanded}
        aria-controls="include-options"
        className={styles.heading}
        onClick={() => onExpandedChange(!expanded)}
        type="button"
      >
        <span id="include-heading">Include in export</span>
        <CaretUp
          className={expanded ? "" : styles.collapsedCaret}
          size={22}
          aria-hidden
        />
      </button>
      <div
        className={`${styles.options} ${expanded ? "" : styles.collapsed}`}
        id="include-options"
      >
        {inclusionOptions.map(({ id, label }) => (
          <label className={styles.option} key={id}>
            <input
              checked={value[id]}
              onChange={(event) =>
                onChange({ ...value, [id]: event.target.checked })
              }
              type="checkbox"
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </section>
  );
}
