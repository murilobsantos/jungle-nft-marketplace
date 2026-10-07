import {
  delay,
  http,
  HttpResponse,
  ws,
  type PathParams,
  type JsonBodyType,
} from "msw";
import { toSocketIo } from "@mswjs/socket.io-binding";
import {
  available,
  cartFor,
  db,
  hash,
  persist,
  quoteFor,
  reset,
  setEmitter,
  settleOrders,
  updateNft,
} from "./database";
import type { Order, Wallet } from "../domain/types";
import { wei } from "../domain/money";

const sockets = new Set<{
  emit: (event: string, ...args: unknown[]) => void;
  close: () => void;
}>();
setEmitter((event, data) =>
  sockets.forEach((socket) => socket.emit(event, data)),
);
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new ApiError(status, message);
}
function user(request: Request, required = false) {
  const token =
    request.headers.get("Authorization")?.replace("Bearer ", "") || "";
  const session = db.sessions[token];
  const found =
    session && session.expiresAt > Date.now()
      ? db.users.find((user) => user.id === session.userId)
      : undefined;
  if (!found && required)
    fail(401, "Sua sessão expirou. Entre novamente para continuar.");
  return found;
}
function owner(request: Request) {
  return (
    user(request)?.id || `guest:${request.headers.get("X-Visitor") || "demo"}`
  );
}
type Body = Record<string, unknown>;
async function body(request: Request): Promise<Body> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}
const text = (data: Body, key: string) =>
  typeof data[key] === "string" ? (data[key] as string).trim() : "";
