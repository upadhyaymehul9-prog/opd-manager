import { describe, expect, it } from "vitest";
import { MAX_FAILED_LOGIN_ATTEMPTS } from "@/lib/auth";
import {
  IDLE_LOCK_TIMEOUT_MINUTES,
  IDLE_LOCK_TIMEOUT_MS,
  LOCK_SCREEN_MAX_ATTEMPTS,
  SCREEN_LOCK_SESSION_KEY,
} from "@/lib/idle-lock-config";

describe("idle-lock constants", () => {
  it("IDLE_LOCK_TIMEOUT_MS is exactly 5 minutes (300 000 ms)", () => {
    expect(IDLE_LOCK_TIMEOUT_MS).toBe(300_000);
  });

  it("IDLE_LOCK_TIMEOUT_MINUTES derives correctly from the ms constant", () => {
    expect(IDLE_LOCK_TIMEOUT_MINUTES).toBe(5);
  });

  it("SCREEN_LOCK_SESSION_KEY is the expected storage key string", () => {
    expect(SCREEN_LOCK_SESSION_KEY).toBe("opd_screen_locked");
  });

  it("LOCK_SCREEN_MAX_ATTEMPTS matches MAX_FAILED_LOGIN_ATTEMPTS — intentionally aligned", () => {
    expect(LOCK_SCREEN_MAX_ATTEMPTS).toBe(MAX_FAILED_LOGIN_ATTEMPTS);
  });
});
