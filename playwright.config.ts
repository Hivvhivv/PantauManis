import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Halaman Responden harus nyaman di lebar 360 px (PRD bagian 11).
    {
      name: "mobile-360",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 }, isMobile: false },
    },
  ],
  webServer: {
    command: "npx tsx scripts/e2e-server.ts",
    url: "http://localhost:3100/masuk",
    timeout: 240_000,
    reuseExistingServer: false,
  },
});
