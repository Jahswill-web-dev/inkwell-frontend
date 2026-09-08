import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  FileText,
  UserCircle,
} from "@phosphor-icons/react";
import type { ArticleWorkspaceViewModel } from "@/lib/articles/article-workspace";
import styles from "./article-workspace-overview.module.css";

export function ArticleWorkspaceOverview({
  workspace,
}: {
  workspace: ArticleWorkspaceViewModel;
}) {
  return (
    <div className={styles.layout}>
      <div className={styles.mainColumn}>
        <section
          className={styles.nextAction}
          aria-labelledby="next-action-title"
        >
          <p>Recommended next action</p>
          <h2 id="next-action-title">{workspace.nextAction.title}</h2>
          <span>{workspace.nextAction.description}</span>
          {workspace.nextAction.href ? (
            <Link href={workspace.nextAction.href}>
              Continue <ArrowRight size={16} aria-hidden />
            </Link>
          ) : (
            <button type="button" disabled>
              {workspace.nextAction.unavailableLabel}
            </button>
          )}
        </section>

        <section className={styles.panel} aria-labelledby="readiness-title">
          <header>
            <div>
              <p>Workflow</p>
              <h2 id="readiness-title">Article readiness</h2>
            </div>
            <span>{workspace.progressLabel}</span>
          </header>
          <div
            className={styles.progressTrack}
            aria-label={`${workspace.progress}% complete`}
          >
            <span style={{ width: `${workspace.progress}%` }} />
          </div>
          <ol className={styles.readinessList}>
            {workspace.readiness.map((item) => (
              <li data-state={item.state} key={item.id}>
                {item.state === "complete" ? (
                  <CheckCircle size={22} weight="fill" aria-hidden />
                ) : (
                  <Clock size={22} aria-hidden />
                )}
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </div>
                <small>{item.state}</small>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.panel} aria-labelledby="source-title">
          <header>
            <div>
              <p>Source material</p>
              <h2 id="source-title">Collected context</h2>
            </div>
            <FileText size={23} aria-hidden />
          </header>
          <div className={styles.sourceCard}>
            <strong>Article setup</strong>
            <span>{workspace.sourceSummary}</span>
            <p>{workspace.article.notes}</p>
          </div>
        </section>
      </div>

      <aside className={styles.sideColumn} aria-label="Article details">
        <section className={styles.panel}>
          <header>
            <div>
              <p>Contributors</p>
              <h2>Interviews</h2>
            </div>
            <UserCircle size={23} aria-hidden />
          </header>
          {workspace.participants.length > 0 ? (
            <ul className={styles.participants}>
              {workspace.participants.map((participant) => (
                <li key={`${participant.role}-${participant.name}`}>
                  <span aria-hidden>
                    {participant.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{participant.name}</strong>
                    <small>{participant.role}</small>
                  </div>
                  <em>{participant.state}</em>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.emptyParticipants}>
              No interview participants are required for this article.
            </p>
          )}
        </section>

        <section className={styles.panel}>
          <header>
            <div>
              <p>Planning</p>
              <h2>Article brief</h2>
            </div>
          </header>
          <dl className={styles.articleFacts}>
            <div>
              <dt>Audience</dt>
              <dd>{workspace.article.target_audience.join(", ")}</dd>
            </div>
            <div>
              <dt>Assignee</dt>
              <dd>{workspace.assignee}</dd>
            </div>
          </dl>
        </section>
      </aside>
    </div>
  );
}
