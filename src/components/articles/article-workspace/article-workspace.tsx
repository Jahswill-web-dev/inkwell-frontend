"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarBlank,
  Microphone,
  PencilSimple,
  Trash,
  User,
} from "@phosphor-icons/react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { ArticleDeleteDialog } from "@/components/articles/article-delete-dialog";
import { ArticleRequestError, deleteArticle } from "@/lib/articles/client";
import { formatDueDate } from "@/lib/dashboard/agency-format";
import type { AuthIdentity } from "@/lib/auth/identity";
import { ArticleWorkspaceNav } from "./article-workspace-nav";
import { ArticleWorkspaceOverview } from "./article-workspace-overview";
import { ClientInterviewManager } from "./client-interview-manager";
import { InterviewNotes } from "../interview-notes/interview-notes";
import { useArticleWorkspace } from "./use-article-workspace";
import styles from "./article-workspace.module.css";

function WorkspaceFeedback({
  articleId,
  state,
  retry,
}: {
  articleId: string;
  state: "loading" | "not-found" | "unauthorized" | "error";
  retry: () => void;
}) {
  const content = {
    loading: {
      title: "Loading article workspace…",
      message: "Please wait while Inkwell checks the article workflow.",
    },
    "not-found": {
      title: "Article not found",
      message:
        "This article is unavailable or does not belong to your account.",
    },
    unauthorized: {
      title: "Your session expired",
      message: "Sign in again to continue working on this article.",
    },
    error: {
      title: "We couldn’t load this workspace",
      message: "The article service may be temporarily unavailable.",
    },
  }[state];

  return (
    <main className={styles.feedback} aria-busy={state === "loading"}>
      <h1>{content.title}</h1>
      <p>{content.message}</p>
      {state === "error" ? (
        <button type="button" onClick={retry}>
          Try again
        </button>
      ) : null}
      {state === "not-found" ? (
        <Link href="/dashboard">Return to workspace</Link>
      ) : null}
      {state === "unauthorized" ? (
        <Link
          href={`/login?next=${encodeURIComponent(`/articles/${articleId}`)}`}
        >
          Sign in
        </Link>
      ) : null}
    </main>
  );
}

export function ArticleWorkspace({
  articleId,
  identity,
  activeTab = "overview",
}: {
  articleId: string;
  identity: AuthIdentity;
  activeTab?: "overview" | "interviews" | "sources";
}) {
  const router = useRouter();
  const { state, retry } = useArticleWorkspace(articleId, identity.username);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  if (state.type !== "ready") {
    return (
      <WorkspaceFeedback
        articleId={articleId}
        state={state.type}
        retry={retry}
      />
    );
  }

  const { workspace } = state;
  const removeArticle = async () => {
    setIsDeleting(true);
    setDeleteError("");
    try {
      await deleteArticle(articleId);
      router.push("/dashboard?section=articles");
      router.refresh();
    } catch (error) {
      setDeleteError(
        error instanceof ArticleRequestError
          ? error.message
          : "We couldn’t delete this article. Please try again.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <main className={styles.page}>
      <DashboardSidebar
        activeHref="/dashboard?section=articles"
        identity={identity}
      />
      <div className={styles.workspace}>
        <header className={styles.topBar}>
          <div>
            <Link href="/dashboard?section=articles">Articles</Link>
            <span aria-hidden>/</span>
            <span>{workspace.clientName}</span>
          </div>
        </header>

        <div className={styles.content}>
          <header className={styles.articleHeader}>
            <div className={styles.titleBlock}>
              <div className={styles.headingMeta}>
                <span className={styles.status} data-status={workspace.status}>
                  {workspace.statusLabel}
                </span>
                <span>{workspace.clientName}</span>
              </div>
              <h1>{workspace.article.working_title}</h1>
              <div className={styles.details}>
                <span>
                  <User size={15} aria-hidden /> {workspace.assignee}
                </span>
                <span>
                  <CalendarBlank size={15} aria-hidden />{" "}
                  {formatDueDate(workspace.dueDate)}
                </span>
              </div>
            </div>
            <div className={styles.headerActions}>
              <Link
                className={styles.interviewLink}
                href={workspace.writerInterview.href}
              >
                <Microphone size={17} aria-hidden />
                {workspace.writerInterview.state === "completed"
                  ? "View writer interview"
                  : workspace.writerInterview.state === "in_progress"
                    ? "Continue interview"
                    : "Interview me"}
              </Link>
              <Link
                className={styles.editLink}
                href={`/articles/${encodeURIComponent(articleId)}/edit`}
              >
                <PencilSimple size={16} aria-hidden /> Edit setup
              </Link>
              <button
                className={styles.deleteButton}
                onClick={() => {
                  setDeleteError("");
                  setShowDeleteDialog(true);
                }}
                type="button"
              >
                <Trash size={16} aria-hidden /> Delete article
              </button>
            </div>
          </header>

          <ArticleWorkspaceNav activeTab={activeTab} articleId={articleId} />
          {activeTab === "interviews" ? (
            <ClientInterviewManager workspace={workspace} />
          ) : activeTab === "sources" ? (
            <InterviewNotes workspace={workspace} />
          ) : (
            <ArticleWorkspaceOverview workspace={workspace} />
          )}
        </div>
      </div>
      {showDeleteDialog ? (
        <ArticleDeleteDialog
          articleTitle={workspace.article.working_title}
          error={deleteError}
          isDeleting={isDeleting}
          onCancel={() => {
            setDeleteError("");
            setShowDeleteDialog(false);
          }}
          onConfirm={() => void removeArticle()}
        />
      ) : null}
    </main>
  );
}
