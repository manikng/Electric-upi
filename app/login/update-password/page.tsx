"use client";

import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser-client";
import { Lock, ArrowRight, Zap, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import styles from "../login-theme.module.css";

export default function UpdatePasswordPage() {
  const supabase = getSupabaseBrowserClient();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState("");

  async function handleUpdatePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setStatus(error.message);
    } else {
      setStatus("Password updated successfully. You can now sign in.");
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.card} style={{ maxWidth: "500px", minHeight: "auto", padding: "var(--space-8)" }}>
        <div className="w-full flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-8 justify-center">
            <Zap className="w-7 h-7 text-primary fill-primary" />
            <span className="text-2xl font-extrabold text-primary">Electric UPI</span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 text-center mb-1">Set New Password</h2>
          <p className="text-sm text-gray-500 text-center mb-8">
            Choose a strong password with at least 6 characters.
          </p>

          <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
            <div className={styles.fieldGroup}>
              <label className={styles.label} htmlFor="password">New Password</label>
              <div className={styles.inputWrap}>
                <Lock className={`${styles.inputIcon} w-5 h-5 text-gray-400`} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${styles.input} ${styles.inputWithToggle}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={styles.toggleBtn}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {status && (
              <p
                className={`text-sm text-center ${
                  status.includes("successfully") ? "text-green-600" : "text-red-600"
                }`}
                role="status"
                aria-live="polite"
              >
                {status}
              </p>
            )}

            <button type="submit" className={styles.submitBtn}>
              <span>Update Password</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/login" className="text-xs text-primary font-bold hover:underline">
              Back to Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
