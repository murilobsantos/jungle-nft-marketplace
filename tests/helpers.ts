import { expect, type Page } from "@playwright/test";
export async function boot(page: Page) {
  await page.goto("/");
  await expect(
    page.getByText("Emerald Ape #042", { exact: true }).first(),
  ).toBeVisible();
  await scenario(page, {
    name: "standard",
    latency: 0,
    failure: false,
    payment: "confirmed",
    timeout: false,
  });
}
export async function control(
  page: Page,
  action: string,
  data: Record<string, unknown> = {},
) {
  await expect(page.locator("#main")).toBeVisible();
  return page.evaluate(
    async ({ action, data }) => {
      const response = await fetch("/api/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("kurio-token") || ""}`,
          "X-Visitor": localStorage.getItem("kurio-visitor") || "",
        },
        body: JSON.stringify({ action, ...data }),
      });
      return response.json();
    },
    { action, data },
  );
}
export async function scenario(page: Page, data: Record<string, unknown>) {
  await control(page, "scenario", { scenario: data });
}
export async function login(
  page: Page,
  email = "nova@kurio.demo",
  redirect = "/profile",
  password = "Kurio123!",
) {
  await page.goto(`/login?redirect=${encodeURIComponent(redirect)}`);
  const form =
    page.viewportSize()!.width > 600
      ? page.getByRole("dialog")
      : page.locator(".mobile-auth");
  await expect(form).toBeVisible();
  await form.getByLabel("E-mail", { exact: true }).fill(email);
  await form.getByLabel("Senha", { exact: true }).fill(password);
  await form.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(
    (url) => url.pathname === new URL(redirect, url).pathname,
  );
}
export async function addNft(page: Page) {
  await page.goto("/nft/042");
  await page.getByRole("button", { name: "COMPRAR", exact: true }).click();
  await expect(page).toHaveURL(/\/cart/);
  await expect(page.locator(".cart-row")).toHaveCount(1);
}
export async function checkout(page: Page) {
  await login(page, "nova@kurio.demo", "/");
  await addNft(page);
  await page.getByRole("button", { name: "Conectar e finalizar" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Revise sua compra" }),
  ).toBeVisible();
}
