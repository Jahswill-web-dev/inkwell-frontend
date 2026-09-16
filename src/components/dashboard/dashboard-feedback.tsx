import Link from "next/link";
import { FileText, MagnifyingGlass } from "@phosphor-icons/react";
import styles from "./dashboard.module.css";

export function DashboardLoading() {
  return (
    <div className={styles.dashboardState} role="status">
      <span className={styles.loadingMark} aria-hidden />
      <p>Loading your articles…</p>
    </div>
  );
}

export function DashboardLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles.dashboardState} role="alert">
      <FileText size={32} aria-hidden />
      <h2>We couldn’t load your workspace</h2>
      <p>Your articles are safe. Try loading them again.</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

export function DashboardEmpty() {
  return (
    <div className={styles.dashboardState}>
      <FileText size={34} aria-hidden />
      <h2>No client articles yet</h2>
      <p>Create your first article to start the agency workflow.</p>
      <Link href="/articles/new">Create an article</Link>
    </div>
  );
}

export function DashboardNoResults({ onReset }: { onReset: () => void }) {
  return (
    <div className={styles.dashboardState}>
      <MagnifyingGlass size={34} aria-hidden />
      <h2>No articles match these filters</h2>
      <p>Try a different client, status, due date, or search term.</p>
      <button type="button" onClick={onReset}>
        Clear filters
      </button>
    </div>
  );
}
