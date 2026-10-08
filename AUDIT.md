# Auditoria técnica final

Auditoria executada em 7 de outubro de 2026 sobre o desafio oficial
`junglegaming/frontend-challenge` e a árvore local de
`murilobsantos/jungle-nft-marketplace`.

> Estado desta evidência: as correções descritas abaixo estão na branch `main`
> do repositório público. O deploy foi atualizado automaticamente e validado
> novamente após a publicação.

## Fontes e método

- README oficial do desafio, lido integralmente na data da auditoria.
- Documentação local: `README.md`, `ARCHITECTURE.md` e `API.md`.
- Código, contratos, handlers MSW, fixtures, rotas, estado e testes do projeto.
- Quinze frames PNG extraídos do arquivo de referência: nove desktop e seis
  mobile em `references/figma/`.
- Execução real de TypeScript, ESLint, build, Playwright, axe-core, npm audit,
  Lighthouse e smoke test dos deploys.

O arquivo editável do Figma não foi inspecionado em nível de layers. A
comparação visual usou os quinze frames exportados fornecidos no ZIP. Por isso,
a auditoria não apresenta uma falsa alegação de comparação automática pixel a
pixel contra o Figma.

## 1. Resumo executivo

Todos os critérios eliminatórios estão implementados e foram exercitados por
testes executáveis. A aplicação usa efetivamente toda a stack obrigatória; os
fluxos são funcionais; REST passa por Axios e MSW; os eventos percorrem um
cliente `socket.io-client`; e um pedido só aparece como confirmado após a
resposta da simulação.

A auditoria encontrou e corrigiu três defeitos reproduzíveis:

1. o texto e o controle de preço do catálogo não acompanhavam `back` e
   `forward` do navegador;
2. categorias, redes e preços arbitrários na URL chegavam à API e podiam
   produzir um estado vazio incoerente;
3. uma estrutura parcialmente corrompida no carrinho persistido podia chegar à
   interface e causar erro em tempo de execução.

A rodada final local passou em 72 testes Playwright, nos perfis desktop, mobile
e tablet aplicáveis. As 12 medições Lighthouse atingiram as metas oficiais. Não
restou defeito P0 ou P1 conhecido no código local.

A entrega externa está sincronizada: código, documentação, relatórios,
repositório público e deploy correspondem à versão final revisada.

## 2. Critérios eliminatórios

| Critério eliminatório | Status | Evidência verificável |
|---|---|---|
| Uso efetivo da stack obrigatória | **COMPLETO E VALIDADO** | Imports e execução de React/TS, Router, Query, Axios, Tailwind, componentes shadcn/ui, MSW, Socket.IO, Playwright e Lighthouse; build e testes aprovados. |
| Fluxos principais funcionais | **COMPLETO E VALIDADO** | Compra, conta, catálogo, favoritos, carrinho, perfil e carteiras exercitados pela interface em `tests/flows.spec.ts`, `tests/advanced.spec.ts` e `tests/compliance.spec.ts`. |
| MSW na camada de rede | **COMPLETO E VALIDADO** | Axios chama `/api`; `src/mocks/handlers.ts` intercepta REST; os E2E observam os resultados reais das operações. |
| Confirmação dependente da simulação | **COMPLETO E VALIDADO** | Casos confirmado, recusado, pendente, timeout e revalidação passaram; o recibo só é exibido para pedido confirmado. |
| Isolamento entre usuários | **COMPLETO E VALIDADO** | Testes de troca de conta cobrem carrinho, favoritos, pedidos, perfil e carteiras; acesso ao pedido alheio retorna erro. |
| Socket.IO real no cliente | **COMPLETO E VALIDADO** | `src/state.tsx` instancia `socket.io-client`; MSW usa `@mswjs/socket.io-binding`; reconexão e atualização sem refresh passaram. |
| E2E executável e relevante | **COMPLETO E VALIDADO** | 72/72 testes aprovados; relatório em `reports/playwright/index.html`. |
| Instalação e build reproduzíveis | **COMPLETO E VALIDADO** | `npm ci`, typecheck, lint, build e testes executados também em uma cópia sem `node_modules` nem artefatos de build. |
| Deploy e rotas diretas | **COMPLETO E VALIDADO** | Os dois endereços publicados responderam HTTP 200, inclusive `/nft/042`, `/cart` e rota inexistente; o deploy canônico contém as correções finais. |

## 3. Matriz de conformidade

Os status abaixo usam exatamente a classificação definida na missão.

