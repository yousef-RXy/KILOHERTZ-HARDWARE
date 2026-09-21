"use client";

import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { loginAction, signupAction } from "@/actions/auth";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || searchParams.get("next") || "/account";

  const [tab, setTab] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    formData.append("returnTo", returnTo);
    if (tab === "signup") {
      formData.append("name", name);
    }

    try {
      if (tab === "login") {
        const res = await loginAction(formData);
        if (res?.error) {
          setErrorMessage(res.error);
        }
      } else {
        const res = await signupAction(formData);
        if (res?.error) {
          setErrorMessage(res.error);
        } else if (res?.message) {
          setSuccessMessage(res.message);
          setTimeout(() => {
            setTab("login");
            setSuccessMessage("Account created. Please authenticate with your credentials.");
          }, 1500);
        }
      }
    } catch (err: any) {
      // Next.js redirect throws a NEXT_REDIRECT error which is caught here
      if (err?.message && !err.message.includes("NEXT_REDIRECT")) {
        setErrorMessage(err.message || "An authentication error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAccount = () => {
    setEmail("systems@workstation-labs.io");
    setPassword("Enterprise123!");
    if (tab === "signup") {
      setName("Dr. Evelyn Vance");
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const callbackUrl = new URL(`${window.location.origin}/auth/callback`);
      if (returnTo) {
        callbackUrl.searchParams.set("next", returnTo);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });
      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to initialize Google authentication.");
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-surface">
      <Header minimal />

      <main className="flex-1 w-full pt-[80px] pb-12 flex items-center justify-center">
        {/* Authentication Card Container */}
        <div className="w-full max-w-lg mx-auto px-4">
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden shadow-sm font-mono">
            {/* Segmented Switcher */}
            <div className="grid grid-cols-2 border-b border-outline-variant bg-surface-container-lowest text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setTab("login");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-3.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  tab === "login"
                    ? "border-primary bg-surface-container-low text-primary font-bold"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  lock_open
                </span>
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("signup");
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-3.5 px-4 flex items-center justify-center gap-2 border-b-2 transition-all cursor-pointer ${
                  tab === "signup"
                    ? "border-primary bg-surface-container-low text-primary font-bold"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  person_add
                </span>
                <span>Create Account</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 rounded flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] shrink-0 text-red-500">
                    error
                  </span>
                  <div>
                    <strong className="block font-semibold">
                      Unable to proceed
                    </strong>
                    <span className="text-[11px] leading-relaxed">{errorMessage}</span>
                  </div>
                </div>
              )}

              {successMessage && (
                <div className="p-3 bg-secondary/10 border border-secondary/30 text-secondary rounded flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[18px] shrink-0 text-secondary">
                    check_circle
                  </span>
                  <div>
                    <strong className="block font-semibold">
                      Account Created
                    </strong>
                    <span className="text-[11px] leading-relaxed">{successMessage}</span>
                  </div>
                </div>
              )}

              {tab === "signup" && (
                <div>
                  <label className="block text-on-surface font-semibold mb-1 text-[11px]">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded text-on-surface focus:outline-none focus:border-secondary text-xs"
                  />
                </div>
              )}

              <div>
                <label className="block text-on-surface font-semibold mb-1 text-[11px]">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded text-on-surface focus:outline-none focus:border-secondary text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-on-surface font-semibold text-[11px]">
                    Password *
                  </label>
                  {tab === "login" && (
                    <span className="text-[10px] text-on-surface-variant hover:text-primary cursor-pointer">
                      Forgot password?
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-10 px-3 bg-surface-container-low border border-outline-variant rounded text-on-surface focus:outline-none focus:border-secondary text-xs"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-primary hover:bg-primary-container text-on-primary rounded font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs tracking-wider uppercase"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {tab === "login" ? "login" : "how_to_reg"}
                  </span>
                  <span>
                    {loading
                      ? "Signing in..."
                      : tab === "login"
                      ? "Sign In"
                      : "Create Account"}
                  </span>
                </button>
              </div>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-outline-variant"></div>
                <span className="flex-shrink mx-3 text-[10px] text-on-surface-variant uppercase tracking-wider">
                  or continue with
                </span>
                <div className="flex-grow border-t border-outline-variant"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full h-11 bg-surface-container-low hover:bg-surface-container-highest border border-outline-variant text-on-surface rounded font-medium transition-colors flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 text-xs"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Demo Account Helper */}
              <div className="pt-4 border-t border-outline-variant">
                <div className="flex items-center justify-between text-[11px] text-on-surface-variant mb-2">
                  <span>Demo Account:</span>
                  <button
                    type="button"
                    onClick={fillDemoAccount}
                    className="text-secondary font-bold hover:underline uppercase cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
                <div className="p-2.5 bg-surface-container-low border border-outline-variant rounded text-[11px] text-on-surface-variant font-mono space-y-0.5">
                  <div>
                    <strong className="text-on-surface">Email:</strong> systems@workstation-labs.io
                  </div>
                  <div>
                    <strong className="text-on-surface">Password:</strong> Enterprise123!
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-surface flex items-center justify-center font-mono text-xs">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
