import Link from "next/link";
import { CaretRight } from "@phosphor-icons/react";
import { articleGoalLabels, type Article } from "@/lib/articles/article";
import styles from "./dashboard.module.css";

type ArticleListProps = {
  articles: readonly Article[];
  total: number;
  isLoadingMore: boolean;
  loadError: string;
  onLoadMore: () => void;
  onRetry: () => void;
};

function updatedLabel(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function articleBriefHref(articleId: string) {
  return `/articles/new/brief?articleId=${encodeURIComponent(articleId)}`;
}

export function ArticleList({
  articles,
  total,
  isLoadingMore,
  loadError,
  onLoadMore,
  onRetry,
}: ArticleListProps) {
  return (
    <section className={styles.articleSection} aria-labelledby="continue-writing-title">
      <h2 id="continue-writing-title">Continue writing</h2>
      <div className={styles.desktopTable}>
        <div className={styles.tableHeader}>
          <span>Title</span><span>Goal</span><span>Target audience</span><span>Last edited</span><span />
        </div>
        {articles.map((article) => (
          <Link className={styles.desktopArticleRow} href={articleBriefHref(article.id)} key={article.id}>
            <strong>{article.working_title}</strong>
            <span>{articleGoalLabels[article.article_goal]}</span>
            <span className={styles.audienceCell}>{article.target_audience.join(", ")}</span>
            <span>{updatedLabel(article.updated_at)}</span>
            <CaretRight size={20} aria-hidden />
          </Link>
        ))}
      </div>
      <div className={styles.mobileList}>
        {articles.map((article) => (
          <Link className={styles.mobileArticleRow} href={articleBriefHref(article.id)} key={article.id}>
            <strong>{article.working_title}</strong>
            <span className={styles.mobileStage}>{articleGoalLabels[article.article_goal]}</span>
            <span className={styles.mobileArticleMeta}><small>{updatedLabel(article.updated_at)}</small><CaretRight size={24} aria-hidden /></span>
          </Link>
        ))}
      </div>
      {loadError ? <div className={styles.listFeedback} role="alert"><span>{loadError}</span><button type="button" onClick={onRetry}>Try again</button></div> : null}
      {!loadError && articles.length < total ? <button className={styles.loadMore} type="button" disabled={isLoadingMore} onClick={onLoadMore}>{isLoadingMore ? "Loading…" : "Load more"}</button> : null}
    </section>
  );
}