| Requisito original | Peso/criticidade | Implementação e evidência | Lacuna / ação | Status |
|---|---:|---|---|---|
| React e TypeScript | Eliminatório | SPA React 19 tipada; `tsc -b` aprovado; nenhum `any`, `@ts-ignore` ou `@ts-expect-error` encontrado em `src`, `tests` e `scripts`. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| TanStack Router | Eliminatório | Árvore em `src/routeTree.tsx`, search params tipados, guardas privadas, acesso direto, tela 404 e retorno após login. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| TanStack Query | Eliminatório | Consultas/mutations, chaves por parâmetros e usuário, invalidação, cancelamento e rollback em `src/state.tsx` e páginas. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Axios e REST | Eliminatório | Cliente único em `src/lib/api.ts`; contratos em `src/domain/types.ts` e `API.md`; chamadas observadas via MSW. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Tailwind CSS | Eliminatório | Plugin do Vite, tokens e utilitários usados na implementação; build gera o CSS final. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| shadcn/ui | Eliminatório | `Button` com CVA/Slot e `Dialog` com Radix seguem a composição shadcn/ui adaptada à identidade. | A biblioteca é incorporada como código de componentes, conforme o modelo do shadcn. | **COMPLETO E VALIDADO** |
| MSW | Eliminatório | Worker versionado, handlers REST/WebSocket e ativação configurável; build de demonstração funciona sem backend privado. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Socket.IO | Eliminatório | Cliente real, transporte WebSocket, binding MSW, eventos versionados, reconciliação e limpeza de listeners. | Limitações próprias do mock estão documentadas. | **COMPLETO E VALIDADO** |
| Playwright | Eliminatório | Fluxos E2E e regressão visual em Chromium; relatório HTML e retenção de evidências em falha. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Lighthouse | Alta | Script reproduzível, três medições por página/perfil, HTML/JSON e medianas versionadas. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Início e catálogo | 20 UX / alta | Destaques, busca, filtros combinados, rede, preço, ordenação, abas, paginação e navegação funcionam. | Nenhuma funcional conhecida. | **COMPLETO E VALIDADO** |
| Estado do catálogo na URL | 15 integração / alta | Refresh, `back`/`forward`, texto, faixa de preço, parâmetros inválidos e respostas fora de ordem cobertos por E2E. | Defeito de sincronização foi corrigido nesta auditoria. | **COMPLETO E VALIDADO** |
| Loading, vazio, erro e recuperação | Alta | Skeletons, vazio, erro 503 e nova tentativa cobertos nos dois viewports. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Detalhe do NFT | 20 UX / alta | Acesso direto, galeria, edição indisponível, quantidade, estoque, favorito, compra e NFT 404. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Cadastro e login | 20 UX / alta | Validações, conflito, credenciais inválidas, persistência e retorno ao destino exercitados. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Sessão, expiração e logout | Alta | Guarda via API, retomada de checkout, limpeza de token/cache/socket e troca de usuário cobertas. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Favoritos | Alta | Inclusão/remoção, atualização otimista, rollback, persistência e isolamento. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Carrinho | Alta | Adição, remoção, quantidade, limites, persistência, merge no login, usuário isolado e migração defensiva. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Cupom e cotação | Alta | Cupom válido, inválido e expirado; subtotal, desconto, taxa e total vêm da API. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Precisão monetária | Alta | ETH trafega como string; operações usam `BigInt` em wei em `src/domain/money.ts`. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Dados do colecionador no checkout | Alta | Campos, labels, validação, persistência por usuário e retomada. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Carteira, rede, conexão, recusa e desconexão | Alta | Carteiras cadastradas alimentam checkout; cenários de conectar, recusar e desconectar passaram. | Integração é simulada, conforme o escopo. | **COMPLETO E VALIDADO** |
| Revalidação antes da compra | Eliminatório | Cotação com fingerprint e versão; preço/estoque alterado gera nova revisão ou bloqueio. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Pedido confirmado/recusado/pendente | Eliminatório | Estado e resultado vêm da API simulada e de `order.updated`; carrinho é preservado na falha. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Idempotência e clique repetido | Alta | Chave e payload persistidos; reenvio recupera o mesmo pedido e conflito retorna 409. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Timeout, refresh e recuperação | Alta | Tentativa persiste; refresh/reconexão recupera o mesmo pedido sem nova compra. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Recibo imutável | Alta | Pedido guarda snapshot; teste altera catálogo e confirma que o recibo não muda. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Perfil, avatar e senha | 20 UX / média | Edição, validação, persistência e nova autenticação cobertas. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Carteiras principal/secundária | 20 UX / média | Cadastro/edição, máximo, validação por rede, persistência e isolamento. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Contratos e erros REST | 15 integração / alta | Recursos mínimos documentados; 401/403/404/409/422/503 e falha de rede implementados. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Cenários MSW determinísticos | 10 / alta | Padrão, latência variável, lento, 503, falha de favorito, expiração, conflito, timeout e pagamento recusado. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Reset integral do mock | 10 / média | Painel Demo e `/api/demo` restauram fixtures, usuários, carrinhos, pedidos e cenário. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| `nft.updated` | 10 tempo real / alta | Atualiza/reconcilia catálogo, detalhe, carrinho e cotação; versão antiga/duplicada é descartada. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| `order.updated` | 10 tempo real / alta | Atualiza apenas o pedido do usuário; estados terminais não regridem. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Desconexão e reconexão Socket.IO | 10 tempo real / alta | Reconecta, emite `reconcile`, invalida recursos ativos e recupera pedido/detalhe sem refresh manual. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Responsividade 390/768/1440 | 20 visual / alta | Doze snapshots de início, detalhe, carrinho e pagamento passaram; teste de overflow passou. | Frames sem layers limitam medição geométrica exata. | **COMPLETO E VALIDADO** |
| Fidelidade visual ao Figma | 20 / alta | A prancha oficial foi conferida com os 15 exports locais e comparada lado a lado com a versão publicada. Identidade, assets, tipografia, cores e composição permanecem consistentes. | Algumas telas mobile foram estendidas para comportar os fluxos funcionais; não houve inspeção de medidas por layers. | **PARCIAL** |
| Assets e fontes locais | 20 visual / média | Artes derivadas dos frames e Roboto Mono local; nenhuma dependência visual remota. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Teclado, foco e diálogos | 5 a11y / alta | Focus trap e retorno do foco pelo Radix; E2E de teclado e foco passou. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Semântica, labels, alt, contraste e feedback | 5 a11y / alta | Seis varreduras axe sem violações; Lighthouse A11y 100; feedback usa roles e regiões acessíveis. | Nenhuma violação automática conhecida. | **COMPLETO E VALIDADO** |
| Leitor de tela e zoom manual | 5 a11y / média | Estrutura e overflow foram verificados; CSS contempla reduced motion. | Não houve sessão manual completa com NVDA/VoiceOver nem matriz de zoom 200%. | **IMPLEMENTADO MAS NÃO VALIDADO** |
| Regressão E2E exigida | 10 / alta | Todos os 12 grupos do enunciado estão cobertos nos dois viewports principais. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Regressão visual | 10 / alta | Início, detalhe, carrinho e pagamento em 390, 768 e 1440; dados/fontes estáveis. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Performance ≥ 90 | 5 / alta | Medianas: início mobile 91, detalhe mobile 90, desktop 100/100. | A margem do detalhe mobile é pequena. | **COMPLETO E VALIDADO** |
| A11y ≥ 95, BP ≥ 95, SEO ≥ 90 | 5 / alta | Todas as quatro combinações tiveram 100/100/100 nessas categorias. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Arquitetura e documentação | 5 / média | Responsabilidades, cache, sessão, idempotência, REST/Socket e desvios visuais documentados. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Segurança e robustez | Alta | `npm audit` sem vulnerabilidades; nenhum padrão comum de segredo, HTML inseguro ou `eval`; cache privado limpo. | Autenticação é deliberadamente uma simulação frontend. | **COMPLETO E VALIDADO** |
| Deploy obrigatório | Entrega / alta | Vercel e URL legada responderam 200 nas rotas diretas; no Vercel, MSW, REST, Socket.IO e refresh também funcionaram após a publicação final. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |
| Repositório acessível ao avaliador | Entrega / alta | Repositório público, branch `main` sincronizada e remoto documentado. | Nenhuma conhecida. | **COMPLETO E VALIDADO** |

