import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Search } from "lucide-react";
import { useState } from "react";
import { rest } from "../lib/api";
import { displayEth } from "../domain/money";
import { useCartMutation, useFavorites } from "../state";
import { ErrorPanel, Quantity, Skeleton } from "../components/common";
import { Button } from "../components/ui/button";
import { Modal } from "../components/ui/dialog";
import { defaults, NftCard } from "./Catalog";
export function Detail({ id }: { id: string }) {
  const query = useQuery({
      queryKey: ["nft", id],
      queryFn: ({ signal }) => rest.nft(id, signal),
    }),
    related = useQuery({
      queryKey: ["catalog", defaults],
      queryFn: ({ signal }) => rest.catalog(defaults, signal),
    });
  const [edition, setEdition] = useState("1/50"),
    [quantity, setQuantity] = useState(1),
    [zoom, setZoom] = useState(false);
  const cart = useCartMutation(),
    favorite = useFavorites(),
    navigate = useNavigate();
  if (query.isPending)
    return (
      <div className="detail-loading" key="loading">
        <Skeleton />
      </div>
    );
  if (query.isError)
    return (
      <ErrorPanel error={query.error} retry={() => void query.refetch()} />
    );
  const nft = query.data;
  return (
    <>
      <div className="breadcrumb" key="breadcrumb">
        <Link to="/">Início</Link> / Mercado / {nft.title}
      </div>
      <section className="detail-layout">
        <div className="gallery">
          <div className="gallery-thumbs">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                onClick={() => setZoom(true)}
                aria-label={`Ampliar imagem ${i + 1}`}
              >
                <img src={nft.image} alt="" width="100" height="100" />
              </button>
            ))}
          </div>
          <div className="gallery-main">
            <img
              src={nft.image}
              srcSet={`${nft.image.replace(".webp", "-card.webp")} 400w, ${nft.image} 900w`}
              sizes="(max-width: 600px) calc(100vw - 64px), 600px"
              alt={nft.title}
              width="600"
              height="600"
              fetchPriority="high"
            />
            <button onClick={() => setZoom(true)} aria-label="Ampliar NFT">
              <Search size={23} />
            </button>
          </div>
        </div>
        <div className="detail-info">
          <h1>{nft.title}</h1>
          <div className="detail-price">
            <strong>{displayEth(nft.price)} ETH</strong>
            <span>
              ★★★★☆ <small>19 avaliações de colecionadores</small>
            </span>
          </div>
          <h2 className="section-subheading">Sobre este NFT:</h2>
          <p>
            Um colecionável digital finalizado à mão da coleção Kurio Editions,
            verificado na {nft.network}, com arte desbloqueável e acesso para
            colecionadores.
          </p>
          <h2 className="section-subheading">Edição:</h2>
          <div className="edition-options">
            {["1/1", "1/10", "1/50", "ABERTA"].map((item) => (
              <button
                aria-pressed={edition === item}
                className={edition === item ? "active" : ""}
                disabled={item === "1/1"}
                key={item}
                onClick={() => {
                  setEdition(item);
                  setQuantity(1);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="detail-buy">
            <Quantity
              value={quantity}
              max={Math.min(nft.supply, edition === "1/10" ? 10 : 50)}
              onChange={setQuantity}
              pending={cart.isPending}
            />
            <Button
              disabled={cart.isPending || !nft.supply || quantity > nft.supply}
              onClick={() =>
                cart.mutate(
                  { nftId: id, edition, quantity },
                  { onSuccess: () => void navigate({ to: "/cart" }) },
                )
              }
            >
              {nft.supply ? "COMPRAR" : "ESGOTADO"}
            </Button>
            <Button
              variant="outline"
              disabled={favorite.pending}
              onClick={() => favorite.toggle(id)}
            >
              <Heart
                size={18}
                fill={favorite.ids.includes(id) ? "currentColor" : "none"}
              />
              {favorite.ids.includes(id) ? "Favoritado" : "Favoritar"}
            </Button>
          </div>
          <p>
            ID do token: #{id}
            <br />
            Coleção: Kurio Apes
            <br />
            Atributos: Óculos, Esmeralda, Raro
            <br />
            Disponíveis: {nft.supply}
          </p>
          <strong>Compartilhar este NFT: </strong>
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              void navigator.clipboard.writeText(window.location.href)
            }
          >
            Copiar link
          </Button>
        </div>
      </section>
      <section className="detail-description">
        <h2>Detalhes do NFT</h2>
        <p>
          {nft.title} é uma obra digital {edition} finalizada à mão da coleção
          Kurio Editions. Cada atributo fica armazenado nos metadados do token e
          verificado na {nft.network}. A obra explora identidade, movimento e
          luz em um mundo digital sem fronteiras.
        </p>
        <p>
          A propriedade inclui a arte em alta resolução, lançamentos exclusivos
          para colecionadores e um registro permanente de procedência registrada
          na rede. {nft.artist} recebe 5% de direitos autorais nas vendas
          secundárias, apoiando novos trabalhos e lançamentos da comunidade.
        </p>
        <h2 className="section-subheading">Rede:</h2>
        <p>
          Cunhado na {nft.network} com procedência e metadados armazenados no
          IPFS. Informações de demonstração.
        </p>
        <h2 className="section-subheading">Contrato:</h2>
        <p>
          Direitos autorais do criador: 5% nas vendas secundárias, pagos
          automaticamente pelos mercados compatíveis.
        </p>
      </section>
      <section className="related">
        <h2>Mais desta coleção</h2>
        <div className="related-grid">
          {related.data?.items
            .filter((item) => item.id !== id)
            .slice(0, 5)
            .map((item) => (
              <NftCard key={item.id} nft={item} />
            ))}
        </div>
      </section>
      <Modal
        open={zoom}
        onClose={() => setZoom(false)}
        title={nft.title}
        className="image-dialog"
      >
        <img src={nft.image} alt={nft.title} />
      </Modal>
    </>
  );
}
