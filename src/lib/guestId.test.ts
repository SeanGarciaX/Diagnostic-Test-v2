import { describe, expect, it } from "vitest";
import { readGuestIdCookie } from "./guestId";

describe("readGuestIdCookie", () => {
  it("accepts a plausible cookie value", () => {
    expect(readGuestIdCookie("a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7a8")).toBe("a1b2c3d4-e5f6-4789-a012-b3c4d5e6f7a8");
  });

  it("rejects undefined (no cookie sent yet)", () => {
    expect(readGuestIdCookie(undefined)).toBeNull();
  });

  it("rejects an empty or absurdly short value rather than trusting a malformed cookie", () => {
    expect(readGuestIdCookie("")).toBeNull();
    expect(readGuestIdCookie("x")).toBeNull();
  });

  it("rejects an absurdly long value", () => {
    expect(readGuestIdCookie("a".repeat(500))).toBeNull();
  });
});
