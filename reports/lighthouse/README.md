# Lighthouse

Três medições por página/perfil; mediana. Build otimizado, cenário padrão, imagens e fontes locais.

| Página/perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |
|---|---:|---:|---:|---:|---:|---:|---:|
| inicio-mobile | 91 | 100 | 100 | 100 | 3106 | 0.000 | 123 |
| inicio-desktop | 100 | 100 | 100 | 100 | 716 | 0.000 | 2 |
| detalhe-mobile | 90 | 100 | 100 | 100 | 3259 | 0.001 | 78 |
| detalhe-desktop | 100 | 100 | 100 | 100 | 767 | 0.000 | 0 |

Ambiente e versões: [summary.json](summary.json). Metas: 90/95/95/90. Relatórios individuais HTML e JSON neste diretório.

## Análise

Todas as medianas atendem às metas do desafio. Medição individual abaixo da meta: detalhe-mobile-1, performance 89 (meta 90). A avaliação solicitada usa a mediana das três rodadas, e todos os resultados foram preservados.

O caminho crítico inclui o JavaScript da SPA, a inicialização do MSW/Service Worker e a resposta simulada com 180 ms de latência. Esses custos explicam o LCP maior no perfil mobile; a variação de CPU entre rodadas também afeta o TBT. CLS permanece próximo de zero.

Mocks, Socket.IO, imagens e fontes locais permanecem ativos durante a auditoria. Não há uma versão simplificada exclusiva para Lighthouse. O ambiente, as versões, LCP, CLS e TBT estão registrados em [summary.json](summary.json).
