"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";

interface UseAuthOptions {
  initialUser: User | null;
}

export function useAuth({ initialUser }: UseAuthOptions) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(initialUser);

  // Listen to auth state changes
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSignOut = useCallback(async () => {
    try {
      console.log("Signing out — cookies before:", document.cookie);
      console.log(
        "localStorage keys before:",
        Object.keys(localStorage)
      );

      const { error } = await supabase.auth.signOut({ scope: "local" });
      console.log("signOut response error:", error);

      if (error) {
        console.warn("Local signOut failed, attempting global signOut", error);
        const { error: err2 } = await supabase.auth.signOut();
        console.log("global signOut response error:", err2);
      }

      console.log("Signing out — cookies after:", document.cookie);
      console.log(
        "localStorage keys after:",
        Object.keys(localStorage)
      );
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      setUser(null);
      try {
        router.push("/");
      } catch (e) {
        // ignore
      }
      router.refresh();
    }
  }, [supabase, router]);

  return {
    user,
    setUser,
    handleSignOut,
  };
}
