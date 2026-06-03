import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addSession,
  clearToken,
  getHistory,
  getToken,
  saveHistory,
  setToken,
} from "../../src/utils/storage.js";

describe("storage utils", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("token helpers", () => {
    it("stores and reads the auth token", () => {
      setToken("abc123");
      expect(getToken()).toBe("abc123");
    });

    it("clears the auth token", () => {
      setToken("abc123");
      clearToken();
      expect(getToken()).toBeNull();
    });
  });

  describe("study history", () => {
    it("returns an empty list when no history exists", () => {
      expect(getHistory(42)).toEqual([]);
    });

    it("returns an empty list for invalid JSON", () => {
      localStorage.setItem("fc_history_42", "{not-json");
      expect(getHistory(42)).toEqual([]);
    });

    it("saves and loads sessions per user", () => {
      const sessions = [{ id: 1, pct: 80 }];
      saveHistory(7, sessions);
      expect(getHistory(7)).toEqual(sessions);
    });

    it("prepends new sessions and keeps at most 50 entries", () => {
      const existing = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        date: "2026-01-01",
        correct: 1,
        wrong: 0,
        total: 1,
        pct: 100,
      }));
      saveHistory(9, existing);

      vi.spyOn(Date, "now").mockReturnValue(999);
      addSession(9, { correct: 2, wrong: 1, total: 3, pct: 67 });

      const history = getHistory(9);
      expect(history).toHaveLength(50);
      expect(history[0]).toMatchObject({
        id: 999,
        correct: 2,
        wrong: 1,
        total: 3,
        pct: 67,
      });
      expect(history[49].id).toBe(48);
      expect(history.some((session) => session.id === 49)).toBe(false);
    });
  });
});
