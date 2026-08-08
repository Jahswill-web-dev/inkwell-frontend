import { CaretRight, DotsThreeVertical } from "@phosphor-icons/react";
import type { DashboardArticle } from "./dashboard-data";
import styles from "./dashboard.module.css";

type ArticleListProps = {
  desktopArticles: readonly DashboardArticle[];
  mobileArticles: readonly DashboardArticle[];
  onOpen: (title: string) => void;
};

function DesktopArticleRow({
  article,
  onOpen,
}: {
  article: DashboardArticle;
  onOpen: (title: string) => void;
}) {
  return (
    <button
      className={styles.desktopArticleRow}
      type="button"
      onClick={() => onOpen(article.title)}
    >
      <strong>{article.title}</strong>
      <span className={`${styles.stage} ${styles[`stage${article.stage}`]}`}>
        {article.stage}
      </span>
      <span className={styles.desktopProgress}>
        <span>{article.progress}%</span>
        <i>
          <b style={{ width: `${article.progress}%` }} />
        </i>
      </span>
      <span>{article.words}</span>
      <span>{article.edited}</span>
      <DotsThreeVertical size={24} aria-hidden />
    </button>
  );
}

function MobileArticleRow({
  article,
  onOpen,
}: {
  article: DashboardArticle;
  onOpen: (title: string) => void;
}) {
  return (
    <button
      className={styles.mobileArticleRow}
      type="button"
      onClick={() => onOpen(article.title)}
    >
      <strong>{article.title}</strong>
      <span className={styles.mobileStage}>
        <i className={styles[`dot${article.stage}`]} />
        {article.stage}
      </span>
      <span className={styles.mobileProgress}>
        <i>
          <b style={{ width: `${article.progress}%` }} />
        </i>
        <span>{article.progress}%</span>
        <small>{article.edited}</small>
        <CaretRight size={24} aria-hidden />
      </span>
    </button>
  );
}

export function ArticleList({
  desktopArticles,
  mobileArticles,
  onOpen,
}: ArticleListProps) {
  return (
    <section
      className={styles.articleSection}
      aria-labelledby="continue-writing-title"
    >
      <h2 id="continue-writing-title">Continue writing</h2>
      <div className={styles.desktopTable}>
        <div className={styles.tableHeader}>
          <span>Title</span>
          <span>Stage</span>
          <span>Progress</span>
          <span>Words</span>
          <span>Last edited</span>
          <span />
        </div>
        {desktopArticles.map((article) => (
          <DesktopArticleRow
            article={article}
            key={article.title}
            onOpen={onOpen}
          />
        ))}
      </div>
      <div className={styles.mobileList}>
        {mobileArticles.map((article) => (
          <MobileArticleRow
            article={article}
            key={article.title}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  );
}
