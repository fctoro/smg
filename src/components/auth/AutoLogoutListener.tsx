"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

export default function AutoLogoutListener() {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = async () => {
    // Check if another tab was active recently
    const lastActive = parseInt(localStorage.getItem("fctoro_last_activity") || "0", 10);
    if (Date.now() - lastActive < INACTIVITY_TIMEOUT_MS - 5000) {
      resetTimer(); // Another tab is active, just reset this tab's timer
      return;
    }

    try {
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
    localStorage.setItem("fctoro_last_activity", Date.now().toString());

    // User activity events to reset inactivity timer
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

    // Throttle event handler to prevent performance impact
    let lastReset = Date.now();
    const onUserActivity = () => {
      const now = Date.now();
      if (now - lastReset > 2000) { // Reset at most every 2 seconds
        lastReset = now;
        localStorage.setItem("fctoro_last_activity", now.toString());
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
