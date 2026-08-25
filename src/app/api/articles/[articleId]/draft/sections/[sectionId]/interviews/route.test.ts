import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as createInterview } from "./route";
import { GET as getLatestInterview } from "./latest/route";
import { GET as getInterview } from "./[interviewId]/route";
import { PATCH as saveAnswers } from "./[interviewId]/answers/route";
import { POST as generateInterview } from "./[interviewId]/generate/route";

const { cookiesMock, createMock, getMock, patchMock, postMock } = vi.hoisted(
  () => ({
    cookiesMock: vi.fn(),
    createMock: vi.fn(),
    getMock: vi.fn(),
    patchMock: vi.fn(),
    postMock: vi.fn(),
  }),
);

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("axios", () => ({
  default: {
    create: createMock,
    isAxiosError: (error: unknown) =>
      Boolean(error && typeof error === "object" && "isAxiosError" in error),
  },
}));

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";
const sectionId = "20000000-0000-4000-8000-000000000000";
const interviewId = "40000000-0000-4000-8000-000000000000";
const sectionContext = { params: Promise.resolve({ articleId, sectionId }) };
const interviewContext = {
  params: Promise.resolve({ articleId, sectionId, interviewId }),
};
const basePath = `/api/v1/articles/${articleId}/draft/sections/${sectionId}/interviews`;
const result = {
  id: interviewId,
  draft_id: "30000000-0000-4000-8000-000000000000",
  section_id: sectionId,
  status: "awaiting_answers",
  questions: [
    {
      id: "50000000-0000-4000-8000-000000000000",
      missing_piece: "Example",
      question: "What happened?",
      answer_guidance: "Describe the outcome.",
    },
    {
      id: "50000000-0000-4000-8000-000000000001",
      missing_piece: "Lesson",
      question: "What changed?",
      answer_guidance: "Describe the lesson.",
    },
  ],
  answers: [],
  generated_blocks: null,
  is_stale: false,
  created_at: "2026-08-25T12:00:00Z",
  updated_at: "2026-08-25T12:00:00Z",
};

beforeEach(() => {
  process.env.AUTH_API_URL = "http://127.0.0.1:8000";
  vi.clearAllMocks();
  cookiesMock.mockResolvedValue({ get: () => ({ value: "token" }) });
  createMock.mockReturnValue({
    defaults: { headers: { common: {} } },
    get: getMock,
    patch: patchMock,
    post: postMock,
  });
  getMock.mockResolvedValue({ data: result });
  patchMock.mockResolvedValue({ data: result });
  postMock.mockResolvedValue({ data: result });
});

describe("section interview proxies", () => {
  it("creates bodyless and instructed interviews", async () => {
    expect(
      (
        await createInterview(
          new Request("http://local", { method: "POST" }),
          sectionContext,
        )
      ).status,
    ).toBe(200);
    expect(postMock).toHaveBeenNthCalledWith(1, basePath);

    await createInterview(
      new Request("http://local", {
        method: "POST",
        body: JSON.stringify({ instruction: "  Focus on lessons  " }),
      }),
      sectionContext,
    );
    expect(postMock).toHaveBeenNthCalledWith(2, basePath, {
      instruction: "Focus on lessons",
    });
  });

  it("gets the latest and a particular interview", async () => {
    await getLatestInterview(new Request("http://local"), sectionContext);
    await getInterview(new Request("http://local"), interviewContext);

    expect(getMock).toHaveBeenNthCalledWith(1, `${basePath}/latest`);
    expect(getMock).toHaveBeenNthCalledWith(2, `${basePath}/${interviewId}`);
  });

  it("replaces the complete answer collection and generates", async () => {
    const answers = [
      { question_id: result.questions[0].id, answer: "A saved answer" },
      { question_id: result.questions[1].id, answer: null },
    ];
    await saveAnswers(
      new Request("http://local", {
        method: "PATCH",
        body: JSON.stringify({ answers }),
      }),
      interviewContext,
    );
    postMock.mockResolvedValueOnce({
      data: {
        ...result,
        status: "generated",
        generated_blocks: [{ type: "paragraph", text: "Generated copy" }],
      },
    });
    await generateInterview(
      new Request("http://local", { method: "POST" }),
      interviewContext,
    );

    expect(patchMock).toHaveBeenCalledWith(
      `${basePath}/${interviewId}/answers`,
      { answers },
    );
    expect(postMock).toHaveBeenCalledWith(
      `${basePath}/${interviewId}/generate`,
    );
  });

  it("validates auth, IDs, request bodies, and response ownership", async () => {
    cookiesMock.mockResolvedValueOnce({ get: () => undefined });
    expect(
      (
        await createInterview(
          new Request("http://local", { method: "POST" }),
          sectionContext,
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await getLatestInterview(new Request("http://local"), {
          params: Promise.resolve({ articleId, sectionId: "invalid" }),
        })
      ).status,
    ).toBe(422);
    expect(
      (
        await saveAnswers(
          new Request("http://local", {
            method: "PATCH",
            body: JSON.stringify({ answers: [{ question_id: "bad" }] }),
          }),
          interviewContext,
        )
      ).status,
    ).toBe(422);

    getMock.mockResolvedValueOnce({
      data: { ...result, id: "40000000-0000-4000-8000-000000000001" },
    });
    expect(
      (await getInterview(new Request("http://local"), interviewContext))
        .status,
    ).toBe(502);
  });

  it("preserves stale interview conflicts", async () => {
    postMock.mockRejectedValueOnce({
      isAxiosError: true,
      response: {
        status: 409,
        data: {
          error: {
            code: "section_interview_stale",
            message: "Create a new interview.",
          },
        },
      },
    });
    const response = await generateInterview(
      new Request("http://local", { method: "POST" }),
      interviewContext,
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: { code: "section_interview_stale" },
    });
  });
});
