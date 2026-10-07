import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Heart, LogOut, MapPin, UserRound } from "lucide-react";
import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { errorMessage, rest } from "../lib/api";
import type { Profile, Wallet } from "../domain/types";
import { useApp, useFavorites } from "../state";
import { Button } from "../components/ui/button";
import { Modal } from "../components/ui/dialog";
import {
  ErrorPanel,
  Field,
  Password,
  Select,
  Skeleton,
} from "../components/common";
import { Catalog, defaults, NftCard } from "./Catalog";

function formValues(event: FormEvent<HTMLFormElement>) {
  return Object.fromEntries(new FormData(event.currentTarget).entries());
}
const safeRedirect = (value: string) =>
  value.startsWith("/") &&
  !value.startsWith("//") &&
  !value.startsWith("/login") &&
  !value.startsWith("/signup")
    ? value
    : "/";
export function AuthPage({
  signup = false,
  redirect = "/",
}: {
  signup?: boolean;
  redirect?: string;
}) {
  const navigate = useNavigate(),
    router = useRouter(),
    { authenticate } = useApp();
  const [desktop, setDesktop] = useState(
    () => window.matchMedia("(min-width: 601px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 601px)");
    const change = () => setDesktop(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const mutation = useMutation({
    mutationFn: signup ? rest.signup : rest.login,
    onSuccess: async (data) => {
      authenticate(data.token);
      toast.success(
        signup ? "Perfil criado. Bem-vindo à Kurio!" : "Bem-vindo de volta.",
      );
      await router.invalidate();
      await navigate({ href: safeRedirect(redirect) });
    },
  });
  const [validation, setValidation] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = formValues(event);
    setValidation("");
    if (signup && data.password !== data.confirm) {
      setValidation("As senhas devem coincidir.");
      return;
    }
    mutation.mutate(data);
  }
  const content = (
    <>
      <nav className="auth-tabs">
        <Link
          to="/login"
          search={{ redirect }}
          className={!signup ? "active" : ""}
        >
          Entrar
        </Link>
        <span>|</span>
        <Link
          to="/signup"
          search={{ redirect }}
          className={signup ? "active" : ""}
        >
          Criar conta
        </Link>
      </nav>
      <p className="auth-description">
        {signup
          ? "Crie seu perfil para colecionar arte digital."
          : "Entre para gerenciar sua carteira, coleção e perfil de criador."}
      </p>
      <form onSubmit={submit}>
        {signup && (
          <>
            <Field
              label="Nome de exibição"
              name="name"
              required
              minLength={2}
              autoComplete="name"
            />
            <Field
              label="Nome de usuário"
              name="username"
              required
              pattern="[a-zA-Z0-9_]{3,24}"
              autoComplete="username"
            />
          </>
        )}
        <Field
          label="E-mail"
          name="email"
          type="email"
          placeholder="contato@email.com"
          required
          autoComplete="email"
        />
        <Password
          label="Senha"
          name="password"
          required
          minLength={signup ? 8 : 1}
          autoComplete={signup ? "new-password" : "current-password"}
        />
        {signup && (
          <Password
            label="Confirmar senha"
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
          />
        )}
        {!signup && (
          <button
            className="forgot-password"
            type="button"
            onClick={() =>
              toast.info(
                "Recuperação de senha externa não faz parte desta demonstração. Use as credenciais fictícias documentadas.",
              )
            }
          >
            Esqueceu a senha?
          </button>
        )}
        {(validation || mutation.isError) && (
          <p className="form-error" role="alert">
            {validation || errorMessage(mutation.error)}
          </p>
        )}
        <Button className="w-full auth-submit" disabled={mutation.isPending}>
          {mutation.isPending ? "Aguarde…" : signup ? "Criar perfil" : "Entrar"}
        </Button>
      </form>
      <div className="auth-divider">Ou continue com</div>
      <Button
        className="social-auth"
        variant="outline"
        onClick={() =>
          toast.info(
            "Login com Google indisponível na simulação. Use e-mail e senha.",
          )
        }
      >
        <span className="google-mark">G</span>Continuar com Google
      </Button>
      <Button
        className="social-auth"
        variant="outline"
        onClick={() =>
          toast.info(
            "Login com Facebook indisponível na simulação. Use e-mail e senha.",
          )
        }
      >
        <span className="facebook-mark">f</span>Continuar com Facebook
      </Button>
      <p className="auth-bottom">
        {signup ? "Já tem uma conta?" : "Novo na Kurio?"}{" "}
        <Link to={signup ? "/login" : "/signup"} search={{ redirect }}>
          {signup ? "Entre" : "Crie uma conta"}
        </Link>
      </p>
    </>
  );
  return (
    <div className="auth-page">
      <div className="desktop-only">
        <Catalog search={defaults} />
      </div>
      <div className="mobile-auth">
        <Link className="auth-brand" to="/">
          KURIO
        </Link>
        <h1>{signup ? "Criar perfil de colecionador" : "Entrar"}</h1>
        {content}
      </div>
      {desktop && (
        <Modal
          open
          onClose={() => void navigate({ to: "/" })}
          title={signup ? "Criar conta" : "Entrar"}
          className="auth-dialog"
        >
          {content}
        </Modal>
      )}
    </div>
  );
}
export function Private({ children }: { children: ReactNode }) {
  const { session, loading } = useApp();
  if (loading) return <Skeleton />;
  if (!session)
    return (
      <div className="empty-state">
        <h2>Entre para continuar</h2>
        <Button asChild>
          <Link
            to="/login"
            search={{
              redirect: window.location.pathname + window.location.search,
            }}
          >
            Entrar
          </Link>
        </Button>
      </div>
    );
  return children;
}
export function AccountLayout({ children }: { children: ReactNode }) {
  const { logout } = useApp();
  return (
    <div className="account-layout">
      <aside className="account-sidebar">
        <h2>Meu perfil</h2>
        <Link to="/profile" activeProps={{ className: "active" }}>
          <UserRound size={19} />
          Dados do perfil
        </Link>
        <Link to="/wallets" activeProps={{ className: "active" }}>
          <MapPin size={19} />
          Carteiras
        </Link>
        <Link to="/favorites" activeProps={{ className: "active" }}>
          <Heart size={19} />
          Lista de interesse
        </Link>
        {["Atividade", "Ofertas", "Arquivos baixados", "Suporte"].map(
          (label) => (
            <button
              key={label}
              onClick={() => toast.info("Esta seção não faz parte do desafio.")}
            >
              {label}
            </button>
          ),
        )}
        <button onClick={() => void logout()}>
          <LogOut size={19} />
          Sair
        </button>
      </aside>
      <section>{children}</section>
    </div>
  );
}
function ProfileForm({ profile }: { profile: Profile }) {
  const client = useQueryClient(),
    [avatar, setAvatar] = useState(profile.avatar),
    [formError, setFormError] = useState("");
  const mutation = useMutation({
    mutationFn: rest.saveProfile,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["profile"] });
      void client.invalidateQueries({ queryKey: ["session"] });
      toast.success("Perfil salvo.");
    },
    onError: (error) => setFormError(errorMessage(error)),
  });
  const password = useMutation({
    mutationFn: rest.password,
    onSuccess: () => toast.success("Senha alterada."),
    onError: (error) => toast.error(errorMessage(error)),
  });
  return (
    <>
      <h1>Perfil do colecionador</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setFormError("");
          mutation.mutate({ ...formValues(event), avatar });
        }}
      >
        <div className="form-grid">
          <Field
            label="Nome de exibição"
            name="name"
            defaultValue={profile.name}
            required
            minLength={2}
          />
          <Field
            label="Nome de usuário"
            name="username"
            defaultValue={profile.username}
            required
            pattern="[a-zA-Z0-9_]{3,24}"
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            defaultValue={profile.email}
            required
          />
          <Field
            label="Nome ENS"
            name="ens"
            defaultValue={profile.ens}
            placeholder="seunome.eth"
          />
          <Field
            label="Apelido da carteira"
            name="nickname"
            defaultValue={profile.nickname}
          />
          <div className="field">
            <label htmlFor="avatar">Avatar</label>
            <div className="avatar-editor">
              {avatar ? (
                <img src={avatar} alt="Seu avatar" width="48" height="48" />
              ) : (
                <UserRound size={38} />
              )}
              <label className="upload-button" htmlFor="avatar">
                Alterar
              </label>
              <input
                id="avatar"
                className="sr-only"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (file.size > 500000) {
                    toast.error("O avatar deve ter até 500 KB.");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setAvatar(String(reader.result));
                  reader.readAsDataURL(file);
                }}
              />
              <button type="button" onClick={() => setAvatar("")}>
                Remover
              </button>
            </div>
          </div>
        </div>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <Button disabled={mutation.isPending}>Salvar perfil</Button>
      </form>
      <h2 className="password-title">Alterar senha</h2>
      <form
        className="password-form"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          password.mutate(formValues(event), { onSuccess: () => form.reset() });
        }}
      >
        <Password
          label="Senha atual"
          name="current"
          required
          autoComplete="current-password"
        />
        <Password
          label="Nova senha"
          name="password"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Password
          label="Confirmar nova senha"
          name="confirm"
          required
          minLength={8}
          autoComplete="new-password"
        />
        <Button disabled={password.isPending}>Alterar senha</Button>
      </form>
    </>
  );
}
export function ProfilePage() {
  const { owner } = useApp();
  const query = useQuery({
    queryKey: ["profile", owner],
    queryFn: rest.profile,
  });
  return (
    <AccountLayout>
      {query.isPending ? (
        <Skeleton />
      ) : query.isError ? (
        <ErrorPanel error={query.error} retry={() => void query.refetch()} />
      ) : (
        <ProfileForm profile={query.data} />
      )}
    </AccountLayout>
  );
}
export function WalletForm({
  wallet,
  onSaved,
}: {
  wallet?: Wallet;
  onSaved: () => void;
}) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: rest.saveWallet,
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["wallets"] });
      toast.success("Carteira salva.");
      onSaved();
    },
  });
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        mutation.mutate({ ...formValues(event), id: wallet?.id });
      }}
    >
      <div className="form-grid">
        <Field
          label="Nome de exibição"
          name="name"
          defaultValue={wallet?.name}
          required
        />
        <Field
          label="Apelido da carteira"
          name="nickname"
          defaultValue={wallet?.nickname}
          required
        />
        <Select
          label="Rede"
          name="network"
          defaultValue={wallet?.network || ""}
          required
        >
          <option value="">Selecione uma rede</option>
          {["Ethereum", "Polygon", "Solana"].map((network) => (
            <option key={network}>{network}</option>
          ))}
        </Select>
        <Field
          label="Nome do perfil"
          name="profileName"
          defaultValue={wallet?.profileName}
          required
        />
        <Field
          label="Endereço da carteira"
          name="address"
          defaultValue={wallet?.address}
          placeholder="Endereço 0x da carteira"
          required
        />
        <Field
          label="ENS ou carteira secundária (opcional)"
          name="ens"
          defaultValue={wallet?.ens}
        />
        <Select
          label="Tipo de carteira"
          name="provider"
          defaultValue={wallet?.provider || ""}
          required
        >
          <option value="">Selecione uma carteira</option>
          {["MetaMask", "Coinbase Wallet", "WalletConnect"].map((provider) => (
            <option key={provider}>{provider}</option>
          ))}
        </Select>
        <Field
          label="Código de indicação"
          name="referral"
          defaultValue={wallet?.referral}
          required
        />
        <Field
          label="E-mail"
          name="email"
          type="email"
          defaultValue={wallet?.email}
          required
        />
      </div>
      {mutation.isError && (
        <p className="form-error" role="alert">
          {errorMessage(mutation.error)}
        </p>
      )}
      <Button disabled={mutation.isPending}>Salvar carteira</Button>
    </form>
  );
}
export function WalletsPage() {
  const { owner } = useApp();
  const query = useQuery({
    queryKey: ["wallets", owner],
    queryFn: rest.wallets,
  });
  const [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<Wallet>();
  if (query.isPending) return <Skeleton />;
  if (query.isError)
    return (
      <ErrorPanel error={query.error} retry={() => void query.refetch()} />
    );
  return (
    <AccountLayout>
      <div className="wallet-heading">
        <h1>Carteira principal</h1>
        {query.data.length < 2 && (
          <Button
            variant="ghost"
            onClick={() => {
              setEditing(undefined);
              setAdding(true);
            }}
          >
            Adicionar
          </Button>
        )}
      </div>
      <p className="muted">
        Estas carteiras ficam disponíveis no pagamento e para receber NFTs
        comprados.
      </p>
      {query.data[0] ? (
        <WalletForm
          key={query.data[0].id}
          wallet={query.data[0]}
          onSaved={() => {}}
        />
      ) : (
        <WalletForm onSaved={() => {}} />
      )}
      <h2 className="secondary-wallet">Carteira secundária</h2>
      {query.data[1] ? (
        <WalletForm
          key={query.data[1].id}
          wallet={query.data[1]}
          onSaved={() => {}}
        />
      ) : (
        <p className="muted">
          Você ainda não adicionou uma carteira secundária.
        </p>
      )}
      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Adicionar carteira"
      >
        <WalletForm wallet={editing} onSaved={() => setAdding(false)} />
      </Modal>
    </AccountLayout>
  );
}
export function FavoritesPage() {
  const favorite = useFavorites();
  const { owner } = useApp();
  const query = useQuery({
    queryKey: ["favorite-nfts", owner, favorite.ids],
    queryFn: rest.favoriteNfts,
  });
  return (
    <AccountLayout>
      <h1>Lista de interesse</h1>
      {query.isPending ? (
        <Skeleton cards={3} />
      ) : query.isError ? (
        <ErrorPanel error={query.error} />
      ) : (
        <div className="nft-grid">
          {query.data
            .filter((nft) => favorite.ids.includes(nft.id))
            .map((nft) => (
              <NftCard key={nft.id} nft={nft} />
            ))}
        </div>
      )}
      {!favorite.ids.length && (
        <p className="muted">Você ainda não favoritou nenhum NFT.</p>
      )}
    </AccountLayout>
  );
}
