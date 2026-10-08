# Kurio — Marketplace de NFTs

Implementação do desafio frontend da Jungle Gaming, baseada nas exportações desktop/mobile fornecidas do Figma. React + TypeScript + TanStack Router/Query + Axios + Tailwind + componentes shadcn/ui + MSW + Socket.IO.

## Executar a partir de um checkout limpo

Use Node.js 24 LTS e npm. No PowerShell com política que bloqueia npm.ps1, utilize `npm.cmd`/`npx.cmd`.

```bash
npm ci
npx playwright install chromium
npm run dev:mocks
```

Abra a URL mostrada pelo Vite (normalmente http://localhost:5173). O Service Worker está versionado; não há backend ou serviço privado necessário. Mocks são ativados por padrão no desenvolvimento e no build de demonstração.

## Credenciais fictícias

| Usuário | E-mail | Senha |
|---|---|---|
| Nova Sato | nova@kurio.demo | Kurio123! |
| Luna Costa | luna@kurio.demo | Kurio123! |

As contas têm carteiras iniciais diferentes. Cadastro permite criar outra conta; cadastre sua carteira antes de finalizar uma compra. As credenciais servem apenas à demonstração. Senhas não são persistidas em claro.

## Comandos

| Comando | Finalidade |
|---|---|
| `npm run dev` / `npm run dev:mocks` | Desenvolvimento com MSW |
| `npm run build` | TypeScript + build Vite otimizado |
| `npm run preview` | Preview do build |
| `npm run typecheck` | Verificar tipos |
| `npm run lint` | ESLint |
| `npm run test:e2e` | Playwright desktop/mobile + regressões visuais |
| `npm run test:visual` | Regressão visual em 390/768/1440 pixels |
| `npm run audit` | Três medições Lighthouse em início/detalhe, desktop/mobile |
| `npm run format` | Formatar o código |

Para atualizar as imagens após uma alteração visual intencional: `npm run test:visual -- --update-snapshots`. Baselines ficam em `tests/visual.spec.ts-snapshots/`; relatórios em `reports/playwright/`, traces/vídeos das falhas em `test-results/`. Auditorias HTML/JSON e medianas ficam em `reports/lighthouse/`.

## Configuração

Copie `.env.example` para `.env.local` se precisar mudar a configuração. `VITE_ENABLE_MOCKS=true` habilita a simulação. O valor `false` exige fornecer backend REST e servidor Socket.IO compatíveis na mesma origem; nenhuma integração real com blockchain é implementada.

## Fluxos

- Catálogo: busca, filtros combinados, rede, preço, ordenação, abas e paginação mantidos na URL.
- Detalhe: acesso direto, edições, limite de estoque, galeria, favoritos e compra.
- Carrinho: alteração/removal, cupom, cotação precisa em ETH e persistência após refresh/login.
- Pagamento: dados do colecionador, carteira/rede, conexão simulada, revisão, revalidação e pedido idempotente.
- Pedido: pendente/confirmado/recusado; recuperação após refresh, reconexão e timeout; recibo imutável.
- Conta: cadastro/login/logout/expiração, perfil/avatar/senha e carteiras principal/secundária.

## Cenários reproduzíveis

Abra o botão **Demo** (canto inferior direito; acima da navegação mobile). O painel permite alternar carregamento lento, latência variável, falha HTTP 503, falha em favoritos, pagamento recusado e timeout. Também permite alterar preço/estoque via Socket.IO, enviar eventos duplicados/antigos, interromper a conexão e expirar a sessão. **Resetar todos os dados** restaura o cenário conhecido.

Para alterações em tempo real: adicione Emerald Ape ao carrinho, avance até pagamento e abra a revisão; no painel Demo, altere preço ou esgote o NFT. A cotação é reconciliada e a confirmação com valores antigos é bloqueada. Para timeout: selecione esse cenário antes de confirmar, recarregue e use Recuperar pedido. Para recusa: selecione Pagamento recusado antes do envio; o carrinho permanece intacto. Para expiração: preencha o checkout, expire a sessão, entre novamente e retome a rota.

Cupom de sucesso: `KURIO10`. Cupom expirado: `EXPIRADO`. Qualquer outro código gera erro de validação. A rede e os endereços das carteiras são simulados.

## Documentação e entrega

[ARCHITECTURE.md](ARCHITECTURE.md) registra cache, sessão, carrinho, precisão monetária, idempotência, reconciliação e adaptações das referências. [API.md](API.md) descreve REST e eventos. [AUDIT.md](AUDIT.md) contém a matriz de conformidade, correções, validações e riscos da auditoria final. Frames originais ficam em `references/figma/`; imagens utilizadas e fontes são locais. Os recortes podem ser reproduzidos no Windows com `scripts/extract-assets.ps1`.

`vercel.json` e `public/_redirects` permitem fallback SPA para acesso direto e refresh em Vercel/Netlify. O build publicado deve usar mocks ativos e servir `mockServiceWorker.js` como JavaScript da mesma origem.

## Publicação

Repositório: https://github.com/murilobsantos/jungle-nft-marketplace

Demonstração: https://jungle-nft-marketplace.vercel.app

A entrega usa uma SPA estática com mocks na mesma origem. A publicação não usa blockchain real.

As artes originais têm versões WebP e recortes de 400 px para os cards. Para reproduzir: `node scripts/optimize-assets.mjs`. As telas secundárias são carregadas sob demanda; fontes essenciais são pré-carregadas.

### Verificação da entrega

Build, TypeScript e ESLint concluídos. Playwright: **74 testes passaram**, incluindo normalização defensiva do carrinho, migração de dados persistidos, isolamento entre contas, histórico do catálogo, URL inválida, reconexão Socket.IO, axe-core e 12 comparações visuais em desktop, tablet e mobile, sem atualização de snapshots na rodada final. O relatório HTML está em [reports/playwright/index.html](reports/playwright/index.html). As baselines representam a implementação revisada a partir dos frames PNG; não são uma comparação automática contra layers do Figma.

As medianas de três medições por página/perfil e os relatórios individuais estão em [reports/lighthouse/README.md](reports/lighthouse/README.md).

Uma rodada dedicada de comparação visual passou nos 12 cenários: [relatório visual](reports/playwright-visual/index.html).

A prancha oficial do Figma também foi conferida com os 15 exports locais e comparada lado a lado com a versão publicada. As principais adaptações estão documentadas em [AUDIT.md](AUDIT.md).

As imagens de referência dos testes não incluem o nome do sistema operacional, permitindo reutilizar as mesmas baselines em Windows e Linux com as fontes locais e o Chromium do Playwright.

A execução final não teve falhas. Traces, vídeos e capturas são retidos automaticamente em `test-results/` quando um teste falha.

Medianas Lighthouse finais: início mobile 91, detalhe mobile 90, desktop 100 em ambas as páginas. Accessibility, Best Practices e SEO: 100 em todos os perfis. LCP/CLS/TBT, relatórios individuais e análise constam no relatório de auditoria.

