"use client";

import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const CHECK_INTERVAL_MS = 10 * 1000; // Check every 10 seconds
const SESSION_REFRESH_INTERVAL_MS = 10 * 60 * 1000; // Keepalive refresh every 10 minutes

export default function AutoLogoutListener() {
  const isLoggingOut = useRef(false);

  const handleLogout = async () => {
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem("fctoro_user_role");
          localStorage.removeItem("fctoro_last_activity");
        } catch {}
        window.location.href = "/signin?timeout=true";
      }
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const now = Date.now();
    // Initialize last activity if not present or invalid
    const existing = parseInt(localStorage.getItem("fctoro_last_activity") || "0", 10);
    if (!existing || isNaN(existing) || existing <= 0 || now < existing) {
      try {
        localStorage.setItem("fctoro_last_activity", now.toString());
      } catch {}
    }

    let localLastActivity = Date.now();

    const recordActivity = () => {
      const current = Date.now();
      localLastActivity = current;
      // Throttle localStorage writes to once every 2 seconds
      const stored = parseInt(localStorage.getItem("fctoro_last_activity") || "0", 10);
      if (current - stored > 2000) {
        try {
          localStorage.setItem("fctoro_last_activity", current.toString());
        } catch {}
      }
    };

    // Cross-tab synchronization via storage event
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === "fctoro_last_activity" && event.newValue) {
        const val = parseInt(event.newValue, 10);
        if (!isNaN(val) && val > localLastActivity) {
          localLastActivity = val;
        }
      }
    };
    window.addEventListener("storage", handleStorageEvent);

    // Periodic check for inactivity
    const intervalId = setInterval(() => {
      if (isLoggingOut.current) return;

      const stored = parseInt(localStorage.getItem("fctoro_last_activity") || "0", 10);
      const effectiveLastActive = Math.max(localLastActivity, isNaN(stored) ? 0 : stored);

      // If for any reason effectiveLastActive is 0 or invalid, reset it to now rather than logging out
      if (!effectiveLastActive || effectiveLastActive <= 0) {
        recordActivity();
        return;
      }

      const timeSinceLastActivity = Date.now() - effectiveLastActive;

      // If inactive for more than 15 minutes
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS) {
        clearInterval(intervalId);
        handleLogout();
      }
    }, CHECK_INTERVAL_MS);

    // Periodic token keepalive to prevent 1-hour JWT expiration while user is active
    const refreshIntervalId = setInterval(async () => {
      if (isLoggingOut.current || !supabase) return;
      const stored = parseInt(localStorage.getItem("fctoro_last_activity") || "0", 10);
      const effectiveLastActive = Math.max(localLastActivity, isNaN(stored) ? 0 : stored);
      const timeSinceLastActivity = Date.now() - effectiveLastActive;

      // Only refresh token if the user was active within the last 15 minutes
      if (timeSinceLastActivity < INACTIVITY_TIMEOUT_MS) {
        try {
          await supabase.auth.getSession();
        } catch {}
      }
    }, SESSION_REFRESH_INTERVAL_MS);

    // Comprehensive list of events to detect ANY user interaction (captured globally)
    const events = [
      "mousemove",
      "mousedown",
      "mouseup",
      "keydown",
      "keyup",
      "keypress",
      "scroll",
      "wheel",
      "touchstart",
      "touchend",
      "touchmove",
      "click",
      "contextmenu",
      "focus",
      "input",
      "change",
      "pointerdown",
      "pointermove"
    ];

    events.forEach((event) => {
      window.addEventListener(event, recordActivity, { passive: true, capture: true });
    });

    return () => {
      clearInterval(intervalId);
      clearInterval(refreshIntervalId);
      window.removeEventListener("storage", handleStorageEvent);
      events.forEach((event) => {
        window.removeEventListener(event, recordActivity, { capture: true } as any);
      });
    };
  }, []);

  return null;
}
