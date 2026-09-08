import { useEffect, useState } from "react";
import {
  ArticleRequestError,
  getArticle,
  getArticleBrief,
  getArticleDraft,
  getArticleOutline,
} from "@/lib/articles/client";
import { loadArticleSetupMetadata } from "@/lib/articles/article-setup-storage";
import type { ArticleWorkspaceViewModel } from "@/lib/articles/article-workspace";
import { toArticleWorkspaceViewModel } from "@/lib/articles/article-workspace";

type WorkspaceLoadState =
  | { type: "loading" }
  | { type: "ready"; workspace: ArticleWorkspaceViewModel }
  | { type: "not-found" }
  | { type: "unauthorized" }
  | { type: "error" };

async function exists(request: Promise<unknown>) {
  try {
    await request;
    return true;
  } catch (error) {
    if (error instanceof ArticleRequestError && error.status === 404) {
      return false;
    }
    throw error;
  }
}

async function loadWorkspace(articleId: string, currentWriter: string) {
  const article = await getArticle(articleId);
  const [hasBrief, hasOutline, hasDraft] = await Promise.all([
    exists(getArticleBrief(articleId)),
    exists(getArticleOutline(articleId)),
    exists(getArticleDraft(articleId)),
  ]);
  return toArticleWorkspaceViewModel(
    article,
    currentWriter,
    loadArticleSetupMetadata(articleId),
    { hasBrief, hasOutline, hasDraft },
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

  return {
    state,
    retry() {
      setState({ type: "loading" });
      setRetryKey((value) => value + 1);
    },
  };
}
