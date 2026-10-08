import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  Heart,
  Home,
  LogIn,
  ScanLine,
  Search,
  Settings2,
  ShoppingCart,
  UserRound,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Suspense, useState } from "react";
import { Skeleton } from "./components/common";
import { useQueryClient } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";
import { AppProvider, useApp, useCart } from "./state";
import { Button } from "./components/ui/button";
import { Modal } from "./components/ui/dialog";
import { demo } from "./lib/api";
import { errorMessage } from "./lib/api";
export function Shell() {
  return (
    <AppProvider>
      <Frame />
    </AppProvider>
  );
}
function Frame() {
  const { session, logout, connected } = useApp(),
    cart = useCart(),
    path = useRouterState({ select: (state) => state.location.pathname });
  const [controls, setControls] = useState(false);
  const cartItems = Array.isArray(cart.data?.items) ? cart.data.items : [];
  const cartQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const auth = path === "/login" || path === "/signup",
    account = ["/profile", "/wallets", "/favorites"].includes(path),
    receipt = path.startsWith("/order/");
  return (
    <>
      <a className="skip-link" href="#main">
        Ir ao conteúdo
      </a>
      <div className={`app-shell ${auth ? "is-auth" : ""}`}>
        <header className="header">
          <Link to="/" className="brand">
            KURIO
          </Link>
          <nav aria-label="Navegação principal">
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "active" }}
            >
              Início
            </Link>
            <Link
              to="/"
              search={{ tab: "all" }}
              activeProps={{ className: "" }}
              className={
                path.startsWith("/nft") ||
                path === "/cart" ||
                path === "/checkout"
                  ? "active"
                  : ""
              }
            >
              Mercado
            </Link>
            <button
              onClick={() =>
                toast.info(
                  "Página de criadores fora do escopo da demonstração.",
                )
              }
            >
              Criadores
            </button>
            <button
              onClick={() =>
                toast.info("Conteúdo editorial fora do escopo da demonstração.")
              }
            >
              Aprenda
            </button>
          </nav>
          <div className="header-actions">
            <Link to="/" hash="catalogo" aria-label="Buscar NFTs">
              <Search size={23} />
            </Link>
            <Link
              to="/cart"
              className="header-cart"
              aria-label={`Carrinho com ${cartQuantity} itens`}
            >
              <ShoppingCart size={24} />
              {!!cartItems.length && <span>{cartQuantity}</span>}
            </Link>
            {session ? (
              <>
                <Link to="/profile" className="account-link">
                  <UserRound size={17} />
                  {session.user.username}
                </Link>
                <button
                  className="logout-icon"
                  aria-label="Sair da conta"
                  onClick={() => void logout()}
                >
                  Sair
                </button>
              </>
            ) : (
              <Button size="sm" asChild>
                <Link to="/login" search={{ redirect: path }}>
                  <LogIn size={17} />
                  Entrar
                </Link>
              </Button>
            )}
          </div>
        </header>
        <main
          id="main"
          tabIndex={-1}
          className={path.startsWith("/nft/") ? "detail-main" : undefined}
        >
          <Suspense
            fallback={
              <div className="detail-loading">
                <Skeleton />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </main>
        {!account && !auth && !receipt && <Footer />}
        <nav
          className={`bottom-nav ${auth || path === "/checkout" || path.startsWith("/nft/") || receipt ? "hide" : ""}`}
          aria-label="Navegação mobile"
        >
          <Link to="/" aria-label="Início">
            <Home />
          </Link>
          <Link to="/favorites" aria-label="Favoritos">
            <Heart />
          </Link>
          <button
            className="scan-button"
            aria-label="Explorar coleções"
            onClick={() =>
              document
                .getElementById("catalogo")
                ?.scrollIntoView({ behavior: "smooth" })
            }
          >
            <ScanLine />
          </button>
          <Link to="/cart" aria-label="Carrinho">
            <ShoppingCart />
          </Link>
          <Link to="/profile" aria-label="Perfil">
            <UserRound />
          </Link>
        </nav>
      </div>
      <button
        className="demo-toggle"
        onClick={() => setControls(true)}
        aria-label="Abrir cenários de demonstração"
      >
        <Settings2 size={16} />
        <span>Demo</span>
        {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
      </button>
      <DemoControls open={controls} close={() => setControls(false)} />
      <Toaster position="top-right" richColors closeButton theme="dark" />
    </>
  );
}
function Footer() {
  return (
    <footer>
      <div className="footer-features">
        {[
          [
            "W",
            "Segurança da carteira",
            "Proteja sua carteira e colecione arte digital verificada com confiança.",
          ],
          [
            "C",
            "Criadores em destaque",
            "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.",
          ],
          [
            "D",
            "Alertas de lançamentos",
            "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.",
          ],
        ].map(([icon, title, copy]) => (
          <article key={icon}>
            <span>{icon}</span>
            <h3>{title}</h3>
            <p>{copy}</p>
          </article>
        ))}
        <article>
          <h3>Antecipe-se ao próximo lançamento</h3>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              toast.info(
                "Cadastro de newsletter fora do escopo da demonstração.",
              );
            }}
          >
            <label className="sr-only" htmlFor="newsletter">
              E-mail para newsletter
            </label>
            <div>
              <input
                type="email"
                required
                id="newsletter"
                placeholder="digite seu e-mail..."
              />
              <Button size="sm">Enviar</Button>
            </div>
          </form>
          <p>
            Receba lançamentos selecionados, histórias de criadores e novidades
            do mercado.
          </p>
        </article>
      </div>
      <div className="footer-contact">
        <strong>KURIO</strong>
        <span>
          Feito para colecionadores,
          <br />
          criadores e cultura
        </span>
        <a href="mailto:contato@email.com">contato@email.com</a>
        <a href="tel:+551140028922">+55 11 4002 8922</a>
      </div>
      <div className="footer-links">
        <div>
          <h3>Meu perfil</h3>
          <Link to="/profile">Meu perfil</Link>
          <Link to="/favorites">Minha coleção</Link>
          <Link to="/wallets">Carteiras</Link>
          <Link to="/favorites">Lista de interesse</Link>
        </div>
        <div>
          <h3>Central de ajuda</h3>
          <span>Como comprar NFTs</span>
          <span>Carteira e segurança</span>
          <span>Política do mercado</span>
          <span>Denunciar item</span>
        </div>
        <div>
          <h3>Coleções</h3>
          {["Arte digital", "Fotografia", "Música", "Arte 3D", "Utilidade"].map(
            (category) => (
              <Link key={category} to="/" search={{ categories: category }}>
                {category}
              </Link>
            ),
          )}
        </div>
        <div>
          <h3>Redes sociais</h3>
          <div className="social-links">
            {["f", "◎", "𝕏", "in", "▶"].map((social, i) => (
              <a
                key={social}
                href={
                  [
                    "https://facebook.com",
                    "https://instagram.com",
                    "https://x.com",
                    "https://linkedin.com",
                    "https://youtube.com",
                  ][i]
                }
                target="_blank"
                rel="noreferrer"
                aria-label={
                  ["Facebook", "Instagram", "X", "LinkedIn", "YouTube"][i]
                }
              >
                {social}
              </a>
            ))}
          </div>
          <h3>Carteiras compatíveis</h3>
          <small className="wallet-badge">
            METAMASK · WALLETCONNECT · COINBASE
          </small>
        </div>
      </div>
      <p className="copyright">© 2026 Kurio. Propriedade digital para todos.</p>
    </footer>
  );
}
function DemoControls({ open, close }: { open: boolean; close: () => void }) {
  const client = useQueryClient(),
    cart = useCart();
  const [scenario, setScenario] = useState("standard"),
    [busy, setBusy] = useState(false);
  async function action(name: string, data: object = {}) {
    setBusy(true);
    try {
      await demo(name, data);
      if (name === "reset") {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key?.startsWith("kurio-") && key !== "kurio-mock-db-v2")
            localStorage.removeItem(key);
        }
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key?.startsWith("kurio-")) sessionStorage.removeItem(key);
        }
        window.location.href = "/";
        return;
      }
      if (name === "scenario") void client.invalidateQueries();
      if (name === "expire")
        void client.invalidateQueries({ queryKey: ["session"] });
      toast.success("Cenário aplicado.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal open={open} onClose={close} title="Cenários de demonstração">
      <p className="muted">
        Dados fictícios. Credenciais: nova@kurio.demo ou luna@kurio.demo ·
        Kurio123!
      </p>
      <label className="field">
        Cenário
        <select
          value={scenario}
          onChange={(event) => {
            const value = event.target.value;
            setScenario(value);
            void action("scenario", {
              scenario: {
                name: value,
                latency: value === "slow" ? 2000 : 180,
                failure: value === "offline",
                payment: value === "declined" ? "declined" : "confirmed",
                timeout: value === "timeout",
              },
            });
          }}
        >
          {[
            ["standard", "Padrão"],
            ["slow", "Carregamento lento"],
            ["variable-latency", "Latência variável"],
            ["offline", "Falha HTTP 503"],
            ["network-error", "Falha de conexão"],
            ["favorite-failure", "Falha em favoritos"],
            ["declined", "Pagamento recusado"],
            ["timeout", "Timeout após criar pedido"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="demo-actions">
        <Button
          disabled={busy}
          onClick={() =>
            void action("nft", {
              id: cart.data?.items[0]?.nftId || "042",
              price: "2.19",
            })
          }
        >
          Alterar preço via Socket.IO
        </Button>
        <Button
          disabled={busy}
          onClick={() =>
            void action("nft", {
              id: cart.data?.items[0]?.nftId || "042",
              soldout: true,
            })
          }
        >
          Esgotar NFT via Socket.IO
        </Button>
        <Button
          disabled={busy}
          onClick={() =>
            void action("nft", {
              id: cart.data?.items[0]?.nftId || "042",
              price: "2.39",
              mode: "duplicate",
            })
          }
        >
          Eventos duplicados e antigos
        </Button>
        <Button disabled={busy} onClick={() => void action("disconnect")}>
          Interromper conexão
        </Button>
        <Button disabled={busy} onClick={() => void action("expire")}>
          Expirar sessão
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void action("reset")}
        >
          Resetar todos os dados
        </Button>
      </div>
    </Modal>
  );
}
