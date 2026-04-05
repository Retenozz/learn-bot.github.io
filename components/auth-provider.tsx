"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type UserProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  phone: string | null;
  major: string | null;
  year_level: number | null;
  study_id: string | null;
};

type AuthContextValue = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<UserProfile | null>;
  updateProfile: (
    patch: Partial<Omit<UserProfile, "id">>,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function buildStableStudyId(userId: string) {
  const compact = userId.replace(/-/g, "").slice(0, 8).toUpperCase();
  return `ID${compact}`;
}

function buildProfileFallback(user: User): UserProfile {
  const metadata = user.user_metadata;
  const displayName =
    metadata.display_name ??
    metadata.full_name ??
    metadata.name ??
    user.email?.split("@")[0] ??
    "Learner";

  return {
    id: user.id,
    email: user.email ?? null,
    display_name: displayName,
    first_name: metadata.first_name ?? null,
    last_name: metadata.last_name ?? null,
    nickname: metadata.nickname ?? null,
    phone: metadata.phone ?? null,
    major: metadata.major ?? null,
    year_level:
      typeof metadata.year_level === "number"
        ? metadata.year_level
        : metadata.year_level
          ? Number(metadata.year_level)
          : null,
    study_id: metadata.study_id ?? buildStableStudyId(user.id),
  };
}

async function upsertProfileRecord(
  supabase: SupabaseClient,
  values: Partial<UserProfile> & { id: string },
) {
  const { data, error } = await supabase
    .from("profiles")
    .upsert(values, { onConflict: "id" })
    .select(
      "id, email, display_name, first_name, last_name, nickname, phone, major, year_level, study_id",
    )
    .single();

  if (error) {
    throw error;
  }

  return data as UserProfile;
}

async function fetchProfile(
  supabase: SupabaseClient,
  user: User | null,
) {
  if (!user) {
    return null;
  }

  const fallback = buildProfileFallback(user);
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, display_name, first_name, last_name, nickname, phone, major, year_level, study_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load profile", error);
    return fallback;
  }

  if (!data || !data.study_id) {
    try {
      return await upsertProfileRecord(supabase, {
        id: fallback.id,
        email: data?.email ?? fallback.email,
        display_name: data?.display_name ?? fallback.display_name,
        first_name: data?.first_name ?? fallback.first_name,
        last_name: data?.last_name ?? fallback.last_name,
        nickname: data?.nickname ?? fallback.nickname,
        phone: data?.phone ?? fallback.phone,
        major: data?.major ?? fallback.major,
        year_level: data?.year_level ?? fallback.year_level,
        study_id: data?.study_id ?? fallback.study_id,
      });
    } catch (upsertError) {
      console.error("Failed to upsert profile", upsertError);
      return fallback;
    }
  }

  return data as UserProfile;
}

export function getProfileDisplayName(
  profile: UserProfile | null,
  user: User | null,
) {
  return (
    profile?.display_name ||
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") ||
    profile?.nickname ||
    user?.user_metadata?.display_name ||
    user?.email?.split("@")[0] ||
    "Learner"
  );
}

export function getProfileInitials(
  profile: UserProfile | null,
  user: User | null,
) {
  const name = getProfileDisplayName(profile, user).trim();
  const pieces = name.split(/\s+/).filter(Boolean);

  if (!pieces.length) {
    return "L";
  }

  if (pieces.length === 1) {
    return pieces[0].slice(0, 1).toUpperCase();
  }

  return `${pieces[0][0] ?? ""}${pieces[1][0] ?? ""}`.toUpperCase();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  async function refreshProfile() {
    const nextProfile = await fetchProfile(supabase, user);
    setProfile(nextProfile);
    return nextProfile;
  }

  async function updateProfile(patch: Partial<Omit<UserProfile, "id">>) {
    if (!user) {
      return { error: "Not authenticated" };
    }

    const values = {
      id: user.id,
      email: patch.email ?? user.email ?? profile?.email ?? null,
      display_name: patch.display_name ?? profile?.display_name ?? null,
      first_name: patch.first_name ?? profile?.first_name ?? null,
      last_name: patch.last_name ?? profile?.last_name ?? null,
      nickname: patch.nickname ?? profile?.nickname ?? null,
      phone: patch.phone ?? profile?.phone ?? null,
      major: patch.major ?? profile?.major ?? null,
      year_level:
        typeof patch.year_level === "number"
          ? patch.year_level
          : profile?.year_level ?? null,
      study_id: profile?.study_id ?? buildStableStudyId(user.id),
    };

    try {
      const data = await upsertProfileRecord(supabase, values);
      setProfile(data as UserProfile);
      return { error: null };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Failed to update profile",
      };
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Failed to sign out", error);
    }

    setSession(null);
    setUser(null);
    setProfile(null);
  }

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      const {
        data: { session: initialSession },
      } = await supabase.auth.getSession();

      if (cancelled) {
        return;
      }

      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      setProfile(await fetchProfile(supabase, initialSession?.user ?? null));
      setLoading(false);
    }

    void bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setProfile(await fetchProfile(supabase, nextSession?.user ?? null));
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const value = {
    supabase,
    session,
    user,
    profile,
    loading,
    refreshProfile,
    updateProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
