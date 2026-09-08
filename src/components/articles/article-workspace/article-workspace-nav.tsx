import Link from "next/link";
import styles from "./article-workspace.module.css";

const tabs = [
  { label: "Overview", path: null },
  { label: "Interviews", path: "interviews" },
  { label: "Brief", path: "brief" },
  { label: "Outline", path: "outline" },
  { label: "Draft", path: "draft" },
  { label: "Review", path: "review" },
  { label: "Publish", path: "export" },
] as const;

function tabHref(articleId: string, path: string | null) {
  if (path === "interviews") {
    return "/articles/" + encodeURIComponent(articleId) + "/interviews";
  }
  if (!path) return `/articles/${encodeURIComponent(articleId)}`;
  return `/articles/new/${path}?articleId=${encodeURIComponent(articleId)}`;
}

export function ArticleWorkspaceNav({
  articleId,
  activeTab = "overview",
}: {
  articleId: string;
  activeTab?: "overview" | "interviews";
}) {
  return (
    <nav className={styles.tabs} aria-label="Article workspace">
      {tabs.map((tab) => (
        <Link
          aria-current={
            (activeTab === "overview" && tab.path === null) ||
            activeTab === tab.path
              ? "page"
              : undefined
          }
          href={tabHref(articleId, tab.path)}
          key={tab.label}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
