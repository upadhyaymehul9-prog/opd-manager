"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  IDLE_LOCK_TIMEOUT_MS,
  SCREEN_LOCK_SESSION_KEY,
} from "@/lib/idle-lock-config";

export function useIdleLock(enabled: boolean) {
  const [locked, setLocked] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lock = useCallback(() => {
    sessionStorage.setItem(SCREEN_LOCK_SESSION_KEY, "1");
    setLocked(true);
  }, []);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(lock, IDLE_LOCK_TIMEOUT_MS);
  }, [lock]);

  // resetTimer must be declared before unlock (temporal dead zone).
  const unlock = useCallback(() => {
    sessionStorage.removeItem(SCREEN_LOCK_SESSION_KEY);
    setLocked(false);
    resetTimer();
  }, [resetTimer]);

  // Restore lock state from sessionStorage whenever enabled becomes true
  // (covers page refreshes and initial mount after the session loads).
  useEffect(() => {
    if (!enabled) return;
    if (sessionStorage.getItem(SCREEN_LOCK_SESSION_KEY) === "1") {
      setLocked(true);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    resetTimer();

    function handleActivity() {
      // Ignore activity while a debounce is already queued.
      if (debounceRef.current) return;
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        resetTimer();
      }, 300);
    }

    const events = ["mousemove", "keydown", "touchstart", "click"] as const;
    for (const event of events) {
      window.addEventListener(event, handleActivity, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      for (const event of events) {
        window.removeEventListener(event, handleActivity);
      }
    };
  }, [enabled, resetTimer]);

  return { locked, unlock };
}
