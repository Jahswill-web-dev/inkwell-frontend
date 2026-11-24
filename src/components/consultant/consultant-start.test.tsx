import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ConsultantDashboard } from "./consultant-start";
import { consultantRequest } from "@/lib/consultant/client";

const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/lib/consultant/client", () => ({ consultantRequest: vi.fn() }));
const api = vi.mocked(consultantRequest);
const items = [
  {
    id: "ready",
    title: "Better handoffs",
    status: "in_review",
    updated_at: "2026-11-23T10:00:00Z",
  },
  {
    id: "interview",
    title: "Founder lessons",
    status: "interview_in_progress",
    updated_at: "2026-11-22T10:00:00Z",
  },
  {
    id: "published",
    title: "Past work",
    status: "published",
    updated_at: "2025-11-22T10:00:00Z",
  },
];
beforeEach(() =>
  api.mockImplementation(async (path) =>
    path === "profile" ? { onboarding_complete: true } : { items },
  ),
);
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it("combines title search with status filters and can reset an empty result", async () => {
  render(<ConsultantDashboard />);
  const ready = await screen.findByRole("link", {
    name: "Open article: Better handoffs",
  });
  expect(ready).toHaveAttribute("href", "/consultant/articles/ready");
  fireEvent.click(screen.getByRole("button", { name: "In progress" }));
  expect(
    screen.queryByRole("link", { name: /Better handoffs/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: /Past work/ }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: /Resume interview: Founder lessons/ }),
  ).toBeVisible();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "  HANDOFFS  " },
  });
  expect(screen.getByText("No matching articles")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Ready to edit" }));
  expect(screen.getByRole("link", { name: /Better handoffs/ })).toBeVisible();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "missing" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
  expect(
    screen.getAllByRole("link", { name: /article:|interview:/ }),
  ).toHaveLength(3);
  expect(screen.getByRole("searchbox")).toHaveValue("");
});

it("loads subsequent pages so search includes articles beyond the first page", async () => {
  api.mockImplementation(async (path) => {
    if (path === "profile") return { onboarding_complete: true };
    return {
      items: path.includes("offset=0&")
        ? Array.from({ length: 100 }, (_, index) => ({
            ...items[0],
            id: `first-${index}`,
          }))
        : [{ ...items[0], id: "later", title: "An older idea" }],
    };
  });
  render(<ConsultantDashboard />);
  await screen.findByRole("link", { name: "Open article: An older idea" });
  expect(api).toHaveBeenCalledWith("articles?offset=100&limit=100");
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: "older" },
  });
  expect(screen.getAllByRole("link", { name: /Open article:/ })).toHaveLength(
    1,
  );
});

it("shows a recoverable load error rather than a never-ending loading state", async () => {
  api.mockRejectedValue(new Error("Unable to connect"));
  render(<ConsultantDashboard />);
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("Unable to connect"),
  );
  expect(screen.queryByText("Loading your articles…")).not.toBeInTheDocument();
  expect(screen.getByText(/Refresh the page/)).toBeVisible();
});
