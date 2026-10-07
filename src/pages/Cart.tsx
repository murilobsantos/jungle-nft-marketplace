import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { errorMessage, rest } from "../lib/api";
import { displayEth } from "../domain/money";
import { useApp, useQuote } from "../state";
import { ErrorPanel, Quantity, Skeleton } from "../components/common";
import { Button } from "../components/ui/button";
import type { Quote } from "../domain/types";
export function QuoteSummary({
  quote,
  children,
}: {
  quote: Quote;
  children?: React.ReactNode;
}) {
  return (
    <div className="quote-summary">
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>{displayEth(quote.subtotal)} ETH</dd>
        </div>
        <div>
          <dt>Desconto do lançamento</dt>
          <dd>(−) {displayEth(quote.discount)} ETH</dd>
        </div>
        <div>
          <dt>Taxa de rede</dt>
          <dd>{displayEth(quote.fee)} ETH</dd>
        </div>
      </dl>
      <p className="estimated">Taxa estimada</p>
      <div className="grand-total">
        <strong>Total</strong>
        <strong>{displayEth(quote.total)} ETH</strong>
      </div>
      {children}
    </div>
  );
}
export function CartPage() {
  const query = useQuote(),
    client = useQueryClient(),
    navigate = useNavigate(),
    { session } = useApp();
  const [coupon, setCoupon] = useState("");
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ["cart"] });
    void client.invalidateQueries({ queryKey: ["quote"] });
  };
  const mutation = useMutation({
    mutationFn: ({
      id,
      edition,
      quantity,
    }: {
      id: string;
      edition: string;
      quantity: number;
    }) =>
      quantity
        ? rest.cartItem({ nftId: id, edition, quantity })
        : rest.removeCart(id, edition),
    onSuccess: refresh,
    onError: (error) => toast.error(errorMessage(error)),
  });
  const couponMutation = useMutation({
    mutationFn: rest.coupon,
    onSuccess: () => {
      refresh();
      toast.success("Cupom atualizado.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
  if (query.isPending) return <Skeleton />;
  if (query.isError)
    return (
      <ErrorPanel error={query.error} retry={() => void query.refetch()} />
    );
  const quote = query.data;
  return (
    <>
      <div className="breadcrumb">
        <Link to="/">Início</Link> / Mercado / Carrinho
      </div>
      <h1 className="mobile-page-title">Carrinho de NFTs</h1>
      {!quote.items.length ? (
        <div className="empty-state">
          <h2>Seu carrinho está vazio</h2>
          <p>Explore as coleções e encontre seu próximo NFT.</p>
          <Button asChild>
            <Link to="/">Continuar explorando</Link>
          </Button>
        </div>
      ) : (
        <div className="cart-layout">
          <section aria-label="Itens do carrinho">
            <div className="cart-table-heading">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Edições</span>
              <span>Total</span>
              <span />
            </div>
            {quote.items.map((item) => (
              <article
                className="cart-row"
                key={`${item.nftId}:${item.edition}`}
              >
                <Link
                  className="cart-nft"
                  to="/nft/$id"
                  params={{ id: item.nftId }}
                >
                  <img src={item.image} alt="" width="76" height="76" />
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      ID do token: #{item.nftId} · {item.edition}
                    </small>
                    {item.quantity > item.available && (
                      <small className="form-error">
                        Disponíveis: {item.available}. Remova ou ajuste o item.
                      </small>
                    )}
                  </div>
                </Link>
                <span className="cart-unit-price">
                  {displayEth(item.price)} ETH
                </span>
                <Quantity
                  pending={mutation.isPending}
                  value={item.quantity}
                  max={item.available}
                  onChange={(quantity) =>
                    mutation.mutate({
                      id: item.nftId,
                      edition: item.edition,
                      quantity,
                    })
                  }
                />
                <strong className="accent">{displayEth(item.total)} ETH</strong>
                <button
                  className="trash-button"
                  aria-label={`Remover ${item.title}`}
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({
                      id: item.nftId,
                      edition: item.edition,
                      quantity: 0,
                    })
                  }
                >
                  <Trash2 size={19} />
                </button>
              </article>
            ))}
          </section>
          <aside className="cart-summary">
            <h2>Resumo da carteira</h2>
            <form
              className="coupon-form"
              onSubmit={(event) => {
                event.preventDefault();
                couponMutation.mutate(coupon);
              }}
            >
              <label htmlFor="coupon">Código promocional</label>
              <div>
                <input
                  id="coupon"
                  value={coupon}
                  onChange={(event) => setCoupon(event.target.value)}
                  placeholder="Digite o código promocional…"
                />
                <Button disabled={couponMutation.isPending}>Aplicar</Button>
              </div>
            </form>
            {quote.coupon && (
              <p className="applied-coupon">
                {quote.coupon} aplicado{" "}
                <button
                  onClick={() => couponMutation.mutate("")}
                  disabled={couponMutation.isPending}
                >
                  Remover
                </button>
              </p>
            )}
            <QuoteSummary quote={quote}>
              <Button
                className="w-full"
                disabled={!quote.valid || mutation.isPending}
                onClick={() =>
                  void navigate(
                    session
                      ? { to: "/checkout" }
                      : { to: "/login", search: { redirect: "/checkout" } },
                  )
                }
              >
                Conectar e finalizar
              </Button>
              <Link className="continue-link" to="/">
                Continuar explorando
              </Link>
            </QuoteSummary>
          </aside>
        </div>
      )}
    </>
  );
}
