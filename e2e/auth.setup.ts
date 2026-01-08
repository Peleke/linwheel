import { test as setup, expect } from "@playwright/test";
import path from "path";

const authFile = path.join(__dirname, "../.auth/user.json");

setup("authenticate", async ({ page }) => {
  // Use test credentials from environment
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are required.\n" +
        "Create a test user in Supabase and set these in your .env.local"
    );
  }

  console.log(`Authenticating with: ${email}`);

  // Listen for console errors
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`Browser console error: ${msg.text()}`);
    }
  });

  // Navigate to login page
  await page.goto("/login");
  await page.waitForLoadState("networkidle");

  // Fill in login form
  const emailInput = page.locator("#email");
  const passwordInput = page.locator("#password");

  await expect(emailInput).toBeVisible({ timeout: 10000 });
  await emailInput.fill(email);
  await passwordInput.fill(password);

  console.log("Form filled, clicking sign in button...");

  // Click sign in button
  const signInButton = page.getByRole("button", { name: "Sign in" });
  await expect(signInButton).toBeEnabled();
  await signInButton.click();

  // Wait for network to settle
  await page.waitForLoadState("networkidle");

  // Check for error message
  const errorDiv = page.locator(".bg-red-50, .bg-red-900\\/20");
  if (await errorDiv.isVisible({ timeout: 2000 }).catch(() => false)) {
    const errorText = await errorDiv.textContent();
    throw new Error(`Login failed: ${errorText}`);
  }

  // Wait for redirect away from login page (default redirects to /generate)
  try {
    await page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 15000,
    });
  } catch {
    const url = page.url();
    console.log(`Still on: ${url}`);

    // Final check for error
    if (await errorDiv.isVisible().catch(() => false)) {
      const errorText = await errorDiv.textContent();
      throw new Error(`Login failed: ${errorText}`);
    }

    throw new Error(`Login did not redirect. Stuck on ${url}`);
  }

  // Verify we're authenticated
  await expect(page).not.toHaveURL(/\/login/);

  console.log("Login successful!");

  // Save signed-in state
  await page.context().storageState({ path: authFile });
});
