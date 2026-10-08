import { expect, test } from "@playwright/test";
import { normalizeCart } from "../src/lib/api";

test("normaliza resposta legada do carrinho antes da renderização", () => {
  expect(normalizeCart({ version: 7, coupon: "KURIO10" })).toEqual({
    items: [],
    version: 7,
    coupon: "KURIO10",
  });
});

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
  await expect(
    page.getByText("Não foi possível abrir esta página"),
  ).toHaveCount(0);
});

test("descarta itens corrompidos sem perder o carrinho válido", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("kurio-visitor", "legacy-items");
    localStorage.setItem(
      "kurio-mock-db-v2",
      JSON.stringify({
        carts: {
          "guest:legacy-items": {
            version: 1,
            items: [
              null,
              {},
              { nftId: "inexistente", edition: "1/50", quantity: 1 },
              { nftId: "042", edition: "1/50", quantity: 1 },
            ],
          },
        },
        scenario: { latency: 0 },
      }),
    );
  });

  await page.goto("/cart");

  await expect(page.locator(".cart-row")).toHaveCount(1);
  await expect(
    page.getByText("Emerald Ape #042", { exact: true }),
  ).toBeVisible();
  const items = await page.evaluate(() => {
    const stored = JSON.parse(localStorage.getItem("kurio-mock-db-v2") || "{}");
    return stored.carts?.["guest:legacy-items"]?.items;
  });
  expect(items).toEqual([{ nftId: "042", edition: "1/50", quantity: 1 }]);
});
