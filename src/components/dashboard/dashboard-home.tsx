"use client";

import { useMemo, useState } from "react";
import {
  Article,
  Gear,
  House,
  Lightbulb,
  Sparkle,
  SquaresFour,
} from "@phosphor-icons/react";
import { ArticleList } from "./article-list";
import { DashboardHeader } from "./dashboard-header";
import { desktopArticles, mobileArticles } from "./dashboard-data";
import { MobileNav } from "./mobile-nav";
import { QuickActions } from "./quick-actions";
import { Sidebar } from "./sidebar";
import styles from "./dashboard.module.css";

const sidebarItems = [
  { label: "Home", icon: House, href: "/dashboard" },
  { label: "Articles", icon: Article, href: "/dashboard?section=articles" },
  { label: "Ideas", icon: Lightbulb, href: "/dashboard?section=ideas" },
  {
    label: "Templates",
    icon: SquaresFour,
    href: "/dashboard?section=templates",
  },
  { label: "Settings", icon: Gear, href: "/dashboard?section=settings" },
] as const;

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
      <Sidebar
        items={sidebarItems}
        activeHref="/dashboard"
        user={{ name: "Nina Koskinen", initials: "NK" }}
      />
      <div className={styles.workspace}>
        <DashboardHeader query={query} onQueryChange={setQuery} />
        <div className={styles.dashboardGrid}>
          <section className={styles.mainContent}>
            <header className={styles.welcome}>
              <h1>Good morning, Nina.</h1>
              <p>What would you like to write today?</p>
              <button
                className={styles.createButton}
                type="button"
                onClick={() => setNotice("New article setup will open next.")}
              >
                <Sparkle size={31} weight="regular" aria-hidden />
                <span>Create new article</span>
              </button>
            </header>
            <div className={styles.mobileQuick}>
              <QuickActions onAction={setNotice} />
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
            <QuickActions onAction={setNotice} />
          </div>
        </div>
      </div>
      <MobileNav
        onNavigate={(label) => setNotice(`${label} view will open next.`)}
      />
    </main>
  );
}
