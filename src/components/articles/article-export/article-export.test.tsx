import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArticleExport } from "./article-export";
import {
  DEFAULT_EXPORT_SETTINGS,
  EXPORT_SETTINGS_STORAGE_KEY,
} from "./export-data";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));

const writeTextMock = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  pushMock.mockClear();
  writeTextMock.mockClear();
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText: writeTextMock },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:article-export"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("ArticleExport", () => {
  it("hydrates the default export and exposes unavailable formats", async () => {
    render(<ArticleExport />);
    expect(
      await screen.findByRole("heading", { name: "Export your article" }),
    ).toBeVisible();
    expect(
      screen.getByRole("radio", { name: /Copy formatted text/ }),
    ).toBeChecked();
    expect(screen.getByRole("radio", { name: /PDF/ })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /Word document/ })).toBeDisabled();
    expect(
      screen.getByRole("navigation", { name: "Article progress" }),
    ).toHaveTextContent("Export");
  });

  it("changes inclusions, persists settings, and navigates back", async () => {
    render(<ArticleExport />);
    await screen.findByRole("heading", { name: "Export your article" });
    await userEvent.click(screen.getByRole("checkbox", { name: "Author" }));
    await userEvent.click(screen.getByRole("button", { name: "Save draft" }));
    const saved = JSON.parse(
      window.sessionStorage.getItem(EXPORT_SETTINGS_STORAGE_KEY) ?? "{}",
    );
    expect(saved.inclusions.author).toBe(false);
    expect(screen.getByRole("status")).toHaveTextContent("settings saved");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(pushMock).toHaveBeenCalledWith("/articles/new/review");
  });

  it("copies formatted text and downloads Markdown", async () => {
    const clickMock = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const createObjectUrlMock = vi.spyOn(URL, "createObjectURL");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);

    render(<ArticleExport />);
    await screen.findByRole("heading", { name: "Export your article" });
    await userEvent.click(
      screen.getByRole("button", { name: "Export article" }),
    );
    expect(writeTextMock).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("copied");

    await userEvent.click(screen.getByRole("radio", { name: /Markdown/ }));
    await userEvent.click(
      screen.getByRole("button", { name: "Export article" }),
    );
    expect(createObjectUrlMock).toHaveBeenCalled();
    expect(clickMock).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("downloaded");
  });

  it("hydrates valid saved export settings", async () => {
    window.sessionStorage.setItem(
      EXPORT_SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_EXPORT_SETTINGS, format: "html" }),
    );
    render(<ArticleExport />);
    expect(await screen.findByRole("radio", { name: /HTML/ })).toBeChecked();
  });
});
