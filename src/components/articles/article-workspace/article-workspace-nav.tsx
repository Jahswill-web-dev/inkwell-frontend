import Link from "next/link";
import styles from "./article-workspace.module.css";

const tabs = [
  { label: "Overview", path: null },
  { label: "Interviews", path: "interviews", upcoming: true },
  { label: "Brief", path: "brief" },
  { label: "Outline", path: "outline" },
  { label: "Draft", path: "draft" },
  { label: "Review", path: "review" },
  { label: "Publish", path: "export" },
] as const;

function tabHref(articleId: string, path: string | null) {
  if (!path) return `/articles/${encodeURIComponent(articleId)}`;
  return `/articles/new/${path}?articleId=${encodeURIComponent(articleId)}`;
}

export function ArticleWorkspaceNav({ articleId }: { articleId: string }) {
  return (
    <nav className={styles.tabs} aria-label="Article workspace">
      {tabs.map((tab) =>
        "upcoming" in tab && tab.upcoming ? (
          <span
            aria-disabled="true"
            key={tab.label}
            title="Available in the next milestone"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            aria-current={tab.path === null ? "page" : undefined}
            href={tabHref(articleId, tab.path)}
            key={tab.label}
          >
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}