## 4. Correções realizadas nesta auditoria

| Arquivo | Correção | Motivo |
|---|---|---|
| `src/pages/Catalog.tsx` | Sincroniza o rascunho da busca e o range de preço quando os search params mudam. | `back` e `forward` atualizavam resultados/URL, mas deixavam controles visuais com o valor mais novo. |
| `src/routeTree.tsx` | Valida allowlists de categoria/rede, faixa monetária, ordenação, aba e intervalo coerente. | Entradas arbitrárias na URL alcançavam a API e podiam gerar estado vazio ou controles inconsistentes. |
| `src/mocks/database.ts` | Filtra itens persistidos inválidos, NFTs inexistentes, edição desconhecida e quantidade inválida durante restore. | Um carrinho parcialmente corrompido ainda podia quebrar a renderização. |
| `tests/migration.spec.ts` | Acrescenta regressão para descartar itens ruins e preservar o item válido. | Impede retorno do erro de migração. |
| `tests/compliance.spec.ts` | Acrescenta dez cenários de conformidade executados em desktop e mobile. | Cobre isolamento, credenciais, logout, estoque/cupom, carteira, concorrência, histórico, URL inválida, 404, reconexão e axe. |
| `README.md` | Atualiza quantidade de testes, caminho do relatório e evidências finais. | Mantém a documentação alinhada ao resultado realmente executado. |
| `reports/playwright/` e `reports/lighthouse/` | Regenera relatórios sobre a árvore final. | Preserva evidência verificável da última rodada. |

