import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { House, Lightbulb } from "@phosphor-icons/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./sidebar";

afterEach(cleanup);

const items = [
  { label: "Home", icon: House, href: "/dashboard" },
  { label: "Ideas", icon: Lightbulb, href: "/dashboard/ideas" },
] as const;

const { postMock, refreshMock, replaceMock } = vi.hoisted(() => ({
  postMock: vi.fn().mockResolvedValue({ status: 204 }),
  refreshMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock("axios", () => ({ default: { post: postMock } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
}));

describe("Sidebar", () => {
  it("renders configurable navigation and marks the active destination", () => {
    render(
      <Sidebar
        items={items}
        activeHref="/dashboard/ideas"
        user={{ name: "Ada Lovelace", initials: "AL" }}
      />,
    );

    expect(screen.getByRole("link", { name: "Ideas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(screen.getByText("Ada Lovelace")).toBeVisible();
  });

  it("supports a profile action", async () => {
    const onProfileClick = vi.fn();
    render(
      <Sidebar
        items={items}
        activeHref="/dashboard"
        user={{ name: "Ada Lovelace", initials: "AL" }}
        onProfileClick={onProfileClick}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Open Ada Lovelace profile menu" }),
    );
    expect(onProfileClick).toHaveBeenCalledOnce();
  });

  it("signs out from the profile menu", async () => {
    render(
      <Sidebar
        items={items}
        activeHref="/dashboard"
        user={{ name: "writer_01", initials: "WR" }}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Open writer_01 profile menu" }),
    );
    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(postMock).toHaveBeenCalledWith("/api/auth/logout");
    expect(replaceMock).toHaveBeenCalledWith("/login");
    expect(refreshMock).toHaveBeenCalled();
  });
});
