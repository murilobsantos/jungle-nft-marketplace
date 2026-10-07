import axios from "axios";
import type {
  Cart,
  CartItem,
  CatalogResponse,
  CatalogSearch,
  Nft,
  Order,
  Profile,
  Quote,
  Session,
  Wallet,
} from "../domain/types";

export const api = axios.create({ baseURL: "/api", timeout: 8000 });
export function token() {
  return localStorage.getItem("kurio-token") || "";
}
export function visitor() {
  let id = localStorage.getItem("kurio-visitor");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("kurio-visitor", id);
  }
  return id;
}
api.interceptors.request.use((config) => {
  config.headers["Authorization"] = `Bearer ${token()}`;
  config.headers["X-Visitor"] = visitor();
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      token() &&
      error.config?.headers?.Authorization === `Bearer ${token()}` &&
      !error.config?.url?.includes("/login")
    )
      window.dispatchEvent(new Event("kurio-session-expired"));
    return Promise.reject(error);
  },
);
export async function demo(action: string, data: object = {}) {
  return api.post("/demo", { action, ...data });
}
export function errorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.message ||
        (error.code === "ECONNABORTED"
          ? "A conexão demorou. Recupere a tentativa para continuar."
          : "Falha de conexão. Tente novamente.")
    : error instanceof Error
      ? error.message
      : "Não foi possível concluir a operação.";
}
export const rest = {
  catalog: async (params: CatalogSearch, signal?: AbortSignal) =>
    (await api.get<CatalogResponse>("/nfts", { params, signal })).data,
  nft: async (id: string, signal?: AbortSignal) =>
    (await api.get<Nft>(`/nfts/${id}`, { signal })).data,
  session: async () => {
    if (!token()) return null;
    try {
      return (await api.get<Session>("/session")).data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401)
        return null;
      throw error;
    }
  },
  login: async (data: object) =>
    (await api.post<{ token: string; user: Profile }>("/login", data)).data,
  signup: async (data: object) =>
    (await api.post<{ token: string; user: Profile }>("/signup", data)).data,
  logout: async () => {
    await api.post("/logout");
  },
  cart: async () => (await api.get<Cart>("/cart")).data,
  cartItem: async (item: CartItem) =>
    (await api.put<Cart>("/cart/items", item)).data,
  addCart: async (item: CartItem) =>
    (await api.post<Cart>("/cart/items", item)).data,
  removeCart: async (nftId: string, edition: string) =>
    (await api.delete<Cart>("/cart/items", { data: { nftId, edition } })).data,
  coupon: async (code: string) =>
    (await api.put<Cart>("/cart/coupon", { code })).data,
  quote: async () => (await api.get<Quote>("/quote")).data,
  favorites: async () => (await api.get<string[]>("/favorites")).data,
  favoriteNfts: async () => (await api.get<Nft[]>("/favorites/nfts")).data,
  favorite: async (id: string, selected: boolean) =>
    (await api.put<string[]>("/favorites", { id, selected })).data,
  wallets: async () => (await api.get<Wallet[]>("/wallets")).data,
  saveWallet: async (data: Partial<Wallet>) =>
    (await api.put<Wallet[]>("/wallets", data)).data,
  profile: async () => (await api.get<Profile>("/profile")).data,
  saveProfile: async (data: object) =>
    (await api.put<Profile>("/profile", data)).data,
  password: async (data: object) => {
    await api.put("/password", data);
  },
  createOrder: async (key: string, data: object) =>
    (
      await api.post<Order>("/orders", data, {
        headers: { "Idempotency-Key": key },
      })
    ).data,
  order: async (id: string) => (await api.get<Order>(`/orders/${id}`)).data,
  attempt: async (key: string) =>
    (await api.get<Order>(`/orders/attempt/${key}`)).data,
};
