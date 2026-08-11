"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUDownLeft,
  ArrowUDownRight,
  CaretDown,
  CaretUp,
  Check,
  DotsThree,
  ImageSquare,
  LinkSimple,
  ListBullets,
  ListNumbers,
  NotePencil,
  Plus,
  Quotes,
  Sparkle,
  TextAa,
  TextB,
  TextItalic,
  X,
} from "@phosphor-icons/react";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  COMMAND_PRIORITY_LOW,
  FORMAT_TEXT_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
  type LexicalEditor,
} from "lexical";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DEFAULT_AUTH_IDENTITY, type AuthIdentity } from "@/lib/auth/identity";
import { ArticleProgress } from "../article-progress/article-progress";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import {
  countDraftWords,
  createDefaultDraft,
  createEditorState,
  DRAFT_STORAGE_KEY,
  parseDraft,
  type DraftArticleState,
  type DraftSection,
} from "./draft-editor-data";
import { DraftRichSection, insertEditorImage } from "./draft-rich-section";
import styles from "./draft-editor.module.css";

type SaveStatus = "saved" | "saving" | "offline" | "failed" | "retrying";
type MobileTab = "outline" | "assistant" | "format" | "more";
type AssistantAction = "clearer" | "example" | "transition" | "voice";

type Suggestion = {
  action: AssistantAction;
  original: string;
  replacement: string;
  explanation: string;
  attempt: number;
};

const actionCopy: Record<
  AssistantAction,
  { title: string; subtitle: string; icon: typeof Sparkle }
> = {
  clearer: {
    title: "Make clearer",
    subtitle: "Clarify this sentence",
    icon: Sparkle,
  },
  example: {
    title: "Add example",
    subtitle: "Add a relevant example",
    icon: ImageSquare,
  },
  transition: {
    title: "Improve transition",
    subtitle: "Smooth the flow",
    icon: NotePencil,
  },
  voice: {
    title: "Rewrite in my voice",
    subtitle: "Match my writing style",
    icon: NotePencil,
  },
};

const suggestionVariants: Record<AssistantAction, readonly string[]> = {
  clearer: [
    "Great ideas are hard to capture because they begin as possibilities, not precise statements.",
    "Ideas often resist words because they first appear as possibilities rather than finished thoughts.",
  ],
  example: [
    "For example, a founder may sense the shape of a new product long before they can explain why it matters.",
    "Think of the idea that arrives during a walk: vivid enough to feel important, but still too loose to present to someone else.",
  ],
  transition: [
    "That uncertainty is exactly why writing becomes the next essential step.",
    "Once the fragments are visible, structure can begin to turn them into an argument.",
  ],
  voice: [
    "The idea is there, but it is still moving—more possibility than precision, more spark than sentence.",
    "A good idea rarely arrives dressed for the page. It shows up unfinished and asks us to do the tailoring.",
  ],
};

function createSuggestion(
  action: AssistantAction,
  selectedText: string,
  attempt = 0,
): Suggestion {
  const fallback =
    "Great ideas are elusive because they live in the realm of possibility, not precision.";
  return {
    action,
    original: selectedText.trim() || fallback,
    replacement:
      suggestionVariants[action][attempt % suggestionVariants[action].length],
    explanation: actionCopy[action].subtitle,
    attempt,
  };
}

function elapsedLabel(savedAt: string | null) {
  if (!savedAt) return "Autosaved just now";
  const minutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(savedAt).getTime()) / 60_000),
  );
  return minutes < 1 ? "Autosaved just now" : `Autosaved ${minutes}m ago`;
}

