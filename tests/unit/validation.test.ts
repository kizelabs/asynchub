import { describe, expect, test } from "vitest";
import { signInSchema, signUpSchema } from "$lib/validation";

describe("signInSchema", () => {
  test("validates correct email & password", () => {
    const res = signInSchema.safeParse({ email: "dev@example.com", password: "secure123" });
    expect(res.success).toBe(true);
  });

  test("rejects invalid email format", () => {
    const res = signInSchema.safeParse({ email: "notanemail", password: "secure123" });
    expect(res.success).toBe(false);
    expect(res.error?.flatten().fieldErrors.email?.[0]).toBe("Please enter a valid email address");
  });

  test("rejects password shorter than 8 chars", () => {
    const res = signInSchema.safeParse({ email: "dev@example.com", password: "short" });
    expect(res.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  test("validates matching passwords & required name", () => {
    const res = signUpSchema.safeParse({
      name: "Jane",
      email: "jane@co.com",
      password: "longpassword",
      confirmPassword: "longpassword",
    });
    expect(res.success).toBe(true);
  });

  test("rejects mismatched passwords", () => {
    const res = signUpSchema.safeParse({
      name: "Jane",
      email: "jane@co.com",
      password: "password1",
      confirmPassword: "password2",
    });
    expect(res.success).toBe(false);
    expect(res.error?.flatten().fieldErrors.confirmPassword?.[0]).toBe("Passwords do not match");
  });

  test("rejects short name", () => {
    const res = signUpSchema.safeParse({
      name: "J",
      email: "j@co.com",
      password: "password1",
      confirmPassword: "password1",
    });
    expect(res.success).toBe(false);
  });
});
