import { expect, test } from "@playwright/test";

test("recupera dados persistidos por uma versão anterior", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("kurio-visitor", "legacy");
    localStorage.setItem(
      "kurio-mock-db-v2",
      JSON.stringify({
        carts: { "guest:legacy": { version: 1 } },
        scenario: { latency: 0 },
      }),
    );
  });

  await page.goto("/");

  await expect(
    page.getByText("Emerald Ape #042", { exact: true }).first(),
  ).toBeVisible();
  const migratedItems = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("kurio-mock-db-v2") || "{}");
    return stored.carts?.["guest:legacy"]?.items;
  });
  expect(migratedItems).toEqual([]);
  await expect(page.getByText("Não foi possível abrir esta página")).toHaveCount(
    0,
  );
});
