import { Clock, FileText, TextT } from "@phosphor-icons/react";
import {
  countDraftWords,
  type DraftArticleState,
} from "../draft-editor/draft-editor-data";
import { articleParagraphs, readingMinutes } from "./export-data";
import { formatLabels } from "./export-formats";
import type { ExportFormat } from "./export-data";
import styles from "./export-summary.module.css";

export function ExportSummary({
  draft,
  format,
  estimatedSize,
}: {
  draft: DraftArticleState;
  format: ExportFormat;
  estimatedSize: string;
}) {
  const words = countDraftWords(draft).toLocaleString("en-US");
  const minutes = readingMinutes(draft);
  const preview = articleParagraphs(draft).slice(0, 3);

  return (
    <aside className={styles.summary} aria-labelledby="export-summary-heading">
      <p className={styles.eyebrow} id="export-summary-heading">
        Export summary
      </p>
      <h2>{draft.title}</h2>

      <div className={styles.mobileMetrics} aria-label="Article export details">
        <span>
          <TextT size={25} aria-hidden /> {words} words
        </span>
        <span>
          <Clock size={25} aria-hidden /> {minutes} min read
        </span>
        <span>
          <FileText size={25} aria-hidden /> {formatLabels[format]}
        </span>
      </div>

      <p className={styles.desktopMetrics}>
        {words} words <span>•</span> {minutes} min read
      </p>
      <dl className={styles.details}>
        <div>
          <dt>Format</dt>
          <dd>{formatLabels[format]}</dd>
        </div>
        <div>
          <dt>Estimated file size</dt>
          <dd>{estimatedSize}</dd>
        </div>
      </dl>
      <section
        className={styles.preview}
        aria-labelledby="content-preview-heading"
      >
        <h3 id="content-preview-heading">Content preview</h3>
        <div>
          {preview.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
    </aside>
  );
}
