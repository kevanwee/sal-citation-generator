import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "Add footnote" }),
  ).toBeEnabled();
});
test("empty workspace is accessible, responsive and validates required fields", async ({
  page,
}, info) => {
  await expect(
    page.getByRole("heading", { name: "Your sources. In good form." }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy all" })).toBeDisabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: `.audit/${info.project.name}-empty.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add footnote" }).click();
  await expect(page.locator(".validation[role=alert]")).toContainText(
    "Case name is required.",
  );
});
test("case workflow, linked edits, repeat references, reorder, undo and persistence", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.getByLabel("Case name").fill("Example v Respondent");
  await page.getByLabel("Report citation").fill("[2020] 1 SLR 100");
  await page.getByLabel("Short reference").fill("Example");
  await page.getByLabel("Paragraph start").fill("10");
  await page.getByRole("button", { name: "Add footnote" }).click();
  await page.getByRole("button", { name: "Cite again" }).click();
  await page.getByRole("button", { name: "Add footnote" }).click();
  await expect(page.locator(".footnote-row").nth(1)).toContainText("Ibid.");
  await page.getByRole("button", { name: "Cite again" }).last().click();
  await page.getByLabel("Paragraph start").fill("12");
  await page.getByRole("button", { name: "Add footnote" }).click();
  await expect(page.locator(".footnote-row").nth(2)).toContainText(
    "Id, at [12].",
  );
  await page.getByRole("button", { name: "Edit", exact: true }).first().click();
  await page.getByLabel("Case name").fill("Updated v Respondent");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("button", { name: "Edit", exact: true }).last().click();
  await expect(page.getByLabel("Case name")).toHaveValue(
    "Updated v Respondent",
  );
  await expect(page.getByLabel("Paragraph start")).toHaveValue("12");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Move footnote 3 up" }).click();
  await expect(page.locator(".footnote-row").nth(1)).toContainText(
    "Id, at [12].",
  );
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".footnote-row").nth(1)).toContainText("Ibid.");
  await page.reload();
  await expect(page.locator(".footnote-row")).toHaveCount(3);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Clear list" }).click();
  await expect(page.locator(".footnote-row")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".footnote-row")).toHaveCount(3);
});
test("book, journal, legislation, chapter and website forms produce usable citations", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await page.getByLabel("Author(s)").fill("Colin Tapper");
  await page
    .getByLabel("Title", { exact: true })
    .fill("Cross and Tapper on Evidence");
  await page.getByLabel("Publisher").fill("Butterworths");
  await page.getByLabel("Edition", { exact: false }).fill("9th Ed");
  await page.getByLabel("Publication year").fill("1999");
  await page.getByLabel("Pinpoint start").fill("74");
  await page.getByRole("button", { name: "Add footnote" }).click();
  await expect(page.locator(".footnote-row").first()).toContainText(
    "Colin Tapper, Cross and Tapper on Evidence (Butterworths, 9th Ed, 1999) at p 74.",
  );
  await page
    .getByRole("button", { name: "Journal article", exact: true })
    .click();
  await page.getByLabel("Author(s)").fill("Peter Birks");
  await page.getByLabel("Article title").fill("No Consideration");
  await page.getByLabel("Publication year").fill("1993");
  await page.getByLabel("Volume / issue").fill("23");
  await page.getByLabel("Journal abbreviation").fill("UWALR");
  await page.getByLabel("First page").fill("195");
  await page.getByRole("button", { name: "Add footnote" }).click();
  await page.getByRole("button", { name: "Legislation", exact: true }).click();
  await page.getByLabel("Legislation title").fill("Misuse of Drugs Act");
  await page
    .getByLabel("Edition / instrument reference")
    .fill("Cap 185, 2001 Rev Ed");
  await page.getByLabel("Provision").fill("s 2(1)");
  await page.getByRole("button", { name: "Add footnote" }).click();
  await page.getByRole("button", { name: "Book chapter", exact: true }).click();
  await page.getByLabel("Author(s)").fill("Walter Woon");
  await page
    .getByLabel("Chapter title")
    .fill("The Applicability of English Law in Singapore");
  await page.getByLabel("Book title").fill("The Singapore Legal System");
  await page.getByLabel("Editor", { exact: false }).fill("Kevin Y L Tan ed");
  await page.getByLabel("Publisher").fill("Singapore University Press");
  await page.getByLabel("Publication year").fill("1999");
  await page.getByRole("button", { name: "Add footnote" }).click();
  await page.getByRole("button", { name: "Website", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("An article");
  await page.getByLabel("Source URL").fill("https://example.org/article");
  await page.getByLabel("Access date").fill("15 September 2026");
  await page.getByRole("button", { name: "Add footnote" }).click();
  await expect(page.locator(".footnote-row")).toHaveCount(5);
  await expect(page.getByRole("button", { name: "Copy all" })).toBeEnabled();
});
test("formatted export, portable backup and import undo", async ({
  page,
}, info) => {
  await page.getByRole("button", { name: "Try an example" }).click();
  await page.getByLabel("Start at").fill("20");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download HTML" }).click();
  const html = await readFile((await (await downloadPromise).path())!, "utf8");
  expect(html).toContain("<i>Ibid</i>");
  expect(html).toContain('start="20"');
  const backupPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Back up" }).click();
  const backup = await backupPromise;
  const backupPath = await backup.path();
  await page.getByRole("button", { name: "Clear list" }).click();
  await page.getByLabel("Import workspace backup").setInputFiles(backupPath!);
  await expect(page.locator(".footnote-row")).toHaveCount(3);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(page.locator(".reading-preview")).toHaveAttribute("start", "20");
  await page.screenshot({
    path: `.audit/${info.project.name}-populated.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator(".reading-preview")).toHaveCount(0);
});
test("lookup success and failure preserve manual workflow", async ({
  page,
}) => {
  await page.route("**/api/elitigation?*", (route) =>
    route.fulfill({
      json: {
        year: "2023",
        court: "SGCA",
        caseNo: "5",
        caseName: "A v B",
        sourceUrl: "https://www.elitigation.sg/gd/s/2023_SGCA_5",
      },
    }),
  );
  await page.getByLabel("Start with a citation or URL").fill("[2023] SGCA 5");
  await page.getByRole("button", { name: "Look up", exact: true }).click();
  await expect(page.getByLabel("Case name")).toHaveValue("A v B");
  await page.getByRole("button", { name: "Add footnote" }).click();
  await expect(page.locator(".footnote-row")).toContainText(
    "A v B [2023] SGCA 5.",
  );
  await page.route("**/api/elitigation?*", (route) =>
    route.fulfill({
      status: 502,
      json: { error: "The judgment could not be retrieved." },
    }),
  );
  await page.getByLabel("Start with a citation or URL").fill("[2024] SGCA 9");
  await page.getByRole("button", { name: "Look up", exact: true }).click();
  await expect(page.locator(".lookup-box")).toContainText(
    "could not be retrieved",
  );
  await expect(page.getByLabel("Judgment year")).toHaveValue("2024");
  await page.getByLabel("Case name").fill("Manual v Entry");
  await page.getByRole("button", { name: "Add footnote" }).click();
  await expect(page.locator(".footnote-row")).toHaveCount(2);
});
test("corrupt storage is preserved and valid legacy data migrates", async ({
  page,
}) => {
  await page.evaluate(() =>
    localStorage.setItem("sal-citation-generator:v3", "{invalid"),
  );
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Download original data" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      localStorage.getItem("sal-citation-generator:v3"),
    ),
  ).toBe("{invalid");
  await page.evaluate(() => {
    localStorage.removeItem("sal-citation-generator:v3");
    localStorage.setItem(
      "sal-citation-generator:v2",
      JSON.stringify([
        {
          type: "case",
          caseName: "Legacy v Case",
          reportCitation: "[2020] 1 SLR 100",
          paraStart: "10",
        },
      ]),
    );
  });
  await page.reload();
  await expect(page.locator(".footnote-row")).toContainText(
    "Legacy v Case [2020] 1 SLR 100 at [10].",
  );
});
test("storage unavailable and bad import remain recoverable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    };
  });
  await page.reload();
  await page.getByRole("button", { name: "Try an example" }).click();
  await expect(page.locator(".footnote-row")).toHaveCount(3);
  await expect(page.locator(".status-message")).toContainText("Example loaded");
  await page.getByLabel("Import workspace backup").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.locator(".status-message")).toContainText(
    "not a supported",
  );
  await expect(page.locator(".footnote-row")).toHaveCount(3);
});
test("populated workspace passes accessibility checks and keyboard sorting", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Try an example" }).click();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  const handle = page.getByRole("button", { name: "Reorder footnote 3" });
  await handle.focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator(".footnote-row").nth(1)).toContainText(
    "Id, at [12].",
  );
});

test("switching source types retains drafts and rich copy includes italics", async ({
  page,
  context,
}) => {
  await page.getByLabel("Case name").fill("A retained draft");
  await page.getByRole("button", { name: "Book", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("A retained book");
  await page.getByRole("button", { name: "Case", exact: true }).click();
  await expect(page.getByLabel("Case name")).toHaveValue("A retained draft");
  await page.getByRole("button", { name: "Try an example" }).click();
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy all" }).click();
  await expect(page.locator(".status-message")).toContainText(
    "Copied with italics",
  );
  const clipboard = await page.evaluate(async () => {
    const items = await navigator.clipboard.read();
    return (await items[0].getType("text/html")).text();
  });
  expect(clipboard).toContain("<i>Ibid</i>");
});

test("a second tab cannot silently overwrite newer workspace changes", async ({
  page,
  context,
}) => {
  await page.getByRole("button", { name: "Try an example" }).click();
  const other = await context.newPage();
  await other.goto("/");
  await expect(other.locator(".footnote-row")).toHaveCount(3);
  await other.getByLabel("Manuscript title").fill("Changed in another tab");
  await expect(page.locator(".persistent-storage-warning")).toBeVisible();
  await page.getByRole("button", { name: "Remove footnote 3" }).click();
  expect(
    await other.evaluate(
      () =>
        JSON.parse(localStorage.getItem("sal-citation-generator:v3")!).title,
    ),
  ).toBe("Changed in another tab");
  await expect(other.locator(".footnote-row")).toHaveCount(3);
  await other.close();
});
