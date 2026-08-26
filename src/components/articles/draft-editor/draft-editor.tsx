"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ArrowClockwise,
  ArrowUpRight,
  ArrowUDownLeft,
  ArrowUDownRight,
  CaretDown,
  CaretLeft,
  CaretRight,
  CaretUp,
  Check,
  CheckCircle,
  DotsThree,
  ImageSquare,
  LinkSimple,
  ListBullets,
  ListNumbers,
  NotePencil,
  PencilSimple,
  Plus,
  Quotes,
  Sparkle,
  Trash,
  TextAa,
  TextB,
  TextItalic,
  X,
} from "@phosphor-icons/react";
import { $createHeadingNode, $createQuoteNode } from "@lexical/rich-text";
import { $setBlocksType } from "@lexical/selection";
import {
  $createListItemNode,
  $createListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
} from "@lexical/list";
import { TOGGLE_LINK_COMMAND } from "@lexical/link";
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
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
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { z } from "zod";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DEFAULT_AUTH_IDENTITY, type AuthIdentity } from "@/lib/auth/identity";
import {
  ArticleRequestError,
  createArticleDraft,
  createSectionInterview,
  generateDraftSection,
  generateSectionInterview,
  generateTalkingPoints,
  getArticle,
  getArticleDraft,
  getLatestSectionInterview,
  replaceSectionInterviewAnswers,
  updateArticleDraft,
} from "@/lib/articles/client";
import type {
  SectionAnswer,
  SectionContentBlock,
  SectionInterview,
} from "@/lib/articles/interview";
import { ArticleProgress } from "../article-progress/article-progress";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import {
  countDraftWords,
  createDefaultDraft,
  createEditorState,
  createEditorStateFromBlocks,
  editorStateText,
  toArticleDraftPatch,
  toDraftArticleState,
  type DraftArticleState,
  type DraftSection,
} from "./draft-editor-data";
import { DraftRichSection, insertEditorImage } from "./draft-rich-section";
import styles from "./draft-editor.module.css";

type SaveStatus = "saved" | "saving" | "offline" | "failed" | "retrying";
type DraftLoadFailure = {
  kind: "missing-id" | "not-found" | "missing-outline" | "error";
  message: string;
  retryable: boolean;
};
type MobileTab = "outline" | "assistant" | "format" | "more";
type AssistantAction = "clearer" | "expand" | "example" | "tone" | "transition";
type AssistantStartMode = "plan" | "guided" | "draft";
type InterviewViewMode = "questions" | "complete" | "proposal";
type InterviewSaveStatus = "idle" | "saving" | "saved" | "failed";
type InterviewViewState = {
  active: boolean;
  answers: Record<string, string>;
  currentQuestion: number;
  interview: SectionInterview;
  mode: InterviewViewMode;
  revision: number;
  savedRevision: number;
  saveError: string | null;
  saveStatus: InterviewSaveStatus;
};
type GeneratedResult = {
  sectionId: string;
  points: string[];
  instruction: string;
};
type SectionDraftProposal = {
  sectionId: string;
  blocks: SectionContentBlock[];
};
type GenerationError = {
  message: string;
  retryable: boolean;
  instruction: string;
};

function StructuredBlocksPreview({
  blocks,
}: {
  blocks: readonly SectionContentBlock[];
}) {
  return (
    <div className={styles.interviewBlocks}>
      {blocks.map((block, blockIndex) => {
        if (block.type === "paragraph")
          return <p key={blockIndex}>{block.text}</p>;
        if (block.type === "subheading")
          return <h4 key={blockIndex}>{block.text}</h4>;
        const items = block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{item}</li>
        ));
        return block.type === "numbered_list" ? (
          <ol key={blockIndex}>{items}</ol>
        ) : (
          <ul key={blockIndex}>{items}</ul>
        );
      })}
    </div>
  );
}
const DRAFT_OUTLINE_DRAWER_ID = "draft-outline-drawer";
const DRAFT_ASSISTANT_ID = "draft-writing-assistant";
const articleIdSchema = z.string().uuid();
const INTERVIEW_AUTOSAVE_DELAY = 800;

function createInterviewView(interview: SectionInterview): InterviewViewState {
  const savedAnswers = new Map(
    interview.answers.map((answer) => [
      answer.question_id,
      answer.answer ?? "",
    ]),
  );
  return {
    active: true,
    answers: Object.fromEntries(
      interview.questions.map((question) => [
        question.id,
        savedAnswers.get(question.id) ?? "",
      ]),
    ),
    currentQuestion: 0,
    interview,
    mode:
      interview.status === "generated" && interview.generated_blocks
        ? "proposal"
        : "questions",
    revision: 0,
    savedRevision: 0,
    saveError: null,
    saveStatus: "idle",
  };
}

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
  expand: {
    title: "Expand idea",
    subtitle: "Develop the point further",
    icon: ArrowUpRight,
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
  tone: {
    title: "Change tone",
    subtitle: "Adjust how this sounds",
    icon: NotePencil,
  },
};

const suggestionVariants: Record<AssistantAction, readonly string[]> = {
  clearer: [
    "Great ideas are hard to capture because they begin as possibilities, not precise statements.",
    "Ideas often resist words because they first appear as possibilities rather than finished thoughts.",
  ],
  expand: [
    "Writing gives an unfinished thought room to develop: once the idea is visible, its assumptions, consequences, and connections become easier to explore.",
    "Putting the idea into words does more than preserve it. The page becomes a place to test the thought, follow its implications, and discover what it still needs.",
  ],
  example: [
    "For example, a founder may sense the shape of a new product long before they can explain why it matters.",
    "Think of the idea that arrives during a walk: vivid enough to feel important, but still too loose to present to someone else.",
  ],
  transition: [
    "That uncertainty is exactly why writing becomes the next essential step.",
    "Once the fragments are visible, structure can begin to turn them into an argument.",
  ],
  tone: [
    "The idea is there, but it is still moving—more possibility than precision, more spark than sentence.",
    "A good idea rarely arrives dressed for the page. It shows up unfinished and asks us to do the tailoring.",
  ],
};

const startModeCopy: Record<
  AssistantStartMode,
  { title: string; subtitle: string }
