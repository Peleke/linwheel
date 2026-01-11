import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright Test Configuration
 *
 * Projects:
 * - setup: Runs auth.setup.ts first to authenticate
 * - chromium: Main tests using authenticated state
 * - chromium-noauth: Tests that don't require auth (e.g., landing page)
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["html"], ["list"], ["github"]]
    : [["html"], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3001",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    // Setup project - runs first to authenticate
    { name: "setup", testMatch: /.*\.setup\.ts/ },

    // Main authenticated tests
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Use signed-in state from auth setup
        storageState: ".auth/user.json",
      },
      dependencies: ["setup"],
      // Exclude setup files from regular test runs
      testIgnore: /.*\.setup\.ts/,
    },

    // Unauthenticated tests (landing page, public routes)
    {
      name: "chromium-noauth",
      use: {
        ...devices["Desktop Chrome"],
      },
      // Only match tests that explicitly don't need auth
      testMatch: /.*\.noauth\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3001",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
