import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";
import { errorMessage, rest, token, visitor } from "./lib/api";
import type { ResourceEvent, Session } from "./domain/types";

const Context = createContext<{
  session: Session | null;
  loading: boolean;
  owner: string;
  connected: boolean;
  authenticate: (token: string) => void;
  logout: () => Promise<void>;
}>({
  session: null,
  loading: true,
  owner: "",
  connected: false,
  authenticate: () => {},
  logout: async () => {},
});
export function AppProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient(),
    navigate = useNavigate();
  const location = useRouterState({ select: (state) => state.location });
  const [auth, setAuth] = useState(token);
  const [connected, setConnected] = useState(false);
  const query = useQuery({
    queryKey: ["session", auth],
    queryFn: rest.session,
    retry: 1,
    refetchInterval: 15000,
  });
  const session = query.data || null,
    owner = session?.user.id || `guest:${visitor()}`;
  function authenticate(next: string) {
    localStorage.setItem("kurio-token", next);
    client.clear();
    setAuth(next);
  }
  async function logout() {
    try {
      await rest.logout();
    } finally {
      localStorage.removeItem("kurio-token");
      client.clear();
      setAuth("");
      await navigate({ to: "/" });
    }
  }
  useEffect(() => {
    const expired = () => {
      localStorage.removeItem("kurio-token");
      client.clear();
      setAuth("");
      toast.error("Sua sessão expirou. Entre novamente para retomar.");
      if (!/^\/(login|signup)(\?|$)/.test(location.href))
        void navigate({ to: "/login", search: { redirect: location.href } });
    };
    window.addEventListener("kurio-session-expired", expired);
    return () => window.removeEventListener("kurio-session-expired", expired);
  }, [client, navigate, location.href]);
  useEffect(() => {
    let active = true;
    let currentSocket: Socket | undefined;
    void import("socket.io-client")
      .then(({ io }) => {
        if (!active) return;
        const socket = io(window.location.origin, {
          transports: ["websocket"],
          auth: { token: auth },
          reconnectionDelay: 500,
        });
        currentSocket = socket;
        const versions = new Map<string, number>();
        let reconnected = false;
        const reconcile = () => {
          setConnected(true);
          socket.emit("reconcile");
          void client.invalidateQueries();
          if (reconnected)
            toast.info("Conexão recuperada. Dados sincronizados.");
          reconnected = true;
        };
        socket.on("connect", reconcile);
        socket.on("disconnect", () => setConnected(false));
        const update = (kind: string, event: ResourceEvent) => {
          if (event.userId && event.userId !== session?.user.id) return;
          const key = `${kind}:${event.resourceId}`;
          if ((versions.get(key) || 0) >= event.version) return;
          versions.set(key, event.version);
          if (kind === "nft") {
            void client.invalidateQueries({ queryKey: ["catalog"] });
            void client.invalidateQueries({
              queryKey: ["nft", event.resourceId],
            });
            void client.invalidateQueries({ queryKey: ["quote"] });
            toast.info(
              "Preço ou disponibilidade atualizado. Revise seu carrinho.",
            );
          } else {
            void client.invalidateQueries({ queryKey: ["order"] });
            void client.invalidateQueries({ queryKey: ["cart"] });
            void client.invalidateQueries({ queryKey: ["quote"] });
          }
        };
        socket.on("nft.updated", (event) => update("nft", event));
        socket.on("order.updated", (event) => update("order", event));
      })
      .catch(() => {});
    return () => {
      active = false;
      currentSocket?.removeAllListeners();
      currentSocket?.disconnect();
    };
  }, [auth, session?.user.id, client]);
  return (
    <Context.Provider
      value={{
        session,
        loading: query.isPending,
        owner,
        connected,
        authenticate,
        logout,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export const useApp = () => useContext(Context);
export function useCart() {
  const { owner } = useApp();
  return useQuery({ queryKey: ["cart", owner], queryFn: rest.cart });
}
export function useQuote() {
  const { owner } = useApp();
  return useQuery({ queryKey: ["quote", owner], queryFn: rest.quote });
}
export function useCartMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: rest.addCart,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["cart"] });
      void client.invalidateQueries({ queryKey: ["quote"] });
      toast.success("NFT adicionado ao carrinho.");
    },
    onError: (error) => toast.error(errorMessage(error)),
  });
}
export function useFavorites() {
  const { session } = useApp(),
    client = useQueryClient(),
    navigate = useNavigate();
  const key = ["favorites", session?.user.id];
  const query = useQuery({
    queryKey: key,
    queryFn: rest.favorites,
    enabled: !!session,
  });
  const mutation = useMutation({
    mutationFn: ({ id, selected }: { id: string; selected: boolean }) =>
      rest.favorite(id, selected),
    onMutate: async ({ id, selected }) => {
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<string[]>(key) || [];
      client.setQueryData(
        key,
        selected
          ? [...previous, id]
          : previous.filter((current) => current !== id),
      );
      return { previous };
    },
    onError: (error, _variables, context) => {
      client.setQueryData(key, context?.previous);
      toast.error(errorMessage(error));
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: key });
    },
  });
  return {
    ids: query.data || [],
    pending: mutation.isPending,
    toggle: (id: string) => {
      if (!session) {
        void navigate({
          to: "/login",
          search: {
            redirect: window.location.pathname + window.location.search,
          },
        });
        return;
      }
      mutation.mutate({ id, selected: !query.data?.includes(id) });
    },
  };
}
