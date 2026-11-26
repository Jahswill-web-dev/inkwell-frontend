import type { Section } from "./client";

export type ReviewNode = {
  type?: string;
  text?: string;
  format?: number | string;
  tag?: string;
  url?: string;
  listType?: string;
  start?: number;
  src?: string;
  altText?: string;
  children?: ReviewNode[];
};

export type BlockChange = {
  kind: "same" | "removed" | "added" | "replacement";
  before?: ReviewNode;
  after?: ReviewNode;
};

export function sectionBlocks(section: Section): ReviewNode[] {
  return JSON.parse(section.editor_state).root?.children ?? [];
}

// Ignore editor bookkeeping (paragraph IDs, version, selection) when comparing.
function signature(node: ReviewNode): string {
  return JSON.stringify([
    node.type,
    node.text,
    node.format,
    node.tag,
    node.url,
    node.listType,
    node.start,
    node.src,
    node.altText,
    node.children?.map(signature),
  ]);
}

export function diffBlocks(
  before: ReviewNode[],
  after: ReviewNode[],
): BlockChange[] {
  const left = before.map(signature);
  const right = after.map(signature);
  // Long rewritten sections fall back to complete before/after blocks, keeping
  // review responsive and preserving every removal without a quadratic matrix.
  if (left.length * right.length > 40000) {
    return [
      ...before.map((node) => ({ kind: "removed" as const, before: node })),
      ...after.map((node) => ({ kind: "added" as const, after: node })),
    ];
  }
  const rows = Array.from(
    { length: left.length + 1 },
    () => new Uint16Array(right.length + 1),
  );
  for (let i = left.length - 1; i >= 0; i--) {
    for (let j = right.length - 1; j >= 0; j--) {
      rows[i][j] =
        left[i] === right[j]
          ? rows[i + 1][j + 1] + 1
          : Math.max(rows[i + 1][j], rows[i][j + 1]);
    }
  }
  const result: BlockChange[] = [];
  let i = 0,
    j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && left[i] === right[j]) {
      result.push({ kind: "same", before: before[i++], after: after[j++] });
      continue;
    }
    const removed: ReviewNode[] = [],
      added: ReviewNode[] = [];
    while (
      (i < before.length || j < after.length) &&
      !(i < before.length && j < after.length && left[i] === right[j])
    ) {
      if (
        j < after.length &&
        (i === before.length || rows[i][j + 1] > rows[i + 1][j])
      )
        added.push(after[j++]);
      else removed.push(before[i++]);
    }
    for (let k = 0; k < Math.max(removed.length, added.length); k++) {
      result.push({
        kind:
          removed[k] && added[k]
            ? "replacement"
            : removed[k]
              ? "removed"
              : "added",
        before: removed[k],
        after: added[k],
      });
    }
  }
  return result;
}

function plainParagraph(node: ReviewNode): string | null {
  if (!["paragraph", "anchored-paragraph"].includes(node.type ?? ""))
    return null;
  if (!node.children?.every((child) => child.type === "text" && !child.format))
    return null;
  return node.children.map((child) => child.text ?? "").join("");
}

// A single contiguous phrase replacement stays readable; substantial rewrites
// use separate before/after paragraphs instead of interleaving many tiny edits.
export function phraseChange(before: ReviewNode, after: ReviewNode) {
  const oldText = plainParagraph(before),
    newText = plainParagraph(after);
  if (oldText === null || newText === null) return null;
  const left = oldText.match(/\S+\s*|\s+/g) ?? [],
    right = newText.match(/\S+\s*|\s+/g) ?? [];
  let start = 0,
    end = 0;
  while (
    start < left.length &&
    start < right.length &&
    left[start] === right[start]
  )
    start++;
  while (
    end < left.length - start &&
    end < right.length - start &&
    left[left.length - 1 - end] === right[right.length - 1 - end]
  )
    end++;
  const removed = left.slice(start, left.length - end).join("");
  const added = right.slice(start, right.length - end).join("");
  if (
    Math.max(removed.length, added.length) >
    Math.max(oldText.length, newText.length) * 0.45
  )
    return null;
  return {
    prefix: left.slice(0, start).join(""),
    removed,
    added,
    suffix: left.slice(left.length - end).join(""),
  };
}

export function reviewSections(current: Section[], proposed: Section[]) {
  const proposedIds = new Set(proposed.map((section) => section.id));
  const deleted = current.filter((section) => !proposedIds.has(section.id));
  const anchored = new Map<string | null, Section[]>();
  for (const section of deleted) {
    const index = current.indexOf(section);
    const next =
      current
        .slice(index + 1)
        .find((candidate) => proposedIds.has(candidate.id))?.id ?? null;
    anchored.set(next, [...(anchored.get(next) ?? []), section]);
  }
  return [
    ...proposed.flatMap((section, index) => [
      ...(anchored.get(section.id) ?? []).map((before) => ({
        before,
        after: undefined,
        index: current.indexOf(before),
        originalIndex: current.indexOf(before),
      })),
      {
        before: current.find((candidate) => candidate.id === section.id),
        after: section,
        index,
        originalIndex: current.findIndex(
          (candidate) => candidate.id === section.id,
        ),
      },
    ]),
    ...(anchored.get(null) ?? []).map((before) => ({
      before,
      after: undefined,
      index: current.indexOf(before),
      originalIndex: current.indexOf(before),
    })),
  ];
}
