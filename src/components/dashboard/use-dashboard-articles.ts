"use client";

import { useCallback, useEffect, useState } from "react";
import type { Article } from "@/lib/articles/article";
import { ArticleRequestError, listArticles } from "@/lib/articles/client";

const PAGE_SIZE = 20;

function loadMessage(error: unknown) {
  if (error instanceof ArticleRequestError && error.status === 401) {
    return "Your session expired. Sign in again to view your articles.";
  }
  return "We couldn’t load your articles. Please try again.";
}

export function useDashboardArticles() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [total, setTotal] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    listArticles(0, PAGE_SIZE)
      .then((result) => {
        if (!active) return;
        setArticles(result.items);
        setTotal(result.total);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(loadMessage(error));
      })
      .finally(() => {
        if (active) setIsInitialLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retryKey]);

  const retryInitialLoad = useCallback(() => {
    setIsInitialLoading(true);
    setLoadError("");
    setRetryKey((key) => key + 1);
  }, []);

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    setLoadError("");
    try {
      const result = await listArticles(articles.length, PAGE_SIZE);
      setArticles((current) => [
        ...current,
        ...result.items.filter(
          (item) => !current.some((existing) => existing.id === item.id),
        ),
      ]);
      setTotal(result.total);
    } catch (error) {
      setLoadError(loadMessage(error));
    } finally {
      setIsLoadingMore(false);
    }
  }, [articles.length]);

  return {
    articles,
    total,
    isInitialLoading,
    isLoadingMore,
    loadError,
    retryInitialLoad,
    loadMore,
  };
}