function validatedIdentity(data: Body) {
  if (text(data, "name").length < 2)
    fail(422, "Informe um nome com pelo menos 2 caracteres.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(data, "email")))
    fail(422, "Informe um e-mail válido.");
  if (!/^[a-zA-Z0-9_]{3,24}$/.test(text(data, "username")))
    fail(422, "Usuário deve ter 3 a 24 letras, números ou _.");
}
function wrap(
  fn: (request: Request, params: PathParams) => Promise<unknown> | unknown,
  auth = false,
) {
  return async ({
    request,
    params,
  }: {
    request: Request;
    params: PathParams;
  }) => {
    try {
      await delay(
        db.scenario.latency +
          (db.scenario.name === "variable-latency"
            ? new URL(request.url).searchParams.get("q")?.length
              ? 80
              : 700
            : 0),
      );
      if (db.scenario.failure && !request.url.includes("/demo"))
        fail(
          503,
          "A simulação está temporariamente indisponível. Tente novamente.",
        );
      if (auth) user(request, true);
      if (
        db.scenario.name === "network-error" &&
        !request.url.includes("/demo")
      )
        return HttpResponse.error();
      settleOrders();
      return HttpResponse.json((await fn(request, params)) as JsonBodyType);
    } catch (error) {
      return HttpResponse.json(
        { message: error instanceof Error ? error.message : "Erro inesperado" },
        { status: error instanceof ApiError ? error.status : 500 },
      );
    }
  };
}
function cartItem(data: Body) {
  const nftId = text(data, "nftId"),
    edition = text(data, "edition");
  const quantity = Number(data.quantity);
  const nft = db.nfts.find((nft) => nft.id === nftId);
  if (!nft) fail(404, "NFT não encontrado.");
  if (!["1/1", "1/10", "1/50", "ABERTA"].includes(edition))
    fail(422, "Edição inválida.");
  if (edition === "1/1") fail(409, "Esta edição não está disponível.");
  if (
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > Math.min(available(nftId), edition === "1/10" ? 10 : 50)
  )
    fail(409, "Quantidade indisponível para esta edição.");
  return { nftId, edition, quantity };
}
async function authenticate(request: Request, signup: boolean) {
  const data = await body(request);
  const email = text(data, "email").toLowerCase();
  const password = text(data, "password");
  let account = db.users.find((user) => user.email.toLowerCase() === email);
  if (signup) {
    validatedIdentity(data);
    if (password.length < 8)
      fail(422, "A senha precisa ter pelo menos 8 caracteres.");
    if (
      account ||
      db.users.some((user) => user.username === text(data, "username"))
    )
      fail(409, "E-mail ou nome de usuário já cadastrado.");
    account = {
      id: crypto.randomUUID(),
      name: text(data, "name"),
      username: text(data, "username"),
      email,
      hash: await hash(password),
      ens: "",
      nickname: "",
      avatar: "",
      wallets: [],
      favorites: [],
    };
    db.users.push(account);
  } else if (!account || account.hash !== (await hash(password)))
    fail(422, "E-mail ou senha incorretos.");
  const token = crypto.randomUUID();
  db.sessions[token] = {
    userId: account!.id,
    expiresAt: Date.now() + 30 * 60 * 1000,
  };
  const guest = cartFor(`guest:${request.headers.get("X-Visitor") || "demo"}`);
  const cart = cartFor(account!.id);
  for (const item of guest.items) {
    const existing = cart.items.find(
      (current) =>
        current.nftId === item.nftId && current.edition === item.edition,
    );
    if (existing)
      existing.quantity = Math.min(
        available(item.nftId),
        existing.quantity + item.quantity,
      );
    else
      cart.items.push({
        ...item,
        quantity: Math.min(item.quantity, available(item.nftId)),
      });
  }
  cart.items = cart.items.filter((item) => item.quantity > 0);
  guest.items = [];
  cart.version++;
  persist();
  const {
    hash: _hash,
    favorites: _favorites,
    wallets: _wallets,
    ...profile
  } = account!;
  void _hash;
  void _favorites;
  void _wallets;
  return { token, user: profile };
}
export const handlers = [
  http.get(
    "/api/nfts",
    wrap((request) => {
      const search = new URL(request.url).searchParams;
      let items = db.nfts.filter((nft) =>
        `${nft.title} ${nft.artist}`
          .toLowerCase()
          .includes((search.get("q") || "").toLowerCase()),
      );
      for (const [key, field] of [
        ["categories", "category"],
        ["networks", "network"],
      ] as const) {
        const selected = (search.get(key) || "").split(",").filter(Boolean);
        if (selected.length)
          items = items.filter((nft) => selected.includes(nft[field]));
      }
      const min = search.get("min") || "0",
        max = search.get("max") || "99999";
      items = items.filter(
        (nft) => wei(nft.price) >= wei(min) && wei(nft.price) <= wei(max),
      );
      if (search.get("tab") === "trending")
        items = items.filter((nft) => nft.rare);
      const sort = search.get("sort");
      if (sort === "price-asc" || sort === "price-desc")
        items = [...items].sort((a, b) =>
          wei(a.price) < wei(b.price)
            ? sort === "price-asc"
              ? -1
              : 1
            : wei(a.price) > wei(b.price)
              ? sort === "price-asc"
                ? 1
                : -1
              : 0,
        );
      if (search.get("tab") === "new") items = [...items].reverse();
      const total = items.length;
      const page = Math.max(1, Number(search.get("page")) || 1);
      return {
        items: items
          .slice((page - 1) * 9, page * 9)
          .map((nft) => ({ ...nft, supply: available(nft.id) })),
        total,
        pages: Math.ceil(total / 9),
      };
    }),
  ),
  http.get(
    "/api/nfts/:id",
    wrap((_request, params) => {
      const nft = db.nfts.find((nft) => nft.id === params.id);
      if (!nft) fail(404, "Este NFT não foi encontrado.");
      return { ...nft, supply: available(nft.id) };
    }),
  ),
  http.post(
    "/api/login",
    wrap((request) => authenticate(request, false)),
  ),
  http.post(
    "/api/signup",
    wrap((request) => authenticate(request, true)),
  ),
  http.get(
    "/api/session",
    wrap((request) => {
      const account = user(request, true)!;
      const session =
        db.sessions[
          request.headers.get("Authorization")!.replace("Bearer ", "")
        ];
      const {
        hash: _hash,
        favorites: _favorites,
        wallets: _wallets,
        ...profile
      } = account;
      void _hash;
      void _favorites;
      void _wallets;
      return { user: profile, expiresAt: session.expiresAt };
    }),
  ),
  http.post(
    "/api/logout",
    wrap((request) => {
      delete db.sessions[
        request.headers.get("Authorization")?.replace("Bearer ", "") || ""
      ];
      persist();
      return { ok: true };
    }),
  ),
  http.get(
    "/api/cart",
    wrap((request) => cartFor(owner(request))),
  ),
  http.post(
    "/api/cart/items",
    wrap(async (request) => {
      const item = cartItem(await body(request));
      const cart = cartFor(owner(request));
      if (
        cart.items
          .filter((current) => current.nftId === item.nftId)
          .reduce((sum, current) => sum + current.quantity, 0) +
          item.quantity >
        available(item.nftId)
      )
        fail(409, "A quantidade total excede a disponibilidade do NFT.");
      const current = cart.items.find(
        (current) =>
          current.nftId === item.nftId && current.edition === item.edition,
      );
      if (current) {
        if (current.quantity + item.quantity > available(item.nftId))
          fail(409, "A quantidade excede a disponibilidade.");
        current.quantity += item.quantity;
      } else cart.items.push(item);
      cart.version++;
      persist();
      return cart;
    }),
  ),
  http.put(
    "/api/cart/items",
    wrap(async (request) => {
      const item = cartItem(await body(request));
      const cart = cartFor(owner(request));
      const current = cart.items.find(
        (current) =>
          current.nftId === item.nftId && current.edition === item.edition,
      );
      if (!current) fail(404, "Item não está no carrinho.");
      if (
        cart.items
          .filter(
            (other) =>
              other.nftId === item.nftId && other.edition !== item.edition,
          )
          .reduce((sum, other) => sum + other.quantity, 0) +
          item.quantity >
        available(item.nftId)
      )
        fail(409, "A quantidade total excede a disponibilidade do NFT.");
      Object.assign(current!, item);
      cart.version++;
      persist();
      return cart;
    }),
  ),
  http.delete(
    "/api/cart/items",
    wrap(async (request) => {
      const item = await body(request);
      const cart = cartFor(owner(request));
      cart.items = cart.items.filter(
        (current) =>
          current.nftId !== item.nftId || current.edition !== item.edition,
      );
      cart.version++;
      persist();
      return cart;
    }),
  ),
  http.put(
    "/api/cart/coupon",
    wrap(async (request) => {
      const data = await body(request);
      const code = text(data, "code").toUpperCase();
      if (code === "EXPIRADO") fail(422, "Este cupom expirou.");
      if (code && code !== "KURIO10")
        fail(422, "Cupom inválido. Use KURIO10 na demonstração.");
      const cart = cartFor(owner(request));
      cart.coupon = code;
      cart.version++;
      persist();
      return cart;
    }),
  ),
  http.get(
    "/api/quote",
    wrap((request) => quoteFor(owner(request))),
  ),
  http.get(
    "/api/favorites",
    wrap((request) => user(request, true)!.favorites, true),
  ),
  http.get(
    "/api/favorites/nfts",
    wrap((request) => {
      const ids = user(request, true)!.favorites;
      return db.nfts.filter((nft) => ids.includes(nft.id));
    }, true),
  ),
  http.put(
    "/api/favorites",
    wrap(async (request) => {
      if (db.scenario.name === "favorite-failure")
        fail(503, "Não foi possível atualizar seus favoritos.");
      const data = await body(request);
      const account = user(request, true)!;
      const id = text(data, "id");
      if (!db.nfts.some((nft) => nft.id === id))
        fail(404, "NFT não encontrado.");
      account.favorites = account.favorites.filter((item) => item !== id);
      if (data.selected) account.favorites.push(id);
      persist();
      return account.favorites;
    }, true),
  ),
  http.get(
    "/api/profile",
    wrap((request) => {
      const {
        hash: _hash,
        favorites: _favorites,
        wallets: _wallets,
        ...profile
      } = user(request, true)!;
      void _hash;
      void _favorites;
      void _wallets;
      return profile;
    }, true),
  ),
  http.put(
    "/api/profile",
    wrap(async (request) => {
      const data = await body(request);
      validatedIdentity(data);
      if (
        text(data, "avatar") &&
        (!/^data:image\/(png|jpeg|webp);base64,/.test(text(data, "avatar")) ||
          text(data, "avatar").length > 700000)
      )
        fail(422, "Avatar precisa ser PNG, JPEG ou WebP de até 500 KB.");
      const account = user(request, true)!;
      if (
        db.users.some(
          (other) =>
            other.id !== account.id &&
            (other.email === text(data, "email") ||
              other.username === text(data, "username")),
        )
      )
        fail(409, "E-mail ou usuário já pertence a outra conta.");
      for (const key of [
        "name",
        "username",
        "email",
        "ens",
        "nickname",
        "avatar",
      ] as const)
        if (typeof data[key] === "string") account[key] = data[key] as string;
      if (
        account.avatar &&
        !/^data:image\/(png|jpeg|webp);base64,/.test(account.avatar)
      )
        fail(422, "Avatar precisa ser PNG, JPEG ou WebP.");
      persist();
      const {
        hash: _hash,
        favorites: _favorites,
        wallets: _wallets,
        ...profile
      } = account;
      void _hash;
      void _favorites;
      void _wallets;
      return profile;
    }, true),
  ),
  http.put(
    "/api/password",
    wrap(async (request) => {
      const account = user(request, true)!;
      const data = await body(request);
      if (account.hash !== (await hash(text(data, "current"))))
        fail(422, "A senha atual está incorreta.");
      if (
        text(data, "password").length < 8 ||
        text(data, "password") !== text(data, "confirm")
      )
        fail(
          422,
          "A nova senha precisa ter 8 caracteres e coincidir com a confirmação.",
        );
      account.hash = await hash(text(data, "password"));
      persist();
      return { ok: true };
    }, true),
  ),
  http.get(
    "/api/wallets",
    wrap((request) => user(request, true)!.wallets, true),
  ),
  http.put(
    "/api/wallets",
    wrap(async (request) => {
      const data = await body(request);
      if (
        !text(data, "name") ||
        !text(data, "nickname") ||
        !text(data, "profileName") ||
        !text(data, "referral")
      )
        fail(422, "Preencha os campos obrigatórios da carteira.");
      if (
        !["Ethereum", "Polygon", "Solana"].includes(text(data, "network")) ||
        !["MetaMask", "Coinbase Wallet", "WalletConnect"].includes(
          text(data, "provider"),
        )
      )
        fail(422, "Selecione rede e tipo de carteira válidos.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(data, "email")))
        fail(422, "Informe um e-mail válido.");
      if (
        text(data, "network") === "Solana"
          ? !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(text(data, "address"))
          : !/^0x[a-fA-F0-9]{40}$/.test(text(data, "address"))
      )
        fail(422, "Endereço inválido para a rede selecionada.");
      const account = user(request, true)!;
      const existing = account.wallets.find(
        (wallet) => wallet.id === text(data, "id"),
      );
      if (!existing && account.wallets.length >= 2)
        fail(409, "Você pode cadastrar duas carteiras.");
      const wallet = {
        ...data,
        id: existing?.id || crypto.randomUUID(),
        primary: existing?.primary ?? account.wallets.length === 0,
      } as unknown as Wallet;
      if (existing) Object.assign(existing, wallet);
      else account.wallets.push(wallet);
      persist();
      return account.wallets;
    }, true),
  ),
  http.post(
    "/api/orders",
    wrap(async (request) => {
      const account = user(request, true)!;
      const data = await body(request);
      const key = request.headers.get("Idempotency-Key");
      if (!key) fail(422, "Chave de idempotência obrigatória.");
      const fingerprint = JSON.stringify(data);
      const previous = db.attempts[`${account.id}:${key}`];
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          fail(409, "Esta tentativa já foi usada com outro conteúdo.");
        return db.orders.find((order) => order.id === previous.orderId)!;
      }
      const wallet = account.wallets.find(
        (wallet) => wallet.id === data.walletId,
      );
      if (!wallet || wallet.network !== data.network)
        fail(422, "Selecione uma carteira cadastrada e sua rede.");
      if (
        text(data, "name").length < 2 ||
        !text(data, "username") ||
        !text(data, "profileName") ||
        !text(data, "referral") ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text(data, "email"))
      )
        fail(422, "Preencha os dados do colecionador.");
      const quote = quoteFor(account.id);
      if (data.quoteId !== quote.id)
        fail(
          409,
          "Preço ou disponibilidade mudou. Revise a nova cotação antes de confirmar.",
        );
      if (!quote.valid) fail(409, "Revise os itens indisponíveis no carrinho.");
      const order: Order = {
        outcome: db.scenario.payment,
        id: crypto.randomUUID(),
        userId: account.id,
        status: "pending",
        quote: structuredClone(quote),
        wallet: structuredClone(wallet!),
        createdAt: Date.now(),
        settledAt: Date.now() + 2500,
        transaction: `0xSIMULADA${crypto.randomUUID().replaceAll("-", "")}`,
        key: key!,
        version: 1,
      };
      db.orders.push(order);
      db.attempts[`${account.id}:${key}`] = { orderId: order.id, fingerprint };
      persist();
      setTimeout(settleOrders, 2600);
      if (db.scenario.timeout) await delay(10000);
      return order;
    }, true),
  ),
  http.get(
    "/api/orders/attempt/:key",
    wrap((request, params) => {
      const attempt = db.attempts[`${user(request, true)!.id}:${params.key}`];
      if (!attempt)
        fail(
          404,
          "Tentativa ainda não recebida. Você pode reenviar com a mesma chave.",
        );
      return db.orders.find((order) => order.id === attempt.orderId)!;
    }, true),
  ),
  http.get(
    "/api/orders/:id",
    wrap((request, params) => {
      const order = db.orders.find((order) => order.id === params.id);
      if (!order) fail(404, "Pedido não encontrado.");
      if (order!.userId !== user(request, true)!.id)
        fail(403, "Este pedido pertence a outra conta.");
      return order;
    }, true),
  ),
  http.post(
    "/api/demo",
    wrap(async (request) => {
      const data = await body(request);
      const action = text(data, "action");
      if (action === "reset") {
        await reset();
        return { ok: true };
      }
      if (action === "scenario") {
        Object.assign(db.scenario, data.scenario);
        persist();
      }
      if (action === "expire") {
        const token =
          request.headers.get("Authorization")?.replace("Bearer ", "") || "";
        if (db.sessions[token]) db.sessions[token].expiresAt = 0;
        persist();
      }
      if (action === "nft") {
        updateNft(
          text(data, "id"),
          {
            ...(data.soldout
              ? { supply: 0 }
              : { price: text(data, "price") || "2.19" }),
          },
          text(data, "mode"),
        );
      }
      if (action === "settle") {
        db.orders
          .filter((order) => order.status === "pending")
          .forEach((order) => (order.settledAt = 0));
        settleOrders();
      }
      if (action === "disconnect") sockets.forEach((socket) => socket.close());
      return { ok: true };
    }, false),
  ),
  // MSW normalizes the Socket.IO transport pathname to the origin root.
  ws
    .link(
      `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/`,
    )
    .addEventListener("connection", (connection) => {
      const binding = toSocketIo(connection);
      const socket = {
        emit: (event: string, ...args: unknown[]) =>
          binding.client.emit(event, ...args),
        close: () => connection.client.close(1000, "Simulação de desconexão"),
      };
      sockets.add(socket);
      connection.client.addEventListener("close", () => sockets.delete(socket));
      const heartbeat = setInterval(() => connection.client.send("2"), 15000);
      connection.client.addEventListener("close", () =>
        clearInterval(heartbeat),
      );
      binding.client.on("reconcile", () => settleOrders());
    }),
];
