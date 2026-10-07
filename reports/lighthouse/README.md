# Lighthouse

Três medições por página/perfil; mediana. Build otimizado, cenário padrão, imagens e fontes locais.

| Página/perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|
| inicio-mobile | 91 | 100 | 100 | 100 | 3096 | 0.000 | 110 |
| inicio-desktop | 100 | 100 | 100 | 100 | 710 | 0.000 | 0 |
| detalhe-mobile | 90 | 100 | 100 | 100 | 3276 | 0.001 | 118 |
| detalhe-desktop | 100 | 100 | 100 | 100 | 771 | 0.000 | 0 |

Ambiente e versões: [summary.json](summary.json). Metas: 90/95/95/90. Relatórios individuais HTML e JSON neste diretório.

## Análise

As quatro medianas atingem as metas. O detalhe mobile teve uma medição de performance 86; as outras foram 90 e 90, resultando na mediana 90. Todas as medições foram mantidas. O perfil mobile usa a simulação padrão de rede/CPU do Lighthouse e uma viewport de 390 × 844; desktop usa 1440 × 1000 e os parâmetros versionados.

O caminho inicial inclui JavaScript da SPA, inicialização do MSW/Service Worker e resposta do catálogo/detalhe com latência padrão de 180 ms. O build estima 163 KB gzip para o módulo principal e 95 KB gzip para os mocks. Isso explica LCP de cerca de 3,1–3,3 s no mobile, mesmo com CLS próximo de zero. A variação de trabalho de CPU nas medições pode alterar o TBT. Os JSON individuais registram a decomposição de LCP e os dados de cada rodada.

Foram aplicados carregamento sob demanda de conta/carrinho/checkout/diálogos, fontes locais pré-carregadas, imagens WebP responsivas e placeholders sem reutilização de caixas incompatíveis. Os mocks, o Socket.IO, todas as imagens e as funcionalidades permanecem ativos durante a auditoria; não há uma versão simplificada para melhorar os resultados.
