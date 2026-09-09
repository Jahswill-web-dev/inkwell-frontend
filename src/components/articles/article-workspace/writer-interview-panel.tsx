import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Microphone,
  NotePencil,
} from "@phosphor-icons/react";
import type { ArticleWorkspaceViewModel } from "@/lib/articles/article-workspace";
import styles from "./writer-interview-panel.module.css";

export function WriterInterviewPanel({
  workspace,
}: {
  workspace: ArticleWorkspaceViewModel;
}) {
  const interview = workspace.writerInterview;
  const actionLabel =
    interview.state === "completed"
      ? "View writer interview"
      : interview.state === "in_progress"
        ? "Continue interview"
        : "Interview me";

  return (
    <section className={styles.card} aria-labelledby="writer-interview-title">
      <div className={styles.icon}>
        {interview.state === "completed" ? (
          <CheckCircle size={25} weight="fill" aria-hidden />
        ) : (
          <Microphone size={25} aria-hidden />
        )}
      </div>
      <div className={styles.content}>
        <p>Authenticated writer · Whole article</p>
        <h2 id="writer-interview-title">Add your own expertise</h2>
        <span>
          Capture your perspective before the brief or draft. This material is
          stored separately from client answers and from section-specific
          interviews in the draft editor.
        </span>
        <div className={styles.provenance}>
          <NotePencil size={17} aria-hidden /> Writer-supplied material
        </div>
      </div>
      <div className={styles.action}>
        {interview.state !== "not_started" ? (
          <div>
            <strong>{interview.progress}%</strong>
            <span>{interview.responses} responses saved</span>
          </div>
        ) : null}
        <Link href={interview.href}>
          {actionLabel} <ArrowRight size={17} aria-hidden />
        </Link>
      </div>
    </section>
  );
}
