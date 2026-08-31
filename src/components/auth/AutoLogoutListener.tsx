"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

export default function AutoLogoutListener() {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out:", err);
    } finally {
      localStorage.removeItem("fctoro_user_role");
      window.location.href = "/signin?timeout=true";
    }
  };

  useEffect(() => {
    // Set initial activity
    localStorage.setItem("fctoro_last_activity", Date.now().toString());

    // Check for inactivity every 10 seconds
    const intervalId = setInterval(() => {
      const lastActive = parseInt(localStorage.getItem("fctoro_last_activity") || "0", 10);
      const timeSinceLastActivity = Date.now() - lastActive;

      // If inactive for more than 15 minutes (with a small 5-second buffer)
      if (timeSinceLastActivity >= INACTIVITY_TIMEOUT_MS - 5000) {
        clearInterval(intervalId);
        handleLogout();
      }
    }, 10000);

    // User activity events to reset inactivity timer
    const events = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

    // Throttle event handler to prevent performance impact (max once every 2 seconds)
    let lastReset = Date.now();
    const onUserActivity = () => {
      const now = Date.now();
      if (now - lastReset > 2000) { 
        lastReset = now;
        localStorage.setItem("fctoro_last_activity", now.toString());
      }
    };

    events.forEach((event) => {
      window.addEventListener(event, onUserActivity, { passive: true });
    });

    return () => {
      clearInterval(intervalId);
      events.forEach((event) => {
        window.removeEventListener(event, onUserActivity);
      });
    };
  }, []);

  return null;
}
