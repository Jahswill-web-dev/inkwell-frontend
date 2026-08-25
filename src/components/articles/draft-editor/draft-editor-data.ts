import type { Article } from "@/lib/articles/article";
import type { ArticleDraft, ArticleDraftPatch } from "@/lib/articles/draft";
import type { SectionContentBlock } from "@/lib/articles/interview";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  createEditor,
} from "lexical";
import { $createHeadingNode, HeadingNode } from "@lexical/rich-text";
import {
  $createListItemNode,
  $createListNode,
  ListItemNode,
  ListNode,
} from "@lexical/list";

export const DRAFT_SCHEMA_VERSION = 1;

export type DraftChecklistItem = {
  id: string;
  label: string;
  completed: boolean;
};

export type DraftSection = {
  id: string;
  outlineSectionId: string | null;
  title: string;
  goal: string;
  checklist: DraftChecklistItem[];
  editorState: string;
};

export type DraftArticleState = {
  schemaVersion: 1;
  title: string;
  sections: DraftSection[];
  savedAt: string | null;
};

const referenceCopy: Record<string, readonly string[]> = {
  introduction: [
    "We’ve all had them—that spark of insight in the shower, the half-formed observation on a late-night walk, the mental lightning bolt that feels brilliant in the moment and evaporates by morning.",
    "Great ideas are elusive because they live in the realm of possibility, not precision. They arrive as splinters, fragments, and flashes—not as fully formed arguments.",
    "But writing asks for something different. It demands structure. It asks us to slow down, to arrange our thoughts in a way that others can follow. And that’s where friction begins.",
  ],
  "messy-nature": [
    "Ideas rarely show up polished. They’re raw, ambiguous, and often contradictory. You might feel the shape of something but not yet the language to hold it. The chaos is part of the process.",
    "Embracing that mess is the first step. Before clarity comes curiosity. Before structure comes exploration.",
  ],
  "writing-creates-structure": [
    "Good writing is an act of translation. You’re turning internal noise into external signal. That requires choices—what to keep, what to cut, how to order, how to connect.",
    "A sentence makes an idea accountable. Each paragraph asks the thought before it to lead somewhere, and each section reveals the gaps that intuition alone can hide.",
  ],
  "clarity-through-iteration": [
    "Clarity rarely arrives in the first draft. It emerges through revision, when vague claims become specific and unnecessary words fall away.",
    "Iteration is not a sign that the idea failed. It is how the idea becomes sturdy enough to share.",
  ],
  conclusion: [
    "The difficulty of writing down a great idea is not evidence that the idea is weak. It is evidence that the work of shaping it has begun.",
    "Capture the fragments, give them an order, and return to them with patience. The clearer version is already inside the messy one.",
  ],
};

const referenceSections = [
  { id: "introduction", title: "Introduction" },
  { id: "messy-nature", title: "The messy nature of great ideas" },
  { id: "writing-creates-structure", title: "Writing requires structure" },
  { id: "clarity-through-iteration", title: "Clarity comes through iteration" },
  { id: "conclusion", title: "Conclusion" },
] as const;

export function createEditorState(paragraphs: readonly string[]): string {
  return JSON.stringify({
    root: {
      children: paragraphs.map((text) => ({
        children: [
          {
            detail: 0,
            format: 0,
            mode: "normal",
            style: "",
            text,
            type: "text",
            version: 1,
          },
        ],
        direction: "ltr",
        format: "",
        indent: 0,
        type: "paragraph",
        version: 1,
        textFormat: 0,
        textStyle: "",
      })),
      direction: "ltr",
      format: "",
      indent: 0,
      type: "root",
      version: 1,
    },
  });
}

export function createEditorStateFromBlocks(
  blocks: readonly SectionContentBlock[],
): string {
  const editor = createEditor({ nodes: [HeadingNode, ListNode, ListItemNode] });
  editor.update(
    () => {
      const root = $getRoot();
      blocks.forEach((block) => {
        if (block.type === "paragraph") {
          root.append(
            $createParagraphNode().append($createTextNode(block.text)),
          );
          return;
        }
        if (block.type === "subheading") {
          root.append(
            $createHeadingNode("h2").append($createTextNode(block.text)),
          );
          return;
        }
        const list = $createListNode(
          block.type === "numbered_list" ? "number" : "bullet",
        );
        block.items.forEach((item) => {
          list.append($createListItemNode().append($createTextNode(item)));
        });
        root.append(list);
      });
    },
    { discrete: true },
  );
  return JSON.stringify(editor.getEditorState().toJSON());
}

export function normalizeEditorState(editorState: string): string {
  try {
    const parsed = JSON.parse(editorState) as {
      root?: { children?: unknown };
    };
    if (
      parsed.root &&
      Array.isArray(parsed.root.children) &&
      parsed.root.children.length === 0
    ) {
      return createEditorState([""]);
    }
  } catch {
    return editorState;
  }
  return editorState;
}

function makeSection(id: string, title: string, index: number): DraftSection {
  const copy = referenceCopy[id] ?? [
    `Start shaping the key idea for ${title.toLowerCase()} here.`,
  ];
  return {
    id,
    outlineSectionId: null,
    title,
    goal:
      index === 0
        ? "Show why good ideas become difficult to express"
        : `Develop the article’s point about ${title.toLowerCase()}`,
    checklist: [
      {
        id: `${id}-frustration`,
        label:
          index === 0
            ? "Explain the reader’s frustration"
            : "Make the central point clear",
        completed: true,
      },
      {
        id: `${id}-example`,
        label: "Add a personal example",
        completed: false,
      },
      {
        id: `${id}-transition`,
        label: "Connect to the next section",
        completed: false,
      },
    ],
    editorState: createEditorState(copy),
  };
}

export function toDraftArticleState(
  article: Article,
  draft: ArticleDraft,
): DraftArticleState {
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    title: article.working_title,
    sections: draft.sections.map((section) => ({
      id: section.id,
      outlineSectionId: section.outline_section_id,
      title: section.title,
      goal: section.goal,
      checklist: section.checklist,
      editorState: normalizeEditorState(section.editor_state),
    })),
    savedAt: draft.updated_at,
  };
}

export function toArticleDraftPatch(
  draft: DraftArticleState,
): ArticleDraftPatch {
  return {
    sections: draft.sections.map((section) => ({
      id: section.id,
      outline_section_id: section.outlineSectionId,
      title: section.title,
      goal: section.goal,
      checklist: section.checklist,
      editor_state: section.editorState,
    })),
  };
}

export function createDefaultDraft(): DraftArticleState {
  return {
    schemaVersion: DRAFT_SCHEMA_VERSION,
    title: "Why Great Ideas Are Hard to Write Down",
    sections: referenceSections.map((section, index) =>
      makeSection(section.id, section.title, index),
    ),
    savedAt: null,
  };
}

export function editorStateText(editorState: string): string {
  try {
    const state = JSON.parse(editorState) as { root?: unknown };
    const collect = (node: unknown): string => {
      if (!node || typeof node !== "object") return "";
      const value = node as { text?: unknown; children?: unknown };
      const ownText = typeof value.text === "string" ? value.text : "";
      const childText = Array.isArray(value.children)
        ? value.children.map(collect).join(" ")
        : "";
      return `${ownText} ${childText}`.trim();
    };
    return collect(state.root);
  } catch {
    return "";
  }
}

export function countDraftWords(draft: DraftArticleState): number {
  const text = draft.sections
    .map((section) => editorStateText(section.editorState))
    .join(" ")
    .trim();
  return text ? text.split(/\s+/u).length : 0;
}
