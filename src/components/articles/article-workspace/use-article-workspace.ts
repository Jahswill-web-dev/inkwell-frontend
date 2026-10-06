import { useEffect, useState } from "react";
import { ArticleRequestError, getArticle } from "@/lib/articles/client";
import { articleSetupMetadataFromArticle } from "@/lib/articles/article-setup";
import {
  getInterviewInvitation,
  getInterviewTranscript,
  InterviewInvitationRequestError,
} from "@/lib/articles/client-interview-api";
import { loadInterviewInvitation } from "@/lib/articles/client-interview-storage";
import type {
  ArticleWorkspaceViewModel,
  ClientInterviewNotesState,
} from "@/lib/articles/article-workspace";
import { toArticleWorkspaceViewModel } from "@/lib/articles/article-workspace";
import {
  loadWriterInterviewMaterial,
  WRITER_INTERVIEW_UPDATED_EVENT,
} from "@/lib/articles/writer-interview-storage";
import {
  loadSourceReview,
  SOURCE_REVIEW_UPDATED_EVENT,
} from "@/lib/articles/source-review-storage";

type WorkspaceLoadState =
  | { type: "loading" }
  | { type: "ready"; workspace: ArticleWorkspaceViewModel }
  | { type: "not-found" }
  | { type: "unauthorized" }
  | { type: "error" };

async function loadWorkspace(articleId: string, currentWriter: string) {
  const article = await getArticle(articleId);
  const metadata = articleSetupMetadataFromArticle(article);
  let invitation = loadInterviewInvitation(articleId);
  let clientNotesState: ClientInterviewNotesState = null;

  if (metadata?.interviewMethod === "client") {
    try {
      invitation = await getInterviewInvitation(articleId);
    } catch {
      if (invitation?.progressState === "completed") {
        clientNotesState = "unavailable";
      }
    }

    if (invitation?.progressState === "completed") {
      if (!invitation.id) {
        clientNotesState = "unavailable";
      } else {
        try {
          const transcript = await getInterviewTranscript(
            articleId,
            invitation.id,
          );
          clientNotesState = transcript.insight_status;
        } catch (error) {
          clientNotesState =
            error instanceof InterviewInvitationRequestError &&
            error.status === 404
              ? "pending"
              : "unavailable";
        }
      }
    }
  }

  return toArticleWorkspaceViewModel(
    article,
    currentWriter,
    metadata,
    { hasBrief: false, hasOutline: false, hasDraft: false },
    invitation,
    loadWriterInterviewMaterial(articleId),
    loadSourceReview(articleId),
    clientNotesState,
  );
}

export function useArticleWorkspace(articleId: string, currentWriter: string) {
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState<WorkspaceLoadState>({ type: "loading" });

  useEffect(() => {
    let active = true;
    loadWorkspace(articleId, currentWriter)
      .then((workspace) => {
        if (active) setState({ type: "ready", workspace });
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ArticleRequestError && error.status === 404) {
          setState({ type: "not-found" });
        } else if (
          error instanceof ArticleRequestError &&
          error.status === 401
        ) {
          setState({ type: "unauthorized" });
        } else {
          setState({ type: "error" });
        }
      });
    return () => {
      active = false;
    };
  }, [articleId, currentWriter, retryKey]);

  useEffect(() => {
    function refresh(event: Event) {
      const detail = (event as CustomEvent<{ articleId?: string }>).detail;
      if (!detail?.articleId || detail.articleId === articleId) {
        setRetryKey((value) => value + 1);
      }
    }
    window.addEventListener(WRITER_INTERVIEW_UPDATED_EVENT, refresh);
    window.addEventListener(SOURCE_REVIEW_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(WRITER_INTERVIEW_UPDATED_EVENT, refresh);
      window.removeEventListener(SOURCE_REVIEW_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [articleId]);

  return {
    state,
    retry() {
      setState({ type: "loading" });
      setRetryKey((value) => value + 1);
    },
  };
}
