import { test, expect } from "@playwright/test";
import { addNft, boot, checkout, control, login, scenario } from "./helpers";

test.beforeEach(async ({ page }) => boot(page));

test("perfil, avatar e senha persistem após nova autenticação", async ({
  page,
}) => {
  await login(page);
  await page
    .getByLabel("Nome de exibição", { exact: true })
    .fill("Nova Atualizada");
  await page
    .getByLabel("Avatar", { exact: true })
    .setInputFiles("public/assets/sage.jpg");
  await page
    .getByRole("button", { name: "Salvar perfil", exact: true })
    .click();
  await expect(page.getByText("Perfil salvo.", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Nome de exibição", { exact: true }),
  ).toHaveValue("Nova Atualizada");
  await expect(page.getByAltText("Seu avatar")).toBeVisible();
  await page.getByLabel("Senha atual", { exact: true }).fill("Kurio123!");
  await page.getByLabel("Nova senha", { exact: true }).fill("Atualizada123!");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("Atualizada123!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(
    page.getByText("Senha alterada.", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".account-sidebar")
    .getByRole("button", { name: "Sair", exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await login(page, "nova@kurio.demo", "/profile", "Atualizada123!");
  await expect(
    page.getByLabel("Nome de exibição", { exact: true }),
  ).toHaveValue("Nova Atualizada");
});

test("carteira editada persiste e contas mantêm carrinhos isolados", async ({
  page,
}) => {
  await login(page);
  await page.goto("/wallets");
  const form = page.locator("#main form").first();
  await form
    .getByLabel("Apelido da carteira", { exact: true })
    .fill("Carteira editada");
  await form
    .getByRole("button", { name: "Salvar carteira", exact: true })
    .click();
  await expect(
    page.getByText("Carteira salva.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page
      .locator("#main form")
      .first()
      .getByLabel("Apelido da carteira", { exact: true }),
  ).toHaveValue("Carteira editada");
  await addNft(page);
  await page.goto("/profile");
  await page
    .locator(".account-sidebar")
    .getByRole("button", { name: "Sair", exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await login(page, "luna@kurio.demo", "/cart");
  await expect(page.locator(".cart-row")).toHaveCount(0);
  await page.goto("/profile");
  await page
    .locator(".account-sidebar")
    .getByRole("button", { name: "Sair", exact: true })
    .click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  await login(page, "nova@kurio.demo", "/cart");
  await expect(page.locator(".cart-row")).toHaveCount(1);
});

test("sessão expirada no pagamento preserva carrinho e destino", async ({
  page,
}) => {
  await checkout(page);
  await page.keyboard.press("Escape");
  await control(page, "expire");
  await page.reload();
  await expect(page).toHaveURL(/\/login.*redirect=%2Fcheckout/);
  await login(page, "nova@kurio.demo", "/checkout");
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.locator(".cart-row")).toHaveCount(1);
});

test("falha de conexão recupera detalhes sem perder navegação", async ({
  page,
}) => {
  await scenario(page, { name: "network-error", latency: 0 });
  await page.goto("/nft/042");
  await expect(page.getByRole("alert")).toBeVisible();
  await scenario(page, { name: "standard" });
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
});
