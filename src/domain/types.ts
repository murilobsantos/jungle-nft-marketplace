export type Network = "Ethereum" | "Polygon" | "Solana";
export interface Nft {
  id: string;
  title: string;
  artist: string;
  category: string;
  network: Network;
  price: string;
  image: string;
  supply: number;
  version: number;
  edition: string;
  rare: boolean;
}
export interface Profile {
  id: string;
  name: string;
  username: string;
  email: string;
  ens: string;
  nickname: string;
  avatar: string;
}
export interface Wallet {
  id: string;
  name: string;
  nickname: string;
  network: Network;
  address: string;
  provider: string;
  primary: boolean;
  profileName: string;
  referral: string;
  email: string;
  ens: string;
}
export interface Session {
  user: Profile;
  expiresAt: number;
}
export interface CartItem {
  nftId: string;
  edition: string;
  quantity: number;
}
export interface Cart {
  items: CartItem[];
  version: number;
  coupon: string;
}
export interface QuoteItem extends CartItem {
  title: string;
  image: string;
  price: string;
  total: string;
  available: number;
  version: number;
}
export interface Quote {
  id: string;
  items: QuoteItem[];
  subtotal: string;
  discount: string;
  fee: string;
  total: string;
  coupon: string;
  valid: boolean;
}
export interface Order {
  outcome: "confirmed" | "declined";
  id: string;
  userId: string;
  status: "pending" | "confirmed" | "declined";
  quote: Quote;
  wallet: Wallet;
  createdAt: number;
  settledAt: number;
  transaction: string;
  key: string;
  version: number;
}
export interface CatalogSearch {
  q: string;
  categories: string;
  networks: string;
  sort: string;
  tab: string;
  min: string;
  max: string;
  page: number;
}
export interface CatalogResponse {
  items: Nft[];
  total: number;
  pages: number;
}
export interface ResourceEvent {
  id: string;
  resourceId: string;
  version: number;
  userId?: string;
}
export interface Scenario {
  name: string;
  latency: number;
  failure: boolean;
  payment: "confirmed" | "declined";
  timeout: boolean;
}
