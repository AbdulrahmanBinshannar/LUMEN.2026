"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) router.push("/profile");
    });
  }, [supabase, router]);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = identifier.trim().length > 0 && password.length > 0 && !loading;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setLoading(true);

    const trimmed = identifier.trim();
    const isEmail = trimmed.includes("@");
    let email = trimmed;

    // Resolve Email if Username or Phone was provided
    if (!isEmail) {
      const isPhone = /^\+?\d[\d\s\-]{6,}$/.test(trimmed);
      const query = supabase.from("users").select("email");
      
      if (isPhone) {
        query.eq("phone", trimmed);
      } else {
        // Assume it's a username (with or without @ prefix)
        query.eq("username", trimmed.startsWith("@") ? trimmed.slice(1) : trimmed);
      }

      const { data, error: dbError } = await query.single();
      
      if (dbError || !data) {
        setError(isPhone ? "Phone number not registered" : "Username not found");
        setLoading(false);
        return;
      }
      email = data.email;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh(); // Force a refresh to sync server/client state if needed
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Left Panel - Brand */}
      <div
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden"
        style={{ background: "var(--bg-secondary)" }}
      >
        {/* Background effects */}
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div
          className="absolute top-1/3 left-1/3 w-80 h-80 rounded-full animate-float opacity-20"
          style={{
            background:
              "radial-gradient(circle, rgba(204,255,0,0.15) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />

        <div className="relative z-10 max-w-md px-12 text-center">
          <div className="mb-8 animate-fade-in-up stagger-1">
            <span
              className="text-4xl font-extrabold tracking-[8px]"
              style={{ color: "var(--volt)" }}
            >
              LUMEN
            </span>
          </div>
          <h2 className="text-3xl font-bold mb-4 animate-fade-in-up stagger-2">
            Welcome Back
          </h2>
          <p
            className="text-lg leading-relaxed animate-fade-in-up stagger-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Sign in to access your predictions, climb the leaderboard, and join
            the smartest football community.
          </p>

          {/* Feature pills */}
          <div className="mt-10 flex flex-wrap justify-center gap-3 animate-fade-in-up stagger-4">
            {["⚡ AI Analytics", "🏆 Predictions", "💬 Fan Chat"].map(
              (pill) => (
                <span
                  key={pill}
                  className="px-4 py-2 rounded-full text-sm font-medium"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {pill}
                </span>
              )
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden mb-8 text-center">
            <span
              className="text-2xl font-extrabold tracking-[6px]"
              style={{ color: "var(--volt)" }}
            >
              LUMEN
            </span>
          </div>

          <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
          <p className="mb-8" style={{ color: "var(--text-secondary)" }}>
            Sign in to your account
          </p>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email or Phone */}
            <div>
              <label
                htmlFor="identifier"
                className="block text-xs font-semibold tracking-wider uppercase mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Email or Phone
              </label>
              <input
                id="identifier"
                type="text"
                className="input-field"
                placeholder="Email or phone number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold tracking-wider uppercase mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  className="input-field !pr-16"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold cursor-pointer"
                  style={{ color: "var(--volt)" }}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="text-sm p-3 rounded-lg"
                style={{
                  background: "rgba(255,59,48,0.1)",
                  border: "1px solid rgba(255,59,48,0.2)",
                  color: "var(--live)",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn-primary w-full !rounded-xl !py-4 text-base"
              style={{ opacity: canSubmit ? 1 : 0.4 }}
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in...
                </span>
              ) : (
                "Log In"
              )}
            </button>
          </form>

          {/* Sign up link */}
          <p className="text-center mt-8 text-sm" style={{ color: "var(--text-secondary)" }}>
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold hover:underline"
              style={{ color: "var(--volt)" }}
            >
              Sign up
            </Link>
          </p>

          {/* Back to home */}
          <p className="text-center mt-4">
            <Link
              href="/"
              className="text-sm font-medium transition-colors hover:text-[var(--volt)]"
              style={{ color: "var(--text-muted)" }}
            >
              ← Back to home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
