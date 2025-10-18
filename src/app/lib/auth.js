// src/app/lib/auth.js
import { supabase } from "./supabaseClient";

/**
 * Poll briefly for a session token after signUp/signIn.
 * Handles the race where Supabase session isn't immediately ready.
 */
export async function getSessionToken({ retries = 10, delayMs = 150 } = {}) {
  for (let i = 0; i < retries; i++) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) return token;
    await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
}

/** Safe backend role check (only calls if token exists) */
export async function getRole() {
  const token = await getSessionToken();
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!token || !base) return null;

  try {
    const res = await fetch(`${base}/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j?.role || null;
  } catch {
    return null;
  }
}

/**
 * Mark the current user as teacher in your backend, then verify via /me.
 * Returns true only if role becomes "teacher".
 */
export async function ensureTeacherOnce(fullName) {
  const token = await getSessionToken();
  const base = process.env.NEXT_PUBLIC_API_BASE;
  if (!token || !base) return false;

  try {
    const res = await fetch(`${base}/profiles/ensure_teacher`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(fullName ? { full_name: fullName } : {}), // <—
    });
    if (!res.ok) return false;

    const role = await getRole();
    return role === "teacher";
  } catch {
    return false;
  }
}

