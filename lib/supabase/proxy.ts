import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

const AUTH_ROUTES = new Set(["/login", "/register"]);
const PUBLIC_ROUTES = new Set(["/"]);

function isProtectedPath(pathname: string) {
  if (PUBLIC_ROUTES.has(pathname) || AUTH_ROUTES.has(pathname)) {
    return false;
  }

  return true;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const { supabaseUrl, supabaseKey } = getSupabaseEnv();
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const pathname = request.nextUrl.pathname;
  const isAuthed = Boolean(claims?.sub);

  if (error) {
    console.error("Failed to verify Supabase session in proxy", error);
  }

  if (!isAuthed && isProtectedPath(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthed && AUTH_ROUTES.has(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
