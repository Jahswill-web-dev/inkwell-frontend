import Link from "next/link";
import { ArrowRight, CalendarBlank, Trash } from "@phosphor-icons/react";
import {
  agencyStatusActions,
  agencyStatusLabels,
  type AgencyArticleSummary,
} from "@/lib/dashboard/agency-dashboard";
import { dueDateTone, formatDueDate } from "@/lib/dashboard/agency-format";
import styles from "./article-pipeline.module.css";

function articleHref(articleId: string) {
  return `/articles/${encodeURIComponent(articleId)}`;
}

export function MobileArticleCard({
  article,
  onDelete,
  pendingDeletion,
}: {
  article: AgencyArticleSummary;
  onDelete: () => void;
  pendingDeletion: boolean;
}) {
  return (
    <li>
      <Link className={styles.mobileArticleCard} href={articleHref(article.id)}>
        <div className={styles.mobileArticleTopline}>
          <span>{article.clientName}</span>
          <span className={styles.statusBadge} data-status={article.status}>
            {agencyStatusLabels[article.status]}
          </span>
        </div>
        <h3>{article.working_title}</h3>
        <div className={styles.mobileArticleBottomline}>
          <span data-tone={dueDateTone(article.dueDate)}>
            <CalendarBlank size={16} aria-hidden />
            {formatDueDate(article.dueDate)}
          </span>
          <strong>
            {agencyStatusActions[article.status]}
            <ArrowRight size={15} aria-hidden />
          </strong>
        </div>
      </Link>
      <button
        aria-label={`Delete ${article.working_title}`}
        className={styles.mobileDeleteAction}
        disabled={pendingDeletion}
        onClick={onDelete}
        type="button"
      >
        <Trash aria-hidden size={14} /> Delete article
      </button>
    </li>
  );
}
