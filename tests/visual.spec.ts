import { test, expect } from "@playwright/test";
import { addNft, boot, login } from "./helpers";
test.beforeEach(async ({ page }) => {
  await boot(page);
  await page.clock.setFixedTime(new Date("2026-07-29T12:00:00Z"));
});
for (const screen of ["inicio", "detalhe", "carrinho", "pagamento"])
  test(`visual ${screen}`, async ({ page }) => {
    if (screen === "detalhe") {
      await page.goto("/nft/042");
      await expect(
        page.getByRole("heading", { name: "Emerald Ape #042" }),
      ).toBeVisible();
    }
    if (screen === "carrinho") {
      await addNft(page);
    }
    if (screen === "pagamento") {
      await login(page, "nova@kurio.demo", "/");
      await addNft(page);
      await page.getByRole("button", { name: "Conectar e finalizar" }).click();
      await expect(
        page.getByRole("heading", { name: "Seus NFTs" }),
      ).toBeVisible();
    }
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`${screen}.png`, {
      fullPage: true,
      animations: "disabled",
      mask: [
        page.locator(".demo-toggle"),
        page.locator("[data-sonner-toaster]"),
      ],
    });
  });
