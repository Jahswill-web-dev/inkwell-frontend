"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  CheckCircle,
  PencilSimple,
  Quotes,
  ShieldCheck,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import type { ArticleWorkspaceViewModel } from "@/lib/articles/article-workspace";
import { loadInterviewInvitation } from "@/lib/articles/client-interview-storage";
import { loadClientInterviewSession } from "@/lib/articles/client-interview-session-storage";
import { loadWriterInterviewMaterial } from "@/lib/articles/writer-interview-storage";
import {
  approveSourceReview,
  createSourceReview,
  mergeSourceReview,
  sourceCategoryLabel,
  updateSourceReviewItem,
  type InterviewReviewSource,
  type SourceReviewItem,
} from "@/lib/articles/source-review";
import {
  loadSourceReview,
  saveSourceReview,
} from "@/lib/articles/source-review-storage";
import styles from "./source-review.module.css";

type SourceFilter = "all" | "client" | "writer" | "attention";

function buildReview(workspace: ArticleWorkspaceViewModel) {
  const sources: InterviewReviewSource[] = [];
  const invitation = loadInterviewInvitation(workspace.article.id);
  const clientSession = invitation
    ? loadClientInterviewSession(invitation.token)
    : null;
  if (clientSession?.answers.length) {
    sources.push({
      type: "client",
      label: `Client · ${invitation?.participantName ?? workspace.clientName}`,
      session: clientSession,
    });
  }
  const writer = loadWriterInterviewMaterial(workspace.article.id);
  if (writer?.session.answers.length) {
    sources.push({
      type: "writer",
      label: `Writer · ${workspace.assignee}`,
      session: writer.session,
    });
  }
  return mergeSourceReview(
    createSourceReview(workspace.article.id, sources),
    loadSourceReview(workspace.article.id),
  );
}

function isAttention(item: SourceReviewItem) {
  return (
    item.category === "verification" ||
    item.category === "missing" ||
    item.category === "conflict"
  );
}

export function SourceReview({
  workspace,
}: {
  workspace: ArticleWorkspaceViewModel;
}) {
  const [review, setReview] = useState(() => buildReview(workspace));
  const [filter, setFilter] = useState<SourceFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const includedCount = review.items.filter((item) => item.included).length;
  const attentionCount = review.items.filter(isAttention).length;
  const visibleItems = review.items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "attention") return isAttention(item);
    return item.sourceType === filter;
  });

  function persist(next: typeof review) {
    saveSourceReview(next);
    setReview(next);
  }

  function toggleItem(item: SourceReviewItem) {
    persist(
      updateSourceReviewItem(review, item.id, { included: !item.included }),
    );
  }

  function beginEdit(item: SourceReviewItem) {
    setEditingId(item.id);
    setEditValue(item.content);
  }

  function saveEdit(item: SourceReviewItem) {
    if (!editValue.trim()) return;
    persist(
      updateSourceReviewItem(review, item.id, { content: editValue.trim() }),
    );
    setEditingId(null);
  }

  function approve() {
    persist(approveSourceReview(review));
  }

  if (review.items.length === 0) {
    return (
      <section className={styles.empty} aria-labelledby="source-review-title">
        <Quotes size={34} aria-hidden />
        <p>Source review</p>
        <h2 id="source-review-title">No interview material yet</h2>
        <span>
          Complete a client or whole-article writer interview before reviewing
          material for generation.
        </span>
        <div>
          <Link href={`/articles/${workspace.article.id}/interviews`}>
            Manage interviews
          </Link>
          <Link href={workspace.writerInterview.href}>Interview me</Link>
        </div>
      </section>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.intro} aria-labelledby="source-review-title">
        <div>
          <p>Editorial checkpoint</p>
          <h2 id="source-review-title">Review source material</h2>
          <span>
            Decide what Inkwell may use before creating content. Raw interview
            answers remain unchanged.
          </span>
        </div>
        <div className={styles.summary}>
          <span>
            <strong>{includedCount}</strong> included
          </span>
          <span>
            <strong>{review.items.length - includedCount}</strong> excluded
          </span>
          <span>
            <strong>{attentionCount}</strong> need attention
          </span>
        </div>
      </section>

      <div
        className={styles.filters}
        role="group"
        aria-label="Filter source material"
      >
        {(
          [
            ["all", "All material"],
            ["client", "Client"],
            ["writer", "Writer"],
            ["attention", "Needs attention"],
          ] as const
        ).map(([value, label]) => (
          <button
            aria-pressed={filter === value}
            key={value}
            onClick={() => setFilter(value)}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.items}>
        {visibleItems.map((item) => (
          <article
            className={styles.item}
            data-included={item.included}
            data-attention={isAttention(item)}
            key={item.id}
          >
            <header>
              <div>
                <span data-source={item.sourceType}>{item.sourceLabel}</span>
                <strong>{sourceCategoryLabel(item.category)}</strong>
              </div>
              {isAttention(item) ? (
                <WarningCircle size={21} aria-label="Needs attention" />
              ) : item.included ? (
                <CheckCircle size={21} weight="fill" aria-label="Included" />
              ) : null}
            </header>
            {item.sourceQuestion ? <small>{item.sourceQuestion}</small> : null}
            {editingId === item.id ? (
              <label className={styles.editField}>
                <span>Edit material</span>
                <textarea
                  autoFocus
                  maxLength={20_000}
                  onChange={(event) => setEditValue(event.target.value)}
                  rows={6}
                  value={editValue}
                />
              </label>
            ) : (
              <p>{item.content}</p>
            )}
            <footer>
              {editingId === item.id ? (
                <>
                  <button
                    disabled={!editValue.trim()}
                    onClick={() => saveEdit(item)}
                    type="button"
                  >
                    <Check size={16} aria-hidden /> Save changes
                  </button>
                  <button onClick={() => setEditingId(null)} type="button">
                    <X size={16} aria-hidden /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => beginEdit(item)} type="button">
                    <PencilSimple size={16} aria-hidden /> Edit
                  </button>
                  <button onClick={() => toggleItem(item)} type="button">
                    {item.included ? "Exclude" : "Include"}
                  </button>
                </>
              )}
            </footer>
          </article>
        ))}
      </div>

      <section className={styles.approval}>
        <div>
          <ShieldCheck size={25} aria-hidden />
          <span>
            <strong>
              {review.status === "approved"
                ? "Source material approved"
                : "Ready to approve?"}
            </strong>
            {includedCount} items will be available to the brief, outline, and
            draft stages.
          </span>
        </div>
        {review.status === "approved" ? (
          <Link href={`/articles/new/brief?articleId=${workspace.article.id}`}>
            Continue to brief
          </Link>
        ) : (
          <button
            disabled={includedCount === 0}
            onClick={approve}
            type="button"
          >
            Approve material for generation
          </button>
        )}
      </section>
    </div>
  );
}
