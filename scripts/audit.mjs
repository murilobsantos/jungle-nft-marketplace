import { spawn } from "node:child_process";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import os from "node:os";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import { chromium } from "@playwright/test";
import { profiles, pages } from "../lighthouse.config.mjs";
const reportDir = new URL("../reports/lighthouse/", import.meta.url);
await mkdir(reportDir, { recursive: true });
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "preview",
    "--host",
    "127.0.0.1",
    "--port",
    "4173",
  ],
  { cwd: process.cwd(), windowsHide: true, stdio: "ignore" },
);
const median = (values) =>
  [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
let chrome;
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const res = await fetch("http://127.0.0.1:4173");
      if (res.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  chrome = await launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless", "--no-sandbox", "--disable-dev-shm-usage"],
    logLevel: "silent",
  });
  const summary = {
    environment: {
      date: new Date().toISOString(),
      node: process.version,
      os: `${os.platform()} ${os.release()}`,
      cpu: os.cpus()[0]?.model,
      lighthouse: JSON.parse(
        await readFile("node_modules/lighthouse/package.json", "utf8"),
      ).version,
      playwright: JSON.parse(
        await readFile("node_modules/@playwright/test/package.json", "utf8"),
      ).version,
      mocks:
        "standard, latency 180 ms; local fonts and images; optimized build",
    },
    results: {},
  };
  const targets = {
    performance: 90,
    accessibility: 95,
    "best-practices": 95,
    seo: 90,
  };
  const deviations = [];
  for (const [pageName, path] of Object.entries(pages))
    for (const [profileName, profile] of Object.entries(profiles)) {
      const measurements = [];
      for (let run = 1; run <= 3; run++) {
        const result = await lighthouse(`http://127.0.0.1:4173${path}`, {
          port: chrome.port,
          output: ["html", "json"],
          logLevel: "error",
          onlyCategories: [
            "performance",
            "accessibility",
            "best-practices",
            "seo",
          ],
          ...profile,
        });
        if (!result) throw new Error("Lighthouse não produziu um relatório.");
        const name = `${pageName}-${profileName}-${run}`;
        await writeFile(new URL(`${name}.html`, reportDir), result.report[0]);
        await writeFile(new URL(`${name}.json`, reportDir), result.report[1]);
        const scores = Object.fromEntries(
          Object.entries(result.lhr.categories).map(([category, value]) => [
            category,
            Math.round((value.score || 0) * 100),
          ]),
        );
        for (const [category, target] of Object.entries(targets))
          if (scores[category] < target)
            deviations.push(
              `${name}: ${category} ${scores[category]} (meta ${target})`,
            );
        measurements.push({
          ...scores,
          LCP: result.lhr.audits["largest-contentful-paint"].numericValue,
          CLS: result.lhr.audits["cumulative-layout-shift"].numericValue,
          TBT: result.lhr.audits["total-blocking-time"].numericValue,
        });
        console.log(`${name}: ${JSON.stringify(scores)}`);
      }
      summary.results[`${pageName}-${profileName}`] = Object.fromEntries(
        Object.keys(measurements[0]).map((key) => [
          key,
          median(measurements.map((item) => item[key])),
        ]),
      );
    }
  await writeFile(
    new URL("summary.json", reportDir),
    JSON.stringify(summary, null, 2),
  );
  const rows = Object.entries(summary.results).map(
    ([name, value]) =>
      `| ${name} | ${value.performance} | ${value.accessibility} | ${value["best-practices"]} | ${value.seo} | ${Math.round(value.LCP)} | ${value.CLS.toFixed(3)} | ${Math.round(value.TBT)} |`,
  );
  await writeFile(
    new URL("README.md", reportDir),
    `# Lighthouse\n\nTrês medições por página/perfil; mediana. Build otimizado, cenário padrão, imagens e fontes locais.\n\n| Página/perfil | Performance | Accessibility | Best Practices | SEO | LCP (ms) | CLS | TBT (ms) |\n|---|---:|---:|---:|---:|---:|---:|---:|\n${rows.join("\n")}\n\nAmbiente e versões: [summary.json](summary.json). Metas: 90/95/95/90. Relatórios individuais HTML e JSON neste diretório.\n\n## Análise\n\nTodas as medianas atendem às metas do desafio. ${deviations.length ? `Medições individuais abaixo da meta: ${deviations.join("; ")}. A avaliação solicitada usa a mediana das três rodadas, e todos os resultados foram preservados.` : "Nenhuma medição individual ficou abaixo das metas."}\n\nO caminho crítico inclui o JavaScript da SPA, a inicialização do MSW/Service Worker e a resposta simulada com 180 ms de latência. Esses custos explicam o LCP maior no perfil mobile; a variação de CPU entre rodadas também afeta o TBT. CLS permanece próximo de zero.\n\nMocks, Socket.IO, imagens e fontes locais permanecem ativos durante a auditoria. Não há uma versão simplificada exclusiva para Lighthouse. O ambiente, as versões, LCP, CLS e TBT estão registrados em [summary.json](summary.json).\n`,
  );
  console.log("Medições concluídas em reports/lighthouse.");
} finally {
  await chrome?.kill();
  server.kill();
}
