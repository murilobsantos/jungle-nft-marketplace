import { eth, multiply, wei } from "../domain/money";
import type {
  Cart,
  Nft,
  Order,
  Profile,
  Quote,
  Scenario,
  Wallet,
} from "../domain/types";

export const categories = [
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
const titles = [
  "Emerald Ape #042",
  "Sage Nomad #009",
  "Neon Vessel #552",
  "Cosmic Bloom #118",
  "Violet Nomad #314",
  "Ivory Baron #088",
  "Golden Beat #207",
  "Golden Frequency #071",
  "Golden Signal #160",
];
const prices = [
  "1.19",
  "1.69",
  "1.99",
  "1.29",
  "1.39",
  "1.79",
  "0.99",
  "0.59",
  "0.39",
];
const images = [
  "emerald",
  "sage",
  "neon",
  "sage",
  "sage",
  "neon",
  "gold",
  "gold",
  "gold",
];
interface User extends Profile {
  hash: string;
  favorites: string[];
  wallets: Wallet[];
}
interface Database {
  nfts: Nft[];
  users: User[];
  sessions: Record<string, { userId: string; expiresAt: number }>;
  carts: Record<string, Cart>;
  orders: Order[];
  attempts: Record<string, { orderId: string; fingerprint: string }>;
  scenario: Scenario;
}
const STORAGE = "kurio-mock-db-v2";
export const defaultScenario: Scenario = {
  name: "standard",
  latency: 180,
  failure: false,
  payment: "confirmed",
  timeout: false,
};
let emit: (name: string, data: object) => void = () => {};
export function setEmitter(fn: typeof emit) {
  emit = fn;
}
export async function hash(value: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`kurio-fictional-account:${value}`),
  );
  return Array.from(new Uint8Array(bytes), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
function seed(): Database {
  return {
    nfts: Array.from({ length: 36 }, (_, i) => ({
      id:
        i < 9
          ? ["042", "009", "552", "118", "314", "088", "207", "071", "160"][i]
          : `edition-${i}`,
      title:
        i < 9
          ? titles[i]
          : `${titles[i % 9].split(" #")[0]} #${String(i + 200).padStart(3, "0")}`,
      artist: ["Nova Sato", "Luna Costa", "Caio Nunes"][i % 3],
      category: categories[i % 9],
      network: ["Ethereum", "Polygon", "Solana"][i % 3] as Nft["network"],
      price: prices[i % 9],
      image: `/assets/${images[i % 9]}.webp`,
      supply: i === 35 ? 0 : 50,
      version: 1,
      edition: "1/50",
      rare: i % 3 === 0,
    })),
    users: [],
    sessions: {},
    carts: {},
    orders: [],
    attempts: {},
    scenario: { ...defaultScenario },
  };
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function restore(value: unknown): Database {
  const fresh = seed();
  if (!record(value)) return fresh;

  const nfts =
    Array.isArray(value.nfts) && value.nfts.length
      ? (value.nfts as Nft[])
      : fresh.nfts;
  const nftIds = new Set(nfts.map((nft) => nft.id));
  const editions = new Set(["1/1", "1/10", "1/50", "ABERTA"]);

  const carts: Record<string, Cart> = {};
  if (record(value.carts)) {
    for (const [owner, candidate] of Object.entries(value.carts)) {
      if (!record(candidate)) continue;
      carts[owner] = {
        items: Array.isArray(candidate.items)
          ? candidate.items.filter(
              (item): item is Cart["items"][number] =>
                record(item) &&
                typeof item.nftId === "string" &&
                nftIds.has(item.nftId) &&
                typeof item.edition === "string" &&
                editions.has(item.edition) &&
                typeof item.quantity === "number" &&
                Number.isInteger(item.quantity) &&
                item.quantity > 0,
            )
          : [],
        version: typeof candidate.version === "number" ? candidate.version : 1,
        coupon: typeof candidate.coupon === "string" ? candidate.coupon : "",
      };
    }
  }

  const users = Array.isArray(value.users)
    ? value.users.filter(record).map((candidate) => ({
        ...candidate,
        favorites: Array.isArray(candidate.favorites)
          ? candidate.favorites
          : [],
        wallets: Array.isArray(candidate.wallets) ? candidate.wallets : [],
      }))
    : [];
  const orders = Array.isArray(value.orders)
    ? value.orders.filter(
        (candidate) =>
          record(candidate) &&
          record(candidate.quote) &&
          Array.isArray(candidate.quote.items),
      )
    : [];

  return {
    nfts,
    users: users as User[],
    sessions: record(value.sessions)
      ? (value.sessions as Database["sessions"])
      : {},
    carts,
    orders: orders as Order[],
    attempts: record(value.attempts)
      ? (value.attempts as Database["attempts"])
      : {},
    scenario: {
      ...defaultScenario,
      ...(record(value.scenario) ? value.scenario : {}),
    } as Scenario,
  };
}
export let db: Database;
export function persist() {
  localStorage.setItem(STORAGE, JSON.stringify(db));
}
export async function initialize() {
  const stored = localStorage.getItem(STORAGE);
  try {
    db = stored ? restore(JSON.parse(stored)) : seed();
  } catch {
    db = seed();
  }
  if (!db.users.length) {
    for (const [id, name, email] of [
      ["user-1", "Nova Sato", "nova@kurio.demo"],
      ["user-2", "Luna Costa", "luna@kurio.demo"],
    ]) {
      db.users.push({
        id,
        name,
        username: id === "user-1" ? "nova" : "luna",
        email,
        ens: "",
        nickname: "Minha carteira",
        avatar: "",
        hash: await hash("Kurio123!"),
        favorites: [],
        wallets: [
          {
            id: `wallet-${id}`,
            name: "Minha MetaMask",
            nickname: "Principal",
            network: "Ethereum",
            address: `0x${id === "user-1" ? "a" : "b"}`.padEnd(
              42,
              id === "user-1" ? "1" : "2",
            ),
            provider: "MetaMask",
            primary: true,
            profileName: name,
            referral: "KURIO",
            email,
            ens: "",
          },
        ],
      });
    }
    persist();
  }
  settleOrders();
  persist();
}
export function reset() {
  db = seed();
  persist();
  return initialize();
}
export function cartFor(owner: string): Cart {
  const current = db.carts[owner];
  if (current && Array.isArray(current.items)) return current;
  const repaired = {
    items: [],
    version:
      current && typeof current.version === "number" ? current.version : 1,
    coupon: current && typeof current.coupon === "string" ? current.coupon : "",
  };
  db.carts[owner] = repaired;
  persist();
  return repaired;
}
export function available(nftId: string) {
  const nft = db.nfts.find((item) => item.id === nftId);
  return Math.max(
    0,
    (nft?.supply || 0) -
      db.orders
        .filter((order) => order.status === "pending")
        .flatMap((order) => order.quote.items)
        .filter((item) => item.nftId === nftId)
        .reduce((sum, item) => sum + item.quantity, 0),
  );
}
export function quoteFor(owner: string): Quote {
  const cart = cartFor(owner);
  const items = cart.items.map((item) => {
    const nft = db.nfts.find((nft) => nft.id === item.nftId)!;
    return {
      ...item,
      title: nft.title,
      image: nft.image,
      price: nft.price,
      total: multiply(nft.price, item.quantity),
      available: Math.max(
        0,
        Math.min(
          item.edition === "1/10" ? 10 : 50,
          available(nft.id) -
            cart.items
              .filter(
                (other) =>
                  other.nftId === item.nftId && other.edition !== item.edition,
              )
              .reduce((sum, other) => sum + other.quantity, 0),
        ),
      ),
      version: nft.version,
    };
  });
  const subtotal = items.reduce((total, item) => total + wei(item.total), 0n);
  const discount = cart.coupon === "KURIO10" ? subtotal / 10n : 0n;
  const fee = items.length ? wei("0.016") : 0n;
  const id = JSON.stringify({
    items: items.map(
      ({ nftId, quantity, edition, price, version, available }) => ({
        nftId,
        quantity,
        edition,
        price,
        version,
        available,
      }),
    ),
    coupon: cart.coupon,
    version: cart.version,
  });
  return {
    id,
    items,
    subtotal: eth(subtotal),
    discount: eth(discount),
    fee: eth(fee),
    total: eth(subtotal - discount + fee),
    coupon: cart.coupon,
    valid:
      items.length > 0 &&
      items.every((item) => item.quantity <= item.available),
  };
}
export function updateNft(id: string, values: Partial<Nft>, mode = "normal") {
  const nft = db.nfts.find((item) => item.id === id);
  if (!nft) return;
  Object.assign(nft, values, { version: nft.version + 1 });
  persist();
  const event = {
    id: crypto.randomUUID(),
    resourceId: id,
    version: nft.version,
  };
  emit("nft.updated", event);
  if (mode === "duplicate") {
    emit("nft.updated", event);
    emit("nft.updated", {
      ...event,
      id: crypto.randomUUID(),
      version: nft.version - 1,
    });
  }
}
export function settleOrders() {
  let changed = false;
  for (const order of db.orders) {
    if (order.status !== "pending" || Date.now() < order.settledAt) continue;
    order.status = order.outcome || db.scenario.payment;
    order.version++;
    if (order.status === "confirmed") {
      for (const item of order.quote.items) {
        const nft = db.nfts.find((nft) => nft.id === item.nftId)!;
        nft.supply = Math.max(0, nft.supply - item.quantity);
        nft.version++;
        const cart = cartFor(order.userId);
        const current = cart.items.find(
          (current) =>
            current.nftId === item.nftId && current.edition === item.edition,
        );
        if (current) current.quantity -= item.quantity;
        cart.items = cart.items.filter((current) => current.quantity > 0);
        cart.version++;
        emit("nft.updated", {
          id: crypto.randomUUID(),
          resourceId: nft.id,
          version: nft.version,
        });
      }
    }
    emit("order.updated", {
      id: crypto.randomUUID(),
      resourceId: order.id,
      userId: order.userId,
      version: order.version,
    });
    changed = true;
  }
  if (changed) persist();
}
