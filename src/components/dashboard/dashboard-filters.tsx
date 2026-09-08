"use client";

import { useState } from "react";
import { FunnelSimple, MagnifyingGlass, X } from "@phosphor-icons/react";
import {
  agencyArticleStatuses,
  agencyStatusLabels,
  defaultDashboardFilters,
  type DashboardFilters as DashboardFilterValues,
} from "@/lib/dashboard/agency-dashboard";
import styles from "./dashboard-filters.module.css";

type DashboardFiltersProps = {
  clients: readonly string[];
  filters: DashboardFilterValues;
  onChange: (filters: DashboardFilterValues) => void;
};

export function DashboardFilters({
  clients,
  filters,
  onChange,
}: DashboardFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const activeFilterCount = [
    filters.client !== "all",
    filters.status !== "all",
    filters.dueDate !== "all",
  ].filter(Boolean).length;

  const update = <Key extends keyof DashboardFilterValues>(
    key: Key,
    value: DashboardFilterValues[Key],
  ) => onChange({ ...filters, [key]: value });

  return (
    <section className={styles.filters} aria-label="Article filters">
      <div className={styles.mobileFilterBar}>
        <label className={styles.mobileSearch}>
          <span className={styles.visuallyHidden}>
            Search articles or clients
          </span>
          <MagnifyingGlass size={19} aria-hidden />
          <input
            type="search"
            value={filters.query}
            placeholder="Search articles or clients"
            onChange={(event) => update("query", event.target.value)}
          />
        </label>
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls="dashboard-filter-fields"
          onClick={() => setIsOpen((open) => !open)}
        >
          <FunnelSimple size={19} aria-hidden />
          Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      <div
        className={`${styles.filterFields} ${isOpen ? styles.filterFieldsOpen : ""}`}
        id="dashboard-filter-fields"
      >
        <label>
          <span>Client</span>
          <select
            value={filters.client}
            onChange={(event) => update("client", event.target.value)}
          >
            <option value="all">All clients</option>
            {clients.map((client) => (
              <option value={client} key={client}>
                {client}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Status</span>
          <select
            value={filters.status}
            onChange={(event) =>
              update(
                "status",
                event.target.value as DashboardFilterValues["status"],
              )
            }
          >
            <option value="all">All statuses</option>
            {agencyArticleStatuses.map((status) => (
              <option value={status} key={status}>
                {agencyStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Due date</span>
          <select
            value={filters.dueDate}
            onChange={(event) =>
              update(
                "dueDate",
                event.target.value as DashboardFilterValues["dueDate"],
              )
            }
          >
            <option value="all">Any due date</option>
            <option value="overdue">Overdue</option>
            <option value="this_week">Due this week</option>
            <option value="no_due_date">No due date</option>
          </select>
        </label>
        {activeFilterCount ? (
          <button
            className={styles.clearFilters}
            type="button"
            onClick={() =>
              onChange({ ...defaultDashboardFilters, query: filters.query })
            }
          >
            <X size={15} aria-hidden /> Clear
          </button>
        ) : null}
      </div>
    </section>
  );
}
