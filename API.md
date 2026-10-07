# Contratos REST e eventos

Base: `/api`. JSON em todas as respostas; ETH é string decimal, quantidade é inteiro. Axios envia `Authorization: Bearer <token>` e `X-Visitor: <id>`. Recursos privados verificam a sessão; pedidos verificam também a propriedade.

| Método / recurso | Entrada | Resposta |
|---|---|---|
| POST `/signup` | name, username, email, password | token, user (Profile) |
| POST `/login` | email, password | token, user |
| GET `/session` | Bearer | user, expiresAt |
| POST `/logout` | Bearer | ok |
| GET `/nfts` | q, categories/networks separados por vírgula, sort (`recent`, `price-asc`, `price-desc`), tab (`all`, `new`, `trending`), min, max, page | items (Nft[]), total, pages; 9 itens/página |
| GET `/nfts/:id` | ID | Nft com preço, rede, imagem, estoque e versão |
| GET `/favorites` | sessão | IDs favoritos |
| GET `/favorites/nfts` | sessão | NFTs favoritos, incluindo itens fora da primeira página |
| PUT `/favorites` | id, selected:boolean | IDs favoritos |
| GET `/cart` | visitante/sessão | items (CartItem[]), version, coupon |
| POST `/cart/items` | nftId, edition, quantity | Cart; soma à quantidade existente |
| PUT `/cart/items` | nftId, edition, quantity | Cart; substitui quantidade |
| DELETE `/cart/items` | nftId, edition | Cart |
| PUT `/cart/coupon` | code | Cart; vazio remove cupom |
| GET `/quote` | visitante/sessão | Quote: id, items, subtotal, discount, fee, total, coupon, valid |
| POST `/orders` | `Idempotency-Key`; quoteId, walletId, network, name, username, profileName, email, referral; note/ens opcionais | Order pending ou pedido existente |
| GET `/orders/:id` | sessão do proprietário | Order e snapshot |
| GET `/orders/attempt/:key` | sessão do proprietário | mesmo Order da tentativa |
| GET `/profile` | sessão | Profile |
| PUT `/profile` | name, username, email, ens, nickname, avatar:dataURI | Profile |
| PUT `/password` | current, password, confirm | ok |
| GET `/wallets` | sessão | Wallet[] |
| PUT `/wallets` | id opcional, name, nickname, network, address, provider, profileName, referral, email, ens opcional | Wallet[]; máximo duas |
| POST `/demo` | action e parâmetros | ok |

Interfaces completas: `src/domain/types.ts`. `Profile` não inclui senha/hash. Carteiras usam Ethereum/Polygon/Solana, MetaMask/Coinbase Wallet/WalletConnect; endereços são validados por rede. A edição 1/1 está indisponível na fixture.

Erros seguem `{ "message": "mensagem legível" }`: 401 sessão inválida/expirada; 403 acesso a pedido de outra conta; 404 recurso ausente; 409 identidade duplicada, estoque/cotação alterada ou chave reutilizada com conteúdo diferente; 422 formulário/cupom inválido; 503 falha transitória. Cenário de falha de conexão utiliza resposta de rede MSW.

Cupons: `KURIO10` desconta 10% do subtotal; `EXPIRADO` simula cupom expirado. Taxa padrão: `0.016` ETH. A API de cotação é a autoridade sobre o total.

## Eventos

Transporte: Socket.IO sobre WebSocket, namespace padrão, origem da aplicação. Os eventos `nft.updated` e `order.updated` usam:

```ts
{ id: string; resourceId: string; version: number; userId?: string }
```

`nft.updated` invalida catálogo, detalhe e cotação. `order.updated` é identificado por usuário e invalida pedido/carrinho/cotação. Payloads representam notificações de mudança; valores são reconciliados com REST para impedir regressões por eventos antigos. O cliente envia `reconcile` ao conectar; o mock conclui pedidos cujo prazo já passou.

O endpoint Demo aceita `scenario`, `nft`, `expire`, `disconnect`, `settle`, `reset`. `nft` recebe id, price ou soldout, e mode=`duplicate` para emitir duplicata/evento antigo. `settle` torna pendentes vencidos e conclui-os pelo fluxo do mock, com eventos Socket.IO. Cenários ficam persistidos e o reset restaura catálogo, usuários, carteiras, carrinhos e pedidos.
