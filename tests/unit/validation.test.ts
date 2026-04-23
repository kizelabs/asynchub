import { describe, expect, test } from "vitest";
import {
  inviteEmailSchema,
  projectStatusSchema,
  projectTitleSchema,
  signInSchema,
  signUpSchema,
  taskTitleSchema,
  workspaceNameSchema
} from "$lib/validation";

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

describe("taskTitleSchema", () => {
  test("accepts a trimmed title within bounds", () => {
    const res = taskTitleSchema.safeParse("  Ship onboarding flow  ");
    expect(res.success).toBe(true);
    expect(res.data).toBe("Ship onboarding flow");
  });

  test("rejects titles shorter than 3 characters", () => {
    const res = taskTitleSchema.safeParse("ok");
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.message).toBe("Task title must be at least 3 characters");
  });

  test("rejects titles longer than 255 characters", () => {
    const res = taskTitleSchema.safeParse("a".repeat(256));
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.message).toBe("Task title must be 255 characters or fewer");
  });
});

describe("workspaceNameSchema", () => {
  test("accepts a trimmed workspace name", () => {
    const res = workspaceNameSchema.safeParse("  Design Team  ");
    expect(res.success).toBe(true);
    expect(res.data).toBe("Design Team");
  });

  test("rejects workspace names shorter than 2 characters", () => {
    const res = workspaceNameSchema.safeParse("a");
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.message).toBe("Workspace name must be at least 2 characters");
  });
});

describe("projectTitleSchema", () => {
  test("accepts a trimmed project title", () => {
    const res = projectTitleSchema.safeParse("  Q2 Launch  ");
    expect(res.success).toBe(true);
    expect(res.data).toBe("Q2 Launch");
  });

  test("rejects project titles shorter than 3 characters", () => {
    const res = projectTitleSchema.safeParse("ab");
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.message).toBe("Title must be at least 3 characters");
  });
});

describe("projectStatusSchema", () => {
  test("accepts supported project statuses", () => {
    expect(projectStatusSchema.safeParse("active").success).toBe(true);
    expect(projectStatusSchema.safeParse("paused").success).toBe(true);
    expect(projectStatusSchema.safeParse("completed").success).toBe(true);
  });

  test("rejects unsupported project statuses", () => {
    const res = projectStatusSchema.safeParse("archived");
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.message).toBe("Project status must be active, paused, or completed");
  });
});

describe("inviteEmailSchema", () => {
  test("normalizes invite emails to lowercase", () => {
    const res = inviteEmailSchema.safeParse("Teammate@Example.com");
    expect(res.success).toBe(true);
    expect(res.data).toBe("teammate@example.com");
  });

  test("rejects invalid invite emails", () => {
    const res = inviteEmailSchema.safeParse("not-an-email");
    expect(res.success).toBe(false);
    expect(res.error?.issues[0]?.message).toBe("Enter a valid email address");
  });
});
