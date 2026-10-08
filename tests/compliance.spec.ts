import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { addNft, boot, checkout, control, login } from "./helpers";

test.beforeEach(async ({ page }) => boot(page));

test("rota protegida, credencial inválida e logout preservam o destino", async ({
  page,
}) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/);

  const form =
    page.viewportSize()!.width > 600
      ? page.getByRole("dialog")
      : page.locator(".mobile-auth");
  await form.getByLabel("E-mail", { exact: true }).fill("nova@kurio.demo");
  await form.getByLabel("Senha", { exact: true }).fill("senha-incorreta");
  await form.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(form.getByRole("alert")).toContainText(
    "E-mail ou senha incorretos",
  );

  await form.getByLabel("Senha", { exact: true }).fill("Kurio123!");
  await form.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/profile");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === "/");
  expect(
    await page.evaluate(() => localStorage.getItem("kurio-token")),
  ).toBeNull();
});

test("favoritos e pedidos privados não vazam entre usuários", async ({
  page,
}) => {
  await login(page, "nova@kurio.demo", "/nft/042");
  await page.getByRole("button", { name: "Favoritar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Favoritado", exact: true }),
  ).toBeVisible();

  await checkout(page);
  await page
    .getByRole("button", { name: "Confirmar pedido", exact: true })
    .click();
  await expect(page).toHaveURL(/\/order\//);
  const privateOrderPath = new URL(page.url()).pathname;

  await page.goto("/profile");
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "luna@kurio.demo", privateOrderPath);
  await expect(page.getByRole("alert")).toContainText(
    "pedido pertence a outra conta",
  );

  await page.goto("/nft/042");
  await expect(
    page.getByRole("button", { name: "Favoritar", exact: true }),
  ).toBeVisible();
  await page.goto("/favorites");
  await expect(
    page.getByText("Você ainda não favoritou nenhum NFT."),
  ).toBeVisible();
});

test("cupom expirado e estoque esgotado bloqueiam o checkout", async ({
  page,
}) => {
  await addNft(page);
  await page.getByLabel("Código promocional").fill("EXPIRADO");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByText("Este cupom expirou.")).toBeVisible();

  await control(page, "nft", { id: "042", soldout: true });
  await expect(page.getByText(/Disponíveis: 0/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Conectar e finalizar", exact: true }),
  ).toBeDisabled();
});

test("checkout trata recusa e desconexão da carteira", async ({ page }) => {
  await login(page, "nova@kurio.demo", "/");
  await addNft(page);
  await page.getByRole("button", { name: "Conectar e finalizar" }).click();

  await page.getByRole("button", { name: "Simular recusa" }).click();
  await expect(page.getByRole("alert")).toContainText("conexão foi recusada");
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeDisabled();

  await page
    .getByRole("button", { name: "Conectar carteira", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Carteira conectada");
  await page.getByRole("button", { name: "Desconectar", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Carteira desconectada");
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeDisabled();
});

test("respostas fora de ordem não sobrescrevem a busca mais recente", async ({
  page,
}) => {
  await control(page, "scenario", {
    scenario: { name: "variable-latency", latency: 0 },
  });
  const search =
    page.viewportSize()!.width < 600
      ? page.getByRole("textbox", { name: "Buscar NFTs", exact: true })
      : page.getByLabel("Buscar no catálogo", { exact: true });

  await search.fill("Sage");
  await search.press("Enter");
  await search.fill("Emerald");
  await search.press("Enter");

  await expect(page).toHaveURL(/q=Emerald/);
  await expect(
    page.getByText("Emerald Ape #042", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByText("Sage Nomad #009", { exact: true })).toHaveCount(
    0,
  );
});

test("campo de busca acompanha back e forward do histórico", async ({
  page,
}) => {
  const search =
    page.viewportSize()!.width < 600
      ? page.getByRole("textbox", { name: "Buscar NFTs", exact: true })
      : page.getByLabel("Buscar no catálogo", { exact: true });

  await search.fill("Sage");
  await search.press("Enter");
  await expect(page).toHaveURL(/q=Sage/);
  await search.fill("Emerald");
  await search.press("Enter");
  await expect(page).toHaveURL(/q=Emerald/);

  await page.goBack();
  await expect(page).toHaveURL(/q=Sage/);
  await expect(search).toHaveValue("Sage");
  await expect(
    page.getByText("Sage Nomad #009", { exact: true }).first(),
  ).toBeVisible();

  await page.goForward();
  await expect(page).toHaveURL(/q=Emerald/);
  await expect(search).toHaveValue("Emerald");

  const mobile = page.viewportSize()!.width < 600;
  if (mobile) await page.getByRole("button", { name: "Abrir filtros" }).click();
  const filters = mobile
    ? page.getByRole("dialog", { name: "Filtros" })
    : page.locator(".catalog-sidebar");
  const price = filters.getByLabel("Preço máximo");
  await price.fill("5");
  await filters.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(filters.locator(".range-label")).toHaveText("Preço: 0 – 5 ETH");
  await price.fill("8");
  await filters.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(filters.locator(".range-label")).toHaveText("Preço: 0 – 8 ETH");

  await page.goBack();
  await expect(price).toHaveValue("5");
  await expect(filters.locator(".range-label")).toHaveText("Preço: 0 – 5 ETH");
});

test("parâmetros inválidos da URL são descartados com segurança", async ({
  page,
}) => {
  await page.goto(
    "/?categories=CategoriaInexistente&networks=Bitcoin&sort=invalid&tab=invalid&min=-1&max=999&page=-2",
  );

  await expect(
    page.getByText("Emerald Ape #042", { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Ordenar NFTs")).toHaveValue("recent");
  await expect(
    page.getByRole("button", { name: "Todos os NFTs" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByLabel("Ethereum")).not.toBeChecked();
  await expect(page.getByLabel("Arte digital")).not.toBeChecked();
  await expect(page.locator(".range-label")).toHaveText("Preço: 0 – 12.30 ETH");
});

test("rota desconhecida exibe recuperação navegável", async ({ page }) => {
  await page.goto("/rota-inexistente");

  await expect(
    page.getByRole("heading", { name: "Página não encontrada" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Voltar ao marketplace" }),
  ).toHaveAttribute("href", "/");
});

test("Socket.IO reconecta e volta a atualizar o detalhe sem refresh", async ({
  page,
}) => {
  await page.goto("/nft/042");
  await expect(page.locator(".detail-price strong")).toHaveText("1.19 ETH");

  await control(page, "disconnect");
  await expect(
    page.getByText("Conexão recuperada. Dados sincronizados."),
  ).toBeVisible({ timeout: 10_000 });

  await control(page, "nft", { id: "042", price: "2.49" });
  await expect(page.locator(".detail-price strong")).toHaveText("2.49 ETH");
});

test("páginas críticas não têm violações automáticas de acessibilidade", async ({
  page,
}) => {
  const check = async () => {
    const result = await new AxeBuilder({ page }).analyze();
    expect(result.violations).toEqual([]);
  };

  await check();
  await page.goto("/nft/042");
  await expect(
    page.getByRole("heading", { name: "Emerald Ape #042" }),
  ).toBeVisible();
  await check();

  await checkout(page);
  await check();
});
