import {
  createRoute,
  redirect,
  type SearchSchemaInput,
} from "@tanstack/react-router";
import { Route as root } from "./routes/__root";
import { Catalog, defaults } from "./pages/Catalog";
import { lazy } from "react";
import { Private } from "./components/private";
import { Detail } from "./pages/Detail";
const CartPage = lazy(() =>
  import("./pages/Cart").then((module) => ({ default: module.CartPage })),
);
const AuthPage = lazy(() =>
  import("./pages/Account").then((module) => ({ default: module.AuthPage })),
);
const FavoritesPage = lazy(() =>
  import("./pages/Account").then((module) => ({
    default: module.FavoritesPage,
  })),
);
const ProfilePage = lazy(() =>
  import("./pages/Account").then((module) => ({ default: module.ProfilePage })),
);
const WalletsPage = lazy(() =>
  import("./pages/Account").then((module) => ({ default: module.WalletsPage })),
);
const CheckoutPage = lazy(() =>
  import("./pages/Checkout").then((module) => ({
    default: module.CheckoutPage,
  })),
);
const OrderPage = lazy(() =>
  import("./pages/Checkout").then((module) => ({ default: module.OrderPage })),
);
import { rest } from "./lib/api";
import type { CatalogSearch } from "./domain/types";
const catalog = createRoute({
  getParentRoute: () => root,
  path: "/",
  validateSearch: (
    input: SearchSchemaInput & Partial<CatalogSearch>,
  ): CatalogSearch => ({
    ...defaults,
    q: typeof input.q === "string" ? input.q : "",
    categories: typeof input.categories === "string" ? input.categories : "",
    networks: typeof input.networks === "string" ? input.networks : "",
    sort: ["recent", "price-asc", "price-desc"].includes(String(input.sort))
      ? String(input.sort)
      : "recent",
    tab: ["all", "new", "trending"].includes(String(input.tab))
      ? String(input.tab)
      : "all",
    min: /^\d+(\.\d{1,18})?$/.test(String(input.min)) ? String(input.min) : "0",
    max: /^\d+(\.\d{1,18})?$/.test(String(input.max))
      ? String(input.max)
      : "12.30",
    page: Math.max(1, Math.min(1000, Math.floor(Number(input.page) || 1))),
  }),
  component: () => {
    const search = catalog.useSearch();
    return <Catalog search={search} />;
  },
});
const detail = createRoute({
  getParentRoute: () => root,
  path: "/nft/$id",
  component: () => {
    const { id } = detail.useParams();
    return <Detail id={id} />;
  },
});
const cart = createRoute({
  getParentRoute: () => root,
  path: "/cart",
  component: CartPage,
});
const redirectSearch = (input: Record<string, unknown>) => ({
  redirect: typeof input.redirect === "string" ? input.redirect : "/",
});
const login = createRoute({
  getParentRoute: () => root,
  path: "/login",
  validateSearch: redirectSearch,
  component: () => {
    const { redirect } = login.useSearch();
    return <AuthPage redirect={redirect} />;
  },
});
const signup = createRoute({
  getParentRoute: () => root,
  path: "/signup",
  validateSearch: redirectSearch,
  component: () => {
    const { redirect } = signup.useSearch();
    return <AuthPage signup redirect={redirect} />;
  },
});
const guard = async ({ location }: { location: { href: string } }) => {
  const session = await rest.session();
  if (!session)
    throw redirect({ to: "/login", search: { redirect: location.href } });
};
const checkout = createRoute({
  getParentRoute: () => root,
  path: "/checkout",
  beforeLoad: guard,
  component: () => (
    <Private>
      <CheckoutPage />
    </Private>
  ),
});
const profile = createRoute({
  getParentRoute: () => root,
  path: "/profile",
  beforeLoad: guard,
  component: () => (
    <Private>
      <ProfilePage />
    </Private>
  ),
});
const wallets = createRoute({
  getParentRoute: () => root,
  path: "/wallets",
  beforeLoad: guard,
  component: () => (
    <Private>
      <WalletsPage />
    </Private>
  ),
});
const favorites = createRoute({
  getParentRoute: () => root,
  path: "/favorites",
  beforeLoad: guard,
  component: () => (
    <Private>
      <FavoritesPage />
    </Private>
  ),
});
const order = createRoute({
  getParentRoute: () => root,
  path: "/order/$id",
  beforeLoad: guard,
  component: () => {
    const { id } = order.useParams();
    return (
      <Private>
        <OrderPage id={id} />
      </Private>
    );
  },
});
export const routeTree = root.addChildren([
  catalog,
  detail,
  cart,
  login,
  signup,
  checkout,
  profile,
  wallets,
  favorites,
  order,
]);
