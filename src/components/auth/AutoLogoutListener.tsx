"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

export default function AutoLogoutListener() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      localStorage.removeItem("fctoro_user_role");
      window.location.href = "/signin?timeout=true";
    }
  };

  const resetTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(handleLogout, INACTIVITY_TIMEOUT_MS);
  };

  useEffect(() => {
    // Initial timer setup
    resetTimer();

    // User activity events to reset inactivity timer
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

    // Throttle event handler to prevent performance impact
    let lastReset = Date.now();
    const onUserActivity = () => {
      const now = Date.now();
      if (now - lastReset > 2000) { // Reset at most every 2 seconds
        lastReset = now;
        resetTimer();
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, onUserActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, onUserActivity);
      });
    };
  }, []);

  return null;
}
