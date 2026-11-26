import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConsultantInterviewScreen } from "./consultant-interview";

const mocks = vi.hoisted(() => ({
  start: vi.fn(),
  router: { replace: vi.fn(), push: vi.fn() },
  api: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("@/lib/consultant/client", () => ({ consultantRequest: mocks.api }));
vi.mock("@elevenlabs/react", () => ({
  ConversationProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));
vi.mock("@/components/interview/use-realtime-interview", () => ({
  useRealtimeInterview: () => ({
    start: mocks.start,
    status: "idle",
    error: null,
    stop: vi.fn(),
    muted: false,
    flushTranscript: vi.fn(),
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.api.mockResolvedValue({
    id: "interview-id",
    article_id: "article-id",
    title: "Why better tools won’t fix broken handoffs",
    state: "active",
  });
});
afterEach(cleanup);

it("waits for explicit start before beginning voice access", async () => {
  render(<ConsultantInterviewScreen interviewId="interview-id" />);
  expect(
    await screen.findByRole("heading", { name: /Why better tools/ }),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: "Back to article" })).toHaveAttribute(
    "href",
    "/consultant/articles/article-id",
  );
  expect(
    screen.getByText("Microphone access begins when you start."),
  ).toBeVisible();
  expect(mocks.start).not.toHaveBeenCalled();
  expect(
    screen.queryByRole("button", { name: "Mute" }),
  ).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Start conversation" }));
  expect(mocks.start).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "Mute" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Start conversation" }),
  ).not.toBeInTheDocument();
});

it("keeps completed interviews out of the start screen", async () => {
  mocks.api.mockResolvedValue({
    id: "interview-id",
    article_id: "article-id",
    state: "completed",
  });
  render(<ConsultantInterviewScreen interviewId="interview-id" />);
  expect(await screen.findByText("Opening your draft progress…")).toBeVisible();
  expect(mocks.router.replace).toHaveBeenCalledWith(
    "/consultant/articles/article-id",
  );
  expect(mocks.start).not.toHaveBeenCalled();
});
