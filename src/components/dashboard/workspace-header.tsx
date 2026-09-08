import Link from "next/link";
import { Plus } from "@phosphor-icons/react";
import styles from "./dashboard.module.css";

export function WorkspaceHeader({ firstName }: { firstName: string }) {
  return (
    <header className={styles.workspaceIntro}>
      <div>
        <p className={styles.eyebrow}>Content workspace</p>
        <h1>Keep every client article moving.</h1>
        <p className={styles.workspaceSummary}>
          Welcome back, {firstName}. Here’s what needs your attention today.
        </p>
      </div>
      <Link className={styles.createButton} href="/articles/new">
        <Plus size={20} weight="bold" aria-hidden />
        <span>Create article</span>
      </Link>
    </header>
  );
}
