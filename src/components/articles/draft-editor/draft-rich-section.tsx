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
  SELECTION_CHANGE_COMMAND,
  type EditorState,
  type LexicalEditor,
  type LexicalNode,
  type NodeKey,
  type SerializedLexicalNode,
  type Spread,
} from "lexical";
import { useEffect, type ReactNode } from "react";
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
  onEditor,
  onSelection,
  temporaryContent,
}: {
  section: DraftSection;
  index: number;
  isActive?: boolean;
  readOnly?: boolean;
  onChange?: (sectionId: string, editorState: string) => void;
  onEditor?: (sectionId: string, editor: LexicalEditor) => void;
  onSelection?: (sectionId: string, text: string) => void;
  temporaryContent?: ReactNode;
}) {
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
        <h2 aria-current={isActive ? "location" : undefined}>
          {index}. {section.title}
        </h2>
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
