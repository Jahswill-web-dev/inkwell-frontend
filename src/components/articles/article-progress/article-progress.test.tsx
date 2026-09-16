import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleProgress } from "./article-progress";

const articleId = "be5579e3-24fd-4272-a35f-f74740c3887e";

describe("ArticleProgress", () => {
  it("shows all eight stages and links completed workspace steps", () => {
    render(<ArticleProgress currentStep="brief" articleId={articleId} />);
    const progress = screen.getByRole("navigation", {
      name: "Article progress",
    });
    expect(progress).toHaveTextContent("Setup");
    expect(progress).toHaveTextContent("Interviews");
    expect(progress).toHaveTextContent("Sources");
    expect(progress).toHaveTextContent("Publish");
    expect(screen.getByRole("link", { name: "Setup" })).toHaveAttribute(
      "href",
      "/articles/" + articleId,
    );
    expect(screen.getByRole("link", { name: "Interviews" })).toHaveAttribute(
      "href",
      "/articles/" + articleId + "/interviews",
    );
  });
});
