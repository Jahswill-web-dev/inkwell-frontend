import {
  CalendarDots,
  ChatTeardropText,
  Files,
  PencilLine,
  type Icon,
} from "@phosphor-icons/react";
import type { AgencyDashboardMetrics } from "@/lib/dashboard/agency-metrics";
import styles from "./dashboard-metrics.module.css";

type Metric = {
  label: string;
  key: keyof AgencyDashboardMetrics;
  icon: Icon;
  tone: "navy" | "amber" | "green" | "blue";
};

const metrics: readonly Metric[] = [
  { label: "Active articles", key: "active", icon: Files, tone: "navy" },
  {
    label: "Waiting for client",
    key: "waitingForClient",
    icon: ChatTeardropText,
    tone: "amber",
  },
  {
    label: "Ready to draft",
    key: "readyToDraft",
    icon: PencilLine,
    tone: "green",
  },
  {
    label: "Due this week",
    key: "dueThisWeek",
    icon: CalendarDots,
    tone: "blue",
  },
];

export function DashboardMetrics({
  values,
}: {
  values: AgencyDashboardMetrics;
}) {
  return (
    <section className={styles.metricGrid} aria-label="Workspace summary">
      {metrics.map(({ icon: MetricIcon, key, label, tone }) => (
        <article className={styles.metricCard} data-tone={tone} key={key}>
          <span className={styles.metricIcon} aria-hidden>
            <MetricIcon size={21} />
          </span>
          <div>
            <strong>{values[key]}</strong>
            <span>{label}</span>
          </div>
        </article>
      ))}
    </section>
  );
}
