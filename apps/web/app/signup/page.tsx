"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) router.push("/profile");
    });
  }, [supabase, router]);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const allFilled =
    fullName.trim() &&
    phone.trim() &&
    email.trim() &&
    username.trim() &&
    password.length >= 8 &&
    confirmPassword.length > 0;
  const passwordsMatch = password === confirmPassword;
  const canSubmit = !!allFilled && passwordsMatch && !loading;

  const passwordStrength = useMemo(() => {
    if (password.length === 0) return null;
    if (password.length < 8)
      return { label: "Too short", color: "var(--live)", percent: 20 };
    let score = 0;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (password.length >= 12) score++;
    if (score <= 1)
      return { label: "Weak", color: "var(--warning)", percent: 40 };
    if (score <= 2)
      return { label: "Medium", color: "var(--warning)", percent: 65 };
    return { label: "Strong", color: "var(--success)", percent: 100 };
  }, [password]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setError("");
    setLoading(true);

    try {
      // 1. Sign up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            username: username.trim(),
            phone: phone.trim(),
          }
        }
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      // 2. Insert into custom users table
      if (data.user) {
        const { error: dbError } = await supabase.from("users").insert({
          id: data.user.id,
          email: email.trim(),
          username: username.trim(),
          full_name: fullName.trim(),
          phone: phone.trim(),
          total_points: 0,
          level: 1,
          streak_count: 0,
          fav_team: 'Al-Hilal', // Default to a team to prevent null constraint errors
        });

        if (dbError) {
          console.error("Database insertion failed:", dbError);
          // If it's an RLS error, it's likely because email confirmation is required and the user isn't fully AUTHENTICATED yet.
          // We can redirect anyway as the profile page or a trigger will handle the record creation.
          if (dbError.message.includes("row-level security policy")) {
            console.warn("RLS policy blocked insertion. Profile creation will be handled after email confirmation.");
            // We still proceed because the user IS signed up in Auth.
            router.push("/");
            router.refresh();
            return;
          }
          
          setError(`Auth successful, but user profile creation failed: ${dbError.message}`);
          setLoading(false);
          return;
        }

        // 3. Success - redirect
        router.push("/");
        router.refresh();
      }
    } catch (err: any) {
      console.error("Signup exception:", err);
      setError(err.message || "An unexpected error occurred during signup.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Left Panel - Brand */}
      <div
        className="hidden lg:flex lg:w-5/12 relative items-center justify-center overflow-hidden"
        style={{ background: "var(--bg-secondary)" }}
      >
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute inset-0 grid-pattern opacity-30" />
        <div
          className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full animate-float opacity-20"
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
            Join the Community
          </h2>
          <p
            className="text-lg leading-relaxed animate-fade-in-up stagger-3"
            style={{ color: "var(--text-secondary)" }}
          >
            Create your account and join the smartest football community. Predict matches, earn rewards, and connect with fans worldwide.
          </p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-2 gap-4 animate-fade-in-up stagger-4">
            {[
              { icon: "👥", stat: "10K+", label: "Active Fans" },
              { icon: "🎯", stat: "50K+", label: "Predictions" },
              { icon: "⚽", stat: "500+", label: "Matches" },
              { icon: "🏆", stat: "95%", label: "AI Accuracy" },
            ].map((s) => (
              <div
                key={s.label}
                className="p-3 rounded-xl text-center"
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <span className="text-lg">{s.icon}</span>
                <div
                  className="text-lg font-bold gradient-text"
                >
                  {s.stat}
                </div>
                <div
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-7/12 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg">
          {/* Mobile brand */}
          <div className="lg:hidden mb-6 text-center">
            <span
              className="text-2xl font-extrabold tracking-[6px]"
              style={{ color: "var(--volt)" }}
            >
              LUMEN
            </span>
          </div>

          <h1 className="text-3xl font-bold mb-2">Create Account</h1>
          <p className="mb-6" style={{ color: "var(--text-secondary)" }}>
            Join the smartest football community
          </p>

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Two columns on desktop */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs font-semibold tracking-wider uppercase mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Full Name
                </label>
                <input
                  id="fullName"
                  type="text"
                  className="input-field"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                />
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-xs font-semibold tracking-wider uppercase mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  className="input-field"
                  placeholder="@yourname"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold tracking-wider uppercase mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="input-field"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoCapitalize="none"
                />
              </div>

              {/* Phone */}
              <div>
                <label
                  htmlFor="phone"
                  className="block text-xs font-semibold tracking-wider uppercase mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  className="input-field"
                  placeholder="+966 5X XXX XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="signup-password"
                className="block text-xs font-semibold tracking-wider uppercase mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPass ? "text" : "password"}
                  className="input-field !pr-16"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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
              {/* Password strength */}
              {passwordStrength && (
                <div className="mt-2 flex items-center gap-3">
                  <div
                    className="flex-1 h-1 rounded-full overflow-hidden"
                    style={{ background: "var(--bg-card-hover)" }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${passwordStrength.percent}%`,
                        background: passwordStrength.color,
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold tracking-wider uppercase mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPass ? "text" : "password"}
                  className="input-field !pr-16"
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  style={
                    confirmPassword.length > 0 && !passwordsMatch
                      ? { borderColor: "var(--live)" }
                      : {}
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPass(!showConfirmPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold cursor-pointer"
                  style={{ color: "var(--volt)" }}
                >
                  {showConfirmPass ? "Hide" : "Show"}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs mt-2" style={{ color: "var(--live)" }}>
                  Passwords don&apos;t match
                </p>
              )}
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
              className="btn-primary w-full !rounded-xl !py-4 text-base mt-2"
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
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Log in link */}
          <p
            className="text-center mt-6 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold hover:underline"
              style={{ color: "var(--volt)" }}
            >
              Log In
            </Link>
          </p>

          {/* Back to home */}
          <p className="text-center mt-3">
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
