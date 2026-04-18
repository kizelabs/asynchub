import { describe, expect, test } from "vitest";
import { slugify } from "$lib/utils";

describe("slugify", () => {
  test("converts to lowercase & replaces spaces", () => {
    expect(slugify("My Workspace")).toBe("my-workspace");
  });
  test("removes special characters", () => {
    expect(slugify("Team @ Design!")).toBe("team-design");
  });
  test("handles empty input", () => {
    expect(slugify("")).toBe("");
  });
  test("collapses multiple hyphens", () => {
    expect(slugify("test   -   workspace")).toBe("test-workspace");
  });
});
