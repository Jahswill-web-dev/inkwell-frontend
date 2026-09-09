"use client";

import Link from "next/link";
import {
  ArrowClockwise,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import {
  loadPipelineSourceContext,
  type PipelineSourceContext,
} from "@/lib/articles/pipeline-source-context";
import styles from "./pipeline-source-status.module.css";

export function PipelineSourceStatus({
  articleId,
  contentLabel,
  contentUpdatedAt,
  onRegenerate,
  regenerating = false,
  regenerateDisabled = false,
}: {
  articleId?: string;
  contentLabel: "brief" | "outline" | "draft";
  contentUpdatedAt?: string | null;
  onRegenerate?: () => void;
  regenerating?: boolean;
  regenerateDisabled?: boolean;
}) {
  const [context, setContext] = useState<PipelineSourceContext | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setContext(
        articleId
          ? loadPipelineSourceContext(articleId, contentUpdatedAt)
          : null,
      );
    }, 0);
    return () => window.clearTimeout(timer);
  }, [articleId, contentUpdatedAt]);

  if (!articleId || !context || context.state === "none") return null;
  const reviewHref = `/articles/${articleId}/sources`;
  const provenance = [
    context.clientCount ? `${context.clientCount} client` : "",
    context.writerCount ? `${context.writerCount} writer` : "",
    context.combinedCount ? `${context.combinedCount} combined` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  if (context.state === "approved") {
    return (
      <aside className={styles.approved} aria-label="Approved source material">
        <ShieldCheck size={22} weight="fill" aria-hidden />
        <div>
          <strong>Approved source material</strong>
          <span>
            {context.approvedCount} included item
            {context.approvedCount === 1 ? "" : "s"}
            {provenance ? ` · ${provenance}` : ""}
          </span>
        </div>
        <Link href={reviewHref}>View sources</Link>
      </aside>
    );
  }

  const contentStale = context.state === "content_stale";
  return (
    <aside className={styles.warning} role="status">
      <WarningCircle size={23} weight="fill" aria-hidden />
      <div>
        <strong>
          {context.state === "review_required"
            ? "Source approval required"
            : context.state === "source_changed"
              ? "Interview material changed"
              : `${contentLabel[0].toUpperCase()}${contentLabel.slice(1)} may be out of date`}
        </strong>
        <span>
          {context.state === "review_required"
            ? `Review the interview material before using it in the ${contentLabel}.`
            : context.state === "source_changed"
              ? "Review and approve the new answers. Existing content has not been changed."
              : `Approved source material changed after this ${contentLabel} was last saved. Regeneration is never automatic.`}
        </span>
      </div>
      <div className={styles.actions}>
        <Link href={reviewHref}>Review sources</Link>
        {contentStale && onRegenerate ? (
          <button
            disabled={regenerateDisabled || regenerating}
            onClick={onRegenerate}
            type="button"
          >
            <ArrowClockwise size={16} aria-hidden />
            {regenerating ? "Regenerating…" : `Regenerate ${contentLabel}`}
          </button>
        ) : null}
      </div>
    </aside>
  );
}
