"use client";

import { supabase } from "./supabaseClient";

const API = process.env.NEXT_PUBLIC_API_BASE;

/**
 * Poll briefly for a session token after signUp/signIn.
 * Handles the race where the Supabase session isn't immediately ready.
 */
export async function getSessionToken({ retries = 10, delayMs = 150 } = {}) {
  for (let i = 0; i < retries; i++) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token ?? null;
    if (token) return token;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

/**
 * Create/ensure a profile row for the current user.
 * (We keep the old name for compatibility with your pages.)
 * Backend route: POST /profiles/ensure_teacher
 *   - In the new schema this just upserts { user_id, full_name } — no role.
 */
export async function ensureTeacherOnce(fullNameOrEmail = "") {
  const token = await getSessionToken();
  if (!token || !API) return false;

  try {
    const res = await fetch(`${API}/profiles/ensure_teacher`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(
        fullNameOrEmail ? { full_name: fullNameOrEmail } : {}
      ),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Returns "teacher" if a profile row exists; otherwise "none".
 * (We map existence of profile => teacher access.)
 */
export async function getRole() {
  const token = await getSessionToken();
  if (!token || !API) return "none";

  try {
    const r = await fetch(`${API}/profiles/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!r.ok) return "none";
    const j = await r.json();
    return j?.row ? "teacher" : "none";
  } catch {
    return "none";
  }
}

/** Convenience helper for route guards */
export async function getIsTeacher() {
  return (await getRole()) === "teacher";
}
