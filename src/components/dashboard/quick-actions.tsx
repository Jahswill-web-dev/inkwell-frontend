import Link from "next/link";
import { ClipboardText } from "@phosphor-icons/react";
import styles from "./dashboard.module.css";

export function QuickActions() {
  return (
    <aside className={styles.quickStart} aria-labelledby="quick-start-title">
      <h2 id="quick-start-title">Quick start</h2>
      <div className={styles.quickActionList}>
        <Link href="/articles/new">
          <ClipboardText size={27} aria-hidden />
          <span>
            <strong>Paste your notes</strong>
            <small>Draft from something you already have.</small>
          </span>
        </Link>
      </div>
    </aside>
  );
}
