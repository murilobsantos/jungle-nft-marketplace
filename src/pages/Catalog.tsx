import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Heart, Search, ShoppingCart, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { rest } from "../lib/api";
import type { CatalogSearch, Nft } from "../domain/types";
import { displayEth } from "../domain/money";
import { useCartMutation, useFavorites } from "../state";
import { Button } from "../components/ui/button";
import { Modal } from "../components/ui/dialog";
import { ErrorPanel, Skeleton } from "../components/common";

export const defaults: CatalogSearch = {
  q: "",
  categories: "",
  networks: "",
  sort: "recent",
  tab: "all",
  min: "0",
  max: "12.30",
  page: 1,
};
const categories = [
  "Arte digital",
  "Fotografia",
  "Música",
  "Arte 3D",
  "Colecionáveis",
  "Generativa",
  "Jogos",
  "Assinaturas",
  "Utilidade",
];
export function NftCard({ nft }: { nft: Nft }) {
  const favorite = useFavorites(),
    cart = useCartMutation();
  return (
    <article className="nft-card">
      <div className="nft-art">
        <Link to="/nft/$id" params={{ id: nft.id }}>
          <img
            src={nft.image}
            srcSet={`${nft.image.replace(".webp", "-card.webp")} 400w, ${nft.image} 900w`}
            sizes="(max-width: 600px) 45vw, 320px"
            alt={nft.title}
            width="320"
            height="320"
            loading="eager"
          />
        </Link>
        <div className="card-actions">
          <button
            disabled={cart.isPending || !nft.supply}
            onClick={() =>
              cart.mutate({ nftId: nft.id, edition: nft.edition, quantity: 1 })
            }
            aria-label={`Adicionar ${nft.title} ao carrinho`}
          >
            <ShoppingCart size={18} />
          </button>
          <button
            disabled={favorite.pending}
            onClick={() => favorite.toggle(nft.id)}
            aria-label={`${favorite.ids.includes(nft.id) ? "Remover" : "Adicionar"} ${nft.title} ${favorite.ids.includes(nft.id) ? "dos" : "aos"} favoritos`}
          >
            <Heart
              size={18}
              fill={favorite.ids.includes(nft.id) ? "currentColor" : "none"}
            />
          </button>
          <Link
            to="/nft/$id"
            params={{ id: nft.id }}
            aria-label={`Ver ${nft.title}`}
          >
            <Search size={18} />
          </Link>
        </div>
        {!nft.supply && <span className="sold-out">Esgotado</span>}
      </div>
      <Link to="/nft/$id" params={{ id: nft.id }} className="nft-title">
        {nft.title}
      </Link>
      <strong className="nft-price">{displayEth(nft.price)} ETH</strong>
    </article>
  );
}
export function Hero() {
  return (
    <section className="hero">
      <div className="hero-copy">
        <p>Bem-vindo à Kurio</p>
        <h1>
          <span className="desktop-only">
            SEJA DONO DO FUTURO
            <br />
            DA ARTE DIGITAL
          </span>
          <span className="mobile-only">
            SEJA DONO DA
            <br />
            CULTURA DIGITAL
          </span>
        </h1>
        <p className="muted">
          Descubra NFTs selecionados de criadores emergentes e consagrados.
          Colecione arte digital rara, apoie artistas e tenha uma parte da
          cultura da internet.
        </p>
        <Button asChild>
          <a href="#catalogo">
            EXPLORAR <span className="mobile-only">→</span>
          </a>
        </Button>
      </div>
      <img
        className="hero-image"
        src="/assets/emerald.webp"
        width="450"
        height="450"
        alt="Emerald Ape, macaco com óculos e jaqueta verde"
        fetchPriority="high"
      />
      <img
        className="hero-small mobile-only"
        src="/assets/sage.webp"
        width="85"
        height="85"
        alt=""
      />
      <span className="hero-dots" aria-hidden="true">
        ● ● ●
      </span>
    </section>
  );
}
export function Catalog({ search = defaults }: { search?: CatalogSearch }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(false),
    [draft, setDraft] = useState(search.q),
    [range, setRange] = useState(search.max);
  useEffect(() => setDraft(search.q), [search.q]);
  useEffect(() => setRange(search.max), [search.max]);
  const query = useQuery({
    queryKey: ["catalog", search],
    queryFn: ({ signal }) => rest.catalog(search, signal),
  });
  function change(next: Partial<CatalogSearch>) {
    void navigate({
      to: "/",
      search: { ...search, ...next, page: next.page ?? 1 },
    });
  }
  function toggle(key: "categories" | "networks", value: string) {
    const values = search[key].split(",").filter(Boolean);
    change({
      [key]: values.includes(value)
        ? values.filter((item) => item !== value).join(",")
        : [...values, value].join(","),
    });
  }
  const filterContent = (
    <>
      <h2 className="filter-heading">Coleções</h2>
      {categories.map((category, i) => (
        <label className="filter-choice" key={category}>
          <input
            type="checkbox"
            checked={search.categories.split(",").includes(category)}
            aria-label={category}
            onChange={() => toggle("categories", category)}
          />
          <span>{category}</span>
          <small>({[33, 12, 65, 39, 23, 17, 19, 13, 18][i]})</small>
        </label>
      ))}
      <h2 className="section-subheading">Faixa de preço</h2>
      <input
        aria-label="Preço máximo"
        type="range"
        min="0"
        max="12.30"
        step="0.01"
        value={range}
        onChange={(event) => setRange(event.target.value)}
      />
      <p className="range-label">
        Preço: {search.min} – {range} ETH
      </p>
      <Button size="sm" onClick={() => change({ max: range })}>
        Aplicar
      </Button>
      <h2 className="section-subheading">Rede</h2>
      {["Ethereum", "Polygon", "Solana"].map((network, i) => (
        <label className="filter-choice" key={network}>
          <input
            type="checkbox"
            checked={search.networks.split(",").includes(network)}
            aria-label={network}
            onChange={() => toggle("networks", network)}
          />
          <span>{network}</span>
          <small>({[119, 78, 86][i]})</small>
        </label>
      ))}
      {(search.categories ||
        search.networks ||
        search.q ||
        search.max !== "12.30") && (
        <Button
          variant="ghost"
          onClick={() => {
            setDraft("");
            setRange("12.30");
            change(defaults);
          }}
        >
          Limpar filtros
        </Button>
      )}
    </>
  );
  return (
    <>
      <div className="mobile-search">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            change({ q: draft });
          }}
        >
          <Search />
          <input
            aria-label="Buscar NFTs"
            placeholder="Explorar coleções"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        </form>
        <button onClick={() => setFilters(true)} aria-label="Abrir filtros">
          <SlidersHorizontal />
        </button>
      </div>
      <Hero />
      <div className="catalog-layout" id="catalogo">
        <aside className="catalog-sidebar">
          <div className="filters-panel">{filterContent}</div>
          <div className="featured-panel">
            <h2 className="section-subheading">NFT EM DESTAQUE</h2>
            <p>OFERTA LIMITADA</p>
            <Link to="/nft/$id" params={{ id: "009" }}>
              <img
                src="/assets/sage.webp"
                alt="Sage Nomad em destaque"
                width="290"
                height="330"
                loading="lazy"
              />
            </Link>
          </div>
        </aside>
        <section className="catalog-main" aria-label="Catálogo de NFTs">
          <div className="catalog-toolbar">
            <div className="catalog-tabs">
              {[
                ["all", "Todos os NFTs"],
                ["new", "Novos lançamentos"],
                ["trending", "Em alta"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={search.tab === value}
                  className={search.tab === value ? "active" : ""}
                  onClick={() => change({ tab: value })}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="catalog-sort">
              Ordenar por:
              <select
                aria-label="Ordenar NFTs"
                value={search.sort}
                onChange={(event) => change({ sort: event.target.value })}
              >
                <option value="recent">Listados recentemente</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </label>
          </div>
          <form
            className="desktop-catalog-search"
            onSubmit={(event) => {
              event.preventDefault();
              change({ q: draft });
            }}
          >
            <Search size={16} />
            <input
              aria-label="Buscar no catálogo"
              placeholder="Buscar NFTs ou artistas"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit">Buscar</button>
          </form>
          {query.isPending ? (
            <Skeleton cards={9} />
          ) : query.isError ? (
            <ErrorPanel
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : query.data.items.length ? (
            <>
              <div className="nft-grid">
                {query.data.items.map((nft) => (
                  <NftCard key={nft.id} nft={nft} />
                ))}
              </div>
              <nav className="pagination" aria-label="Paginação">
                {Array.from({ length: query.data.pages }, (_, i) => (
                  <button
                    key={i}
                    aria-label={`Página ${i + 1}`}
                    aria-current={search.page === i + 1 ? "page" : undefined}
                    className={search.page === i + 1 ? "active" : ""}
                    onClick={() => change({ page: i + 1 })}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={search.page >= query.data.pages}
                  onClick={() => change({ page: search.page + 1 })}
                  aria-label="Próxima página"
                >
                  ›
                </button>
              </nav>
            </>
          ) : (
            <div className="empty-state">
              <h2>Nenhum NFT encontrado</h2>
              <p>Ajuste sua busca ou os filtros.</p>
              <Button onClick={() => change(defaults)}>Limpar filtros</Button>
            </div>
          )}
          {query.isFetching && !query.isPending && (
            <span className="query-status" role="status">
              Atualizando catálogo…
            </span>
          )}
        </section>
      </div>
      <section className="promos">
        <article>
          <img
            src="/assets/emerald.webp"
            alt=""
            width="290"
            height="240"
            loading="lazy"
          />
          <div>
            <h2 className="section-subheading">
              Lançamentos gênesis
              <br />
              de edição limitada
            </h2>
            <p>
              Colecione edições escassas diretamente dos criadores antes da
              revelação pública.
            </p>
            <Button size="sm" onClick={() => change({ tab: "new" })}>
              Explorar →
            </Button>
          </div>
        </article>
        <article>
          <img
            src="/assets/neon.webp"
            alt=""
            width="290"
            height="240"
            loading="lazy"
          />
          <div>
            <h2 className="section-subheading">
              Arte digital selecionada
              <br />e muito mais
            </h2>
            <p>
              Explore novos artistas, coleções verificadas e obras digitais que
              definem a cultura.
            </p>
            <Button
              size="sm"
              onClick={() => change({ categories: "Arte digital" })}
            >
              Explorar →
            </Button>
          </div>
        </article>
      </section>
      <section className="editorial">
        <h2>Diário da Cunhagem</h2>
        <p>
          Histórias, guias e insights para colecionadores sobre o universo da
          propriedade digital.
        </p>
        <div className="editorial-grid">
          {[
            "Como funciona a propriedade de NFTs",
            "10 artistas digitais para acompanhar",
            "Raridade, atributos e procedência",
            "Como proteger sua carteira",
          ].map((title, i) => (
            <article key={title}>
              <img
                src={`/assets/${["neon", "emerald", "sage", "gold"][i]}.webp`}
                width="300"
                height="230"
                loading="lazy"
                alt=""
              />
              <div>
                <small>15 de setembro | Leitura de 3 min</small>
                <h2 className="section-subheading">{title}</h2>
                <p>Explore histórias e novidades da comunidade digital.</p>
                <span>Conteúdo editorial em breve</span>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Modal
        open={filters}
        onClose={() => setFilters(false)}
        title="Filtros"
        className="filter-dialog"
      >
        {filterContent}
        <Button onClick={() => setFilters(false)}>Ver resultados</Button>
      </Modal>
    </>
  );
}
