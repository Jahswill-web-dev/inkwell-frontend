import { expect, test } from "@playwright/test";

const article = {
  id: "be5579e3-24fd-4272-a35f-f74740c3887e",
  user_id: "46a42280-6ad8-4bb6-a29c-1604adbf0c31",
  notes: "These are useful notes for a future article brief.",
  working_title: "A useful working title",
  target_audience: ["Independent", "writers"],
  article_goal: "educate_with_practical_guidance",
  created_at: "2026-08-12T12:00:00Z",
  updated_at: "2026-08-12T12:00:00Z",
};
const workspaceClient = {
  id: "8d9dd792-78d8-4c9a-84bb-67d84c78b62a",
  workspace_id: "675bd099-ae1f-4246-b91e-a49b8077f65c",
  name: "Northstar Labs",
  website: null,
  industry: null,
  brand_profile: null,
  created_at: "2026-09-10T12:00:00Z",
  updated_at: "2026-09-10T12:00:00Z",
};

async function completeEditorialSetup(page: import("@playwright/test").Page) {
  await expect(page.getByRole("combobox", { name: "Client *" })).toBeEnabled();
  await page.getByLabel("New client name *").fill("Northstar Labs");
  await page.getByLabel(/Working title or topic/).fill(article.working_title);
  await page.getByLabel(/Target audience/).fill("Independent content teams");
  await page
    .getByRole("combobox", { name: /Article goal/ })
    .selectOption(article.article_goal);
  await page.getByRole("button", { name: /Continue/ }).click();
  await page
    .getByLabel(/Main angle or hypothesis/)
    .fill("Expert insight makes B2B content more credible.");
  await page
    .getByLabel(/Key message/)
    .fill("A focused interview produces stronger source material.");
  await page.getByRole("button", { name: /Continue/ }).click();
}

async function mockClients(page: import("@playwright/test").Page) {
  await page.route("**/api/clients**", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(workspaceClient),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: [], total: 0, offset: 0, limit: 100 }),
    });
  });
}

async function mockEmptyWorkspaceResources(
  page: import("@playwright/test").Page,
) {
  for (const resource of ["brief", "outline", "draft"]) {
    await page.route(
      `**/api/articles/${article.id}/${resource}`,
      async (route) => {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            error: { code: "not_found", message: "Not found" },
          }),
        });
      },
    );
  }
}

test("creates a client article and prepares its interview handoff", async ({
  page,
}) => {
  await mockClients(page);
  await page.route("**/api/articles**", async (route) => {
    if (route.request().method() === "POST") {
      const input = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          ...article,
          ...input,
          workspace_id: workspaceClient.workspace_id,
          client_id: workspaceClient.id,
          client: { id: workspaceClient.id, name: workspaceClient.name },
          assignee_id: article.user_id,
          assignee: { id: article.user_id, username: "writer_01" },
          status: "setup",
          draft_readiness: false,
          published_at: null,
        }),
      });
    } else await route.continue();
  });
  await page.route(`**/api/articles/${article.id}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ...article,
        workspace_id: workspaceClient.workspace_id,
        client_id: workspaceClient.id,
        client: { id: workspaceClient.id, name: workspaceClient.name },
        assignee_id: article.user_id,
        assignee: { id: article.user_id, username: "writer_01" },
        status: "setup",
        content_type: "thought_leadership",
        due_date: null,
        target_length: "standard",
        interview_method: "client",
        interviewee_name: "Avery Chen",
        interview_instructions: "",
        main_angle: "Expert insight makes B2B content more credible.",
        key_message: "A focused interview produces stronger source material.",
        call_to_action: "",
        tone: "",
        seo_keyword: "",
        draft_readiness: false,
        published_at: null,
      }),
    });
  });
  await mockEmptyWorkspaceResources(page);

  await page.goto("/articles/new");
  await expect(
    page.getByRole("heading", { name: "Create a client article" }),
  ).toBeVisible();
  await completeEditorialSetup(page);
  await page.getByLabel(/Client or expert name/).fill("Avery Chen");
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByText("Northstar Labs")).toBeVisible();
  await page
    .getByRole("button", { name: "Create article & prepare interview" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/articles/${article.id}/interviews$`),
  );
  await expect(
    page.getByRole("heading", { name: article.working_title }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Create a private interview link" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Edit setup/ })).toHaveAttribute(
    "href",
    `/articles/${article.id}/edit`,
  );
});

test("creates an article from existing material and continues to the brief", async ({
  page,
}) => {
  await mockClients(page);
  await page.route("**/api/articles**", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(article),
    });
  });
  await page.goto("/articles/new");
  await completeEditorialSetup(page);
  await page.getByRole("radio", { name: /Use existing notes/ }).check();
  await page.getByLabel(/Source notes/).fill(article.notes);
  await page.getByRole("button", { name: /Continue/ }).click();
  await page
    .getByRole("button", { name: "Create article & build brief" })
    .click();
  await expect(page).toHaveURL(
    new RegExp(`/articles/new/brief\\?articleId=${article.id}$`),
  );
});
