"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { useAuth } from "@/components/auth-provider";

export default function RegisterPage() {
  const router = useRouter();
  const { supabase, user, loading } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, router, user]);

  async function handleRegister() {
    if (!displayName.trim() || !email.trim() || !password) {
      setErrorMessage("Please complete all required fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password should be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
      },
    });

    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (data.session) {
      router.replace("/dashboard");
      router.refresh();
      return;
    }

    setSuccessMessage("Account created. Check your email to confirm your signup.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(44,74,129,0.14)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="bg-[linear-gradient(180deg,#f7fbff_0%,#eef7ff_100%)] p-8 md:p-10">
          <Brand />
          <div className="mt-10 space-y-4">
            <span className="inline-flex rounded-full bg-[#dceeff] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#4a6a95]">
              Get started
            </span>
            <h1 className="text-4xl font-black leading-tight text-[#1b2c77]">
              Create your account and let Learn&apos;Bot remember your progress
            </h1>
            <p className="max-w-md text-base leading-7 text-slate-600">
              After signup, your private room chat history, Study Squad, quiz repair loop, flashcards, and classroom list will stay with your account.
            </p>
          </div>
        </section>

        <section className="p-8 md:p-10">
          <div className="mx-auto max-w-md">
            <h2 className="text-center text-2xl font-black text-[#1b2c77]">
              Register
            </h2>
            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Display name
                </span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded-2xl border border-[#b7d0ef] bg-[#f7fbff] px-4 py-3 outline-none transition focus:border-[#4267d6]"
                  placeholder="Your name"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-[#b7d0ef] bg-[#f7fbff] px-4 py-3 outline-none transition focus:border-[#4267d6]"
                  placeholder="name@email.com"
                  type="email"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Password
                </span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="w-full rounded-2xl border border-[#b7d0ef] bg-[#f7fbff] px-4 py-3 outline-none transition focus:border-[#4267d6]"
                  placeholder="********"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-slate-600">
                  Confirm password
                </span>
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  type="password"
                  className="w-full rounded-2xl border border-[#b7d0ef] bg-[#f7fbff] px-4 py-3 outline-none transition focus:border-[#4267d6]"
                  placeholder="********"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleRegister();
                    }
                  }}
                />
              </label>
            </div>

            {errorMessage ? (
              <p className="mt-4 text-sm font-semibold text-rose-600">{errorMessage}</p>
            ) : null}
            {successMessage ? (
              <p className="mt-4 text-sm font-semibold text-emerald-600">
                {successMessage}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleRegister}
              disabled={submitting}
              className="mt-6 block w-full rounded-full bg-[#1b2c77] px-5 py-3 text-center text-base font-extrabold text-white transition hover:bg-[#13215c] disabled:opacity-60"
            >
              {submitting ? "Creating account..." : "Create account"}
            </button>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-[#4267d6]">
                Login
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
