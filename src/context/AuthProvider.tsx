"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const INACTIVITY_TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours in ms

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
