# Arquitetura e decisões

## Camadas

`domain/` contém os contratos TypeScript e operações monetárias. `lib/api.ts` concentra Axios, timeout, headers e contratos de resposta. `state.tsx` concentra sessão, Query e sincronização Socket.IO. `pages/` contém a interface. `mocks/` implementa o banco de demonstração e todas as respostas REST/eventos; componentes e hooks não inventam resultados de negócio.

TanStack Router define acesso direto, parâmetros tipados de busca e proteção das rotas privadas. A URL mantém busca, categorias, redes, faixa de preço, ordenação, aba e página. O histórico restaura essas combinações. Mudanças de filtro reiniciam a página.

## Sessão e isolamento

O mock oferece dois usuários fictícios. A sessão usa token opaco e expira após 30 minutos; o token persiste localmente. As senhas são persistidas como hashes SHA-256 com prefixo de demonstração, nunca em claro. Esta simulação não é uma implementação de autenticação para produção.

Guardas consultam a sessão pela API. HTTP 401 limpa sessão e cache e redireciona para login com a rota de retomada. Os campos do checkout são salvos em sessionStorage por usuário. Logout limpa o cache e encerra listeners/sockets; a troca de usuário gera novas chaves de consulta. O backend simulado verifica a propriedade de pedidos e demais recursos privados.

## Cache, mutations e respostas obsoletas

Consultas ficam frescas por 30 segundos; o retry de leitura é limitado a uma tentativa. Mutations não são repetidas automaticamente. Catálogo e detalhe passam AbortSignal ao Axios. Consultas de catálogo incluem todos os parâmetros na chave; consultas privadas incluem a identidade do usuário. Mutations de carrinho invalidam carrinho/cotação, e alterações de perfil invalidam perfil/sessão.

Favoritos usam atualização otimista: cancelamento da leitura, snapshot do estado anterior, atualização local e rollback em erro, seguido de reconciliação REST. Erros de rede e validação são exibidos; o usuário pode tentar novamente.

## Carrinho, valores e pedidos

Carrinhos são persistidos no banco simulado, identificados por visitante ou usuário. Login mescla o carrinho visitante sem descartar o carrinho existente. Quantidades respeitam estoque e limite de edição. Valores em ETH trafegam como strings decimais; cálculos usam BigInt em unidades de 10^-18 ETH. Não se utiliza ponto flutuante para subtotal, desconto, taxa ou total.

A cotação contém um fingerprint dos itens, versões, quantidades e cupom. Antes de abrir a revisão, o cliente consulta novamente a API. Na criação, o backend valida novamente a cotação. Uma mudança causa HTTP 409 e exige revisão e nova confirmação.

Cada tentativa persiste uma chave de idempotência e seu payload antes do envio. A chave é isolada por usuário. Reenvio do mesmo conteúdo retorna o mesmo pedido; conteúdo diferente retorna 409. Timeout preserva a tentativa e permite recuperá-la após refresh. Pedidos começam pendentes, reservam disponibilidade e terminam confirmados ou recusados. O resultado da simulação é registrado na criação. A confirmação retira somente as quantidades compradas; a recusa preserva o carrinho. O recibo usa o snapshot imutável do pedido.

## MSW e Socket.IO

MSW intercepta as chamadas Axios e o WebSocket. `@mswjs/socket.io-binding` codifica/decodifica os pacotes Engine.IO/Socket.IO; o cliente é `socket.io-client` real, com transporte WebSocket. Não há servidor externo nem callbacks diretos da interface para atualizar caches em eventos de negócio.

MSW 2.10 normaliza `/socket.io/` para `/` ao selecionar o handler, portanto o mock registra a origem WebSocket. O cliente Socket.IO é importado depois de iniciar MSW para evitar capturar o WebSocket nativo antes da interceptação. Heartbeats são enviados pela simulação e liberados no fechamento da conexão.

Os eventos carregam ID estável, recurso e versão. O cliente descarta versões repetidas/antigas e eventos privados de outro usuário. Ao reconectar, invalida os recursos ativos e reconcilia com REST. O polling de pedidos pendentes fornece recuperação adicional quando a conexão cai. Estados terminais não são revertidos.

Limitações do mock: sem rooms, namespaces personalizados, transporte polling ou rede entre abas/dispositivos. O banco persiste em localStorage de cada navegador. Cada contexto de teste tem armazenamento isolado. O painel Demo configura cenários pela API e os eventos continuam passando por Socket.IO.

## Referências e interface

As quinze imagens do ZIP fornecido estão em `references/figma/`. A identidade Kurio, as cores escuras/laranja, fonte monoespaçada, composição desktop e navegação mobile foram reproduzidas a partir dessas exportações. As quatro artes foram recortadas dos próprios frames e salvas em `public/assets/`; não há imagens ou fontes remotas. Roboto Mono é distribuída localmente via @fontsource.

Os componentes Button e Dialog seguem a composição shadcn/ui (CVA, Slot, Radix, Tailwind), com tokens adaptados à referência. Diálogos mantêm foco e devolvem-no ao acionador. Os formulários possuem labels, validação nativa e feedback de erro; skeletons respeitam movimento reduzido.

Adaptações: os frames são PNGs, não layers editáveis. Busca desktop, estados de erro, edição de quantidades, conta mobile e painel de cenários receberam controles acessíveis. O pagamento mobile expõe também os dados obrigatórios do colecionador para permitir edição e retomada. Conteúdo editorial/social externo, recuperação de senha, newsletter e autenticação social informam indisponibilidade; não simulam sucesso. A referência de transação e o explorador são explicitamente simulados.

## Testes e auditoria

Playwright cobre operações via interface e rede MSW. O controle `/api/demo` permite disparar e concluir eventos de forma determinística, sem setters de interface. Regressões visuais cobrem início, detalhe, carrinho e pagamento em 390, 768 e 1440 pixels. As fontes/imagens são locais, o relógio visual é fixo e animações/toasts variáveis são removidos das capturas.

Lighthouse executa o build otimizado com todas as funcionalidades/mocks, três vezes por página e perfil, e salva mediana, LCP, CLS, TBT, ambiente, versões e relatórios HTML/JSON em `reports/lighthouse/`. Não há simplificações exclusivas para auditoria.

### Carregamento e autenticação

Rotas de conta, carrinho e pagamento usam React.lazy/Suspense. Dialog carrega o conteúdo Radix apenas quando aberto. Fontes locais são pré-carregadas; imagens WebP possuem variantes de 400 px para o catálogo e o detalhe mobile. O placeholder mantém o rodapé fora da primeira dobra. Skeleton e breadcrumb possuem chaves distintas para evitar reutilização de uma caixa com dimensões diferentes.

O MSW inicializa antes da aplicação. O cliente Socket.IO é importado depois disso, evitando capturar o WebSocket nativo antes da interceptação. A guarda de rota valida a sessão na API; componentes privados aguardam o perfil antes de montar estado por usuário.

Respostas 401 só encerram a sessão quando o token da requisição ainda corresponde ao atual. A tela de login mantém seu destino de retorno quando recebe uma resposta de expiração. Após autenticar, o Router invalida seus estados antes de navegar.

O Tailwind lê somente src/, para impedir que classes dos relatórios HTML mudem a geração de estilos. As baselines são compartilhadas pelos sistemas operacionais, com fontes locais e tolerância de comparação documentada na configuração.