import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FormField } from "./form-field";

afterEach(cleanup);

describe("FormField", () => {
  it("connects the label and validation error to its input", () => {
    render(
      <FormField
        id="email"
        name="email"
        label="Email address"
        error="Enter a valid email address."
      />,
    );

    const input = screen.getByLabelText("Email address");
    const error = screen.getByText("Enter a valid email address.");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", error.id);
  });
});