> = {
  plan: { title: "Help me plan", subtitle: "Create 3–5 talking points" },
  guided: {
    title: "Write with me",
    subtitle: "Answer a few questions, then build the section together",
  },
  draft: {
    title: "Draft this section",
    subtitle: "Generate a complete first draft",
  },
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
  articleId,
  identity = DEFAULT_AUTH_IDENTITY,
}: {
  articleId?: string;
  identity?: AuthIdentity;
}) {
  const { push } = useRouter();
  const validArticleId = articleIdSchema.safeParse(articleId);
  const savedArticleId = validArticleId.success ? validArticleId.data : null;
  const draftPath = savedArticleId
    ? `/articles/new/draft?articleId=${encodeURIComponent(savedArticleId)}`
    : "/articles/new/draft";
  const loginPath = `/login?next=${encodeURIComponent(draftPath)}`;
  const [draft, setDraft] = useState<DraftArticleState>(() =>
    createDefaultDraft(),
  );
  const [hydrated, setHydrated] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState("introduction");
  const [selectedText, setSelectedText] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [assistantAction, setAssistantAction] =
    useState<AssistantAction>("clearer");
  const [assistantInstruction, setAssistantInstruction] = useState("");
  const [assistantStartMode, setAssistantStartMode] =
    useState<AssistantStartMode>("plan");
  const [assistantDirection, setAssistantDirection] = useState("");
  const [interviewViews, setInterviewViews] = useState<
    Record<string, InterviewViewState>
  >({});
  const [interviewError, setInterviewError] = useState<string | null>(null);
  const [isLoadingInterview, setIsLoadingInterview] = useState(false);
  const [isGeneratingInterview, setIsGeneratingInterview] = useState(false);
  const [isApplyingInterview, setIsApplyingInterview] = useState(false);
  const [generatedResult, setGeneratedResult] =
    useState<GeneratedResult | null>(null);
  const [generationError, setGenerationError] =
    useState<GenerationError | null>(null);
  const [isGeneratingTalkingPoints, setIsGeneratingTalkingPoints] =
    useState(false);
  const [sectionDraftProposal, setSectionDraftProposal] =
    useState<SectionDraftProposal | null>(null);
  const [sectionDraftError, setSectionDraftError] =
    useState<GenerationError | null>(null);
  const [sectionDraftApplyError, setSectionDraftApplyError] = useState<
    string | null
  >(null);
  const [isGeneratingDraftSection, setIsGeneratingDraftSection] =
    useState(false);
  const [isApplyingDraftSection, setIsApplyingDraftSection] = useState(false);
  const [goalExpanded, setGoalExpanded] = useState(true);
  const [isAssistantOpen, setIsAssistantOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<MobileTab>("assistant");
  const [sheetCollapsed, setSheetCollapsed] = useState(false);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [newSectionGoal, setNewSectionGoal] = useState("");
  const [loadFailure, setLoadFailure] = useState<DraftLoadFailure | null>(
    validArticleId.success
      ? null
      : {
          kind: "missing-id",
          message: "Choose an article before opening the draft editor.",
          retryable: false,
        },
  );
  const [saveRetryable, setSaveRetryable] = useState(true);
  const [retryKey, setRetryKey] = useState(0);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOutlineExpanded, setIsOutlineExpanded] = useState(false);
  const editorsRef = useRef(new Map<string, LexicalEditor>());
  const activeEditorRef = useRef<LexicalEditor | null>(null);
  const activeSectionIdRef = useRef("introduction");
  const outlineExpandRef = useRef<HTMLButtonElement>(null);
  const outlineCloseRef = useRef<HTMLButtonElement>(null);
  const assistantOpenRef = useRef<HTMLButtonElement>(null);
  const assistantCloseRef = useRef<HTMLButtonElement>(null);
  const guidedAnswerRef = useRef<HTMLTextAreaElement>(null);
  const interviewViewsRef = useRef<Record<string, InterviewViewState>>({});
  const interviewSaveTimersRef = useRef(new Map<string, number>());
  const interviewSaveChainsRef = useRef(new Map<string, Promise<boolean>>());
  const flushInterviewAnswersRef = useRef<
    (sectionId: string) => Promise<boolean>
  >(async () => true);
  const dirtyRef = useRef(false);
  const skipNextAutosaveRef = useRef(true);
  const generationRequestRef = useRef(0);
  const sectionDraftRequestRef = useRef(0);
  const interviewRequestRef = useRef(0);

  const activeSection =
    draft.sections.find((section) => section.id === activeSectionId) ??
    draft.sections[0];
  const activeSectionNumber = activeSection
    ? draft.sections.findIndex((section) => section.id === activeSection.id) + 1
    : 0;
  const wordCount = useMemo(() => countDraftWords(draft), [draft]);
  const activeSectionIsEmpty = activeSection
    ? !editorStateText(activeSection.editorState).trim()
    : true;
  const activeInterviewView = activeSection
    ? interviewViews[activeSection.id]
    : undefined;

  const openOutline = useCallback(() => {
    setIsOutlineExpanded(true);
    window.setTimeout(() => outlineCloseRef.current?.focus(), 0);
  }, []);

  const closeOutline = useCallback(() => {
    setIsOutlineExpanded(false);
    window.setTimeout(() => outlineExpandRef.current?.focus(), 0);
  }, []);

  const closeAssistant = useCallback(() => {
    void flushInterviewAnswersRef.current(activeSectionIdRef.current);
    setIsAssistantOpen(false);
    window.setTimeout(() => assistantOpenRef.current?.focus(), 0);
  }, []);

  const openAssistant = useCallback(() => {
    setIsAssistantOpen(true);
    window.setTimeout(() => assistantCloseRef.current?.focus(), 0);
  }, []);

  const activateSection = useCallback((sectionId: string) => {
    if (activeSectionIdRef.current !== sectionId) {
      void flushInterviewAnswersRef.current(activeSectionIdRef.current);
      activeSectionIdRef.current = sectionId;
      setSelectedText("");
      setSuggestion(null);
      setGeneratedResult(null);
      setGenerationError(null);
      generationRequestRef.current += 1;
      setSectionDraftProposal(null);
      setSectionDraftError(null);
      setSectionDraftApplyError(null);
      sectionDraftRequestRef.current += 1;
      interviewRequestRef.current += 1;
      setIsGeneratingTalkingPoints(false);
      setIsGeneratingDraftSection(false);
      setIsApplyingDraftSection(false);
      setIsLoadingInterview(false);
      setIsGeneratingInterview(false);
      setInterviewError(null);
      setAssistantInstruction("");
      setAssistantDirection("");
      setGoalExpanded(true);
    }
    setActiveSectionId(sectionId);
  }, []);

  useEffect(() => {
    if (!isOutlineExpanded) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeOutline();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeOutline, isOutlineExpanded]);

  useEffect(() => {
    if (!isAssistantOpen || isOutlineExpanded) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      closeAssistant();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeAssistant, isAssistantOpen, isOutlineExpanded]);

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
    let active = true;
    const load = async () => {
      setHydrated(false);
      setLoadFailure(null);
      if (!savedArticleId) {
        setLoadFailure({
          kind: "missing-id",
          message: "Choose an article before opening the draft editor.",
          retryable: false,
        });
        setHydrated(true);
        return;
      }
      try {
        const article = await getArticle(savedArticleId);
        let persisted;
        try {
          persisted = await getArticleDraft(savedArticleId);
        } catch (caught) {
          if (
            caught instanceof ArticleRequestError &&
            caught.status === 404 &&
            caught.code === "draft_not_found"
          ) {
            persisted = await createArticleDraft(savedArticleId);
          } else {
            throw caught;
          }
        }
        if (!active) return;
        const next = toDraftArticleState(article, persisted);
        setDraft(next);
        const firstSectionId = next.sections[0]?.id ?? "";
        activeSectionIdRef.current = firstSectionId;
        setActiveSectionId(firstSectionId);
        setLastSavedAt(next.savedAt);
        skipNextAutosaveRef.current = true;
      } catch (caught) {
        if (!active) return;
        if (caught instanceof ArticleRequestError && caught.status === 401) {
          push(loginPath);
          return;
        }
        const code =
          caught instanceof ArticleRequestError ? caught.code : "draft_error";
        setLoadFailure({
          kind:
            code === "article_not_found"
              ? "not-found"
              : code === "outline_not_found"
                ? "missing-outline"
                : "error",
          message:
            code === "article_not_found"
              ? "This article could not be found."
              : code === "outline_not_found"
                ? "Create an outline before starting this draft."
                : caught instanceof ArticleRequestError
                  ? caught.message
                  : "We couldn’t load this draft. Please try again.",
          retryable:
            !(caught instanceof ArticleRequestError) ||
            [502, 503, 504].includes(caught.status),
        });
      } finally {
        if (active) setHydrated(true);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [loginPath, push, retryKey, savedArticleId]);

  const saveDraft = useCallback(
    async (nextStatus: SaveStatus = "saved", message = "") => {
      if (!savedArticleId) return false;
      setSaveStatus(nextStatus === "retrying" ? "retrying" : "saving");
      try {
        const saved = await updateArticleDraft(
          savedArticleId,
          toArticleDraftPatch(draft),
        );
        dirtyRef.current = false;
        setSaveRetryable(true);
        setLastSavedAt(saved.updated_at);
        setSaveStatus("saved");
        if (message) setStatusMessage(message);
        return true;
      } catch (caught) {
        if (caught instanceof ArticleRequestError && caught.status === 401) {
          push(loginPath);
          return false;
        }
        setSaveRetryable(
          !(caught instanceof ArticleRequestError) ||
            [502, 503, 504].includes(caught.status),
        );
        setSaveStatus("failed");
        setStatusMessage(
          caught instanceof ArticleRequestError && caught.status === 422
            ? caught.message
            : "Autosave failed. Your changes are still open.",
        );
        return false;
      }
    },
    [draft, loginPath, push, savedArticleId],
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
    const timer = window.setTimeout(() => void saveDraft(), 800);
    return () => {
      window.clearTimeout(statusTimer);
      window.clearTimeout(timer);
    };
  }, [draft, hydrated, saveDraft]);

  useEffect(() => {
    const onOffline = () => setSaveStatus("offline");
    const onOnline = () => {
      setSaveStatus("retrying");
      window.setTimeout(() => void saveDraft("retrying"), 350);
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

  useEffect(
    () => () => {
      interviewSaveTimersRef.current.forEach((timer) =>
        window.clearTimeout(timer),
      );
      interviewSaveTimersRef.current.clear();
    },
    [],
  );

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

  const focusSection = useCallback(
    (sectionId: string) => {
      activateSection(sectionId);
      activeEditorRef.current = editorsRef.current.get(sectionId) ?? null;
      document
        .getElementById(`draft-section-${sectionId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [activateSection],
  );

  const onEditorSelection = useCallback((sectionId: string, text: string) => {
    if (sectionId !== activeSectionIdRef.current) return;
    setSelectedText(text.trim());
  }, []);

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

  const updateActiveSectionGoal = (goal: string) => {
    setDraft((current) => ({
      ...current,
      sections: current.sections.map((section) =>
        section.id === activeSectionId ? { ...section, goal } : section,
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
    const goal = newSectionGoal.trim();
    if (!title || !goal) return;
    const id = crypto.randomUUID();
    const section: DraftSection = {
      id,
      outlineSectionId: null,
      title,
      goal,
      checklist: [
        {
          id: crypto.randomUUID(),
          label: "Make the central point clear",
          completed: false,
        },
        {
          id: crypto.randomUUID(),
          label: "Add a supporting example",
          completed: false,
        },
        {
          id: crypto.randomUUID(),
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
    setNewSectionGoal("");
    setAddSectionOpen(false);
    window.setTimeout(() => focusSection(id), 0);
  };

  const previewSuggestion = () => {
    if (!selectedText.trim()) return;
    const next = createSuggestion(assistantAction, selectedText);
    setSuggestion({
      ...next,
      explanation: assistantInstruction.trim() || next.explanation,
    });
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

  const requestTalkingPoints = async (instruction = assistantDirection) => {
    if (!activeSection || !savedArticleId || isGeneratingTalkingPoints) return;
    const requestedSectionId = activeSection.id;
    const normalizedInstruction = instruction.trim();
    const requestId = generationRequestRef.current + 1;
    generationRequestRef.current = requestId;
    setIsGeneratingTalkingPoints(true);
    setGenerationError(null);

    if (dirtyRef.current && !(await saveDraft())) {
      if (generationRequestRef.current === requestId) {
        setGenerationError({
          message: "Save your latest changes before generating talking points.",
          retryable: true,
          instruction: normalizedInstruction,
        });
        setIsGeneratingTalkingPoints(false);
      }
      return;
    }
    if (generationRequestRef.current !== requestId) return;

    try {
      const result = await generateTalkingPoints(
        savedArticleId,
        requestedSectionId,
        normalizedInstruction ? { instruction: normalizedInstruction } : {},
      );
      if (generationRequestRef.current !== requestId) return;
      if (result.section_id !== requestedSectionId)
        throw new ArticleRequestError(
          502,
          "invalid_article_response",
          "The talking-point response did not match this section.",
        );
      setGeneratedResult({
        sectionId: result.section_id,
        points: result.points,
        instruction: normalizedInstruction,
      });
      setGoalExpanded(false);
    } catch (caught) {
      if (generationRequestRef.current !== requestId) return;
      if (caught instanceof ArticleRequestError && caught.status === 401) {
        push(loginPath);
        return;
      }
      setGenerationError({
        message:
          caught instanceof ArticleRequestError
            ? caught.message
            : "We couldn’t generate talking points. Please try again.",
        retryable:
          !(caught instanceof ArticleRequestError) ||
          [502, 503, 504].includes(caught.status),
        instruction: normalizedInstruction,
      });
    } finally {
      if (generationRequestRef.current === requestId)
        setIsGeneratingTalkingPoints(false);
    }
  };

  const requestDraftSection = async (instruction = assistantDirection) => {
    if (!activeSection || !savedArticleId || isGeneratingDraftSection) return;
    const requestedSectionId = activeSection.id;
    const normalizedInstruction = instruction.trim();
    const requestId = sectionDraftRequestRef.current + 1;
    sectionDraftRequestRef.current = requestId;
    setIsGeneratingDraftSection(true);
    setSectionDraftError(null);
    setSectionDraftApplyError(null);

    if (dirtyRef.current && !(await saveDraft())) {
      if (sectionDraftRequestRef.current === requestId) {
        setSectionDraftError({
          message: "Save your latest changes before drafting this section.",
          retryable: true,
          instruction: normalizedInstruction,
        });
        setIsGeneratingDraftSection(false);
      }
      return;
    }
    if (sectionDraftRequestRef.current !== requestId) return;

    try {
      const result = await generateDraftSection(
        savedArticleId,
        requestedSectionId,
        normalizedInstruction ? { instruction: normalizedInstruction } : {},
      );
      if (sectionDraftRequestRef.current !== requestId) return;
      if (result.section_id !== requestedSectionId)
        throw new ArticleRequestError(
          502,
          "invalid_article_response",
          "The generated draft did not match this section.",
        );
      setSectionDraftProposal({
        sectionId: result.section_id,
        blocks: result.blocks,
      });
      setGoalExpanded(false);
    } catch (caught) {
      if (sectionDraftRequestRef.current !== requestId) return;
      if (caught instanceof ArticleRequestError && caught.status === 401) {
        push(loginPath);
        return;
      }
      setSectionDraftError({
        message:
          caught instanceof ArticleRequestError
            ? caught.message
            : "We couldn’t draft this section. Please try again.",
        retryable:
          !(caught instanceof ArticleRequestError) ||
          [502, 503, 504].includes(caught.status),
        instruction: normalizedInstruction,
      });
    } finally {
      if (sectionDraftRequestRef.current === requestId)
        setIsGeneratingDraftSection(false);
    }
  };

  const applyDraftSectionProposal = async () => {
    if (
      !activeSection ||
      !savedArticleId ||
      !sectionDraftProposal ||
      sectionDraftProposal.sectionId !== activeSection.id ||
      isApplyingDraftSection
    )
      return;
    const editorState = createEditorStateFromBlocks(
      sectionDraftProposal.blocks,
    );
    const nextDraft: DraftArticleState = {
      ...draft,
      sections: draft.sections.map((section) =>
        section.id === activeSection.id ? { ...section, editorState } : section,
      ),
    };
    setSectionDraftApplyError(null);
    setIsApplyingDraftSection(true);
    try {
      const saved = await updateArticleDraft(
        savedArticleId,
        toArticleDraftPatch(nextDraft),
      );
      skipNextAutosaveRef.current = true;
      dirtyRef.current = false;
      setDraft({ ...nextDraft, savedAt: saved.updated_at });
      setLastSavedAt(saved.updated_at);
      setSaveStatus("saved");
      const editor = editorsRef.current.get(activeSection.id);
      if (editor) editor.setEditorState(editor.parseEditorState(editorState));
      setSectionDraftProposal(null);
      setSectionDraftError(null);
      setStatusMessage("The generated draft replaced this section.");
      setGoalExpanded(true);
    } catch (caught) {
      if (caught instanceof ArticleRequestError && caught.status === 401) {
        push(loginPath);
        return;
      }
      setSectionDraftApplyError(
        caught instanceof ArticleRequestError
          ? caught.message
          : "We couldn’t save the generated draft. Please try again.",
      );
    } finally {
      setIsApplyingDraftSection(false);
    }
  };

  const setInterviewView = useCallback(
    (
      sectionId: string,
      update: (view: InterviewViewState) => InterviewViewState,
    ) => {
      const current = interviewViewsRef.current[sectionId];
      if (!current) return;
      const next = {
        ...interviewViewsRef.current,
        [sectionId]: update(current),
      };
      interviewViewsRef.current = next;
      setInterviewViews(next);
    },
    [],
  );

  const storeInterview = useCallback((interview: SectionInterview) => {
    const next = {
      ...interviewViewsRef.current,
      [interview.section_id]: createInterviewView(interview),
    };
    interviewViewsRef.current = next;
    setInterviewViews(next);
  }, []);

  const flushInterviewAnswers = useCallback(
    async (sectionId: string) => {
      const timer = interviewSaveTimersRef.current.get(sectionId);
      if (timer) {
        window.clearTimeout(timer);
        interviewSaveTimersRef.current.delete(sectionId);
      }
      if (!savedArticleId) return false;

      const previous = interviewSaveChainsRef.current.get(sectionId);
      const save = (previous ?? Promise.resolve(true)).then(async () => {
        const view = interviewViewsRef.current[sectionId];
        if (!view || view.revision === view.savedRevision) return true;
        const revision = view.revision;
        const answers: SectionAnswer[] = view.interview.questions.map(
          (question) => ({
            question_id: question.id,
            answer: view.answers[question.id]?.trim() || null,
          }),
        );
        setInterviewView(sectionId, (current) => ({
          ...current,
          saveError: null,
          saveStatus: "saving",
        }));
        try {
          const interview = await replaceSectionInterviewAnswers(
            savedArticleId,
            sectionId,
            view.interview.id,
            { answers },
          );
          setInterviewView(sectionId, (current) => ({
            ...current,
            interview,
            savedRevision: Math.max(current.savedRevision, revision),
            saveError: null,
            saveStatus:
              current.revision > revision ? "idle" : ("saved" as const),
          }));
          return true;
        } catch (caught) {
          if (caught instanceof ArticleRequestError && caught.status === 401) {
            push(loginPath);
            return false;
          }
          setInterviewView(sectionId, (current) => ({
            ...current,
            saveError:
              caught instanceof ArticleRequestError
                ? caught.message
                : "We couldn’t save your answers. Please try again.",
            saveStatus: "failed",
          }));
          return false;
        }
      });
      interviewSaveChainsRef.current.set(sectionId, save);
      return save;
    },
    [loginPath, push, savedArticleId, setInterviewView],
  );

  flushInterviewAnswersRef.current = flushInterviewAnswers;

  const scheduleInterviewSave = useCallback(
    (sectionId: string) => {
      const existing = interviewSaveTimersRef.current.get(sectionId);
      if (existing) window.clearTimeout(existing);
      interviewSaveTimersRef.current.set(
        sectionId,
        window.setTimeout(() => {
          interviewSaveTimersRef.current.delete(sectionId);
          void flushInterviewAnswers(sectionId);
        }, INTERVIEW_AUTOSAVE_DELAY),
      );
    },
    [flushInterviewAnswers],
  );

  const focusGuidedAnswer = () => {
    window.setTimeout(() => guidedAnswerRef.current?.focus(), 0);
  };

  const createNewInterview = async (sectionId: string) => {
    if (!savedArticleId || isLoadingInterview) return;
    if (
      interviewViewsRef.current[sectionId] &&
      !(await flushInterviewAnswers(sectionId))
    )
      return;
    const requestId = interviewRequestRef.current + 1;
    interviewRequestRef.current = requestId;
    setInterviewError(null);
    setIsLoadingInterview(true);
    try {
      const interview = await createSectionInterview(savedArticleId, sectionId);
      if (interviewRequestRef.current !== requestId) return;
      storeInterview(interview);
      setGoalExpanded(false);
      focusGuidedAnswer();
    } catch (caught) {
      if (interviewRequestRef.current !== requestId) return;
      if (caught instanceof ArticleRequestError && caught.status === 401) {
        push(loginPath);
        return;
      }
      setInterviewError(
        caught instanceof ArticleRequestError
          ? caught.message
          : "We couldn’t start the interview. Please try again.",
      );
    } finally {
      if (interviewRequestRef.current === requestId)
        setIsLoadingInterview(false);
    }
  };

  const beginAssistantStart = async () => {
    if (assistantStartMode === "guided") {
      if (!activeSection || !savedArticleId || isLoadingInterview) return;
      const existingView = interviewViewsRef.current[activeSection.id];
      if (existingView) {
        setInterviewView(activeSection.id, (view) => ({
          ...view,
          active: true,
        }));
        setGoalExpanded(false);
        focusGuidedAnswer();
        return;
      }

      const requestedSectionId = activeSection.id;
      const requestId = interviewRequestRef.current + 1;
      interviewRequestRef.current = requestId;
      setInterviewError(null);
      setIsLoadingInterview(true);
      try {
        const interview = await getLatestSectionInterview(
          savedArticleId,
          requestedSectionId,
        );
        if (interviewRequestRef.current !== requestId) return;
        storeInterview(interview);
        setGoalExpanded(false);
        focusGuidedAnswer();
      } catch (caught) {
        if (interviewRequestRef.current !== requestId) return;
        if (caught instanceof ArticleRequestError && caught.status === 401) {
          push(loginPath);
          return;
        }
        if (
          caught instanceof ArticleRequestError &&
          caught.status === 404 &&
          caught.code === "section_interview_not_found"
        ) {
          setIsLoadingInterview(false);
          await createNewInterview(requestedSectionId);
          return;
        }
        setInterviewError(
          caught instanceof ArticleRequestError
            ? caught.message
            : "We couldn’t load the interview. Please try again.",
        );
      } finally {
        if (interviewRequestRef.current === requestId)
          setIsLoadingInterview(false);
      }
      return;
    }
    if (assistantStartMode === "draft") {
      void requestDraftSection();
      return;
    }
    void requestTalkingPoints();
  };

  const moveGuidedQuestion = async (direction: -1 | 1) => {
    if (!activeSection || !(await flushInterviewAnswers(activeSection.id)))
      return;
    setInterviewView(activeSection.id, (view) => ({
      ...view,
      currentQuestion: Math.min(
        view.interview.questions.length - 1,
        Math.max(0, view.currentQuestion + direction),
      ),
      mode: "questions",
    }));
    focusGuidedAnswer();
  };

  const continueGuidedSession = async () => {
    if (!activeSection || !activeInterviewView) return;
    if (!(await flushInterviewAnswers(activeSection.id))) return;
    if (
      activeInterviewView.currentQuestion ===
      activeInterviewView.interview.questions.length - 1
    ) {
      setInterviewView(activeSection.id, (view) => ({
        ...view,
        mode: "complete",
      }));
      return;
    }
    setInterviewView(activeSection.id, (view) => ({
      ...view,
      currentQuestion: view.currentQuestion + 1,
      mode: "questions",
    }));
    focusGuidedAnswer();
  };

  const exitGuidedSession = async () => {
    if (!activeSection || !(await flushInterviewAnswers(activeSection.id)))
      return;
    setInterviewView(activeSection.id, (view) => ({ ...view, active: false }));
    setGoalExpanded(true);
  };

  const generateInterviewProposal = async () => {
    if (
      !activeSection ||
      !activeInterviewView ||
      !savedArticleId ||
      isGeneratingInterview
    )
      return;
    if (!(await flushInterviewAnswers(activeSection.id))) return;
    setInterviewError(null);
    setIsGeneratingInterview(true);
    try {
      const interview = await generateSectionInterview(
        savedArticleId,
        activeSection.id,
        activeInterviewView.interview.id,
      );
      setInterviewView(activeSection.id, (view) => ({
        ...view,
        interview,
        mode: "proposal",
      }));
    } catch (caught) {
      if (caught instanceof ArticleRequestError && caught.status === 401) {
        push(loginPath);
        return;
      }
      if (
        caught instanceof ArticleRequestError &&
        caught.code === "section_interview_stale"
      ) {
        setInterviewView(activeSection.id, (view) => ({
          ...view,
          interview: { ...view.interview, is_stale: true },
        }));
      }
      setInterviewError(
        caught instanceof ArticleRequestError
          ? caught.message
          : "We couldn’t generate the proposal. Please try again.",
      );
    } finally {
      setIsGeneratingInterview(false);
    }
  };

  const applyInterviewProposal = async () => {
    const blocks = activeInterviewView?.interview.generated_blocks;
    if (
      !activeSection ||
      !activeInterviewView ||
      !savedArticleId ||
      !blocks ||
      isApplyingInterview
    )
      return;
    const editorState = createEditorStateFromBlocks(blocks);
    const nextDraft: DraftArticleState = {
      ...draft,
      sections: draft.sections.map((section) =>
        section.id === activeSection.id ? { ...section, editorState } : section,
      ),
    };
    setInterviewError(null);
    setIsApplyingInterview(true);
    try {
      const saved = await updateArticleDraft(
        savedArticleId,
        toArticleDraftPatch(nextDraft),
      );
      skipNextAutosaveRef.current = true;
      dirtyRef.current = false;
      setDraft({ ...nextDraft, savedAt: saved.updated_at });
      setLastSavedAt(saved.updated_at);
      setSaveStatus("saved");
      const editor = editorsRef.current.get(activeSection.id);
      if (editor) editor.setEditorState(editor.parseEditorState(editorState));
      setInterviewView(activeSection.id, (view) => ({
        ...view,
        active: false,
      }));
      setStatusMessage("The interview proposal replaced this section.");
      setGoalExpanded(true);
    } catch (caught) {
      if (caught instanceof ArticleRequestError && caught.status === 401) {
        push(loginPath);
        return;
      }
      setInterviewError(
        caught instanceof ArticleRequestError
          ? caught.message
          : "We couldn’t save the proposal. Please try again.",
      );
    } finally {
      setIsApplyingInterview(false);
    }
  };

  const applyGeneratedResult = (replace: boolean) => {
    if (!generatedResult || generatedResult.sectionId !== activeSectionId)
      return;
    const editor = editorsRef.current.get(activeSectionId);
    if (!editor) return;
    editor.update(() => {
      const root = $getRoot();
      if (replace) root.clear();
      const list = $createListNode("bullet");
      generatedResult.points.forEach((text) => {
        const item = $createListItemNode();
        item.append($createTextNode(text));
        list.append(item);
      });
      root.append(list);
    });
    setGeneratedResult(null);
    setGenerationError(null);
    setStatusMessage(
      replace
        ? "The generated content replaced this section."
        : "The generated content was inserted into this section.",
    );
  };

  const retryGeneratedResult = () => {
    if (!generatedResult) return;
    void requestTalkingPoints(generatedResult.instruction);
  };

  const refineGeneratedResult = () => {
    if (!generatedResult) return;
    void requestTalkingPoints(assistantDirection);
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

  const reviewArticle = async () => {
    if (!(await flushInterviewAnswers(activeSectionIdRef.current))) return;
    if (await saveDraft("saved", "Draft saved and ready for review.")) {
      setStatusMessage("Draft saved and ready for review.");
      push(`/articles/new/review?articleId=${articleId}`);
    }
  };

  const openPreview = async () => {
    if (!(await flushInterviewAnswers(activeSectionIdRef.current))) return;
    setPreviewOpen(true);
  };

  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "offline"
        ? "Offline — changes not yet saved"
        : saveStatus === "failed"
          ? "Autosave failed"
          : saveStatus === "retrying"
            ? "Retrying save…"
            : elapsedLabel(lastSavedAt);

  const renderOutline = (mobile = false, drawer = false) => (
    <div className={styles.outlineContent}>
      <div className={styles.outlineHeading}>
        <span>
          <ListBullets size={22} aria-hidden /> Outline
        </span>
        <div className={styles.outlineHeadingActions}>
          {drawer ? (
            <button
              aria-controls={DRAFT_OUTLINE_DRAWER_ID}
              aria-expanded={isOutlineExpanded}
              aria-label="Collapse draft outline"
              onClick={closeOutline}
              ref={outlineCloseRef}
              type="button"
            >
              <CaretLeft size={18} aria-hidden />
            </button>
          ) : null}
          <button
            aria-label="Add section"
            onClick={() => setAddSectionOpen(true)}
            type="button"
          >
            <Plus size={21} aria-hidden />
          </button>
        </div>
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

  const renderCompactOutline = () => (
    <>
      <button
        aria-controls={DRAFT_OUTLINE_DRAWER_ID}
        aria-expanded={isOutlineExpanded}
        aria-label="Expand draft outline"
        className={styles.outlineExpandButton}
        onClick={openOutline}
        ref={outlineExpandRef}
        type="button"
      >
        <ListBullets size={21} aria-hidden />
        <CaretRight size={15} aria-hidden />
      </button>
      <ol className={styles.compactOutlineList}>
        {draft.sections.map((section, index) => {
          const isActive = section.id === activeSectionId;
          return (
            <li key={section.id}>
              <button
                aria-current={isActive ? "location" : undefined}
                aria-label={`Go to ${section.title}`}
                className={isActive ? styles.activeOutlineMarker : ""}
                onClick={() => focusSection(section.id)}
                title={section.title}
                type="button"
              >
                {index + 1}
              </button>
            </li>
          );
        })}
      </ol>
    </>
  );

  const renderGoal = (surface: "desktop" | "mobile", editable = false) => (
    <section className={styles.goalSection}>
      <button
        aria-expanded={goalExpanded}
        className={styles.goalHeader}
        onClick={() => setGoalExpanded((current) => !current)}
        type="button"
      >
        <span>Section goal</span>
        {goalExpanded ? (
          <CaretUp size={18} aria-hidden />
        ) : (
          <CaretRight size={18} aria-hidden />
        )}
      </button>
      {goalExpanded ? (
        editable && !activeSection?.outlineSectionId ? (
          <label className={styles.goalEditor}>
            <span className={styles.srStatus}>Edit section goal</span>
            <textarea
              aria-label={`Edit ${activeSection?.title ?? "section"} goal`}
              onChange={(event) => updateActiveSectionGoal(event.target.value)}
              value={activeSection?.goal ?? ""}
            />
            <PencilSimple size={19} aria-hidden />
          </label>
        ) : (
          <p className={styles.goalCopy}>{activeSection?.goal}</p>
        )
      ) : null}
      {(!editable || Boolean(activeSection?.outlineSectionId)) &&
      goalExpanded ? (
        <div className={styles.checklist} aria-label="Goal progress">
          <span className={styles.checklistTitle}>Goal progress</span>
          {activeSection?.checklist.map((item) => (
            <Checkbox
              checked={item.completed}
              id={`${surface}-${item.id}`}
              key={item.id}
              label={item.label}
              onChange={(event) =>
                toggleChecklist(item.id, event.target.checked)
              }
            />
          ))}
        </div>
      ) : null}
    </section>
  );

  const renderAssistantSectionContext = () => {
    if (!activeSection || activeSectionNumber < 1) return null;
    return (
      <div
        aria-label={`Current section: Section ${activeSectionNumber}, ${activeSection.title}`}
        className={styles.assistantSectionContext}
        title={`Section ${activeSectionNumber}: ${activeSection.title}`}
      >
        <span>Section {activeSectionNumber}</span>
        <span aria-hidden>·</span>
        <strong>{activeSection.title}</strong>
      </div>
    );
  };

  const renderGenerationError = () =>
    generationError ? (
      <div className={styles.generationError} role="alert">
        <span>{generationError.message}</span>
        {generationError.retryable ? (
          <button
            disabled={isGeneratingTalkingPoints}
            onClick={() =>
              void requestTalkingPoints(generationError.instruction)
            }
            type="button"
          >
            Try again
          </button>
        ) : null}
      </div>
    ) : null;

  const renderSectionDraftError = () =>
    sectionDraftError ? (
      <div className={styles.generationError} role="alert">
        <span>{sectionDraftError.message}</span>
        {sectionDraftError.retryable ? (
          <button
            disabled={isGeneratingDraftSection}
            onClick={() =>
              void requestDraftSection(sectionDraftError.instruction)
            }
            type="button"
          >
            Try again
          </button>
        ) : null}
      </div>
    ) : null;

  const renderSectionDraftAssistant = (surface: "desktop" | "mobile") => {
    if (!sectionDraftProposal) return null;
    const generatedWords = sectionDraftProposal.blocks.reduce(
      (count, block) => {
        const text = "text" in block ? block.text : block.items.join(" ");
        const words = text.trim() ? text.trim().split(/\s+/u).length : 0;
        return count + words;
      },
      0,
    );
    return (
      <div className={styles.assistantContent}>
        {renderAssistantSectionContext()}
        <div className={styles.readyStatus} role="status">
          <CheckCircle size={23} weight="bold" aria-hidden />
          <span>Section draft ready</span>
        </div>
        {renderGoal(surface)}
        {renderSectionDraftError()}
        <section
          aria-labelledby="section-draft-proposal-title"
          className={styles.interviewProposal}
        >
          <h3 id="section-draft-proposal-title">Review the proposed section</h3>
          <p>Nothing changes until you replace the section.</p>
          <StructuredBlocksPreview blocks={sectionDraftProposal.blocks} />
          {sectionDraftApplyError ? (
            <div className={styles.generationError} role="alert">
              <span>{sectionDraftApplyError}</span>
            </div>
          ) : null}
          <button
            className={styles.primaryAssistantButton}
            disabled={isApplyingDraftSection || isGeneratingDraftSection}
            onClick={() => void applyDraftSectionProposal()}
            type="button"
          >
            {isApplyingDraftSection ? "Saving section…" : "Replace section"}
          </button>
          <label className={styles.refineField}>
            <span>Direction for another draft</span>
            <textarea
              disabled={isApplyingDraftSection || isGeneratingDraftSection}
              maxLength={1000}
              onChange={(event) => setAssistantDirection(event.target.value)}
              placeholder="Make it more practical and conversational"
              value={assistantDirection}
            />
          </label>
          <button
            className={styles.secondaryAssistantButton}
            disabled={isApplyingDraftSection || isGeneratingDraftSection}
            onClick={() => void requestDraftSection()}
            type="button"
          >
            {isGeneratingDraftSection ? "Generating…" : "Generate another"}
          </button>
          <button
            className={styles.assistantTextButton}
            disabled={isApplyingDraftSection || isGeneratingDraftSection}
            onClick={() => {
              setSectionDraftProposal(null);
              setSectionDraftError(null);
              setSectionDraftApplyError(null);
            }}
            type="button"
          >
            Discard
          </button>
          <p className={styles.resultMeta}>
            About {generatedWords} words · {sectionDraftProposal.blocks.length}{" "}
            blocks
          </p>
        </section>
      </div>
    );
  };

  const renderGeneratedAssistant = (surface: "desktop" | "mobile") => {
    if (!generatedResult) return null;
    const generatedWords = generatedResult.points
      .join(" ")
      .trim()
      .split(/\s+/u).length;
    return (
      <div className={styles.assistantContent}>
        {renderAssistantSectionContext()}
        <div className={styles.readyStatus} role="status">
          <CheckCircle size={23} weight="bold" aria-hidden />
          <span>Talking points ready</span>
        </div>
        {renderGoal(surface)}
        {renderGenerationError()}
        <section className={styles.reviewDraft}>
          <h3>Review these talking points</h3>
          <p>Nothing changes until you insert or replace the section.</p>
          <button
            className={styles.primaryAssistantButton}
            disabled={isGeneratingTalkingPoints}
            onClick={() => applyGeneratedResult(false)}
            type="button"
          >
            Insert talking points
          </button>
          <button
            className={styles.secondaryAssistantButton}
            disabled={isGeneratingTalkingPoints}
            onClick={() => applyGeneratedResult(true)}
            type="button"
          >
            Replace current section
          </button>
          <div className={styles.generatedUtilities}>
            <button
              disabled={isGeneratingTalkingPoints}
              onClick={retryGeneratedResult}
              type="button"
            >
              <ArrowClockwise size={20} aria-hidden />
              {isGeneratingTalkingPoints ? "Generating…" : "Try another"}
            </button>
            <button
              disabled={isGeneratingTalkingPoints}
              onClick={() => {
                setGeneratedResult(null);
                setGenerationError(null);
              }}
              type="button"
            >
              <Trash size={20} aria-hidden /> Discard
            </button>
          </div>
          <label className={styles.refineField}>
            <span>Refine before inserting</span>
            <textarea
              maxLength={1000}
              onChange={(event) => setAssistantDirection(event.target.value)}
              placeholder="Make it more practical and add a software example"
              value={assistantDirection}
            />
          </label>
          <button
            className={styles.secondaryAssistantButton}
            disabled={isGeneratingTalkingPoints || !assistantDirection.trim()}
            onClick={refineGeneratedResult}
            type="button"
          >
            Regenerate with direction
          </button>
          <p className={styles.resultMeta}>
            About {generatedWords} words · {generatedResult.points.length}{" "}
            points
          </p>
        </section>
      </div>
    );
  };

  const renderGuidedAssistant = () => {
    if (!activeInterviewView || !activeSection) return null;
    const questionIndex = activeInterviewView.currentQuestion;
    const questions = activeInterviewView.interview.questions;
    const question = questions[questionIndex];
    const questionCount = questions.length;
    const progress = ((questionIndex + 1) / questionCount) * 100;
    const hasSubstantiveAnswer = Object.values(
      activeInterviewView.answers,
    ).some((answer) => answer.trim());
    const blocks = activeInterviewView.interview.generated_blocks;
    const saveLabel =
      activeInterviewView.saveStatus === "saving"
        ? "Saving answers…"
        : activeInterviewView.saveStatus === "saved"
          ? "Answers saved"
          : activeInterviewView.saveStatus === "failed"
            ? "Answers not saved"
            : "";

    return (
      <div className={styles.assistantContent}>
        {renderAssistantSectionContext()}
        <p className={styles.guidedGoal}>{activeSection.goal}</p>
        <div className={styles.guidedHeader}>
          <span>Write with me</span>
          <button onClick={() => void exitGuidedSession()} type="button">
            Exit <X size={19} aria-hidden />
          </button>
        </div>
        {activeInterviewView.interview.is_stale ? (
          <div className={styles.interviewWarning} role="alert">
            <p>
              This interview uses older article context. Your answers are safe,
              but a new interview is required before generating.
            </p>
            <button
              disabled={isLoadingInterview}
              onClick={() => void createNewInterview(activeSection.id)}
              type="button"
            >
              {isLoadingInterview ? "Starting…" : "Start new interview"}
            </button>
          </div>
        ) : null}
        {interviewError ? (
          <div className={styles.generationError} role="alert">
            <span>{interviewError}</span>
          </div>
        ) : null}
        {activeInterviewView.mode === "proposal" && blocks ? (
          <section
            aria-labelledby="interview-proposal-title"
            className={styles.interviewProposal}
          >
            <div className={styles.readyStatus} role="status">
              <CheckCircle size={23} weight="bold" aria-hidden />
              <span>Section proposal ready</span>
            </div>
            <h3 id="interview-proposal-title">Review the proposed section</h3>
            <p>Nothing changes until you accept this proposal.</p>
            <StructuredBlocksPreview blocks={blocks} />
            <button
              className={styles.primaryAssistantButton}
              disabled={isApplyingInterview}
              onClick={() => void applyInterviewProposal()}
              type="button"
            >
              {isApplyingInterview ? "Saving section…" : "Replace section"}
            </button>
            <button
              className={styles.secondaryAssistantButton}
              disabled={
                isGeneratingInterview || activeInterviewView.interview.is_stale
              }
              onClick={() => void generateInterviewProposal()}
              type="button"
            >
              {isGeneratingInterview ? "Generating…" : "Generate another"}
            </button>
            <button
              className={styles.assistantTextButton}
              onClick={() => {
                setInterviewView(activeSection.id, (view) => ({
                  ...view,
                  mode: "questions",
                }));
                focusGuidedAnswer();
              }}
              type="button"
            >
              Back to answers
            </button>
          </section>
        ) : activeInterviewView.mode === "complete" ? (
          <section
            aria-labelledby="guided-complete-title"
            className={styles.guidedComplete}
          >
            <CheckCircle size={34} weight="bold" aria-hidden />
            <h3 id="guided-complete-title">Your answers are ready</h3>
            <p>
              Generate a proposed replacement for this section, or go back to
              refine your answers.
            </p>
            <button
              className={styles.primaryAssistantButton}
              disabled={
                !hasSubstantiveAnswer ||
                activeInterviewView.interview.is_stale ||
                isGeneratingInterview
              }
              onClick={() => void generateInterviewProposal()}
              type="button"
            >
              {isGeneratingInterview ? "Generating…" : "Generate proposal"}
            </button>
            {!hasSubstantiveAnswer ? (
              <p className={styles.guidedHint}>
                Answer at least one question to generate a proposal.
              </p>
            ) : null}
            <button
              className={styles.assistantTextButton}
              onClick={() => {
                setInterviewView(activeSection.id, (view) => ({
                  ...view,
                  mode: "questions",
                }));
                focusGuidedAnswer();
              }}
              type="button"
            >
              Back to questions
            </button>
          </section>
        ) : (
          <section
            aria-labelledby="guided-question-title"
            className={styles.guidedQuestion}
          >
            <div className={styles.guidedProgressRow}>
              <span>
                Question {questionIndex + 1} of {questionCount}
              </span>
              <div className={styles.guidedNavigation}>
                <button
                  aria-label="Previous question"
                  disabled={questionIndex === 0}
                  onClick={() => void moveGuidedQuestion(-1)}
                  type="button"
                >
                  <ArrowLeft size={19} aria-hidden />
                </button>
                <button
                  aria-label="Next question"
                  disabled={questionIndex === questionCount - 1}
                  onClick={() => void moveGuidedQuestion(1)}
                  type="button"
                >
                  <ArrowRight size={19} aria-hidden />
                </button>
              </div>
            </div>
            <div
              aria-label={`Question ${questionIndex + 1} progress`}
              aria-valuemax={questionCount}
              aria-valuemin={1}
              aria-valuenow={questionIndex + 1}
              className={styles.guidedProgressTrack}
              role="progressbar"
            >
              <span style={{ width: `${progress}%` }} />
            </div>
            <h3 id="guided-question-title">{question.question}</h3>
            <textarea
              aria-labelledby="guided-question-title"
              maxLength={10_000}
              onChange={(event) => {
                const answer = event.target.value;
                setInterviewView(activeSection.id, (view) => ({
                  ...view,
                  answers: { ...view.answers, [question.id]: answer },
                  mode: "questions",
                  revision: view.revision + 1,
                  saveError: null,
                  saveStatus: "idle",
                }));
                scheduleInterviewSave(activeSection.id);
              }}
              onBlur={() => void flushInterviewAnswers(activeSection.id)}
              placeholder="Write your answer here…"
              ref={guidedAnswerRef}
              value={activeInterviewView.answers[question.id] ?? ""}
            />
            <p className={styles.guidedHint}>{question.answer_guidance}</p>
            {saveLabel ? (
              <p className={styles.interviewSaveStatus} role="status">
                {saveLabel}
              </p>
            ) : null}
            {activeInterviewView.saveError ? (
              <div className={styles.generationError} role="alert">
                <span>{activeInterviewView.saveError}</span>
                <button
                  onClick={() => void flushInterviewAnswers(activeSection.id)}
                  type="button"
                >
                  Try again
                </button>
              </div>
            ) : null}
            <div className={styles.guidedActions}>
              <button
                onClick={() => void continueGuidedSession()}
                type="button"
              >
                Skip
              </button>
              <button
                className={styles.primaryAssistantButton}
                onClick={() => void continueGuidedSession()}
                type="button"
              >
                Continue
              </button>
            </div>
          </section>
        )}
      </div>
    );
  };

  const renderStartAssistant = (surface: "desktop" | "mobile") => (
    <div className={styles.assistantContent}>
      {renderAssistantSectionContext()}
      {renderGoal(surface, true)}
      <fieldset className={styles.startChoices}>
        <legend>How would you like to start?</legend>
        {(Object.keys(startModeCopy) as AssistantStartMode[]).map((mode) => {
          return (
            <label
              className={
                assistantStartMode === mode ? styles.selectedChoice : ""
              }
              key={mode}
            >
              <input
                checked={assistantStartMode === mode}
                name={`${surface}-assistant-start`}
                onChange={() => setAssistantStartMode(mode)}
                type="radio"
                value={mode}
              />
              <span>
                <strong>{startModeCopy[mode].title}</strong>
                <small>{startModeCopy[mode].subtitle}</small>
              </span>
            </label>
          );
        })}
      </fieldset>
      <label className={styles.directionField}>
        <span>Add a direction (optional)</span>
        <input
          disabled={assistantStartMode === "guided"}
          maxLength={1000}
          onChange={(event) => setAssistantDirection(event.target.value)}
          placeholder={
            assistantStartMode === "guided"
              ? "Not used for Write with me"
              : "Use a practical example from software development"
          }
          value={assistantDirection}
        />
      </label>
      {assistantStartMode === "plan" ? renderGenerationError() : null}
      {assistantStartMode === "draft" ? renderSectionDraftError() : null}
      {interviewError ? (
        <div className={styles.generationError} role="alert">
          <span>{interviewError}</span>
          <button
            disabled={isLoadingInterview}
            onClick={() => void beginAssistantStart()}
            type="button"
          >
            Try again
          </button>
        </div>
      ) : null}
      <button
        className={styles.primaryAssistantButton}
        disabled={
          isGeneratingTalkingPoints ||
          isLoadingInterview ||
          isGeneratingDraftSection
        }
        onClick={() => void beginAssistantStart()}
        type="button"
      >
        {isLoadingInterview
          ? "Loading interview…"
          : isGeneratingDraftSection
            ? "Drafting section…"
            : isGeneratingTalkingPoints
              ? "Generating talking points…"
              : assistantStartMode === "guided"
                ? "Start writing together"
                : assistantStartMode === "draft"
                  ? "Draft this section"
                  : "Generate talking points"}
      </button>
    </div>
  );

  const renderImprovementAssistant = (surface: "desktop" | "mobile") => (
    <div className={styles.assistantContent}>
      {renderAssistantSectionContext()}
      {renderGoal(surface)}
      <div className={styles.selectedContext}>
        <span>Selected text</span>
        <p>“{selectedText}”</p>
      </div>
      <section className={styles.improvementActions}>
        <h3>How should I improve it?</h3>
        <div>
          {(["clearer", "expand", "example", "tone"] as AssistantAction[]).map(
            (action) => {
              const item = actionCopy[action];
              const Icon = item.icon;
              return (
                <button
                  aria-pressed={assistantAction === action}
                  className={
                    assistantAction === action ? styles.activeImproveAction : ""
                  }
                  key={action}
                  onClick={() => setAssistantAction(action)}
                  type="button"
                >
                  <Icon size={19} aria-hidden /> {item.title}
                </button>
              );
            },
          )}
        </div>
        <input
          aria-label="Tell Inkwell what to change"
          onChange={(event) => setAssistantInstruction(event.target.value)}
          placeholder="Tell Inkwell what to change"
          value={assistantInstruction}
        />
        <button
          className={styles.primaryAssistantButton}
          onClick={previewSuggestion}
          type="button"
        >
          Preview change
        </button>
      </section>
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
              Discard
            </button>
            <button onClick={retrySuggestion} type="button">
              Try again
            </button>
          </div>
        </div>
      ) : null}
      <button
        aria-pressed={assistantAction === "transition"}
        className={styles.transitionAction}
        onClick={() => setAssistantAction("transition")}
        type="button"
      >
        <ArrowRight size={22} aria-hidden />
        <span>Add a transition to the next section</span>
        <CaretRight size={18} aria-hidden />
      </button>
    </div>
  );

  const renderGuidanceAssistant = (surface: "desktop" | "mobile") => (
    <div className={styles.assistantContent}>
      {renderAssistantSectionContext()}
      {renderGoal(surface)}
      <div className={styles.selectionPrompt}>
        <Sparkle size={23} weight="fill" aria-hidden />
        <h3>Improve a passage</h3>
        <p>
          Select text in this section to make it clearer, expand the idea, add
          an example, or change its tone.
        </p>
      </div>
      <section className={styles.sectionPlanning}>
        <h3>Plan this section</h3>
        <label className={styles.directionField}>
          <span>Add a direction (optional)</span>
          <input
            maxLength={1000}
            onChange={(event) => setAssistantDirection(event.target.value)}
            placeholder="Focus on a specific angle"
            value={assistantDirection}
          />
        </label>
        {renderGenerationError()}
        <button
          className={styles.primaryAssistantButton}
          disabled={isGeneratingTalkingPoints}
          onClick={beginAssistantStart}
          type="button"
        >
          {isGeneratingTalkingPoints
            ? "Generating talking points…"
            : "Generate talking points"}
        </button>
      </section>
    </div>
  );

  const renderAssistant = (surface: "desktop" | "mobile") => {
    if (sectionDraftProposal?.sectionId === activeSectionId)
      return renderSectionDraftAssistant(surface);
    if (generatedResult?.sectionId === activeSectionId)
      return renderGeneratedAssistant(surface);
    if (selectedText.trim()) return renderImprovementAssistant(surface);
    if (activeInterviewView?.active) return renderGuidedAssistant();
    if (activeSectionIsEmpty) return renderStartAssistant(surface);
    return renderGuidanceAssistant(surface);
  };

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

  if (loadFailure) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadState}>
          <span role="alert">{loadFailure.message}</span>
          {loadFailure.kind === "missing-outline" && savedArticleId ? (
            <Link href={`/articles/new/outline?articleId=${savedArticleId}`}>
              Create outline
            </Link>
          ) : null}
          {loadFailure.kind === "missing-id" ||
          loadFailure.kind === "not-found" ? (
            <Link href="/dashboard?section=articles">Back to articles</Link>
          ) : null}
          {loadFailure.retryable ? (
            <button type="button" onClick={() => setRetryKey((key) => key + 1)}>
              Try again
            </button>
          ) : null}
        </div>
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
          <div
            className={`${styles.desktopWorkspace} ${!isAssistantOpen ? styles.assistantClosed : ""}`}
          >
            <header className={styles.desktopTopbar}>
              <div className={styles.saveMeta} role="status" aria-live="polite">
                {saveStatus === "saved" ? (
                  <Check size={18} weight="bold" aria-hidden />
                ) : null}
                <span>{saveLabel}</span>
                {saveStatus === "failed" && saveRetryable ? (
                  <button
                    onClick={() => void saveDraft("retrying")}
                    type="button"
                  >
                    Retry
                  </button>
                ) : null}
                <span>{wordCount.toLocaleString()} words</span>
              </div>
              <ArticleProgress
                currentStep="draft"
                compact
                articleId={articleId}
              />
              <div className={styles.topActions}>
                <button onClick={() => void openPreview()} type="button">
                  Preview
                </button>
                <button onClick={() => void reviewArticle()} type="button">
                  Review article
                </button>
              </div>
            </header>
            <div className={styles.desktopLayout}>
              <aside className={styles.outlineRail} aria-label="Draft outline">
                {renderCompactOutline()}
              </aside>
              <aside
                aria-hidden={!isOutlineExpanded}
                aria-label="Outline details"
                className={`${styles.outlineDrawer} ${isOutlineExpanded ? styles.outlineDrawerOpen : ""}`}
                id={DRAFT_OUTLINE_DRAWER_ID}
                inert={!isOutlineExpanded}
              >
                {renderOutline(false, true)}
              </aside>
              <article className={styles.articleCanvas}>
                <div className={styles.articleBody}>
                  <h1>{draft.title}</h1>
                  {draft.sections.map((section, index) => (
                    <Fragment key={section.id}>
                      <DraftRichSection
                        index={index}
                        isActive={section.id === activeSectionId}
                        onChange={updateSectionEditor}
                        onEditor={registerEditor}
                        onSelection={onEditorSelection}
                        section={section}
                      />
                      {generatedResult?.sectionId === section.id ? (
                        <section
                          aria-label="AI talking-points preview"
                          className={styles.generatedPreview}
                        >
                          <span>AI talking-points preview</span>
                          {generatedResult.points.map((point) => (
                            <p key={point}>• {point}</p>
                          ))}
                        </section>
                      ) : null}
                    </Fragment>
                  ))}
                </div>
                {renderToolbar()}
              </article>
              <aside
                aria-hidden={!isAssistantOpen}
                aria-label="Writing assistant"
                className={`${styles.assistantPanel} ${isAssistantOpen ? styles.assistantPanelOpen : ""}`}
                id={DRAFT_ASSISTANT_ID}
                inert={!isAssistantOpen}
              >
                <header>
                  <Sparkle size={23} weight="fill" aria-hidden />
                  <strong>Writing assistant</strong>
                  <button
                    aria-controls={DRAFT_ASSISTANT_ID}
                    aria-expanded={isAssistantOpen}
                    aria-label="Close writing assistant"
                    onClick={closeAssistant}
                    ref={assistantCloseRef}
                    type="button"
                  >
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
              <button
                aria-controls={DRAFT_ASSISTANT_ID}
                aria-expanded={isAssistantOpen}
                aria-hidden={isAssistantOpen}
                aria-label="Open writing assistant"
                className={`${styles.assistantOpenButton} ${!isAssistantOpen ? styles.assistantOpenButtonVisible : ""}`}
                onClick={openAssistant}
                ref={assistantOpenRef}
                inert={isAssistantOpen}
                type="button"
              >
                <Sparkle size={22} weight="fill" aria-hidden />
              </button>
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
          <ArticleProgress currentStep="draft" compact articleId={articleId} />
          <article className={styles.mobileArticle}>
            {draft.sections.map((section, index) => (
              <Fragment key={section.id}>
                <DraftRichSection
                  index={index}
                  isActive={section.id === activeSectionId}
                  onChange={updateSectionEditor}
                  onEditor={registerEditor}
                  onSelection={onEditorSelection}
                  section={section}
                />
                {generatedResult?.sectionId === section.id ? (
                  <section
                    aria-label="AI talking-points preview"
                    className={styles.generatedPreview}
                  >
                    <span>AI talking-points preview</span>
                    {generatedResult.points.map((point) => (
                      <p key={point}>• {point}</p>
                    ))}
                  </section>
                ) : null}
              </Fragment>
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
                    <button onClick={() => void openPreview()} type="button">
                      Preview article <ArrowRight size={18} aria-hidden />
                    </button>
                    <button onClick={() => void reviewArticle()} type="button">
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
            <button onClick={() => void reviewArticle()} type="button">
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
            <label htmlFor="new-section-goal">Section goal</label>
            <textarea
              id="new-section-goal"
              onChange={(event) => setNewSectionGoal(event.target.value)}
              value={newSectionGoal}
            />
            <div>
              <button onClick={() => setAddSectionOpen(false)} type="button">
                Cancel
              </button>
              <button
                disabled={!newSectionTitle.trim() || !newSectionGoal.trim()}
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