export function DraftEditor({
  identity = DEFAULT_AUTH_IDENTITY,
}: {
  identity?: AuthIdentity;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftArticleState>(() =>
    createDefaultDraft(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("introduction");
  const [selectedText, setSelectedText] = useState(
    "Great ideas are elusive because they live in the realm of possibility, not precision.",
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("assistant");
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const editorsRef = useRef(new Map<string, LexicalEditor>());
  const activeEditorRef = useRef<LexicalEditor | null>(null);
  const dirtyRef = useRef(false);
  const skipNextAutosaveRef = useRef(true);

  const activeSection =
    draft.sections.find((section) => section.id === activeSectionId) ??
    draft.sections[0];
  const wordCount = useMemo(() => countDraftWords(draft), [draft]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 800px)");
    const update = () => setIsMobile(media.matches);
    const timer = window.setTimeout(update, 0);
    media.addEventListener("change", update);
    return () => {
      window.clearTimeout(timer);
      media.removeEventListener("change", update);
    };
  }, []);

  useEffect(() => {
    const saved = parseDraft(window.sessionStorage.getItem(DRAFT_STORAGE_KEY));
    const next =
      saved ??
      createDefaultDraft(
        window.sessionStorage.getItem("inkwell:article-outline"),
      );
    const timer = window.setTimeout(() => {
      setDraft(next);
      setActiveSectionId(next.sections[0]?.id ?? "introduction");
      setLastSavedAt(next.savedAt);
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const saveDraft = useCallback(
    (nextStatus: SaveStatus = "saved", message = "") => {
      const savedAt = new Date().toISOString();
      try {
        window.sessionStorage.setItem(
          DRAFT_STORAGE_KEY,
          JSON.stringify({ ...draft, savedAt }),
        );
        dirtyRef.current = false;
        setLastSavedAt(savedAt);
        setSaveStatus(nextStatus);
        if (message) setStatusMessage(message);
        return true;
      } catch {
        setSaveStatus("failed");
        setStatusMessage("Autosave failed. Your changes are still open.");
        return false;
      }
    },
    [draft],
  );

  useEffect(() => {
    if (!hydrated) return;
    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;
      return;
    }
    dirtyRef.current = true;
    if (!navigator.onLine) {
      const offlineTimer = window.setTimeout(() => setSaveStatus("offline"), 0);
      return () => window.clearTimeout(offlineTimer);
    }
    const statusTimer = window.setTimeout(() => setSaveStatus("saving"), 0);
    const timer = window.setTimeout(() => saveDraft(), 800);
    return () => {
      window.clearTimeout(statusTimer);
      window.clearTimeout(timer);
    };
  }, [draft, hydrated, saveDraft]);

  useEffect(() => {
    const onOffline = () => setSaveStatus("offline");
    const onOnline = () => {
      setSaveStatus("retrying");
      window.setTimeout(() => saveDraft(), 350);
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [saveDraft]);

  useEffect(() => {
    const editor = activeEditorRef.current;
    if (!editor) return;
    const unregisterUndo = editor.registerCommand(
      CAN_UNDO_COMMAND,
      (payload) => {
        setCanUndo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    const unregisterRedo = editor.registerCommand(
      CAN_REDO_COMMAND,
      (payload) => {
        setCanRedo(payload);
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
    return () => {
      unregisterUndo();
      unregisterRedo();
    };
  }, [activeSectionId]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sections =
      document.querySelectorAll<HTMLElement>("[data-section-id]");
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        const id = (visible?.target as HTMLElement | undefined)?.dataset
          .sectionId;
        if (id) setActiveSectionId(id);
      },
      { rootMargin: "-18% 0px -68% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [draft.sections.length]);

  const updateSectionEditor = useCallback(
    (sectionId: string, editorState: string) => {
      setDraft((current) => ({
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId ? { ...section, editorState } : section,
        ),
      }));
    },
    [],
  );

  const registerEditor = useCallback(
    (sectionId: string, editor: LexicalEditor) => {
      editorsRef.current.set(sectionId, editor);
      if (sectionId === activeSectionId || !activeEditorRef.current) {
        activeEditorRef.current = editor;
      }
    },
    [activeSectionId],
  );

  const focusSection = useCallback((sectionId: string) => {
    setActiveSectionId(sectionId);
    activeEditorRef.current = editorsRef.current.get(sectionId) ?? null;
    document
      .getElementById(`draft-section-${sectionId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const onEditorFocus = (sectionId: string) => {
    setActiveSectionId(sectionId);
    activeEditorRef.current = editorsRef.current.get(sectionId) ?? null;
  };

  const toggleChecklist = (itemId: string, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === activeSectionId
          ? {
              ...section,
              checklist: section.checklist.map((item) =>
                item.id === itemId ? { ...item, completed: checked } : item,
              ),
            }
          : section,
      ),
    }));
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    setDraft((current) => {
      const sections = [...current.sections];
      const index = sections.findIndex((section) => section.id === sectionId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= sections.length) return current;
      [sections[index], sections[target]] = [sections[target], sections[index]];
      return { ...current, sections };
    });
  };

  const addSection = () => {
    const title = newSectionTitle.trim();
    if (!title) return;
    const id = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${draft.sections.length + 1}`;
    const section: DraftSection = {
      id,
      title,
      goal: `Develop the article’s point about ${title.toLowerCase()}`,
      checklist: [
        {
          id: `${id}-point`,
          label: "Make the central point clear",
          completed: false,
        },
        {
          id: `${id}-example`,
          label: "Add a supporting example",
          completed: false,
        },
        {
          id: `${id}-transition`,
          label: "Connect to the next section",
          completed: false,
        },
      ],
      editorState: createEditorState([""]),
    };
    setDraft((current) => ({
      ...current,
      sections: [...current.sections, section],
    }));
    setNewSectionTitle("");
    setAddSectionOpen(false);
    window.setTimeout(() => focusSection(id), 0);
  };

  const startSuggestion = (action: AssistantAction) => {
    setSuggestion(createSuggestion(action, selectedText));
  };

  const acceptSuggestion = () => {
    if (!suggestion || !activeEditorRef.current) return;
    activeEditorRef.current.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      if (
        suggestion.action === "example" ||
        suggestion.action === "transition"
      ) {
        selection.insertText(` ${suggestion.replacement}`);
      } else {
        selection.insertText(suggestion.replacement);
      }
    });
    setStatusMessage("Suggestion applied. Use Undo to restore the original.");
    setSuggestion(null);
  };

  const retrySuggestion = () => {
    if (!suggestion) return;
    setSuggestion(
      createSuggestion(
        suggestion.action,
        suggestion.original,
        suggestion.attempt + 1,
      ),
    );
  };

  const setBlock = (type: "heading" | "quote" | "paragraph") => {
    activeEditorRef.current?.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      $setBlocksType(selection, () =>
        type === "heading"
          ? $createHeadingNode("h2")
          : type === "quote"
            ? $createQuoteNode()
            : $createParagraphNode(),
      );
    });
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!url || !activeEditorRef.current) return;
    activeEditorRef.current.dispatchCommand(TOGGLE_LINK_COMMAND, url);
    setLinkOpen(false);
    setLinkUrl("");
  };

  const applyImage = () => {
    const url = imageUrl.trim();
    if (!url || !activeEditorRef.current) return;
    insertEditorImage(activeEditorRef.current, url, imageAlt.trim());
    setImageOpen(false);
    setImageUrl("");
    setImageAlt("");
  };

  const reviewArticle = () => {
    if (saveDraft("saved", "Draft saved and ready for review.")) {
      setStatusMessage("Draft saved and ready for review.");
      router.push("/articles/new/review");
    }
  };

  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "offline"
        ? "Offline — saved on this device"
        : saveStatus === "failed"
          ? "Autosave failed"
          : saveStatus === "retrying"
            ? "Retrying save…"
            : elapsedLabel(lastSavedAt);

  const renderOutline = (mobile = false) => (
    <div className={styles.outlineContent}>
      <div className={styles.outlineHeading}>
        <span>
          <ListBullets size={22} aria-hidden /> Outline
        </span>
        <button
          aria-label="Add section"
          onClick={() => setAddSectionOpen(true)}
          type="button"
        >
          <Plus size={21} aria-hidden />
        </button>
      </div>
      <ol className={styles.outlineList}>
        {draft.sections.map((section, index) => (
          <li
            className={
              section.id === activeSectionId ? styles.activeOutline : ""
            }
            key={section.id}
          >
            <button onClick={() => focusSection(section.id)} type="button">
              {index === 0 || /conclusion/i.test(section.title)
                ? section.title
                : `${index}. ${section.title}`}
            </button>
            <span className={styles.reorderControls}>
              <button
                aria-label={`Move ${section.title} up`}
                disabled={index === 0}
                onClick={() => moveSection(section.id, -1)}
                type="button"
              >
                <CaretUp size={14} aria-hidden />
              </button>
              <button
                aria-label={`Move ${section.title} down`}
                disabled={index === draft.sections.length - 1}
                onClick={() => moveSection(section.id, 1)}
                type="button"
              >
                <CaretDown size={14} aria-hidden />
              </button>
            </span>
          </li>
        ))}
      </ol>
      {mobile ? (
        <button
          className={styles.sheetAction}
          onClick={() => setAddSectionOpen(true)}
          type="button"
        >
          <Plus size={20} aria-hidden /> Add section
        </button>
      ) : null}
    </div>
  );

  const renderAssistant = (surface: "desktop" | "mobile") => (
    <div className={styles.assistantContent}>
      <div className={styles.goalHeader}>
        <h3>Section goal</h3>
        <CaretUp size={18} aria-hidden />
      </div>
      <p className={styles.goalCopy}>{activeSection?.goal}</p>
      <div className={styles.checklist}>
        {activeSection?.checklist.map((item) => (
          <Checkbox
            checked={item.completed}
            id={`${surface}-${item.id}`}
            key={item.id}
            label={item.label}
            onChange={(event) => toggleChecklist(item.id, event.target.checked)}
          />
        ))}
      </div>
      <div className={styles.selectedContext}>
        <span>Selected text</span>
        <p>
          {selectedText ||
            "Select text in your draft to use an assistant action."}
        </p>
      </div>
      {suggestion ? (
        <div className={styles.suggestionCard} aria-live="polite">
          <span>Suggested revision</span>
          <p>{suggestion.replacement}</p>
          <small>{suggestion.explanation}</small>
          <div>
            <button onClick={acceptSuggestion} type="button">
              Accept
            </button>
            <button onClick={() => setSuggestion(null)} type="button">
              Reject
            </button>
            <button onClick={retrySuggestion} type="button">
              Try again
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <h3>Suggested actions</h3>
          {(Object.keys(actionCopy) as AssistantAction[]).map((action) => {
            const item = actionCopy[action];
            const Icon = item.icon;
            return (
              <button
                key={action}
                onClick={() => startSuggestion(action)}
                type="button"
              >
                <Icon size={22} aria-hidden />
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.subtitle}</small>
                </span>
                <ArrowRight size={18} aria-hidden />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderToolbar = (mobile = false) => (
    <div
      className={mobile ? styles.mobileToolbar : styles.toolbar}
      role="toolbar"
      aria-label="Text formatting"
    >
      <button
        aria-label="Heading"
        onClick={() => setBlock("heading")}
        type="button"
      >
        <TextAa size={22} aria-hidden />
      </button>
      <button
        aria-label="Bold"
        onClick={() =>
          activeEditorRef.current?.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
        }
        type="button"
      >
        <TextB size={22} weight="bold" aria-hidden />
      </button>
      <button
        aria-label="Italic"
        onClick={() =>
          activeEditorRef.current?.dispatchCommand(
            FORMAT_TEXT_COMMAND,
            "italic",
          )
        }
        type="button"
      >
        <TextItalic size={22} aria-hidden />
      </button>
      <button
        aria-label="Insert link"
        onClick={() => setLinkOpen(true)}
        type="button"
      >
        <LinkSimple size={22} aria-hidden />
      </button>
      <button
        aria-label="Bulleted list"
        onClick={() =>
          activeEditorRef.current?.dispatchCommand(
            INSERT_UNORDERED_LIST_COMMAND,
            undefined,
          )
        }
        type="button"
      >
        <ListBullets size={22} aria-hidden />
      </button>
      <button
        aria-label="Numbered list"
        onClick={() =>
          activeEditorRef.current?.dispatchCommand(
            INSERT_ORDERED_LIST_COMMAND,
            undefined,
          )
        }
        type="button"
      >
        <ListNumbers size={22} aria-hidden />
      </button>
      <button
        aria-label="Quote"
        onClick={() => setBlock("quote")}
        type="button"
      >
        <Quotes size={22} weight="fill" aria-hidden />
      </button>
      <button
        aria-label="Insert image"
        onClick={() => setImageOpen(true)}
        type="button"
      >
        <ImageSquare size={22} aria-hidden />
      </button>
      <button
        aria-label="Undo"
        disabled={!canUndo}
        onClick={() =>
          activeEditorRef.current?.dispatchCommand(UNDO_COMMAND, undefined)
        }
        type="button"
      >
        <ArrowUDownLeft size={22} aria-hidden />
      </button>
      <button
        aria-label="Redo"
        disabled={!canRedo}
        onClick={() =>
          activeEditorRef.current?.dispatchCommand(REDO_COMMAND, undefined)
        }
        type="button"
      >
        <ArrowUDownRight size={22} aria-hidden />
      </button>
    </div>
  );

  if (!hydrated) {
    return (
      <main className={styles.loadingPage}>
        <span>Opening your draft…</span>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      {!isMobile ? (
        <>
          <DashboardSidebar
            activeHref="/dashboard?section=articles"
            identity={identity}
            showSettings={false}
          />
          <div className={styles.desktopWorkspace}>
            <header className={styles.desktopTopbar}>
              <div className={styles.saveMeta} role="status" aria-live="polite">
                {saveStatus === "saved" ? (
                  <Check size={18} weight="bold" aria-hidden />
                ) : null}
                <span>{saveLabel}</span>
                {saveStatus === "failed" ? (
                  <button onClick={() => saveDraft("retrying")} type="button">
                    Retry
                  </button>
                ) : null}
                <span>{wordCount.toLocaleString()} words</span>
              </div>
              <ArticleProgress currentStep="draft" compact />
              <div className={styles.topActions}>
                <button onClick={() => setPreviewOpen(true)} type="button">
                  Preview
                </button>
                <button onClick={reviewArticle} type="button">
                  Review article
                </button>
              </div>
            </header>
            <div className={styles.desktopLayout}>
              <aside className={styles.outlineRail} aria-label="Draft outline">
                {renderOutline()}
              </aside>
              <article className={styles.articleCanvas}>
                <div className={styles.articleBody}>
                  <h1>{draft.title}</h1>
                  {draft.sections.map((section, index) => (
                    <DraftRichSection
                      index={index}
                      key={section.id}
                      onChange={updateSectionEditor}
                      onEditor={registerEditor}
                      onFocus={onEditorFocus}
                      onSelection={(sectionId, text) => {
                        if (text.trim()) {
                          setActiveSectionId(sectionId);
                          setSelectedText(text);
                        }
                      }}
                      section={section}
                    />
                  ))}
                </div>
                {renderToolbar()}
              </article>
              <aside
                className={styles.assistantPanel}
                aria-label="Writing assistant"
              >
                <header>
                  <Sparkle size={23} weight="fill" aria-hidden />
                  <strong>Writing assistant</strong>
                  <button aria-label="Close writing assistant" type="button">
                    <X size={21} aria-hidden />
                  </button>
                </header>
                {renderAssistant("desktop")}
                <p className={styles.disclaimer}>
                  AI suggestions may be inaccurate.
                  <br />
                  <a href="https://openai.com/policies/usage-policies/">
                    Learn more
                  </a>
                </p>
              </aside>
            </div>
          </div>
        </>
      ) : (
        <div className={styles.mobileWorkspace}>
          <header className={styles.mobileHeader}>
            <span className={styles.mobileMark} aria-hidden>
              <Image
                src="/images/inkwell-icon.png"
                alt=""
                width={72}
                height={72}
                priority
              />
            </span>
            <h1>{draft.title}</h1>
            <button
              aria-label="More article actions"
              onClick={() => {
                setMobileTab("more");
                setSheetCollapsed(false);
              }}
              type="button"
            >
              <DotsThree size={27} weight="bold" aria-hidden />
            </button>
          </header>
          <ArticleProgress currentStep="draft" compact />
          <article className={styles.mobileArticle}>
            {draft.sections.map((section, index) => (
              <DraftRichSection
                index={index}
                key={section.id}
                onChange={updateSectionEditor}
                onEditor={registerEditor}
                onFocus={onEditorFocus}
                onSelection={(sectionId, text) => {
                  if (text.trim()) {
                    setActiveSectionId(sectionId);
                    setSelectedText(text);
                  }
                }}
                section={section}
              />
            ))}
          </article>
          <section
            className={`${styles.mobileSheet} ${sheetCollapsed ? styles.collapsedSheet : ""}`}
            aria-label={`${mobileTab} tools`}
          >
            <button
              aria-label={sheetCollapsed ? "Expand tools" : "Collapse tools"}
              className={styles.sheetHandle}
              onClick={() => setSheetCollapsed((current) => !current)}
              type="button"
            >
              <span />
            </button>
            {!sheetCollapsed ? (
              <div className={styles.mobileSheetBody}>
                {mobileTab === "assistant" ? renderAssistant("mobile") : null}
                {mobileTab === "outline" ? renderOutline(true) : null}
                {mobileTab === "format" ? (
                  <>
                    <h2>Format</h2>
                    {renderToolbar(true)}
                  </>
                ) : null}
                {mobileTab === "more" ? (
                  <div className={styles.moreActions}>
                    <h2>More</h2>
                    <button onClick={() => setPreviewOpen(true)} type="button">
                      Preview article <ArrowRight size={18} aria-hidden />
                    </button>
                    <button onClick={reviewArticle} type="button">
                      Mark ready for review <ArrowRight size={18} aria-hidden />
                    </button>
                    <p>
                      {saveLabel} · {wordCount.toLocaleString()} words
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>
          <nav className={styles.mobileNav} aria-label="Draft tools">
            {(
              [
                ["outline", ListBullets, "Outline"],
                ["assistant", Sparkle, "Assistant"],
                ["format", TextAa, "Format"],
                ["more", DotsThree, "More"],
              ] as const
            ).map(([tab, Icon, label]) => (
              <button
                className={mobileTab === tab ? styles.activeTab : ""}
                key={tab}
                onClick={() => {
                  setMobileTab(tab);
                  setSheetCollapsed(false);
                }}
                type="button"
              >
                <Icon
                  size={31}
                  weight={tab === "assistant" ? "regular" : undefined}
                  aria-hidden
                />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      <p className={styles.srStatus} role="status" aria-live="polite">
        {statusMessage}
      </p>

      {previewOpen ? (
        <div
          className={styles.previewOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Article preview"
        >
          <header>
            <button onClick={() => setPreviewOpen(false)} type="button">
              <ArrowLeft size={19} aria-hidden /> Back to editor
            </button>
            <strong>Preview</strong>
            <button onClick={reviewArticle} type="button">
              Review article
            </button>
          </header>
          <article className={styles.previewArticle}>
            <h1>{draft.title}</h1>
            {draft.sections.map((section, index) => (
              <DraftRichSection
                index={index}
                key={section.id}
                readOnly
                section={section}
              />
            ))}
          </article>
        </div>
      ) : null}

      {addSectionOpen ? (
        <div
          className={styles.dialogBackdrop}
          role="presentation"
          onMouseDown={() => setAddSectionOpen(false)}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-section-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="add-section-title">Add a section</h2>
            <label htmlFor="new-section-title">Section title</label>
            <input
              autoFocus
              id="new-section-title"
              onChange={(event) => setNewSectionTitle(event.target.value)}
              value={newSectionTitle}
            />
            <div>
              <button onClick={() => setAddSectionOpen(false)} type="button">
                Cancel
              </button>
              <button
                disabled={!newSectionTitle.trim()}
                onClick={addSection}
                type="button"
              >
                Add section
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {linkOpen ? (
        <div
          className={styles.dialogBackdrop}
          role="presentation"
          onMouseDown={() => setLinkOpen(false)}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="link-title">Insert link</h2>
            <label htmlFor="link-url">URL</label>
            <input
              autoFocus
              id="link-url"
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://"
              value={linkUrl}
            />
            <div>
              <button onClick={() => setLinkOpen(false)} type="button">
                Cancel
              </button>
              <button
                disabled={!linkUrl.trim()}
                onClick={applyLink}
                type="button"
              >
                Apply link
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {imageOpen ? (
        <div
          className={styles.dialogBackdrop}
          role="presentation"
          onMouseDown={() => setImageOpen(false)}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 id="image-title">Insert image</h2>
            <label htmlFor="image-url">Image URL</label>
            <input
              autoFocus
              id="image-url"
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="/images/example.png"
              value={imageUrl}
            />
            <label htmlFor="image-alt">Alternative text</label>
            <input
              id="image-alt"
              onChange={(event) => setImageAlt(event.target.value)}
              value={imageAlt}
            />
            <div>
              <button onClick={() => setImageOpen(false)} type="button">
                Cancel
              </button>
              <button
                disabled={!imageUrl.trim()}
                onClick={applyImage}
                type="button"
              >
                Insert image
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}

export type { DraftArticleState } from "./draft-editor-data";
