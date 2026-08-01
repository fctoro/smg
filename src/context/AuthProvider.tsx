"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in ms

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<any>(null);

  // Sign out user locally and redirect
  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    router.push("/signin");
    router.refresh();
  }, [router]);

  // Handle inactivity timer
  useEffect(() => {
    // We only care about inactivity if they are logged in
    // However, if session is null, we can just skip
    if (!session) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleSignOut();
      }, INACTIVITY_TIMEOUT);
    };

    // Events that count as "activity"
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    // Initialize timer
    resetTimer();

    // Add event listeners
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [session, handleSignOut]);

  // Monitor auth state changes from Supabase
  useEffect(() => {
    if (!supabase) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: string, session: any) => {
        setSession(session);
        if (event === "SIGNED_OUT") {
          router.push("/signin");
          router.refresh();
        }
      }
    );

    // Initial check
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: any } }) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return <>{children}</>;
}
