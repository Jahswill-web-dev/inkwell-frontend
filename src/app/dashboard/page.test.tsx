import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import DashboardPage from "./page";

const { requireUser, redirect } = vi.hoisted(() => ({
  requireUser: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`Redirect:${path}`);
  }),
}));
vi.mock("@/lib/auth/session", () => ({ requireUser }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/components/dashboard/dashboard-home", () => ({
  DashboardHome: () => <div>Marketing workspace</div>,
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
const user = {
  id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  email: "writer@example.com",
  username: "writer_01",
  created_at: "2026-11-26T12:00:00Z",
  updated_at: "2026-11-26T12:00:00Z",
};

it("routes a consultant account returning through the login default to consultant", async () => {
  requireUser.mockResolvedValue({
    ...user,
    preferred_experience: "consultant",
  });
  await expect(DashboardPage()).rejects.toThrow("Redirect:/consultant");
});

it.each(["marketing", undefined])(
  "keeps the marketing dashboard for an existing %s preference",
  async (preferred_experience) => {
    requireUser.mockResolvedValue({ ...user, preferred_experience });
    render(await DashboardPage());
    expect(screen.getByText("Marketing workspace")).toBeVisible();
    expect(redirect).not.toHaveBeenCalled();
  },
);
