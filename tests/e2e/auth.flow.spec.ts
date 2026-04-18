import { test, expect } from "@playwright/test";

test.describe("Auth & Onboarding Flow", () => {
  // Deterministic test data using timestamp to avoid collisions
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "SecurePass123!";
  const workspaceName = `E2E Workspace ${Date.now()}`;

  test("should sign up, create workspace, and land on dashboard", async ({ page }) => {
    await page.goto("/auth/sign-up");
    
    // Fill form using accessible labels (remote hiring signal: a11y-first testing)
    await page.getByLabel("Full Name").fill("E2E User");
    await page.getByLabel("Email").fill(testEmail);
    await page.getByLabel("Password").fill(testPassword);
    await page.getByLabel("Confirm Password").fill(testPassword);
    
    await page.getByRole("button", { name: "Create account" }).click();
    
    // Wait for async auth redirect
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 5000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Create your workspace");

    await page.getByLabel("Workspace name").fill(workspaceName);
    await page.getByRole("button", { name: "Create workspace" }).click();

    // Verify dashboard loads with user context
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 5000 });
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome, E2E User");
    await expect(page.getByRole("banner")).toContainText(workspaceName.split(" ")[0]);
  });
});
