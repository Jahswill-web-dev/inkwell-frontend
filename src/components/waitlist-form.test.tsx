import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WaitlistForm } from "./waitlist-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("WaitlistForm", () => {
  it("shows server validation for empty and invalid values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            message: "Check the highlighted fields and try again.",
            fieldErrors: {
              name: ["Enter your full name."],
              email: ["Enter a valid email address."],
            },
          }),
          { status: 400 },
        ),
      ),
    );
    render(<WaitlistForm />);

    await userEvent.click(
      screen.getByRole("button", { name: "Join the waitlist" }),
    );

    expect(await screen.findByText("Enter your full name.")).toBeVisible();
    expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  });

  it("prevents duplicate submissions while the request is pending", async () => {
    let resolveRequest: ((response: Response) => void) | undefined;
    const pendingRequest = new Promise<Response>((resolve) => {
      resolveRequest = resolve;
    });
    const fetchMock = vi.fn<typeof fetch>().mockReturnValue(pendingRequest);
    vi.stubGlobal("fetch", fetchMock);
    render(<WaitlistForm />);

    const submit = screen.getByRole("button", { name: "Join the waitlist" });
    await userEvent.click(submit);
    await userEvent.click(screen.getByRole("button", { name: "Joining…" }));

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "Joining…" })).toBeDisabled();

    resolveRequest?.(
      new Response(
        JSON.stringify({
          success: true,
          message: "You're added to the waitlist",
        }),
        { status: 200 },
      ),
    );
  });

  it("shows success and clears submitted details", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: true,
            message: "You're added to the waitlist",
          }),
          { status: 200 },
        ),
      ),
    );
    render(<WaitlistForm />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Full name"), "Ada Lovelace");
    await user.type(screen.getByLabelText("Email address"), "ada@example.com");
    await user.click(screen.getByRole("button", { name: "Join the waitlist" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "You're added to the waitlist",
    );
    expect(screen.getByLabelText("Full name")).toHaveValue("");
    expect(screen.getByLabelText("Email address")).toHaveValue("");
  });

  it("keeps the form usable after a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new Error("offline")),
    );
    render(<WaitlistForm />);

    await userEvent.click(
      screen.getByRole("button", { name: "Join the waitlist" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Check your connection and try again.",
    );
    expect(
      screen.getByRole("button", { name: "Join the waitlist" }),
    ).toBeEnabled();
  });
});