## 5. Validação executada

Ambiente principal: Windows 10.0.26200, Node.js 24.19.0, npm lockfile,
Playwright 1.64.0, Lighthouse 13.5.0 e Chromium do Playwright.

| Comando/verificação | Resultado final |
|---|---|
| `npm ci` em cópia limpa | **APROVADO** — instalação apenas pelo lockfile. |
| `npm run typecheck` | **APROVADO** — zero erros. |
| `npm run lint` | **APROVADO** — zero erros. |
| `npm run build` | **APROVADO** — 2.083 módulos; aviso não bloqueante para chunk principal de 509,63 kB (163,16 kB gzip). |
| `npm run test:e2e` | **APROVADO** — 72/72 em 2,3 min; rodada final sem falhas. |
| Regressão visual dentro da suíte | **APROVADO** — 12/12 em 390, 768 e 1440 px. |
| axe-core | **APROVADO** — nenhuma violação em início, detalhe e checkout, desktop/mobile. |
| `npm audit --audit-level=moderate` | **APROVADO** — 0 vulnerabilidades. |
| Busca estática por segredos e APIs inseguras | **APROVADO** — nenhum padrão comum de segredo, `dangerouslySetInnerHTML`, `eval`, escape de tipagem ou `any`. |
| Smoke do Vercel | **APROVADO PARA A VERSÃO PUBLICADA** — `/`, `/nft/042`, `/cart` e `/rota-inexistente` retornaram 200; REST 200; `nft.updated` alterou 1.19 para 2.29 ETH sem refresh; persistiu após refresh; nenhum erro de console/page/HTTP. |
| Smoke da URL legada | **APROVADO PARA A VERSÃO PUBLICADA** — mesmas rotas responderam 200, sem erro de console/page/HTTP. |

### Lighthouse

Cada linha representa a mediana de três execuções sobre o build otimizado, com
cenário padrão MSW e latência simulada de 180 ms.

| Página/perfil | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| Início mobile | 91 | 100 | 100 | 100 | 3.099 ms | 0,000 | 115 ms |
| Início desktop | 100 | 100 | 100 | 100 | 714 ms | 0,000 | 0 ms |
| Detalhe mobile | 90 | 100 | 100 | 100 | 3.273 ms | 0,001 | 91 ms |
| Detalhe desktop | 100 | 100 | 100 | 100 | 771 ms | 0,000 | 0 ms |

Relatórios individuais e ambiente: `reports/lighthouse/README.md` e
`reports/lighthouse/summary.json`.

## 6. Riscos restantes

| Severidade | Risco | Impacto | Mitigação antes da entrega |
|---|---|---|---|
| **MÉDIA** | A comparação final confirmou diferenças de hierarquia no detalhe e no pagamento mobile. | Pode haver desconto no critério visual, embora desktop, identidade e componentes estejam próximos das referências. | Comparação manual concluída; preservar os fluxos validados e evitar uma reestruturação arriscada antes da entrega. |
| **BAIXA** | Detalhe mobile ficou exatamente na meta 90 e o chunk principal gera aviso de 500 kB. | Máquinas mais lentas podem produzir variação de performance. | Evitar mudanças grandes antes da entrega; se houver tempo, medir o custo antes de dividir novos chunks. |
| **BAIXA** | Validação acessível foi principalmente automatizada. | axe/Lighthouse não substituem leitor de tela e zoom manual completos. | Fazer smoke com teclado, NVDA e zoom 200% nas rotas críticas. |
| **BAIXA** | Socket.IO e autenticação são simulações no navegador. | Não representam segurança ou concorrência de um backend real. | Nenhuma ação para o desafio; a limitação já está documentada e é compatível com o escopo. |

## 7. Estimativa de prontidão

- **Prontidão técnica local: 95%**. Os eliminatórios e fluxos críticos estão
  implementados, e a bateria final é ampla e reprodutível.
- **Prontidão da entrega externa: 95%**. Repositório público, branch principal
  e deploy estão sincronizados e foram verificados após a publicação.

Esses percentuais são uma estimativa de risco e cobertura. Não representam nota
oficial nem promessa de aprovação.

## 8. Checklist manual antes da entrega

- [x] Revisar `git diff` e os relatórios gerados.
- [x] Criar um commit final com código, testes, documentação e evidências.
- [x] Enviar o commit ao repositório após a revisão.
- [x] Tornar o repositório público para o avaliador.
- [x] Publicar o código revisado.
- [x] Repetir o smoke de rotas diretas, MSW e Socket.IO no novo deploy.
- [x] Confirmar que o link canônico do deploy está no README.
- [x] Fazer a comparação final lado a lado com as referências atuais do Figma.
- [ ] Fazer um smoke manual com leitor de tela e zoom 200%.
