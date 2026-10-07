import { test, expect } from "@playwright/test";
import { addNft, boot, checkout, control, login, scenario } from "./helpers";
test.beforeEach(async ({ page }) => boot(page));
test("busca, filtros, ordenação e histórico preservam URL", async ({
  page,
}) => {
  if (page.viewportSize()!.width < 600)
    await page.getByRole("button", { name: "Abrir filtros" }).click();
  await page
    .getByRole("checkbox", { name: "Arte digital", exact: true })
    .check();
  await page.getByRole("checkbox", { name: "Ethereum", exact: true }).check();
  if (page.viewportSize()!.width < 600)
    await page.getByRole("button", { name: "Ver resultados" }).click();
  await expect(page).toHaveURL(/categories=Arte/);
  await expect(page.locator(".catalog-main .nft-card")).toHaveCount(4);
  await page.getByLabel("Ordenar NFTs").selectOption("price-asc");
  await page.reload();
  await expect(page.getByLabel("Ordenar NFTs")).toHaveValue("price-asc");
  await page.goBack();
  await expect(page).toHaveURL(/categories=/);
});
test("paginação e resultado vazio", async ({ page }) => {
  await page.getByRole("button", { name: "Página 2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Página 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  const search =
    page.viewportSize()!.width < 600
      ? page.getByRole("textbox", { name: "Buscar NFTs", exact: true })
      : page.getByLabel("Buscar no catálogo", { exact: true });
  await search.fill("nenhum-nft-existente");
  await search.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Nenhum NFT encontrado" }),
  ).toBeVisible();
});
test("detalhe direto, quantidade e recurso inexistente", async ({ page }) => {
  await page.goto("/nft/042");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "1/1", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(page.locator(".quantity span")).toHaveText("2");
  await page.goto("/nft/inexistente");
  await expect(page.getByRole("alert")).toContainText("não foi encontrado");
});
test("carrinho visitante persiste e é preservado no login", async ({
  page,
}) => {
  await addNft(page);
  await page.reload();
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await login(page, "nova@kurio.demo", "/cart");
  await expect(page.locator(".cart-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Aumentar quantidade" }).click();
  await expect(page.locator(".quantity span")).toHaveText("2");
  await page.getByLabel("Código promocional").fill("INVALIDO");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByText(/Cupom inválido/)).toBeVisible();
  await page.getByLabel("Código promocional").fill("KURIO10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.locator(".applied-coupon")).toContainText("KURIO10");
  await expect(page.locator(".grand-total")).toContainText("2.158 ETH");
  await page.getByRole("button", { name: "Remover", exact: true }).click();
  await expect(page.locator(".grand-total")).toContainText("2.396 ETH");
  await page.getByRole("button", { name: "Remover Emerald Ape #042" }).click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("compra confirmada, clique repetido e snapshot do recibo", async ({
  page,
}) => {
  await checkout(page);
  await page
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .dblclick();
  await expect(page).toHaveURL(/\/order\//);
  await control(page, "settle");
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
  await expect(page.locator(".receipt .grand-total")).toContainText(
    "1.206 ETH",
  );
  await control(page, "nft", { id: "042", price: "8.99" });
  await page.reload();
  await expect(page.locator(".receipt .grand-total")).toContainText(
    "1.206 ETH",
  );
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho está vazio" }),
  ).toBeVisible();
});
test("pagamento recusado preserva carrinho", async ({ page }) => {
  await checkout(page);
  await scenario(page, { payment: "declined" });
  await page
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  await control(page, "settle");
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado" }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.locator(".cart-row")).toHaveCount(1);
});
test("timeout recupera o mesmo pedido após refresh", async ({ page }) => {
  await checkout(page);
  await scenario(page, { timeout: true });
  await page
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar pedido" }),
  ).toBeVisible({ timeout: 15000 });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Recuperar pedido" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Recuperar pedido" }).click();
  await expect(page).toHaveURL(/\/order\//);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
});
test("Socket.IO muda cotação e tolera duplicatas e eventos antigos", async ({
  page,
}) => {
  await checkout(page);
  await control(page, "nft", { id: "042", price: "2.39", mode: "duplicate" });
  await expect(
    page.getByText("Preço ou disponibilidade atualizado. Revise seu carrinho."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("mudou");
  await expect(page.locator(".grand-total").first()).toContainText("2.406 ETH");
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  await control(page, "settle");
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
});
test("interrupção da conexão recupera pedido pendente", async ({ page }) => {
  await checkout(page);
  await page
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  await expect(page).toHaveURL(/\/order\//);
  await control(page, "disconnect");
  await control(page, "settle");
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estão na sua carteira",
    }),
  ).toBeVisible();
});
test("favorito otimista faz rollback em falha", async ({ page }) => {
  await login(page, "nova@kurio.demo", "/nft/042");
  await page.getByRole("button", { name: "Favoritar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Favoritado", exact: true }),
  ).toBeVisible();
  await scenario(page, { name: "favorite-failure" });
  await page.getByRole("button", { name: "Favoritado", exact: true }).click();
  await expect(
    page.getByText("Não foi possível atualizar seus favoritos."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Favoritado", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Favoritado", exact: true }),
  ).toBeVisible();
});
test("perfil e senha persistem e carteiras validam endereço", async ({
  page,
}) => {
  await login(page);
  await page
    .getByLabel("Nome de exibição", { exact: true })
    .fill("Nova Atualizada");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByText("Perfil salvo.")).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("Nome de exibição", { exact: true }),
  ).toHaveValue("Nova Atualizada");
  await page.getByLabel("Senha atual", { exact: true }).fill("incorreta");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123!");
  await page
    .getByLabel("Confirmar nova senha", { exact: true })
    .fill("NovaSenha123!");
  await page
    .getByRole("button", { name: "Alterar senha", exact: true })
    .click();
  await expect(page.getByText("A senha atual está incorreta.")).toBeVisible();
  await page.goto("/wallets");
  await page
    .getByLabel("Endereço da carteira", { exact: true })
    .first()
    .fill("invalido");
  await page
    .getByRole("button", { name: "Salvar carteira", exact: true })
    .first()
    .click();
  await expect(page.getByRole("alert")).toContainText("Endereço inválido");
});
test("cadastro, conflito e expiração preservam contexto", async ({ page }) => {
  await page.goto("/signup");
  const form =
    page.viewportSize()!.width > 600
      ? page.getByRole("dialog")
      : page.locator(".mobile-auth");
  await form
    .getByLabel("Nome de exibição", { exact: true })
    .fill("Novo Colecionador");
  await form
    .getByLabel("Nome de usuário", { exact: true })
    .fill("colecionador");
  await form.getByLabel("E-mail", { exact: true }).fill("nova@kurio.demo");
  await form.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await form.getByLabel("Confirmar senha", { exact: true }).fill("Kurio123!");
  await form.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText("já cadastrado");
  await form.getByLabel("E-mail", { exact: true }).fill("novo@kurio.demo");
  await form.getByRole("button", { name: "Criar perfil", exact: true }).click();
  await expect(page).not.toHaveURL(/signup/);
  await page.goto("/profile");
  await control(page, "expire");
  await page.reload();
  await expect(page).toHaveURL(/\/login/);
  await expect(page).toHaveURL(/redirect=%2Fprofile/);
});
test("skeleton, erro de rede e recuperação", async ({ page }) => {
  await scenario(page, { name: "slow", latency: 1500 });
  await page.goto("/nft/042");
  await expect(page.getByLabel("Carregando")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await scenario(page, { failure: true, latency: 0 });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("indisponível");
  await scenario(page, { failure: false });
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
});
test("diálogo mantém foco e não há overflow horizontal", async ({ page }) => {
  await page
    .getByRole("button", { name: "Abrir cenários de demonstração" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Cenários de demonstração" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(dialog).toContainText("Resetar todos os dados");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Abrir cenários de demonstração" }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
