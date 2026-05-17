import { test, expect } from "@playwright/test";

test.describe("Auth & Onboarding Flow", () => {
  test("should preserve invite context on the sign-up screen", async ({ page }) => {
    const redirect = "/invite/test-token";
    const email = "invitee@example.com";

    await page.goto(`/auth/sign-up?redirect=${encodeURIComponent(redirect)}&email=${encodeURIComponent(email)}`);

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Create account");
    await expect(page.getByLabel("Email")).toHaveValue(email);

    const signInLink = page.getByRole("link", { name: "Sign in" });
    await expect(signInLink).toHaveAttribute(
      "href",
      `/auth/sign-in?redirect=${encodeURIComponent(redirect)}&email=${encodeURIComponent(email)}`
    );
  });
});
