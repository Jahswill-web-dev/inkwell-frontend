"use client";
import {
  Fragment,
  createElement,
  useMemo,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react";
import {
  IS_BOLD,
  IS_CODE,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
} from "lexical";
import type { Revision, Section } from "@/lib/consultant/client";
import {
  diffBlocks,
  phraseChange,
  reviewSections,
  sectionBlocks,
  type ReviewNode,
} from "@/lib/consultant/revision-diff";
import { ExperienceSwitcher } from "./experience-switcher";
import styles from "./consultant-review.module.css";

function safeUrl(value: string | undefined, image = false) {
  if (!value) return undefined;
  if (
    image &&
    (/^\/(?!\/)/.test(value) ||
      /^data:image\/(png|jpeg|webp|gif);base64,/.test(value))
  )
    return value;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function renderNode(node: ReviewNode): ReactNode {
  if (node.type === "text") {
    let content: ReactNode = node.text ?? "";
    const format = typeof node.format === "number" ? node.format : 0;
    if (format & IS_CODE) content = <code>{content}</code>;
    if (format & IS_BOLD) content = <strong>{content}</strong>;
    if (format & IS_ITALIC) content = <em>{content}</em>;
    if (format & IS_STRIKETHROUGH) content = <s>{content}</s>;
    if (format & IS_UNDERLINE) content = <u>{content}</u>;
    return content;
  }
  const children = node.children?.map((child, index) => (
    <Fragment key={index}>{renderNode(child)}</Fragment>
  ));
  switch (node.type) {
    case "linebreak":
      return <br />;
    case "link":
    case "autolink": {
      const url = safeUrl(node.url);
      return url ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      ) : (
        children
      );
    }
    case "heading":
      return createElement(
        /^h[2-6]$/.test(node.tag ?? "") ? node.tag! : "h2",
        null,
        children,
      );
    case "list":
      return node.listType === "number" ? (
        <ol
          start={
            Number.isInteger(node.start) && node.start! > 0 ? node.start : 1
          }
        >
          {children}
        </ol>
      ) : (
        <ul>{children}</ul>
      );
    case "listitem":
      return <li>{children}</li>;
    case "quote":
      return <blockquote>{children}</blockquote>;
    case "code":
      return (
        <pre>
          <code>{children}</code>
        </pre>
      );
    case "horizontalrule":
      return <hr />;
    case "image": {
      const src = safeUrl(node.src, true);
      return src ? (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={node.altText ?? ""} loading="lazy" />
        </figure>
      ) : null;
    }
    case "paragraph":
    case "anchored-paragraph":
      return <p>{children}</p>;
    default:
      return children;
  }
}

function BlockDiff({
  before,
  after,
}: {
  before: ReviewNode[];
  after: ReviewNode[];
}) {
  return diffBlocks(before, after).map((change, index) => {
    if (change.kind === "same")
      return <Fragment key={index}>{renderNode(change.after!)}</Fragment>;
    const phrase =
      change.before && change.after
        ? phraseChange(change.before, change.after)
        : null;
    if (phrase)
      return (
        <p key={index}>
          {phrase.prefix}
          {phrase.removed && (
            <del>
              <span className={styles.visuallyHidden}>Removed: </span>
              {phrase.removed}
            </del>
          )}
          {phrase.added && (
            <ins>
              <span className={styles.visuallyHidden}>Added: </span>
              {phrase.added}
            </ins>
          )}
          {phrase.suffix}
        </p>
      );
    return (
      <Fragment key={index}>
        {change.before && (
          <div className={styles.removedBlock}>
            <span className={styles.visuallyHidden}>Removed: </span>
            <del>{renderNode(change.before)}</del>
          </div>
        )}
        {change.after && (
          <div className={styles.addedBlock}>
            <span className={styles.visuallyHidden}>Added: </span>
            <ins>{renderNode(change.after)}</ins>
          </div>
        )}
      </Fragment>
    );
  });
}

export function ConsultantReview({
  title,
  current,
  revision,
  dirty,
  busy,
  error,
  onClose,
  onReject,
  onApply,
  dialogRef,
  backRef,
}: {
  title: string;
  current: Section[];
  revision: Revision;
  dirty: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onReject: () => void;
  onApply: () => void;
  dialogRef: RefObject<HTMLElement | null>;
  backRef: RefObject<HTMLButtonElement | null>;
}) {
  const [showChanges, setShowChanges] = useState(true);
  const compared = useMemo(
    () => reviewSections(current, revision.sections),
    [current, revision.sections],
  );
  return (
    <div className={styles.surface}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consultant-review-title"
        ref={dialogRef}
      >
        <header className={styles.navigation}>
          <Link className={styles.brand} href="/consultant">
            inkwell
          </Link>
          <nav aria-label="Consultant review navigation">
            <Link href="/consultant">My articles</Link>
            <Link href="/consultant/settings">Settings</Link>
          </nav>
          <div className={styles.experience}>
            <ExperienceSwitcher current="consultant" />
          </div>
        </header>
        <div className={styles.toolbar}>
          <button
            ref={backRef}
            className={styles.back}
            onClick={onClose}
            type="button"
          >
            <ArrowLeft aria-hidden="true" size={20} />
            Back to article
          </button>
          <h2 id="consultant-review-title">Review AI suggestion</h2>
          <label className={styles.toggle}>
            <span>Show changes</span>
            <input
              type="checkbox"
              role="switch"
              checked={showChanges}
              onChange={(event) => setShowChanges(event.target.checked)}
            />
            <span className={styles.switchTrack} aria-hidden="true" />
          </label>
        </div>
        <div className={styles.scrollArea}>
          <div className={styles.readingColumn}>
            <div className={styles.context}>
              {revision.request && (
                <p>
                  <strong>Request:</strong> {revision.request}
                </p>
              )}
              {revision.summary && <p>{revision.summary}</p>}
              {!!revision.sources?.length && (
                <p className={styles.sources}>
                  Sources:{" "}
                  {revision.sources.map((source, index) => (
                    <Fragment key={source.id}>
                      {index > 0 && " · "}
                      <a
                        href={safeUrl(source.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {source.title}
                      </a>
                    </Fragment>
                  ))}
                </p>
              )}
            </div>
            <article
              className={styles.article}
              aria-label={
                showChanges
                  ? "Article with suggested changes"
                  : "Suggested article"
              }
            >
              <h1>{title}</h1>
              {showChanges && (
                <p className={styles.legend} aria-label="Change markers">
                  <span className={styles.removedMarker}>Removed</span>
                  <span className={styles.addedMarker}>Added</span>
                </p>
              )}
              {showChanges
                ? compared.map(({ before, after, index, originalIndex }) => (
                    <section
                      key={after?.id ?? `removed:${before!.id}`}
                      aria-label={
                        after?.title ?? `Removed section: ${before!.title}`
                      }
                    >
                      {!after && (
                        <p className={styles.sectionNote}>Removed section</p>
                      )}
                      {after && originalIndex < 0 && (
                        <p className={styles.sectionNote}>Added section</p>
                      )}
                      {after &&
                        originalIndex >= 0 &&
                        originalIndex !== index && (
                          <p className={styles.sectionNote}>
                            Moved from section {originalIndex + 1}
                          </p>
                        )}
                      {((after && index > 0) ||
                        (!after && originalIndex > 0)) && (
                        <h2>
                          {before &&
                            (!after || before.title !== after.title) && (
                              <del>{before.title}</del>
                            )}
                          {after &&
                          (!before || before.title !== after.title) ? (
                            <ins>{after.title}</ins>
                          ) : (
                            after?.title
                          )}
                        </h2>
                      )}
                      <BlockDiff
                        before={before ? sectionBlocks(before) : []}
                        after={after ? sectionBlocks(after) : []}
                      />
                    </section>
                  ))
                : revision.sections.map((section, index) => (
                    <section key={section.id} aria-label={section.title}>
                      {index > 0 && <h2>{section.title}</h2>}
                      {sectionBlocks(section).map((node, index) => (
                        <Fragment key={index}>{renderNode(node)}</Fragment>
                      ))}
                    </section>
                  ))}
            </article>
          </div>
        </div>
        <footer className={styles.footer}>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <div className={styles.footerInner}>
            <div className={styles.reassurance}>
              Your current draft stays unchanged until you approve.
              {dirty && (
                <span className={styles.warning}>
                  Save your current changes before applying this version.
                </span>
              )}
            </div>
            <div className={styles.actions}>
              <button
                className={styles.reject}
                disabled={busy}
                onClick={onReject}
                type="button"
              >
                Reject suggestion
              </button>
              <button
                className={styles.apply}
                disabled={busy || dirty}
                onClick={onApply}
                type="button"
              >
                {busy ? "Please wait…" : "Use this version"}
              </button>
            </div>
          </div>
        </footer>
      </section>
    </div>
  );
}
