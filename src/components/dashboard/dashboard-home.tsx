"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Sparkle } from "@phosphor-icons/react";
import { ArticleList } from "./article-list";
import { DashboardHeader } from "./dashboard-header";
import { desktopArticles, mobileArticles } from "./dashboard-data";
import { MobileNav } from "./mobile-nav";
import { QuickActions } from "./quick-actions";
import { DashboardSidebar } from "./sidebar";
import styles from "./dashboard.module.css";

export function DashboardHome() {
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const filter = query.trim().toLowerCase();
  const filteredDesktop = useMemo(
    () =>
      desktopArticles.filter((article) =>
        article.title.toLowerCase().includes(filter),
      ),
    [filter],
  );
  const filteredMobile = useMemo(
    () =>
      mobileArticles.filter((article) =>
        article.title.toLowerCase().includes(filter),
      ),
    [filter],
  );

  return (
    <main className={styles.dashboard}>
      <DashboardSidebar activeHref="/dashboard" />
      <div className={styles.workspace}>
        <DashboardHeader query={query} onQueryChange={setQuery} />
        <div className={styles.dashboardGrid}>
          <section className={styles.mainContent}>
            <header className={styles.welcome}>
              <h1>Good morning, Nina.</h1>
              <p>What would you like to write today?</p>
              <Link className={styles.createButton} href="/articles/new">
                <Sparkle size={31} weight="regular" aria-hidden />
                <span>Create new article</span>
              </Link>
            </header>
            <div className={styles.mobileQuick}>
              <QuickActions />
            </div>
            {notice ? (
              <p className={styles.notice} role="status">
                {notice}
              </p>
            ) : null}
            <ArticleList
              desktopArticles={filteredDesktop}
              mobileArticles={filteredMobile}
              onOpen={(title) => setNotice(`${title} will open next.`)}
            />
          </section>
          <div className={styles.desktopQuick}>
            <QuickActions />
          </div>
        </div>
      </div>
      <MobileNav
        onNavigate={(label) => setNotice(`${label} view will open next.`)}
      />
    </main>
  );
}
