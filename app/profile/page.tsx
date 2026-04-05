"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarIcon,
  ChevronDownIcon,
  EditIcon,
  LockIcon,
  LogoutIcon,
  UserIcon,
} from "@/components/icons";
import { AppShell } from "@/components/app-shell";
import {
  getProfileDisplayName,
  getProfileInitials,
  useAuth,
} from "@/components/auth-provider";

type ProfileTab = "profile" | "password";

type ProfileFormState = {
  displayName: string;
  firstName: string;
  lastName: string;
  nickname: string;
  phone: string;
  major: string;
  yearLevel: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const { profile, user, supabase, updateProfile, signOut, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");
  const [saved, setSaved] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState<ProfileFormState | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    nextPassword: "",
    confirmPassword: "",
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const displayName = getProfileDisplayName(profile, user);
  const initials = getProfileInitials(profile, user);

  const resolvedProfileForm = useMemo(
    () =>
      profileForm ?? {
      displayName: profile?.display_name ?? displayName,
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      nickname: profile?.nickname ?? "",
      phone: profile?.phone ?? "",
      major: profile?.major ?? "",
      yearLevel: profile?.year_level ? String(profile.year_level) : "",
    },
    [displayName, profile, profileForm],
  );

  useEffect(() => {
    if (!saved) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setSaved(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  async function handleProfileSave() {
    setSavingProfile(true);
    setErrorMessage(null);

    const result = await updateProfile({
      display_name: resolvedProfileForm.displayName.trim() || displayName,
      first_name: resolvedProfileForm.firstName.trim() || null,
      last_name: resolvedProfileForm.lastName.trim() || null,
      nickname: resolvedProfileForm.nickname.trim() || null,
      phone: resolvedProfileForm.phone.trim() || null,
      major: resolvedProfileForm.major.trim() || null,
      year_level: resolvedProfileForm.yearLevel
        ? Number(resolvedProfileForm.yearLevel)
        : null,
    });

    setSavingProfile(false);

    if (result.error) {
      setErrorMessage(result.error);
      return;
    }

    setSaved("Profile saved");
  }

  async function handlePasswordSave() {
    if (passwordForm.nextPassword.length < 6) {
      setErrorMessage("New password should be at least 6 characters.");
      return;
    }

    if (passwordForm.nextPassword !== passwordForm.confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setSavingPassword(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: passwordForm.nextPassword,
    });

    setSavingPassword(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setPasswordForm({
      nextPassword: "",
      confirmPassword: "",
    });
    setSaved("Password updated");
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  if (loading || !user) {
    return (
      <AppShell activeHref="/profile">
        <div className="flex min-h-[744px] items-center justify-center rounded-[20px] border border-[#d7e2ef] bg-[#f8fbff]">
          <p className="text-lg font-black text-[#1b2c77]">Loading your profile...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell activeHref="/profile">
      <div className="flex min-h-[744px] flex-col gap-6 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
        <aside className="space-y-4">
          <div className="relative mx-auto flex h-[110px] w-[110px] items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_35%,#f4d5b1_0%,#d7a062_100%)] text-3xl font-black text-white">
            {initials}
            <button
              type="button"
              className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#3a93f5] text-white shadow-lg"
              aria-label="Edit profile image"
            >
              <EditIcon className="h-4 w-4" />
            </button>
          </div>

          <div className="text-center text-[#111]">
            <h2 className="text-[18px] leading-tight font-black">{displayName}</h2>
            <p className="text-[15px] text-slate-500">{user.email}</p>
            {profile?.study_id ? (
              <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-[#5f84aa]">
                Study ID: {profile.study_id}
              </p>
            ) : null}
          </div>

          <div className="space-y-1 pt-2">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`flex w-full items-center gap-3 rounded-full px-5 py-3 text-[16px] font-bold text-[#111] transition ${
                activeTab === "profile" ? "bg-[#cde8ff]" : "hover:bg-[#eef5ff]"
              }`}
            >
              <UserIcon className="h-5 w-5" />
              Profile
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("password")}
              className={`flex w-full items-center gap-3 rounded-full px-5 py-3 text-[16px] font-bold text-[#111] transition ${
                activeTab === "password" ? "bg-[#cde8ff]" : "hover:bg-[#eef5ff]"
              }`}
            >
              <LockIcon className="h-5 w-5" />
              Password
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-full px-5 py-3 text-[16px] font-bold text-rose-600 hover:bg-rose-50"
            >
              <LogoutIcon className="h-5 w-5" />
              Sign out
            </button>
            <Link
              href="/dashboard"
              className="flex w-full items-center gap-3 rounded-full px-5 py-3 text-[16px] font-bold text-[#1b2c77] hover:bg-[#eef5ff]"
            >
              <UserIcon className="h-5 w-5" />
              Back to dashboard
            </Link>
          </div>
        </aside>

        <section className="px-1">
          {activeTab === "profile" ? (
            <>
              <h1 className="text-[40px] font-black leading-none text-[#111]">
                Edit profile
              </h1>

              <div className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-2">
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-[18px] text-[#222]">
                    Display name
                  </span>
                  <input
                    value={resolvedProfileForm.displayName}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...(current ?? resolvedProfileForm),
                        displayName: event.target.value,
                      }))
                    }
                    className="h-13 w-full rounded-full bg-[#efefef] px-8 text-[17px] outline-none focus:ring-2 focus:ring-[#9fc7ef]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[18px] text-[#222]">First name</span>
                  <input
                    value={resolvedProfileForm.firstName}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...(current ?? resolvedProfileForm),
                        firstName: event.target.value,
                      }))
                    }
                    className="h-13 w-full rounded-full bg-[#efefef] px-8 text-[17px] outline-none focus:ring-2 focus:ring-[#9fc7ef]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[18px] text-[#222]">Last name</span>
                  <input
                    value={resolvedProfileForm.lastName}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...(current ?? resolvedProfileForm),
                        lastName: event.target.value,
                      }))
                    }
                    className="h-13 w-full rounded-full bg-[#efefef] px-8 text-[17px] outline-none focus:ring-2 focus:ring-[#9fc7ef]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[18px] text-[#222]">Nickname</span>
                  <input
                    value={resolvedProfileForm.nickname}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...(current ?? resolvedProfileForm),
                        nickname: event.target.value,
                      }))
                    }
                    className="h-13 w-full rounded-full bg-[#efefef] px-8 text-[17px] outline-none focus:ring-2 focus:ring-[#9fc7ef]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[18px] text-[#222]">Phone</span>
                  <input
                    value={resolvedProfileForm.phone}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...(current ?? resolvedProfileForm),
                        phone: event.target.value,
                      }))
                    }
                    className="h-13 w-full rounded-full bg-[#efefef] px-8 text-[17px] outline-none focus:ring-2 focus:ring-[#9fc7ef]"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-[18px] text-[#222]">Email</span>
                  <input
                    value={user.email ?? ""}
                    readOnly
                    className="h-13 w-full rounded-full bg-[#efefef] px-8 text-[17px] text-slate-500 outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[18px] text-[#222]">Major</span>
                  <input
                    value={resolvedProfileForm.major}
                    onChange={(event) =>
                      setProfileForm((current) => ({
                        ...(current ?? resolvedProfileForm),
                        major: event.target.value,
                      }))
                    }
                    className="h-13 w-full rounded-full bg-[#efefef] px-8 text-[17px] outline-none focus:ring-2 focus:ring-[#9fc7ef]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[18px] text-[#222]">Year level</span>
                  <div className="relative">
                    <select
                      value={resolvedProfileForm.yearLevel}
                      onChange={(event) =>
                        setProfileForm((current) => ({
                          ...(current ?? resolvedProfileForm),
                          yearLevel: event.target.value,
                        }))
                      }
                      className="h-13 w-full appearance-none rounded-full bg-[#efefef] px-8 pr-14 text-[17px] outline-none focus:ring-2 focus:ring-[#9fc7ef]"
                    >
                      <option value="">Select</option>
                      {[1, 2, 3, 4, 5, 6].map((year) => (
                        <option key={year} value={year}>
                          Year {year}
                        </option>
                      ))}
                    </select>
                    <ChevronDownIcon className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111]" />
                  </div>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-[18px] text-[#222]">Study ID</span>
                  <div className="relative">
                    <input
                      value={profile?.study_id ?? ""}
                      readOnly
                      className="h-13 w-full rounded-full bg-[#efefef] px-8 pr-14 text-[17px] text-slate-500 outline-none"
                    />
                    <CalendarIcon className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#111]" />
                  </div>
                </label>
              </div>

              <div className="mt-8 flex items-center justify-end gap-4">
                {errorMessage ? (
                  <p className="text-sm font-black text-rose-600">{errorMessage}</p>
                ) : null}
                {saved ? (
                  <p className="text-sm font-black text-emerald-600">{saved}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handleProfileSave}
                  disabled={savingProfile}
                  className="rounded-full bg-[#1b2c77] px-8 py-3 text-[17px] font-black text-white disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save profile"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-[40px] font-black leading-none text-[#111]">
                Change password
              </h1>
              <div className="mt-6 max-w-md space-y-5">
                <label className="block">
                  <span className="mb-2 block text-[18px] text-[#222]">New password</span>
                  <input
                    type="password"
                    value={passwordForm.nextPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        nextPassword: event.target.value,
                      }))
                    }
                    placeholder="********"
                    className="h-13 w-full rounded-full bg-[#efefef] px-8 text-[17px] outline-none focus:ring-2 focus:ring-[#9fc7ef]"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[18px] text-[#222]">
                    Confirm new password
                  </span>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(event) =>
                      setPasswordForm((current) => ({
                        ...current,
                        confirmPassword: event.target.value,
                      }))
                    }
                    placeholder="********"
                    className="h-13 w-full rounded-full bg-[#efefef] px-8 text-[17px] outline-none focus:ring-2 focus:ring-[#9fc7ef]"
                  />
                </label>
              </div>
              <div className="mt-8 flex items-center justify-end gap-4">
                {errorMessage ? (
                  <p className="text-sm font-black text-rose-600">{errorMessage}</p>
                ) : null}
                {saved ? (
                  <p className="text-sm font-black text-emerald-600">{saved}</p>
                ) : null}
                <button
                  type="button"
                  onClick={handlePasswordSave}
                  disabled={savingPassword}
                  className="rounded-full bg-[#1b2c77] px-8 py-3 text-[17px] font-black text-white disabled:opacity-60"
                >
                  {savingPassword ? "Updating..." : "Update password"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
