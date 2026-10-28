import { describe, expect, it } from "vitest";
import { generateShortCode, isValidShortCodeFormat } from "../shortcode";

describe("generateShortCode", () => {
  it("generates codes of the requested length", () => {
    expect(generateShortCode(7)).toHaveLength(7);
    expect(generateShortCode(10)).toHaveLength(10);
  });

  it("only uses unambiguous alphanumeric characters", () => {
    const code = generateShortCode(20);
    expect(code).toMatch(/^[0-9a-zA-Z]+$/);
    expect(code).not.toMatch(/[0O1lI]/);
  });

  it("generates different codes across calls", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateShortCode()));
    expect(codes.size).toBeGreaterThan(45);
  });
});

describe("isValidShortCodeFormat", () => {
  it("accepts normal codes", () => {
    expect(isValidShortCodeFormat("abc123")).toBe(true);
  });

  it("rejects codes that are too short", () => {
    expect(isValidShortCodeFormat("ab")).toBe(false);
  });

  it("rejects codes with path-traversal characters", () => {
    expect(isValidShortCodeFormat("../etc/passwd")).toBe(false);
  });

  it("rejects codes with special characters", () => {
    expect(isValidShortCodeFormat("abc/def")).toBe(false);
    expect(isValidShortCodeFormat("abc def")).toBe(false);
  });
});
