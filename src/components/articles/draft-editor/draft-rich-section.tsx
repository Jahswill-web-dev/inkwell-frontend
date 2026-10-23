"use client";

import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { LinkNode } from "@lexical/link";
import { ListItemNode, ListNode } from "@lexical/list";
import { HeadingNode, QuoteNode } from "@lexical/rich-text";
import {
  $getSelection,
  $insertNodes,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  DecoratorNode,
  ParagraphNode,
  SELECTION_CHANGE_COMMAND,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type SerializedParagraphNode,
  type Spread,
} from "lexical";
import { useEffect, useId, type ReactNode } from "react";
import type { DraftFinding } from "@/lib/consultant/client";
import { normalizeEditorState, type DraftSection } from "./draft-editor-data";
import styles from "./draft-editor.module.css";

type SerializedImageNode = Spread<
  { altText: string; src: string },
  SerializedLexicalNode
>;

class ImageNode extends DecoratorNode<ReactNode> {
  __src: string;
  __altText: string;

  static getType() {
    return "image";
  }

  static clone(node: ImageNode) {
    return new ImageNode(node.__src, node.__altText, node.__key);
  }

  static importJSON(serializedNode: SerializedImageNode) {
    return new ImageNode(serializedNode.src, serializedNode.altText);
  }

  constructor(src: string, altText: string, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
  }

  exportJSON(): SerializedImageNode {
    return {
      altText: this.__altText,
      src: this.__src,
      type: "image",
      version: 1,
    };
  }

  createDOM() {
    return document.createElement("span");
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return (
      <figure className={styles.editorImage}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={this.__src} alt={this.__altText} />
      </figure>
    );
  }
}

type SerializedAnchoredParagraphNode = Spread<
  { paragraphId: string },
  SerializedParagraphNode
>;

class AnchoredParagraphNode extends ParagraphNode {
  __paragraphId: string;

  static getType() {
    return "anchored-paragraph";
  }

  static clone(node: AnchoredParagraphNode) {
    return new AnchoredParagraphNode(node.__paragraphId, node.__key);
  }

  static importJSON(serialized: SerializedAnchoredParagraphNode) {
    return new AnchoredParagraphNode(serialized.paragraphId).updateFromJSON(
      serialized,
    );
  }

  constructor(paragraphId = crypto.randomUUID(), key?: NodeKey) {
    super(key);
    this.__paragraphId = paragraphId;
  }

  exportJSON(): SerializedAnchoredParagraphNode {
    return {
      ...super.exportJSON(),
      type: "anchored-paragraph",
      paragraphId: this.__paragraphId,
      version: 1,
    };
  }

  createDOM(config: Parameters<ParagraphNode["createDOM"]>[0]) {
    const element = super.createDOM(config);
    element.dataset.paragraphId = this.__paragraphId;
    return element;
  }
}

type HighlightConstructor = new (...ranges: Range[]) => unknown;
const findingHighlightRanges = new Map<
  string,
  { unsupported: Range[]; interpretation: Range[] }
>();

function renderFindingHighlights() {
  const registry = (CSS as unknown as { highlights?: Map<string, unknown> })
    .highlights;
  const HighlightClass = (
    globalThis as unknown as { Highlight?: HighlightConstructor }
  ).Highlight;
  if (!registry || !HighlightClass) return;
  const unsupported = [...findingHighlightRanges.values()].flatMap(
    (item) => item.unsupported,
  );
  const interpretation = [...findingHighlightRanges.values()].flatMap(
    (item) => item.interpretation,
  );
  registry.set("inkwell-unsupported", new HighlightClass(...unsupported));
  registry.set("inkwell-interpretation", new HighlightClass(...interpretation));
}

function textRange(element: Element, claim: string): Range | null {
  const whole = element.textContent ?? "";
  const start = whole.indexOf(claim);
  if (start < 0) return null;
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  let consumed = 0;
  let startNode: Node | null = null;
  let endNode: Node | null = null;
  let startOffset = 0;
  let endOffset = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const length = node.textContent?.length ?? 0;
    if (!startNode && start <= consumed + length) {
      startNode = node;
      startOffset = start - consumed;
    }
    if (start + claim.length <= consumed + length) {
      endNode = node;
      endOffset = start + claim.length - consumed;
      break;
    }
    consumed += length;
  }
  if (!startNode || !endNode) return null;
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  return range;
}

