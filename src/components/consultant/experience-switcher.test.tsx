import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ExperienceSwitcher } from "./experience-switcher";

const { request, push, refresh } = vi.hoisted(() => ({
  request: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/consultant/client", () => ({ consultantRequest: request }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));
beforeEach(() => {
  request.mockReset().mockResolvedValue({});
  push.mockReset();
  refresh.mockReset();
});
afterEach(cleanup);

it.each(["consultant", "marketing"] as const)(
  "marks the saved %s experience and does not resubmit the active choice",
  async (current) => {
    const user = userEvent.setup();
    render(<ExperienceSwitcher current={current} />);
    const label = current === "consultant" ? "Consultant" : "Content marketing";
    const trigger = screen.getByRole("button", {
      name: `Experience: ${label}`,
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    const menu = screen.getByRole("menu", { name: "Switch experience" });
    const option = within(menu).getByRole("menuitemradio", { name: label });
    expect(option).toHaveAttribute("aria-checked", "true");
    expect(option).toHaveFocus();
    await user.click(option);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(request).not.toHaveBeenCalled();
  },
);

it.each([
  ["consultant", "Content marketing", "marketing", "/dashboard"],
  ["marketing", "Consultant", "consultant", "/consultant"],
] as const)(
  "switches from %s only after saving the new experience",
  async (current, label, experience, path) => {
    const user = userEvent.setup();
    render(<ExperienceSwitcher current={current} />);
    await user.click(screen.getByRole("button"));
    await user.click(screen.getByRole("menuitemradio", { name: label }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(path));
    expect(request).toHaveBeenCalledExactlyOnceWith("experience", "PUT", {
      experience,
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  },
);

it("supports arrow keys, Home, End, Escape and Tab without closing its enclosing dialog", async () => {
  const user = userEvent.setup();
  const escape = vi.fn();
  window.addEventListener("keydown", escape);
  try {
    render(
      <div role="dialog" aria-label="Article review">
        <a href="/consultant">Visible navigation</a>
        <nav style={{ display: "none" }}>
          <a href="/consultant/settings">Hidden mobile navigation</a>
        </nav>
        <ExperienceSwitcher current="consultant" />
        <button>Next action</button>
      </div>,
    );
    const trigger = screen.getByRole("button", {
      name: "Experience: Consultant",
    });
    trigger.focus();
    await user.keyboard("{ArrowDown}");
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("menu")).toBeInTheDocument();
    const first = screen.getByRole("menuitemradio", { name: "Consultant" });
    const last = screen.getByRole("menuitemradio", {
      name: "Content marketing",
    });
    expect(first).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(last).toHaveFocus();
    await user.keyboard("{Home}");
    expect(first).toHaveFocus();
    await user.keyboard("{End}");
    expect(last).toHaveFocus();
    escape.mockClear();
    await user.keyboard("{Escape}");
    expect(escape).not.toHaveBeenCalled();
    expect(trigger).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    await user.tab();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next action" })).toHaveFocus();
    await user.click(trigger);
    await user.tab({ shift: true });
    expect(
      screen.getByRole("link", { name: "Visible navigation" }),
    ).toHaveFocus();
  } finally {
    window.removeEventListener("keydown", escape);
  }
});

it("dismisses on an outside click without stealing focus", async () => {
  const user = userEvent.setup();
  render(
    <>
      <ExperienceSwitcher />
      <button>Outside</button>
    </>,
  );
  await user.click(
    screen.getByRole("button", { name: "Experience: Content marketing" }),
  );
  await user.click(screen.getByRole("button", { name: "Outside" }));
  expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Outside" })).toHaveFocus();
});

it("prevents duplicate changes while saving", async () => {
  let finish!: (value: object) => void;
  request.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const user = userEvent.setup();
  render(<ExperienceSwitcher current="consultant" />);
  await user.click(screen.getByRole("button"));
  const target = screen.getByRole("menuitemradio", {
    name: "Content marketing",
  });
  await user.click(target);
  expect(
    screen.getByRole("button", { name: "Experience: Consultant" }),
  ).toBeDisabled();
  expect(screen.getByRole("status")).toHaveTextContent("Switching experience");
  await user.click(target);
  expect(request).toHaveBeenCalledOnce();
  expect(push).not.toHaveBeenCalled();
  finish({});
  await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
});

it("keeps the current selection when saving fails and supports retry", async () => {
  request.mockRejectedValueOnce(new Error("Unable to switch. Please retry."));
  const user = userEvent.setup();
  render(<ExperienceSwitcher current="consultant" />);
  await user.click(screen.getByRole("button"));
  await user.click(
    screen.getByRole("menuitemradio", { name: "Content marketing" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("Please retry.");
  expect(
    screen.getByRole("menuitemradio", { name: "Consultant" }),
  ).toHaveAttribute("aria-checked", "true");
  expect(push).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("menuitemradio", { name: "Content marketing" }),
  );
  await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
});
