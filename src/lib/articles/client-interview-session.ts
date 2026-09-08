import { z } from "zod";

const interviewQuestionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1).max(1_000),
  kind: z.enum(["core", "follow_up", "final_detail"]),
});

const interviewAnswerSchema = z.object({
  questionId: z.string().min(1),
  question: z.string().min(1).max(1_000),
  answer: z.string().trim().min(1).max(10_000),
  answeredAt: z.string().datetime(),
});

export const clientInterviewSessionSchema = z.object({
  token: z.string().min(20).max(200),
  state: z.enum(["welcome", "active", "paused", "completed"]),
  questions: z.array(interviewQuestionSchema).min(1).max(14),
  currentQuestionIndex: z.number().int().min(0),
  answers: z.array(interviewAnswerSchema).max(10),
  completionReason: z
    .enum(["sufficient", "participant_finished", "question_limit"])
    .nullable(),
  finalDetailAdded: z.boolean(),
  draftAnswer: z.string().max(10_000),
  updatedAt: z.string().datetime(),
});

export type ClientInterviewSession = z.infer<
  typeof clientInterviewSessionSchema
>;

const coreQuestions = [
  {
    id: "key-message",
    text: "What is the most important idea you want readers to take away from this article?",
    kind: "core" as const,
  },
  {
    id: "experience",
    text: "What first-hand experience gives you a distinctive perspective on this topic?",
    kind: "core" as const,
  },
  {
    id: "example",
    text: "Can you share a concrete example, story, or result that brings this idea to life?",
    kind: "core" as const,
  },
  {
    id: "misconception",
    text: "What do people commonly misunderstand about this topic?",
    kind: "core" as const,
  },
  {
    id: "action",
    text: "What should a reader do differently after reading the article?",
    kind: "core" as const,
  },
  {
    id: "evidence",
    text: "Are there any facts, results, or claims the writer should verify before publishing?",
    kind: "core" as const,
  },
];

export function createClientInterviewSession(
  token: string,
  now = new Date(),
): ClientInterviewSession {
  return clientInterviewSessionSchema.parse({
    token,
    state: "welcome",
    questions: coreQuestions,
    currentQuestionIndex: 0,
    answers: [],
    completionReason: null,
    finalDetailAdded: false,
    draftAnswer: "",
    updatedAt: now.toISOString(),
  });
}

export function currentInterviewQuestion(session: ClientInterviewSession) {
  return session.questions[session.currentQuestionIndex] ?? null;
}

export function startClientInterview(
  session: ClientInterviewSession,
  now = new Date(),
): ClientInterviewSession {
  return { ...session, state: "active", updatedAt: now.toISOString() };
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function hasEnoughInterviewCoverage(
  answers: ClientInterviewSession["answers"],
) {
  const substantialAnswers = answers.filter(
    (answer) => wordCount(answer.answer) >= 28,
  ).length;
  const totalWords = answers.reduce(
    (total, answer) => total + wordCount(answer.answer),
    0,
  );
  return answers.length >= 3 && substantialAnswers >= 2 && totalWords >= 105;
}

export function submitClientInterviewAnswer(
  session: ClientInterviewSession,
  answer: string,
  now = new Date(),
): ClientInterviewSession {
  const question = currentInterviewQuestion(session);
  if (!question) return completeClientInterview(session, "question_limit", now);
  const normalizedAnswer = answer.trim();
  if (!normalizedAnswer) return session;

  const answers = [
    ...session.answers,
    {
      questionId: question.id,
      question: question.text,
      answer: normalizedAnswer,
      answeredAt: now.toISOString(),
    },
  ];
  if (question.kind === "final_detail") {
    return {
      ...session,
      answers,
      state: "completed",
      completionReason: "participant_finished",
      draftAnswer: "",
      updatedAt: now.toISOString(),
    };
  }
  if (hasEnoughInterviewCoverage(answers)) {
    return {
      ...session,
      answers,
      state: "completed",
      completionReason: "sufficient",
      draftAnswer: "",
      updatedAt: now.toISOString(),
    };
  }

  const questions = [...session.questions];
  const needsFollowUp = wordCount(normalizedAnswer) < 18;
  const nextQuestion = questions[session.currentQuestionIndex + 1];
  if (
    needsFollowUp &&
    question.kind === "core" &&
    nextQuestion?.kind !== "follow_up"
  ) {
    questions.splice(session.currentQuestionIndex + 1, 0, {
      id: `follow-up-${question.id}`,
      text: "Could you make that more specific with an example, detail, or outcome?",
      kind: "follow_up",
    });
  }
  const currentQuestionIndex = session.currentQuestionIndex + 1;
  if (!questions[currentQuestionIndex]) {
    return {
      ...session,
      answers,
      questions,
      state: "completed",
      completionReason: "question_limit",
      draftAnswer: "",
      updatedAt: now.toISOString(),
    };
  }
  return {
    ...session,
    answers,
    questions,
    currentQuestionIndex,
    state: "active",
    draftAnswer: "",
    updatedAt: now.toISOString(),
  };
}

export function pauseClientInterview(
  session: ClientInterviewSession,
  draftAnswer = "",
  now = new Date(),
): ClientInterviewSession {
  return {
    ...session,
    state: "paused",
    draftAnswer,
    updatedAt: now.toISOString(),
  };
}

export function completeClientInterview(
  session: ClientInterviewSession,
  reason: "participant_finished" | "question_limit" = "participant_finished",
  now = new Date(),
): ClientInterviewSession {
  return {
    ...session,
    state: "completed",
    completionReason: reason,
    draftAnswer: "",
    updatedAt: now.toISOString(),
  };
}

export function addFinalInterviewDetail(
  session: ClientInterviewSession,
  now = new Date(),
): ClientInterviewSession {
  const questions = [
    ...session.questions,
    {
      id: "final-detail",
      text: "What final detail would you like the writer to know?",
      kind: "final_detail" as const,
    },
  ];
  return {
    ...session,
    questions,
    currentQuestionIndex: questions.length - 1,
    state: "active",
    completionReason: null,
    finalDetailAdded: true,
    draftAnswer: "",
    updatedAt: now.toISOString(),
  };
}

export function clientInterviewProgress(session: ClientInterviewSession) {
  if (session.state === "completed") return 100;
  return Math.min(92, Math.round((session.answers.length / 6) * 100));
}
