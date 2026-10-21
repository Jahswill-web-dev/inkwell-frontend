"use client";

import { useEffect, useRef } from "react";
import styles from "./article-delete-dialog.module.css";

type ArticleDeleteDialogProps = {
  articleTitle: string;
  error?: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ArticleDeleteDialog({
  articleTitle,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}: ArticleDeleteDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isDeleting) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isDeleting, onCancel]);

  return (
    <div className={styles.backdrop} role="presentation">
      <section
        aria-describedby="article-delete-description"
        aria-labelledby="article-delete-title"
        aria-modal="true"
        className={styles.dialog}
        role="dialog"
      >
        <p className={styles.eyebrow}>Permanent action</p>
        <h2 id="article-delete-title">Delete this article?</h2>
        <p id="article-delete-description">
          “{articleTitle}” and its brief, outline, drafts, client invitations,
          interview transcript, and related content will be permanently deleted.
        </p>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button
            disabled={isDeleting}
            onClick={onCancel}
            ref={cancelButtonRef}
            type="button"
          >
            Cancel
          </button>
          <button
            className={styles.deleteButton}
            disabled={isDeleting}
            onClick={onConfirm}
            type="button"
          >
            {isDeleting ? "Deleting…" : "Delete article"}
          </button>
        </div>
      </section>
    </div>
  );
}
