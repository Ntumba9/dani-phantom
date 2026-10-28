import { describe, expect, it } from "vitest";
import { validateDestinationUrl } from "../url";

describe("validateDestinationUrl", () => {
  it("accepts http URLs", () => {
    const result = validateDestinationUrl("http://example.com/path");
    expect(result.valid).toBe(true);
  });

  it("accepts https URLs", () => {
    const result = validateDestinationUrl("https://example.com/path?q=1");
    expect(result.valid).toBe(true);
  });

  it("rejects empty input", () => {
    const result = validateDestinationUrl("   ");
    expect(result.valid).toBe(false);
  });

  it("rejects javascript: URLs", () => {
    const result = validateDestinationUrl("javascript:alert(1)");
    expect(result.valid).toBe(false);
  });

  it("rejects data: URLs", () => {
    const result = validateDestinationUrl("data:text/html,<script>alert(1)</script>");
    expect(result.valid).toBe(false);
  });

  it("rejects file: URLs", () => {
    const result = validateDestinationUrl("file:///etc/passwd");
    expect(result.valid).toBe(false);
  });

  it("rejects malformed URLs", () => {
    const result = validateDestinationUrl("not a url");
    expect(result.valid).toBe(false);
  });

  it("rejects overly long URLs", () => {
    const longUrl = "https://example.com/" + "a".repeat(3000);
    const result = validateDestinationUrl(longUrl);
    expect(result.valid).toBe(false);
  });

  it("rejects ftp URLs", () => {
    const result = validateDestinationUrl("ftp://example.com/file");
    expect(result.valid).toBe(false);
  });
});
