import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import {
  agencyStatusActions,
  agencyStatusLabels,
  type AgencyArticleSummary,
} from "@/lib/dashboard/agency-dashboard";
import {
  dueDateTone,
  formatDueDate,
  formatLastActivity,
} from "@/lib/dashboard/agency-format";
import { MobileArticleCard } from "./mobile-article-card";
import styles from "./article-pipeline.module.css";

type ArticlePipelineProps = {
  articles: readonly AgencyArticleSummary[];
  total: number;
  isLoadingMore: boolean;
  loadError: string;
  onLoadMore: () => void;
  onRetry: () => void;
};

function articleHref(articleId: string) {
  return `/articles/${encodeURIComponent(articleId)}`;
}

export function ArticlePipeline({
  articles,
  total,
  isLoadingMore,
  loadError,
  onLoadMore,
  onRetry,
}: ArticlePipelineProps) {
  return (
    <section className={styles.pipeline} aria-labelledby="pipeline-title">
      <div className={styles.pipelineHeading}>
        <div>
          <p className={styles.eyebrow}>Article pipeline</p>
          <h2 id="pipeline-title">Client work in progress</h2>
        </div>
        <span>{articles.length} shown</span>
      </div>

      <div className={styles.pipelineTableWrap}>
        <table className={styles.pipelineTable}>
          <thead>
            <tr>
              <th>Article</th>
              <th>Status</th>
              <th>Assignee</th>
              <th>Due</th>
              <th>Activity</th>
              <th>
                <span className={styles.visuallyHidden}>Next action</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {articles.map((article) => (
              <tr key={article.id}>
                <td>
                  <Link href={articleHref(article.id)}>
                    <strong>{article.working_title}</strong>
                    <span>{article.clientName}</span>
                  </Link>
                </td>
                <td>
                  <span
                    className={styles.statusBadge}
                    data-status={article.status}
                  >
                    {agencyStatusLabels[article.status]}
                  </span>
                </td>
                <td>{article.assignee}</td>
                <td>
                  <span
                    className={styles.dueDate}
                    data-tone={dueDateTone(article.dueDate)}
                  >
                    {formatDueDate(article.dueDate)}
                  </span>
                </td>
                <td>{formatLastActivity(article.lastActivity)}</td>
                <td>
                  <Link
                    className={styles.rowAction}
                    href={articleHref(article.id)}
                    aria-label={`${agencyStatusActions[article.status]}: ${article.working_title}`}
                  >
                    {agencyStatusActions[article.status]}
                    <ArrowRight size={15} aria-hidden />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ol className={styles.mobilePipelineList}>
        {articles.map((article) => (
          <MobileArticleCard article={article} key={article.id} />
        ))}
      </ol>

      {loadError ? (
        <div className={styles.listFeedback} role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={onRetry}>
            Try again
          </button>
        </div>
      ) : null}
      {!loadError && articles.length < total ? (
        <button
          className={styles.loadMore}
          type="button"
          disabled={isLoadingMore}
          onClick={onLoadMore}
        >
          {isLoadingMore ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </section>
  );
}
