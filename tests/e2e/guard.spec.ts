import { test, expect } from "@playwright/test";

test.describe("Auth Guard", () => {
  test("should redirect unauthenticated users to sign-in", async ({ page }) => {
    await page.goto("/app/dashboard");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Sign in");
  });

  test("should redirect unauthenticated onboarding access to sign-in", async ({ page }) => {
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/auth\/sign-in/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Sign in");
  });
});
