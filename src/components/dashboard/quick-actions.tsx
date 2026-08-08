import { ClipboardText, Lightbulb } from "@phosphor-icons/react";
import styles from "./dashboard.module.css";

type QuickActionsProps = { onAction: (message: string) => void };

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <aside className={styles.quickStart} aria-labelledby="quick-start-title">
      <h2 id="quick-start-title">Quick start</h2>
      <div className={styles.quickActionList}>
        <button
          type="button"
          onClick={() => onAction("Idea capture will open next.")}
        >
          <Lightbulb size={27} aria-hidden />
          <span>
            <strong>Start from an idea</strong>
            <small>Turn a spark into something written.</small>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onAction("Notes import will open next.")}
        >
          <ClipboardText size={27} aria-hidden />
          <span>
            <strong>Paste your notes</strong>
            <small>Draft from something you already have.</small>
          </span>
        </button>
      </div>
    </aside>
  );
}
