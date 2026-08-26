import type { DraftArticleState } from "../draft-editor/draft-editor-data";
import type { ReviewIssue } from "./review-data";
import styles from "./review-article.module.css";

function getParagraphs(editorState: string): string[] {
  try {
    const state = JSON.parse(editorState) as {
      root?: { children?: unknown[] };
    };
    const collect = (node: unknown): string => {
      if (!node || typeof node !== "object") return "";
      const value = node as { text?: unknown; children?: unknown[] };
      return [
        typeof value.text === "string" ? value.text : "",
        ...(value.children?.map(collect) ?? []),
      ]
        .filter(Boolean)
        .join("");
    };
    return state.root?.children?.map(collect).filter(Boolean) ?? [];
  } catch {
    return [];
  }
}

function HighlightedText({
  text,
  issue,
}: {
  text: string;
  issue?: ReviewIssue;
}) {
  if (!issue || !text.includes(issue.original)) return text;
  const [before, after] = text.split(issue.original);
  return (
    <>
      {before}
      <mark className={styles.highlight}>{issue.original}</mark>
      {after}
    </>
  );
}

export function ReviewArticle({
  draft,
  activeIssue,
  preview = false,
}: {
  draft: DraftArticleState;
  activeIssue?: ReviewIssue;
  preview?: boolean;
}) {
  return (
    <article className={`${styles.article} ${preview ? styles.preview : ""}`}>
      <h1>{draft.title}</h1>
      {draft.sections.map((section, sectionIndex) => (
        <section key={section.id}>
          {sectionIndex > 0 ? (
            <h2>{`${sectionIndex}. ${section.title}`}</h2>
          ) : null}
          {getParagraphs(section.editorState).map(
            (paragraph, paragraphIndex) => (
              <p key={`${section.id}-${paragraphIndex}`}>
                <HighlightedText
                  text={paragraph}
                  issue={
                    activeIssue?.sectionId === section.id
                      ? activeIssue
                      : undefined
                  }
                />
              </p>
            ),
          )}
        </section>
      ))}
    </article>
  );
}
