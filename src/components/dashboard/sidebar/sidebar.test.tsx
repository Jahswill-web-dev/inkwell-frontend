import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { House, Lightbulb } from "@phosphor-icons/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.style.removeProperty("--dashboard-sidebar-width");
});

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

  it("closes, expands the workspace, and restores focus when reopened", async () => {
    render(
      <Sidebar
        items={items}
        activeHref="/dashboard"
        user={{ name: "Ada Lovelace", initials: "AL" }}
      />,
    );

    const sidebar = screen.getByRole("complementary", {
      name: "Primary navigation",
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Open Ada Lovelace profile menu" }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Close sidebar" }),
    );

    expect(sidebar).toHaveAttribute("aria-hidden", "true");
    expect(sidebar).toHaveAttribute("inert");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(
      document.documentElement.style.getPropertyValue(
        "--dashboard-sidebar-width",
      ),
    ).toBe("0px");
    expect(window.localStorage.getItem("inkwell:sidebar-open")).toBe("false");

    const openButton = screen.getByRole("button", { name: "Open sidebar" });
    await waitFor(() => expect(openButton).toHaveFocus());
    await userEvent.click(openButton);

    expect(sidebar).toHaveAttribute("aria-hidden", "false");
    expect(sidebar).not.toHaveAttribute("inert");
    expect(
      document.documentElement.style.getPropertyValue(
        "--dashboard-sidebar-width",
      ),
    ).toBe("215px");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Close sidebar" }),
      ).toHaveFocus(),
    );
  });

  it("restores a saved closed preference", async () => {
    window.localStorage.setItem("inkwell:sidebar-open", "false");
    render(
      <Sidebar
        items={items}
        activeHref="/dashboard"
        user={{ name: "Ada Lovelace", initials: "AL" }}
      />,
    );

    expect(
      await screen.findByRole("button", { name: "Open sidebar" }),
    ).toBeVisible();
    expect(
      document.documentElement.style.getPropertyValue(
        "--dashboard-sidebar-width",
      ),
    ).toBe("0px");
  });

  it("defaults to expanded when local storage is unavailable", async () => {
    const getItem = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("Storage unavailable");
      });

    render(
      <Sidebar
        items={items}
        activeHref="/dashboard"
        user={{ name: "Ada Lovelace", initials: "AL" }}
      />,
    );

    await waitFor(() =>
      expect(
        document.documentElement.style.getPropertyValue(
          "--dashboard-sidebar-width",
        ),
      ).toBe("215px"),
    );
    expect(screen.getByRole("button", { name: "Close sidebar" })).toBeVisible();
    getItem.mockRestore();
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
