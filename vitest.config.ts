import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(__dirname, "src"),
  // Di luar Next.js, paket server-only selalu melempar error; ganti dengan modul kosong.
  "server-only": path.resolve(__dirname, "tests/support/empty.ts"),
};

// Secret khusus test (bukan rahasia sungguhan).
const testEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:54330/pantaumanis_test",
  APP_URL: "http://localhost:3000",
  ACCESS_CODE_HMAC_SECRET: Buffer.alloc(32, 1).toString("base64"),
  ACCESS_CODE_ENC_KEY: Buffer.alloc(32, 2).toString("base64"),
};

export default defineConfig({
  test: {
    // Integration test berbagi satu basis data; file dijalankan berurutan.
    // (Opsi ini hanya berlaku di level root, bukan per proyek.)
    fileParallelism: false,
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          env: testEnv,
        },
      },
      {
        resolve: { alias },
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          env: testEnv,
          globalSetup: ["tests/support/global-setup.ts"],
          setupFiles: ["tests/support/integration-setup.ts"],
          testTimeout: 30_000,
          hookTimeout: 120_000,
        },
      },
    ],
  },
});
