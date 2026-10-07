import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree";
import { Skeleton } from "./components/common";
import "./styles.css";
import "@fontsource/roboto-mono/latin-400.css";
import "@fontsource/roboto-mono/latin-600.css";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});
const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultPendingComponent: () => (
    <div className="detail-loading">
      <Skeleton />
    </div>
  ),
  defaultNotFoundComponent: () => (
    <div className="empty-state">
      <h1>Página não encontrada</h1>
      <a href="/">Voltar ao marketplace</a>
    </div>
  ),
  defaultErrorComponent: ({ error }) => (
    <div className="empty-state" role="alert">
      <h1>Não foi possível abrir esta página</h1>
      <p>{error instanceof Error ? error.message : String(error)}</p>
      <a href="/">Voltar ao marketplace</a>
    </div>
  ),
});
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

async function initializeApi() {
  if (import.meta.env.VITE_ENABLE_MOCKS !== "false") {
    const { startMocks } = await import("./mocks/browser");
    await startMocks();
  }
}
const root = ReactDOM.createRoot(document.getElementById("root")!);
async function start() {
  await initializeApi();
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
void start().catch((error) => {
  root.render(
    <div className="empty-state" role="alert">
      Não foi possível iniciar a aplicação:{" "}
      {error instanceof Error ? error.message : "Erro inesperado"}
    </div>,
  );
});
