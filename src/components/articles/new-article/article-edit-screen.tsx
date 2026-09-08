"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getArticle, ArticleRequestError } from "@/lib/articles/client";
import type { Article } from "@/lib/articles/article";
import type { AuthIdentity } from "@/lib/auth/identity";
import { NewArticleForm } from "./new-article-form";
import styles from "./new-article-form.module.css";

export function ArticleEditScreen({
  articleId,
  identity,
}: {
  articleId: string;
  identity: AuthIdentity;
}) {
  const [article, setArticle] = useState<Article | null>(null);
  const [state, setState] = useState<"loading" | "not-found" | "unauthorized" | "error">("loading");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    getArticle(articleId)
      .then((result) => {
        if (!active) return;
        setArticle(result);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ArticleRequestError && error.status === 404) setState("not-found");
        else if (error instanceof ArticleRequestError && error.status === 401) setState("unauthorized");
        else setState("error");
      });
    return () => { active = false; };
  }, [articleId, retryKey]);

  if (article) return <NewArticleForm identity={identity} article={article} />;

  return (
    <main className={styles.statePage}>
      {state === "loading" ? <><h1>Loading article…</h1><p>Please wait while we load your intake.</p></> : null}
      {state === "not-found" ? <><h1>Article not found</h1><p>This article is unavailable or does not belong to your account.</p><Link href="/dashboard">Return to dashboard</Link></> : null}
      {state === "unauthorized" ? <><h1>Your session expired</h1><p>Sign in again to continue editing.</p><Link href={`/login?next=${encodeURIComponent(`/articles/${articleId}/edit`)}`}>Sign in</Link></> : null}
      {state === "error" ? <><h1>We couldn’t load this article</h1><p>The article service may be temporarily unavailable.</p><button type="button" onClick={() => { setState("loading"); setRetryKey((key) => key + 1); }}>Try again</button></> : null}
    </main>
  );
}
