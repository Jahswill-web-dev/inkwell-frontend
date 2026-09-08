import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createInterviewInvitation } from "@/lib/articles/client-interview-invitation";
import { saveInterviewInvitation } from "@/lib/articles/client-interview-storage";
import { ClientInterview } from "./client-interview";

const token = "a".repeat(48);

function seedInvitation(
  overrides: Partial<ReturnType<typeof createInterviewInvitation>> = {},
) {
  const invitation = {
    ...createInterviewInvitation(
      "article-1",
      {
        participantName: "Avery Chen",
        participantEmail: "avery@client.com",
        expiresOn: "",
      },
      {
        tokenFactory: () => token,
        articleTitle: "Expert-led content",
        clientName: "Northstar Labs",
        writerName: "Morgan",
      },
    ),
    ...overrides,
  };
  saveInterviewInvitation(invitation);
  return invitation;
}

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

describe("ClientInterview", () => {
  it("shows a safe invalid-link state", async () => {
    render(<ClientInterview token="missing-token-value-123456" />);
    expect(
      await screen.findByRole("heading", {
        name: "This interview link isn’t valid",
      }),
    ).toBeVisible();
  });

  it("welcomes the participant and supports save and resume", async () => {
    seedInvitation();
    render(<ClientInterview token={token} />);
    expect(
      await screen.findByRole("heading", {
        name: /Share your expertise for “Expert-led content”/,
      }),
    ).toBeVisible();
    expect(screen.getByText(/About 5–10 minutes/)).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: /Start interview/ }),
    );
    expect(
      screen.getByRole("heading", { name: /most important idea/ }),
    ).toBeVisible();

    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "A short unfinished answer" },
    });
    await userEvent.click(
      screen.getByRole("button", { name: "Save for later" }),
    );
    expect(
      screen.getByRole("heading", { name: "Your progress is saved" }),
    ).toBeVisible();
    await userEvent.click(
      screen.getByRole("button", { name: /Continue interview/ }),
    );
    expect(screen.getByLabelText("Your answer")).toHaveValue(
      "A short unfinished answer",
    );
  });

  it("asks a follow-up and completes early after enough detail", async () => {
    seedInvitation();
    render(<ClientInterview token={token} />);
    await userEvent.click(
      await screen.findByRole("button", { name: /Start interview/ }),
    );
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "A short answer" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByText("A quick follow-up")).toBeVisible();

    const detailed = Array.from(
      { length: 55 },
      (_, index) => "detail" + index,
    ).join(" ");
    for (let index = 0; index < 3; index += 1) {
      fireEvent.change(screen.getByLabelText("Your answer"), {
        target: { value: detailed },
      });
      await userEvent.click(screen.getByRole("button", { name: "Continue" }));
      if (screen.queryByRole("heading", { name: /Thank you/ })) break;
    }
    expect(
      screen.getByRole("heading", { name: "Thank you, Avery Chen" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Add one final detail" }),
    ).toBeVisible();
  });

  it.each([
    [
      "revoked",
      { status: "revoked" as const },
      "This interview link was revoked",
    ],
    [
      "expired",
      { expiresAt: "2020-01-01T23:59:59.999Z" },
      "This interview link has expired",
    ],
  ])("shows the %s state", async (_state, overrides, heading) => {
    seedInvitation(overrides);
    render(<ClientInterview token={token} />);
    expect(await screen.findByRole("heading", { name: heading })).toBeVisible();
  });

  it("allows one final detail on an already completed interview", async () => {
    seedInvitation({ progressState: "completed" });
    render(<ClientInterview token={token} />);
    await userEvent.click(
      await screen.findByRole("button", { name: "Add one final detail" }),
    );
    expect(screen.getByRole("heading", { name: /final detail/ })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Your answer"), {
      target: { value: "One last customer result." },
    });
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(
      screen.getByRole("heading", { name: "Thank you, Avery Chen" }),
    ).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Add one final detail" }),
    ).not.toBeInTheDocument();
  });
});
