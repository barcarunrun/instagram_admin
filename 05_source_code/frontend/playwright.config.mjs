import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";

const frontendPort = Number(process.env.PLAYWRIGHT_FRONTEND_PORT ?? "3100");
const backendPort = Number(process.env.PLAYWRIGHT_BACKEND_PORT ?? "4100");
const frontendBaseUrl = `http://localhost:${frontendPort}`;
const backendOrigin = `http://localhost:${backendPort}`;
const backendBaseUrl = `${backendOrigin}/api`;
const databaseUrl =
  process.env.PLAYWRIGHT_DATABASE_URL ??
  "postgresql://instagram:instagram@localhost:5432/instagram_ops";
const redisUrl = process.env.PLAYWRIGHT_REDIS_URL ?? "redis://localhost:6379";
const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL: frontendBaseUrl,
    headless: true,
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: `PORT=${backendPort} DATABASE_URL=${databaseUrl} REDIS_URL=${redisUrl} CORS_ORIGIN=${frontendBaseUrl} OAUTH_MODE=mock INSTAGRAM_API_MODE=mock NOTIFICATION_MODE=log FACEBOOK_OAUTH_REDIRECT_URI=${backendBaseUrl}/auth/instagram/callback FRONTEND_OAUTH_COMPLETE_URL=${frontendBaseUrl}/connect JWT_SECRET=local-dev-jwt-secret ACCESS_TOKEN_EXPIRES_IN=3600 INSTAGRAM_TOKEN_ENCRYPTION_SECRET=local-dev-instagram-token-secret npm run dev`,
      cwd: path.resolve(rootDir, "../backend"),
      url: `${backendBaseUrl}/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `PORT=${frontendPort} NEXT_PUBLIC_API_BASE_URL=${backendBaseUrl} SERVER_API_BASE_URL=${backendBaseUrl} npm run dev -- --hostname localhost`,
      cwd: rootDir,
      url: `${frontendBaseUrl}/login`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
