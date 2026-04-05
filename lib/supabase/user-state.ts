import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

type LoadUserStateOptions<T> = {
  supabase: SupabaseClient;
  table: string;
  column: string;
  fallback: T;
};

type UpsertUserStateOptions = {
  supabase: SupabaseClient;
  table: string;
  values: Record<string, unknown>;
};

export function isMissingTableError(error: PostgrestError | null) {
  if (!error) {
    return false;
  }

  return ["42P01", "42703"].includes(error.code);
}

export async function loadUserStateValue<T>({
  supabase,
  table,
  column,
  fallback,
}: LoadUserStateOptions<T>) {
  const { data, error } = await supabase.from(table).select(column).maybeSingle();

  if (error) {
    if (isMissingTableError(error)) {
      return fallback;
    }

    throw error;
  }

  const row = data as Record<string, unknown> | null;
  const value = row?.[column];
  return (value ?? fallback) as T;
}

export async function upsertUserState({
  supabase,
  table,
  values,
}: UpsertUserStateOptions) {
  const { error } = await supabase.from(table).upsert(values, {
    onConflict: "user_id",
  });

  if (error && !isMissingTableError(error)) {
    throw error;
  }
}
