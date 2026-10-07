import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import axios from "axios";
import { rest, errorMessage } from "../lib/api";
import { useApp, useQuote } from "../state";
import type { Quote, Wallet } from "../domain/types";
import { displayEth } from "../domain/money";
import { Button } from "../components/ui/button";
import { Modal } from "../components/ui/dialog";
import { ErrorPanel, Field, Select, Skeleton } from "../components/common";
import { QuoteSummary } from "./Cart";

interface Attempt {
  key: string;
  body: Record<string, unknown>;
}
export function CheckoutPage() {
  const { session, owner } = useApp(),
    client = useQueryClient(),
    navigate = useNavigate(),
    query = useQuote();
  const wallets = useQuery({
    queryKey: ["wallets", owner],
    queryFn: rest.wallets,
  });
  const [walletId, setWalletId] = useState(""),
    [connected, setConnected] = useState(false),
    [review, setReview] = useState<{
      quote: Quote;
      body: Record<string, unknown>;
    } | null>(null),
    [checking, setChecking] = useState(false),
    [issue, setIssue] = useState("");
  const key = `kurio-attempt:${owner}`;
  const [attempt, setAttempt] = useState<Attempt | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      return null;
    }
  });
  const wallet = wallets.data?.find(
    (wallet) => wallet.id === (walletId || wallets.data?.[0]?.id),
  );
  const draftKey = `kurio-checkout:${owner}`;
  const draft = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(draftKey) || "{}") as Record<
        string,
        string
      >;
    } catch {
      return {};
    }
  })();
  const recover = async () => {
    if (!attempt) return;
    setChecking(true);
    try {
      const order = await rest.attempt(attempt.key);
      void navigate({ to: "/order/$id", params: { id: order.id } });
    } catch (error) {
      setIssue(errorMessage(error));
    } finally {
      setChecking(false);
    }
  };
  const mutation = useMutation({
    mutationFn: ({ key, body }: Attempt) => rest.createOrder(key, body),
    onSuccess: (order) => {
      setReview(null);
      void navigate({ to: "/order/$id", params: { id: order.id } });
    },
    onError: async (error) => {
      setReview(null);
      setIssue(errorMessage(error));
      if (
        axios.isAxiosError(error) &&
        error.response?.status &&
        error.response.status < 500
      ) {
        localStorage.removeItem(key);
        setAttempt(null);
        void client.invalidateQueries({ queryKey: ["quote"] });
      }
    },
  });
  useEffect(() => {
    if (walletId) setConnected(false);
  }, [walletId]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!wallet || !connected) {
      setIssue("Conecte uma carteira cadastrada antes de continuar.");
      return;
    }
    const values = Object.fromEntries(
      new FormData(event.currentTarget).entries(),
    );
    sessionStorage.setItem(draftKey, JSON.stringify(values));
    setIssue("");
    setChecking(true);
    try {
      const fresh = await rest.quote();
      if (!fresh.valid) {
        setIssue(
          "Seu carrinho tem itens indisponíveis. Revise as quantidades.",
        );
        client.setQueryData(["quote", owner], fresh);
        return;
      }
      if (query.data?.id !== fresh.id) {
        client.setQueryData(["quote", owner], fresh);
        setIssue(
          "A cotação mudou. Confira os novos valores e confirme novamente.",
        );
        return;
      }
      setReview({
        quote: fresh,
        body: {
          ...values,
          quoteId: fresh.id,
          walletId: wallet.id,
          network: wallet.network,
        },
      });
    } catch (error) {
      setIssue(errorMessage(error));
    } finally {
      setChecking(false);
    }
  }
  function confirm() {
    if (!review || mutation.isPending) return;
    const next = attempt || { key: crypto.randomUUID(), body: review.body };
    localStorage.setItem(key, JSON.stringify(next));
    setAttempt(next);
    mutation.mutate(next);
  }
  if (query.isPending || wallets.isPending) return <Skeleton />;
  if (query.isError)
    return (
      <ErrorPanel error={query.error} retry={() => void query.refetch()} />
    );
  if (wallets.isError)
    return (
      <ErrorPanel error={wallets.error} retry={() => void wallets.refetch()} />
    );
  if (!query.data.items.length && attempt)
    return (
      <div className="empty-state">
        <h1>Recuperar sua compra</h1>
        <p>Uma tentativa foi enviada. Consulte o resultado para continuar.</p>
        {issue && (
          <p className="form-error" role="alert">
            {issue}
          </p>
        )}
        <Button disabled={checking} onClick={() => void recover()}>
          Recuperar pedido
        </Button>
      </div>
    );
  if (!query.data.items.length)
    return (
      <div className="empty-state">
        <h1>Seu carrinho está vazio</h1>
        <Button asChild>
          <Link to="/">Explorar NFTs</Link>
        </Button>
      </div>
    );
  return (
    <>
      <div className="breadcrumb">
        <Link to="/">Início</Link> / Mercado / Pagamento
      </div>
      <h1 className="mobile-page-title">Pagamento com carteira</h1>
      <form
        className="checkout-layout"
        onSubmit={submit}
        onChange={(event) => {
          const form = event.currentTarget;
          sessionStorage.setItem(
            draftKey,
            JSON.stringify(Object.fromEntries(new FormData(form).entries())),
          );
        }}
      >
        <section>
          <h2>Perfil do colecionador</h2>
          <div className="form-grid">
            <Field
              label="Nome de exibição"
              name="name"
              defaultValue={draft.name || session?.user.name}
              required
              minLength={2}
            />
            <Field
              label="Nome de usuário"
              name="username"
              defaultValue={draft.username || session?.user.username}
              required
            />
            <Select
              label="Rede"
              name="network"
              value={wallet?.network || ""}
              required
              onChange={() => {}}
            >
              <option value="">Selecione uma rede</option>
              {["Ethereum", "Polygon", "Solana"].map((network) => (
                <option key={network}>{network}</option>
              ))}
            </Select>
            <Field
              label="Nome do perfil"
              name="profileName"
              defaultValue={draft.profileName || session?.user.name}
              required
            />
            <Field
              label="Endereço da carteira"
              name="address"
              value={wallet?.address || ""}
              readOnly
              required
            />
            <Field
              label="ENS ou carteira secundária (opcional)"
              name="ens"
              defaultValue={draft.ens || session?.user.ens}
            />
            <Field
              label="Tipo de carteira"
              value={wallet?.provider || ""}
              readOnly
            />
            <Field
              label="Código de indicação"
              name="referral"
              defaultValue={draft.referral || "KURIO"}
              required
            />
            <Field
              label="E-mail"
              name="email"
              defaultValue={draft.email || session?.user.email}
              type="email"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="note">Observação do colecionador (opcional)</label>
            <textarea id="note" name="note" defaultValue={draft.note} />
          </div>
        </section>
        <aside>
          <h2>Seus NFTs</h2>
          {query.data.items.map((item) => (
            <div
              className="checkout-item"
              key={`${item.nftId}:${item.edition}`}
            >
              <img src={item.image} alt="" width="68" height="68" />
              <div>
                <strong>{item.title}</strong>
                <small>
                  ID do token: #{item.nftId} (× {item.quantity})
                </small>
              </div>
              <strong className="accent">{displayEth(item.total)} ETH</strong>
            </div>
          ))}
          <QuoteSummary quote={query.data} />
          <h2 className="wallet-section-title">Carteira e rede</h2>
          {wallets.data.length ? (
            wallets.data.map((item) => (
              <WalletChoice
                key={item.id}
                wallet={item}
                selected={wallet?.id === item.id}
                choose={() => setWalletId(item.id)}
              />
            ))
          ) : (
            <p>
              Nenhuma carteira cadastrada.{" "}
              <Link className="accent" to="/wallets">
                Adicionar carteira
              </Link>
            </p>
          )}
          {wallet && (
            <div className="wallet-connect">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setConnected(!connected);
                  toast.info(
                    connected
                      ? "Carteira desconectada."
                      : "Carteira conectada na simulação.",
                  );
                }}
              >
                {connected ? "Desconectar" : "Conectar carteira"}
              </Button>
              {!connected && (
                <button
                  type="button"
                  onClick={() => {
                    setConnected(false);
                    setIssue(
                      "A conexão foi recusada. Você pode tentar novamente.",
                    );
                  }}
                >
                  Simular recusa
                </button>
              )}
              <span role="status">
                {connected ? "Carteira conectada" : "Carteira desconectada"}
              </span>
            </div>
          )}
          {issue && (
            <p className="form-error" role="alert">
              {issue}
            </p>
          )}
          {attempt ? (
            <div className="attempt-recovery">
              <p>
                Uma tentativa foi iniciada. Recupere o pedido para evitar uma
                segunda compra.
              </p>
              <Button
                type="button"
                disabled={checking || mutation.isPending}
                onClick={() => void recover()}
              >
                Recuperar pedido
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={checking || mutation.isPending}
                onClick={() => mutation.mutate(attempt)}
              >
                Reenviar mesma tentativa
              </Button>
            </div>
          ) : (
            <Button
              className="w-full checkout-submit"
              disabled={
                !connected ||
                checking ||
                mutation.isPending ||
                !query.data.valid
              }
            >
              {checking ? "Validando…" : "Confirmar compra"}
            </Button>
          )}
        </aside>
      </form>
      <Modal
        open={!!review}
        onClose={() => !mutation.isPending && setReview(null)}
        title="Revise sua compra"
      >
        {review && (
          <>
            <p>Confira os valores e a carteira antes de enviar o pedido.</p>
            <QuoteSummary quote={review.quote} />
            <p className="muted">
              {wallet?.name} · {wallet?.network}
              <br />
              {wallet?.address}
            </p>
            <Button
              className="w-full"
              disabled={mutation.isPending}
              onClick={confirm}
            >
              {mutation.isPending ? "Enviando…" : "Confirmar pedido"}
            </Button>
          </>
        )}
      </Modal>
    </>
  );
}
function WalletChoice({
  wallet,
  selected,
  choose,
}: {
  wallet: Wallet;
  selected: boolean;
  choose: () => void;
}) {
  return (
    <label className={`wallet-choice ${selected ? "selected" : ""}`}>
      <input
        type="radio"
        name="registered-wallet"
        value={wallet.id}
        checked={selected}
        onChange={choose}
      />
      <div>
        <strong>{wallet.name}</strong>
        <small>
          {wallet.address.slice(0, 8)}…{wallet.address.slice(-4)} ·{" "}
          {wallet.network}
          <br />
          {wallet.provider}
        </small>
      </div>
    </label>
  );
}
export function OrderPage({ id }: { id: string }) {
  const { owner } = useApp();
  const query = useQuery({
      queryKey: ["order", owner, id],
      queryFn: () => rest.order(id),
      refetchInterval: (query) =>
        query.state.data?.status === "pending" ? 1200 : false,
    }),
    navigate = useNavigate(),
    client = useQueryClient();
  useEffect(() => {
    if (query.data && query.data.status !== "pending") {
      localStorage.removeItem(`kurio-attempt:${owner}`);
      void client.invalidateQueries({ queryKey: ["cart"] });
      void client.invalidateQueries({ queryKey: ["quote"] });
    }
  }, [query.data?.status, owner, client]);
  if (query.isPending) return <Skeleton />;
  if (query.isError)
    return (
      <ErrorPanel error={query.error} retry={() => void query.refetch()} />
    );
  const order = query.data;
  if (order.status === "pending")
    return (
      <div className="pending-order">
        <div className="spinner" />
        <h1>Pedido em processamento</h1>
        <p>Aguardando a confirmação do pagamento simulado.</p>
        <p className="muted">Pedido {order.id}</p>
        <p>Você pode recarregar esta página. Sua tentativa será recuperada.</p>
        <Button variant="outline" onClick={() => void query.refetch()}>
          Atualizar estado
        </Button>
      </div>
    );
  if (order.status === "declined")
    return (
      <div className="empty-state" role="alert">
        <h1>Pagamento recusado</h1>
        <p>
          Seus itens continuam no carrinho. Conecte outra carteira ou tente
          novamente.
        </p>
        <Button asChild>
          <Link to="/checkout">Voltar ao pagamento</Link>
        </Button>
      </div>
    );
  return (
    <section className="receipt">
      <button
        className="receipt-close"
        onClick={() => void navigate({ to: "/" })}
        aria-label="Fechar recibo"
      >
        ×
      </button>
      <div className="receipt-heading">
        <span aria-hidden="true">✉</span>
        <h1>Seus NFTs agora estão na sua carteira</h1>
      </div>
      <div className="receipt-metadata">
        <div>
          <strong>ID da transação</strong>
          <span>
            {order.transaction.slice(0, 12)}…{order.transaction.slice(-4)}
          </span>
        </div>
        <div>
          <strong>Data</strong>
          <span>{new Date(order.createdAt).toLocaleDateString("pt-BR")}</span>
        </div>
        <div>
          <strong>Total</strong>
          <span>{displayEth(order.quote.total)} ETH</span>
        </div>
        <div>
          <strong>Carteira</strong>
          <span>{order.wallet.provider}</span>
        </div>
      </div>
      <div className="receipt-body">
        <h2>Detalhes da transação</h2>
        {order.quote.items.map((item) => (
          <div className="checkout-item" key={`${item.nftId}:${item.edition}`}>
            <img src={item.image} alt="" width="72" height="72" />
            <div>
              <strong>{item.title}</strong>
              <small>
                ID do token: #{item.nftId} (× {item.quantity})
              </small>
            </div>
            <strong className="accent">{displayEth(item.total)} ETH</strong>
          </div>
        ))}
        <QuoteSummary quote={order.quote} />
        <p className="muted">
          Transação confirmada na simulação da rede {order.wallet.network}. Os
          valores deste recibo reproduzem o pedido confirmado.
        </p>
        <Button
          onClick={() =>
            toast.info(
              `Referência simulada: ${order.transaction}. Não existe transação real no explorador.`,
            )
          }
        >
          Ver no Etherscan
        </Button>
      </div>
    </section>
  );
}
