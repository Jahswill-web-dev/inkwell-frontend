import {
  IS_BOLD,
  IS_CODE,
  IS_ITALIC,
  IS_STRIKETHROUGH,
  IS_UNDERLINE,
} from "lexical";
import type { Section } from "./client";

type EditorNode = {
  type?: string;
  tag?: string;
  text?: string;
  format?: number;
  url?: string;
  listType?: string;
  start?: number;
  children?: EditorNode[];
};

type Rendered = { markdown: string; html: string; plain: string };

const empty: Rendered = { markdown: "", html: "", plain: "" };

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_~\[\]]/g, "\\$&");
}

function safeUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function joinInline(parts: Rendered[]): Rendered {
  return {
    markdown: parts.map((part) => part.markdown).join(""),
    html: parts.map((part) => part.html).join(""),
    plain: parts.map((part) => part.plain).join(""),
  };
}

function renderInline(node: EditorNode): Rendered {
  if (node.type === "linebreak") {
    return { markdown: "  \n", html: "<br>", plain: "\n" };
  }
  if (node.type === "text") {
    const text = node.text ?? "";
    const format = node.format ?? 0;
    let markdown = escapeMarkdown(text);
    let html = escapeHtml(text);
    if (format & IS_CODE) {
      const fence = text.includes("`") ? "``" : "`";
      markdown = `${fence}${text}${fence}`;
      html = `<code>${html}</code>`;
    }
    if (format & IS_BOLD) {
      markdown = `**${markdown}**`;
      html = `<strong>${html}</strong>`;
    }
    if (format & IS_ITALIC) {
      markdown = `*${markdown}*`;
      html = `<em>${html}</em>`;
    }
    if (format & IS_STRIKETHROUGH) {
      markdown = `~~${markdown}~~`;
      html = `<s>${html}</s>`;
    }
    if (format & IS_UNDERLINE) {
      markdown = `<u>${markdown}</u>`;
      html = `<u>${html}</u>`;
    }
    return { markdown, html, plain: text };
  }
  const content = joinInline((node.children ?? []).map(renderInline));
  if (node.type !== "link") return content;
  const url = safeUrl(node.url);
  if (!url) return content;
  const markdownUrl = url.replaceAll("(", "%28").replaceAll(")", "%29");
  return {
    markdown: `[${content.markdown}](${markdownUrl})`,
    html: `<a href="${escapeHtml(url)}" rel="noopener noreferrer">${content.html}</a>`,
    plain: content.plain === url ? content.plain : `${content.plain} (${url})`,
  };
}

function renderList(node: EditorNode, depth: number): Rendered {
  const ordered = node.listType === "number";
  const start =
    typeof node.start === "number" &&
    Number.isInteger(node.start) &&
    node.start >= 1
      ? node.start
      : 1;
  const items = (node.children ?? []).map((item, index) => {
    const children = item.children ?? [];
    const content = joinInline(
      children.filter((child) => child.type !== "list").map(renderInline),
    );
    const nested = children
      .filter((child) => child.type === "list")
      .map((child) => renderList(child, depth + 1));
    const marker = ordered ? `${start + index}.` : "-";
    const plainMarker = ordered ? marker : "•";
    const indent = "  ".repeat(depth);
    return {
      markdown: `${indent}${marker} ${content.markdown}${nested.length ? `\n${nested.map((part) => part.markdown).join("\n")}` : ""}`,
      html: `<li>${content.html}${nested.map((part) => part.html).join("")}</li>`,
      plain: `${indent}${plainMarker} ${content.plain}${nested.length ? `\n${nested.map((part) => part.plain).join("\n")}` : ""}`,
    };
  });
  const tag = ordered ? "ol" : "ul";
  const startAttribute = ordered && start !== 1 ? ` start="${start}"` : "";
  return {
    markdown: items.map((item) => item.markdown).join("\n"),
    html: `<${tag}${startAttribute}>${items.map((item) => item.html).join("")}</${tag}>`,
    plain: items.map((item) => item.plain).join("\n"),
  };
}

function renderBlock(node: EditorNode): Rendered {
  if (node.type === "list") return renderList(node, 0);
  const content = joinInline((node.children ?? []).map(renderInline));
  if (node.type === "heading") {
    const tag = /^h[2-6]$/.test(node.tag ?? "") ? node.tag! : "h2";
    const level = Number(tag.slice(1));
    return {
      markdown: `${"#".repeat(level)} ${content.markdown}`,
      html: `<${tag}>${content.html}</${tag}>`,
      plain: content.plain,
    };
  }
  if (node.type === "quote") {
    return {
      markdown: content.markdown
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n"),
      html: `<blockquote><p>${content.html}</p></blockquote>`,
      plain: content.plain,
    };
  }
  if (node.type === "paragraph" || node.type === "anchored-paragraph") {
    return { ...content, html: `<p>${content.html}</p>` };
  }
  return content;
}

function renderSection(section: Section): Rendered {
  const state = JSON.parse(section.editor_state) as { root?: EditorNode };
  const blocks = (state.root?.children ?? []).map(renderBlock);
  if (!blocks.length) return empty;
  return {
    markdown: blocks
      .map((block) => block.markdown)
      .join("\n\n")
      .trim(),
    html: blocks.map((block) => block.html).join(""),
    plain: blocks
      .map((block) => block.plain)
      .join("\n\n")
      .trim(),
  };
}

export function serializeConsultantArticle(
  title: string,
  sections: Section[],
): Rendered {
  const parts = sections.map((section) => ({
    title: section.title,
    body: renderSection(section),
  }));
  return {
    markdown: [
      `# ${escapeMarkdown(title)}`,
      ...parts.map(
        ({ title: heading, body }) =>
          `## ${escapeMarkdown(heading)}${body.markdown ? `\n\n${body.markdown}` : ""}`,
      ),
    ].join("\n\n"),
    html: `<h1>${escapeHtml(title)}</h1>${parts
      .map(
        ({ title: heading, body }) =>
          `<h2>${escapeHtml(heading)}</h2>${body.html}`,
      )
      .join("")}`,
    plain: [
      title,
      ...parts.map(({ title: heading, body }) =>
        [heading, body.plain].filter(Boolean).join("\n\n"),
      ),
    ].join("\n\n"),
  };
}
