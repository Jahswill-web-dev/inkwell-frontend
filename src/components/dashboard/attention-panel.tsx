import Link from "next/link";
import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import type { AgencyArticleSummary } from "@/lib/dashboard/agency-dashboard";
import { isOverdue } from "@/lib/dashboard/agency-filters";
import styles from "./attention-panel.module.css";

function articleHref(articleId: string) {
  return `/articles/new/brief?articleId=${encodeURIComponent(articleId)}`;
}

export function AttentionPanel({
  articles,
}: {
  articles: readonly AgencyArticleSummary[];
}) {
  return (
    <aside className={styles.attentionPanel} aria-labelledby="attention-title">
      <div className={styles.attentionHeading}>
        <span>
          <WarningCircle size={21} weight="fill" aria-hidden />
          <h2 id="attention-title">Attention needed</h2>
        </span>
        <small>{articles.length}</small>
      </div>
      {articles.length ? (
        <ol className={styles.attentionList}>
          {articles.slice(0, 4).map((article) => {
            const reason =
              article.attentionReason ??
              (isOverdue(article.dueDate)
                ? "This article has passed its due date."
                : "This article needs your attention.");
            return (
              <li key={article.id}>
                <CheckCircle size={19} aria-hidden />
                <div>
                  <strong>{article.working_title}</strong>
                  <p>{reason}</p>
                  <Link href={articleHref(article.id)}>
                    Open article <ArrowRight size={14} aria-hidden />
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className={styles.attentionEmpty}>
          <CheckCircle size={28} weight="fill" aria-hidden />
          <p>You’re all caught up.</p>
          <small>New client activity will appear here.</small>
        </div>
      )}
    </aside>
  );
}
