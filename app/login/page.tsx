"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/brand";
import { useAuth } from "@/components/auth-provider";

export default function LoginPage() {
  const router = useRouter();
  const { supabase, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nextPath] = useState(() => {
    if (typeof window === "undefined") {
      return "/dashboard";
    }

    return new URLSearchParams(window.location.search).get("next") || "/dashboard";
  });

  useEffect(() => {
    if (!loading && user) {
      router.replace(nextPath);
    }
  }, [loading, nextPath, router, user]);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setErrorMessage("Enter your email and password first.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace(nextPath);
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_24px_80px_rgba(44,74,129,0.14)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="bg-[linear-gradient(180deg,#eef7ff_0%,#ffffff_100%)] p-8 md:p-10">
          <Brand />
          <div className="mt-10 space-y-4">
            <span className="inline-flex rounded-full bg-[#dceeff] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#4a6a95]">
              Welcome back
            </span>
            <h1 className="text-4xl font-black leading-tight text-[#1b2c77]">
              Sign in to continue your private learning room
            </h1>
            <p className="max-w-md text-base leading-7 text-slate-600">
              Your private room history, Study Squad list, quiz progress, flashcards, and classrooms are now tied to your account.
            </p>
          </div>
        </section>

        <section className="p-8 md:p-10">
          <div className="mx-auto max-w-md">
            <h2 className="text-center text-2xl font-black text-[#1b2c77]">
              Login
            </h2>
            <div className="mt-6 space-y-4">
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
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      void handleLogin();
                    }
                  }}
                />
              </label>
            </div>

            {errorMessage ? (
              <p className="mt-4 text-sm font-semibold text-rose-600">{errorMessage}</p>
            ) : null}

            <button
              type="button"
              onClick={handleLogin}
              disabled={submitting}
              className="mt-6 block w-full rounded-full bg-[#1b2c77] px-5 py-3 text-center text-base font-extrabold text-white transition hover:bg-[#13215c] disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Login"}
            </button>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don&apos;t have an account yet?{" "}
              <Link href="/register" className="font-bold text-[#4267d6]">
                Create account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
