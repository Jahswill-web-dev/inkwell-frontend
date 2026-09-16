"use client";

import { useMemo, useState } from "react";
import { ArticlePipeline } from "./article-pipeline";
import { AttentionPanel } from "./attention-panel";
import { DashboardFilters } from "./dashboard-filters";
import {
  DashboardEmpty,
  DashboardLoadError,
  DashboardLoading,
  DashboardNoResults,
} from "./dashboard-feedback";
import { DashboardHeader } from "./dashboard-header";
import { DashboardMetrics } from "./dashboard-metrics";
import { MobileNav } from "./mobile-nav";
import { DashboardSidebar } from "./sidebar";
import { useDashboardArticles } from "./use-dashboard-articles";
import { WorkspaceHeader } from "./workspace-header";
import {
  defaultDashboardFilters,
  type DashboardFilters as DashboardFilterValues,
} from "@/lib/dashboard/agency-dashboard";
import {
  agencyClientOptions,
  filterAgencyArticles,
  sortAgencyArticles,
} from "@/lib/dashboard/agency-filters";
import {
  calculateAgencyMetrics,
  selectAttentionArticles,
} from "@/lib/dashboard/agency-metrics";
import { toAgencyArticleSummaries } from "@/lib/dashboard/agency-view-model";
import { DEFAULT_AUTH_IDENTITY, type AuthIdentity } from "@/lib/auth/identity";
import styles from "./dashboard.module.css";

export function DashboardHome({
  user = DEFAULT_AUTH_IDENTITY,
}: {
  user?: AuthIdentity;
}) {
  const [filters, setFilters] = useState<DashboardFilterValues>(
    defaultDashboardFilters,
  );
  const [notice, setNotice] = useState("");
  const {
    articles,
    total,
    isInitialLoading,
    isLoadingMore,
    loadError,
    loadMore,
    retryInitialLoad,
  } = useDashboardArticles();

  const agencyArticles = useMemo(
    () => toAgencyArticleSummaries(articles, user.username),
    [articles, user.username],
  );
  const filteredArticles = useMemo(
    () => sortAgencyArticles(filterAgencyArticles(agencyArticles, filters)),
    [agencyArticles, filters],
  );
  const clients = useMemo(
    () => agencyClientOptions(agencyArticles),
    [agencyArticles],
  );
  const metrics = useMemo(
    () => calculateAgencyMetrics(agencyArticles),
    [agencyArticles],
  );
  const attentionArticles = useMemo(
    () => selectAttentionArticles(agencyArticles),
    [agencyArticles],
  );
  const hasFilters =
    filters.query.trim() !== "" ||
    filters.client !== "all" ||
    filters.status !== "all" ||
    filters.dueDate !== "all";

  const resetFilters = () => setFilters(defaultDashboardFilters);

  return (
    <main className={styles.dashboard}>
      <DashboardSidebar activeHref="/dashboard" identity={user} />
      <div className={styles.workspace}>
        <DashboardHeader
          identity={user}
          query={filters.query}
          onQueryChange={(query) =>
            setFilters((current) => ({ ...current, query }))
          }
        />
        <div className={styles.dashboardContent}>
          <WorkspaceHeader firstName={user.username} />
          <DashboardMetrics values={metrics} />
          {notice ? (
            <p className={styles.notice} role="status">
              {notice}
            </p>
          ) : null}

          <div className={styles.dashboardGrid}>
            <section
              className={styles.mainContent}
              aria-label="Article workspace"
            >
              <DashboardFilters
                clients={clients}
                filters={filters}
                onChange={setFilters}
              />
              {isInitialLoading && articles.length === 0 ? (
                <DashboardLoading />
              ) : null}
              {!isInitialLoading && loadError && articles.length === 0 ? (
                <DashboardLoadError onRetry={retryInitialLoad} />
              ) : null}
              {!isInitialLoading && !loadError && articles.length === 0 ? (
                <DashboardEmpty />
              ) : null}
              {!isInitialLoading &&
              articles.length > 0 &&
              filteredArticles.length === 0 ? (
                <DashboardNoResults onReset={resetFilters} />
              ) : null}
              {!isInitialLoading && filteredArticles.length > 0 ? (
                <ArticlePipeline
                  articles={filteredArticles}
                  total={hasFilters ? filteredArticles.length : total}
                  isLoadingMore={isLoadingMore}
                  loadError={loadError}
                  onLoadMore={() => void loadMore()}
                  onRetry={() => void loadMore()}
                />
              ) : null}
            </section>
            <AttentionPanel articles={attentionArticles} />
          </div>
        </div>
      </div>
      <MobileNav
        onNavigate={(label) => setNotice(`${label} view will open next.`)}
      />
    </main>
  );
}
