import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  snapshotPathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}",
  timeout: 45000,
  expect: { timeout: 10000, toHaveScreenshot: { maxDiffPixelRatio: 0.015 } },
  fullyParallel: true,
  workers: 2,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "reports/playwright" }],
  ],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 } } },
    {
      name: "tablet",
      testMatch: /visual\.spec\.ts/,
      use: { viewport: { width: 768, height: 1024 } },
    },
  ],
  webServer: {
    command: `"${process.execPath}" node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173`,
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
});