function FindingHighlights({
  findings,
  scope,
}: {
  findings: DraftFinding[];
  scope: string;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(
    () =>
      editor.registerRootListener((root, previous) => {
        for (const container of [previous, root]) {
          container
            ?.querySelectorAll("[data-fidelity-finding]")
            .forEach((node) => {
              node.removeAttribute("data-fidelity-finding");
              node.removeAttribute("data-fidelity-classification");
              node.removeAttribute("data-fidelity-exact");
            });
        }
        const ranges = {
          unsupported: [] as Range[],
          interpretation: [] as Range[],
        };
        for (const finding of findings.filter(
          (item) => item.status === "open",
        )) {
          const target = finding.paragraph_id
            ? root?.querySelector(
                `[data-paragraph-id="${CSS.escape(finding.paragraph_id)}"]`,
              )
            : root?.children.item(finding.paragraph_index ?? -1);
          if (target instanceof HTMLElement) {
            target.dataset.fidelityFinding = finding.id;
            if (
              target.dataset.fidelityClassification !== "unsupported" ||
              finding.classification === "unsupported"
            ) {
              target.dataset.fidelityClassification = finding.classification;
            }
            target.title = finding.explanation;
            const range = finding.claim_text
              ? textRange(target, finding.claim_text)
              : null;
            if (range && finding.classification !== "supported") {
              if (target.dataset.fidelityExact !== "false") {
                target.dataset.fidelityExact = "true";
              }
              ranges[finding.classification].push(range);
            } else {
              target.dataset.fidelityExact = "false";
            }
          }
        }
        findingHighlightRanges.set(scope, ranges);
        renderFindingHighlights();
      }),
    [editor, findings, scope],
  );
  useEffect(
    () => () => {
      findingHighlightRanges.delete(scope);
      renderFindingHighlights();
    },
    [scope],
  );
  return null;
}

export function insertEditorImage(
  editor: LexicalEditor,
  src: string,
  altText: string,
) {
  editor.update(() => $insertNodes([new ImageNode(src, altText)]));
}

function EditorBridge({
  onEditor,
  onSelection,
}: {
  onEditor: (editor: LexicalEditor) => void;
  onSelection: (text: string) => void;
}) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    onEditor(editor);
    const reportSelection = () => {
      const selection = $getSelection();
      onSelection(
        $isRangeSelection(selection) ? selection.getTextContent() : "",
      );
      return false;
    };
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      reportSelection,
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, onEditor, onSelection]);

  return null;
}

export function DraftRichSection({
  section,
  index,
  isActive = false,
  readOnly = false,
  onChange,
  onTitleChange,
  onEditor,
  onSelection,
  showSectionNumber = true,
  temporaryContent,
  findings = [],
}: {
  section: DraftSection;
  index: number;
  isActive?: boolean;
  readOnly?: boolean;
  onChange?: (sectionId: string, editorState: string) => void;
  onTitleChange?: (sectionId: string, title: string) => void;
  onEditor?: (sectionId: string, editor: LexicalEditor) => void;
  onSelection?: (sectionId: string, text: string) => void;
  showSectionNumber?: boolean;
  temporaryContent?: ReactNode;
  findings?: DraftFinding[];
}) {
  const highlightScope = useId();
  const initialConfig = {
    namespace: `inkwell-draft-${section.id}-${readOnly ? "preview" : "editor"}`,
    editable: !readOnly,
    editorState: normalizeEditorState(section.editorState),
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      ImageNode,
      AnchoredParagraphNode,
    ],
    theme: {
      paragraph: styles.editorParagraph,
      quote: styles.editorQuote,
      heading: { h2: styles.editorHeading, h3: styles.editorSubheading },
      list: {
        ul: styles.editorList,
        ol: styles.editorList,
        listitem: styles.editorListItem,
      },
      link: styles.editorLink,
      text: { bold: styles.bold, italic: styles.italic },
    },
    onError(error: Error) {
      throw error;
    },
  };

  return (
    <section
      className={styles.articleSection}
      data-section-id={section.id}
      id={`draft-section-${section.id}`}
    >
      {index > 0 ? (
        readOnly || !onTitleChange ? (
          <h2 aria-current={isActive ? "location" : undefined}>
            {showSectionNumber ? `${index}. ` : ""}
            {section.title}
          </h2>
        ) : (
          <input
            aria-current={isActive ? "location" : undefined}
            aria-label={`Section heading: ${section.title}`}
            className={styles.sectionTitleInput}
            maxLength={300}
            onChange={(event) => onTitleChange(section.id, event.target.value)}
            value={section.title}
          />
        )
      ) : null}
      <div hidden={Boolean(temporaryContent)}>
        <LexicalComposer initialConfig={initialConfig}>
          <div className={styles.editorShell}>
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  aria-label={`${section.title} draft content`}
                  className={styles.editorContent}
                />
              }
              placeholder={
                <span className={styles.editorPlaceholder}>
                  Start writing this section…
                </span>
              }
              ErrorBoundary={({ children }) => children}
            />
            <FindingHighlights findings={findings} scope={highlightScope} />
            {!readOnly ? (
              <>
                <HistoryPlugin />
                <ListPlugin />
                <LinkPlugin />
                <OnChangePlugin
                  ignoreSelectionChange
                  onChange={(editorState: EditorState) =>
                    onChange?.(section.id, JSON.stringify(editorState.toJSON()))
                  }
                />
                <EditorBridge
                  onEditor={(editor) => onEditor?.(section.id, editor)}
                  onSelection={(text) => onSelection?.(section.id, text)}
                />
              </>
            ) : null}
          </div>
        </LexicalComposer>
      </div>
      {temporaryContent}
    </section>
  );
}

export type { LexicalEditor, LexicalNode };
