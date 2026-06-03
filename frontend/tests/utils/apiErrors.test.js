import { describe, expect, it } from "vitest";
import {
  formatApiDetail,
  getApiErrorMessage,
  getNetworkOrErrorMessage,
} from "../../src/utils/apiErrors";

describe("apiErrors", () => {
  it("formats string detail", () => {
    expect(formatApiDetail("Not found")).toBe("Not found");
  });

  it("formats validation array detail", () => {
    expect(
      formatApiDetail([{ loc: ["body", "email"], msg: "required" }]),
    ).toContain("required");
  });

  it("maps HTTP status when detail missing", () => {
    expect(getApiErrorMessage({ status: 500 }, {})).toMatch(/Server error/);
  });

  it("detects network failures", () => {
    expect(getNetworkOrErrorMessage(new Error("Failed to fetch"))).toMatch(
      /Cannot reach the server/,
    );
  });
});
