import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { Checkbox } from "./checkbox";

afterEach(cleanup);

describe("Checkbox", () => {
  it("can be toggled from its accessible label", async () => {
    render(<Checkbox id="remember" name="remember" label="Remember me" />);

    const checkbox = screen.getByRole("checkbox", { name: "Remember me" });
    await userEvent.click(checkbox);

    expect(checkbox).toBeChecked();
  });
});
