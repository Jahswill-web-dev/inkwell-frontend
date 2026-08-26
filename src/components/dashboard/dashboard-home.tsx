"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkle } from "@phosphor-icons/react";
import { ArticleList } from "./article-list";
import { DashboardHeader } from "./dashboard-header";
import { MobileNav } from "./mobile-nav";
import { QuickActions } from "./quick-actions";
import { DashboardSidebar } from "./sidebar";
import styles from "./dashboard.module.css";
import type { Article } from "@/lib/articles/article";
import { ArticleRequestError, listArticles } from "@/lib/articles/client";
import { DEFAULT_AUTH_IDENTITY, type AuthIdentity } from "@/lib/auth/identity";

const PAGE_SIZE = 20;

function loadMessage(error: unknown) {
  if (error instanceof ArticleRequestError && error.status === 401) {
    return "Your session expired. Sign in again to view your articles.";
  }
  return "We couldn’t load your articles. Please try again.";
}

export function DashboardHome({ user = DEFAULT_AUTH_IDENTITY }: { user?: AuthIdentity }) {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    listArticles(0, PAGE_SIZE)
      .then((result) => {
        if (!active) return;
        setArticles(result.items);
        setTotal(result.total);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(loadMessage(error));
      })
      .finally(() => {
        if (active) setIsInitialLoading(false);
      });
    return () => { active = false; };
  }, [retryKey]);

  const loadMore = async () => {
    setIsLoadingMore(true);
    setLoadError("");
    try {
      const result = await listArticles(articles.length, PAGE_SIZE);
      setArticles((current) => [...current, ...result.items.filter((item) => !current.some((existing) => existing.id === item.id))]);
      setTotal(result.total);
    } catch (error) {
      setLoadError(loadMessage(error));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const filter = query.trim().toLowerCase();
  const filteredArticles = useMemo(
    () => articles.filter((article) => article.working_title.toLowerCase().includes(filter)),
    [articles, filter],
  );

  return (
    <main className={styles.dashboard}>
      <DashboardSidebar activeHref="/dashboard" identity={user} />
      <div className={styles.workspace}>
        <DashboardHeader identity={user} query={query} onQueryChange={setQuery} />
        <div className={styles.dashboardGrid}>
          <section className={styles.mainContent}>
            <header className={styles.welcome}>
              <h1>Good morning, {user.username}.</h1>
              <p>What would you like to write today?</p>
              <Link className={styles.createButton} href="/articles/new"><Sparkle size={31} aria-hidden /><span>Create new article</span></Link>
            </header>
            <div className={styles.mobileQuick}><QuickActions /></div>
            {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
            {isInitialLoading ? <p className={styles.dashboardState} role="status">Loading your articles…</p> : null}
            {!isInitialLoading && loadError && articles.length === 0 ? <div className={styles.dashboardState} role="alert"><p>{loadError}</p><button type="button" onClick={() => { setIsInitialLoading(true); setLoadError(""); setRetryKey((key) => key + 1); }}>Try again</button></div> : null}
            {!isInitialLoading && !loadError && articles.length === 0 ? <div className={styles.dashboardState}><h2>No articles yet</h2><p>Start with your notes to create your first article intake.</p><Link href="/articles/new">Create an article</Link></div> : null}
            {!isInitialLoading && articles.length > 0 ? <ArticleList articles={filteredArticles} total={filter ? filteredArticles.length : total} isLoadingMore={isLoadingMore} loadError={loadError} onLoadMore={() => void loadMore()} onRetry={() => void loadMore()} /> : null}
          </section>
          <div className={styles.desktopQuick}><QuickActions /></div>
        </div>
      </div>
      <MobileNav onNavigate={(label) => setNotice(`${label} view will open next.`)} />
    </main>
  );
}
