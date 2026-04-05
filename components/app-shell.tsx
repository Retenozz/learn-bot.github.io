"use client";

import Link from "next/link";
import { getProfileInitials, useAuth } from "@/components/auth-provider";
import { Brand } from "@/components/brand";
import {
  BoardIcon,
  BookIcon,
  CardsIcon,
  MenuIcon,
  QuizIcon,
  TargetIcon,
  UserIcon,
  UsersIcon,
} from "@/components/icons";
import { navItems } from "@/data/site";

type AppShellProps = {
  activeHref: string;
  children: React.ReactNode;
  topBarRight?: React.ReactNode;
  lockViewportHeight?: boolean;
};

const iconMap = {
  "/dashboard": BookIcon,
  "/weakness-tracker": TargetIcon,
  "/study-squad": UsersIcon,
  "/quiz": QuizIcon,
  "/flashcards": CardsIcon,
  "/classroom": BoardIcon,
};

export function AppShell({
  activeHref,
  children,
  topBarRight,
  lockViewportHeight = false,
}: AppShellProps) {
  const { profile, user } = useAuth();
  const initials = getProfileInitials(profile, user);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8f2e8_0%,#f4f8ff_100%)] px-4 py-5 md:px-8 md:py-7 xl:px-12">
      <div className="mx-auto max-w-[1420px]">
        <header className="mb-4 flex items-center justify-between gap-4 px-1 md:px-2">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-full text-[#1b2c77]"
              aria-label="Open menu"
            >
              <MenuIcon className="h-8 w-8 stroke-[1.8]" />
            </button>
            <Brand compact />
          </div>

          <Link
            href="/profile"
            className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-[#c8d9ed] bg-white text-[#7a8eab]"
            aria-label="Go to profile"
          >
            {user ? (
              <span className="text-sm font-black text-[#1b2c77]">{initials}</span>
            ) : (
              <UserIcon className="h-5 w-5" />
            )}
          </Link>
        </header>

        <div className="overflow-hidden rounded-[26px] border border-[#d7e2ef] bg-white shadow-[0_26px_68px_rgba(29,53,104,0.12)]">
          <div
            className={`grid min-h-[820px] lg:grid-cols-[196px_minmax(0,1fr)] ${
              lockViewportHeight ? "lg:h-[820px]" : ""
            }`}
          >
            <aside className="border-b border-[#d2e1f0] bg-[#cfe5ff] p-3 lg:border-b-0 lg:border-r lg:p-4">
              <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-3">
                {navItems.map((item) => {
                  const Icon = iconMap[item.href as keyof typeof iconMap] ?? BookIcon;
                  const active = activeHref === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex min-w-max items-center gap-3 rounded-[18px] border px-4 py-3 text-left text-[15px] font-bold transition lg:min-w-0 ${
                        active
                          ? "border-[#d5e1ef] bg-white text-[#15296f]"
                          : "border-[#a7c7e6] bg-[#9ec3ea] text-[#203872]"
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="leading-none">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <section
              className={`grid ${
                lockViewportHeight
                  ? "min-h-0 grid-rows-[52px_minmax(0,1fr)]"
                  : "grid-rows-[52px_auto]"
              }`}
            >
              <div className="flex items-center justify-between bg-[#1b2c77] px-4 md:px-5">
                <div />
                <div className="ml-auto">{topBarRight}</div>
              </div>
              <div className={`${lockViewportHeight ? "min-h-0" : ""} bg-white p-4 md:p-5`}>
                {children}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
