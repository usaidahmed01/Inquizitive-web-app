"use client";

/**
 * Teacher Signup (JS) — role-less edition
 * - Create user → ensure profile → redirect.
 * - Keeps your original "role === 'teacher'" guard by mapping it in getRole().
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { User, Mail, Lock, Eye, EyeOff } from "lucide-react";

import VenomBeams from "../_components/VenomBeams";
import { SignupSchema } from "@/schemas";
import { supabase } from "../lib/supabaseClient";
import { ensureTeacherOnce, getRole, getSessionToken } from "../lib/auth";
import "./signup.css";

export default function Signup() {
  const router = useRouter();
  const cardRef = useRef(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [err, setErr] = useState("");

  const [fxEnabled, setFxEnabled] = useState(true);
  useEffect(() => {
    const isTouch = typeof window !== "undefined" && (("ontouchstart" in window) || navigator.maxTouchPoints > 0);
    const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFxEnabled(!(isTouch || prefersReduced));
  }, []);

  const nameCheck = SignupSchema.shape.fullName.safeParse(fullName);
  const emailCheck = SignupSchema.shape.email.safeParse(email.trim());
  const passCheck = SignupSchema.shape.password.safeParse(password);
  const canSubmit = nameCheck.success && emailCheck.success && passCheck.success && !isSubmitting;

  // Keep your condition: if role === "teacher" already, go dashboard
  useEffect(() => {
    let active = true;
    (async () => {
      const role = await getRole();
      if (!active) return;
      if (role === "teacher") router.replace("/dashboard");
    })();
    return () => { active = false; };
  }, [router]);

  const handleTiltMove = (e) => {
    if (!fxEnabled) return;
    const card = cardRef.current;
    if (!card) return;
    const target = e.target;
    if (target && target.closest("input, button, a, .no-tilt")) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width - 0.5;
    const py = y / rect.height - 0.5;
    const MAX_DEG = 10;
    card.style.transform = `rotateX(${-py * MAX_DEG}deg) rotateY(${px * MAX_DEG}deg) translateZ(0)`;
  };
  const handleTiltLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`;
  };

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    const parsed = SignupSchema.safeParse({
      fullName,
      email: email.trim(),
      password,
    });
    if (!parsed.success) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 450);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1) create user
      const { error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { data: { full_name: parsed.data.fullName } },
      });
      if (error) {
        setErr(error.message || "Signup failed.");
        setIsShaking(true); setTimeout(() => setIsShaking(false), 450);
        return;
      }

      // 2) wait for token
      const token = await getSessionToken();
      if (!token) {
        setErr("Check your email to confirm the account, then log in.");
        return;
      }

      // 3) upsert profile (no role)
      const ok = await ensureTeacherOnce(parsed.data.fullName);
      if (!ok) {
        setErr("Signup succeeded but could not create your profile. Please try logging in again.");
        return;
      }

      // 4) verify -> role mapping ("teacher" if profile exists)
      const role = await getRole();
      if (role !== "teacher") {
        setErr("Profile not ready yet, please try logging in.");
        return;
      }

      router.replace("/dashboard");
    } catch (e2) {
      setErr(e2?.message || "Signup failed.");
      setIsShaking(true); setTimeout(() => setIsShaking(false), 450);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-4 md:p-6"
      style={{ backgroundImage: "url('/bgg.png')", backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <VenomBeams className="absolute inset-0 z-0 h-full w-full" colors={["#2E5EAA", "#81B29A", "#4A8FE7"]} density={fxEnabled ? 14 : 8} speed={fxEnabled ? 1.0 : 0.6} opacity={fxEnabled ? 0.7 : 0.5} />

      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }} className="flex w-full justify-center">
        <motion.div className="tilt-container relative z-10 w-full max-w-md" animate={isShaking ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.45, ease: "easeInOut" }}>
          <div
            ref={cardRef}
            onMouseMove={handleTiltMove}
            onMouseLeave={handleTiltLeave}
            className="tilt-card w-full transform-gpu overflow-hidden rounded-xl bg-[#F8F9FA] p-6 shadow-lg will-change-transform [transform-style:preserve-3d] md:p-8"
            style={{ minWidth: 300 }}
          >
            <div className="no-tilt mb-4 flex h-28 w-full items-center justify-center rounded-lg md:mb-6 md:h-32">
              <Image src="/lOGO.svg" alt="logo" width={220} height={220} priority />
            </div>

            <h1 className="mb-4 text-center text-xl font-bold md:mb-6 md:text-2xl" style={{ color: "#2B2D42" }}>
              Create Account
            </h1>

            <form className="space-y-4 md:space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute inset-y-0 left-3 my-auto text-gray-400" size={18} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    className={`no-tilt h-12 w-full rounded-lg border pl-10 pr-4 outline-none focus:outline-none focus:ring ${
                      fullName.length === 0 ? "border-gray-200 focus:ring-[#2E5EAA]" : nameCheck.success ? "border-green-400 focus:ring-green-400" : "border-red-400 focus:ring-red-400"
                    }`}
                    autoComplete="name"
                    aria-invalid={fullName.length > 0 && !nameCheck.success}
                  />
                </div>
                {!nameCheck.success && fullName.length > 0 && (
                  <p className="text-xs text-red-600">
                    {nameCheck.error?.issues?.[0]?.message || "Full name is required."}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <Mail className="pointer-events-none absolute inset-y-0 left-3 my-auto text-gray-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="@teacher.com"
                    className={`no-tilt h-12 w-full rounded-lg border pl-10 pr-4 outline-none focus:outline-none focus:ring ${
                      email.length === 0 ? "border-gray-200 focus:ring-[#2E5EAA]" : emailCheck.success ? "border-green-400 focus:ring-green-400" : "border-red-400 focus:ring-red-400"
                    }`}
                    inputMode="email"
                    autoComplete="email"
                    aria-invalid={email.length > 0 && !emailCheck.success}
                  />
                </div>
                {!emailCheck.success && email.length > 0 && (
                  <p className="text-xs text-red-600">
                    {emailCheck.error?.issues?.[0]?.message || "Enter a valid email address."}
                  </p>
                )}
              </div>

              <div>
                <div className="relative">
                  <Lock className="absolute inset-y-0 left-3 my-auto text-gray-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className={`hide-native-reveal no-tilt h-12 w-full rounded-lg border pl-10 pr-12 outline-none focus:outline-none focus:ring ${
                      password.length === 0 ? "border-gray-200 focus:ring-[#2E5EAA]" : passCheck.success ? "border-green-400 focus:ring-green-400" : "border-red-400 focus:ring-red-400"
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="no-tilt absolute inset-y-0 right-3 my-auto grid h-8 w-8 place-items-center text-gray-600 hover:text-gray-800"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className="mt-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div className={`h-full transition-all duration-300 ${getPasswordStrength(password).barClass}`} style={{ width: `${(getPasswordStrength(password).score / 4) * 100}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {password.length === 0 ? "Enter a password" : getPasswordStrength(password).label}
                  </div>
                </div>

                {!passCheck.success && password.length > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    {passCheck.error?.issues?.[0]?.message || "Password must be at least 6 characters."}
                  </p>
                )}
              </div>

              <div className="flex flex-col items-center gap-2">
                <button type="submit" disabled={!canSubmit} className={`signupbtn no-tilt ${!canSubmit ? "cursor-not-allowed opacity-60" : ""}`}>
                  {isSubmitting ? "Sign Up…" : "Sign Up"}
                </button>
                {err ? <p className="text-xs text-red-600">{err}</p> : null}
              </div>
            </form>

            <p className="mt-6 text-center text-sm">
              Already have an account?{" "}
              <Link href="/login" className="no-tilt font-semibold text-primary hover:underline">Login</Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* unchanged (strength meter helper) */
function getPasswordStrength(pw) {
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);
  const length = pw.length;
  const categories = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  let score = 0;
  if (length >= 6) {
    if (categories <= 1) {
      score = length >= 8 ? 2 : 1;
    } else if (categories === 2) {
      if (length >= 10) score = 3;
      else if (length >= 8) score = 3;
      else score = 2;
    } else if (categories >= 3) {
      if (length >= 10) score = 4;
      else if (length >= 8) score = 3;
      else score = 2;
    }
  }
  if (/^(123456|password|qwerty|111111|letmein)/i.test(pw)) {
    score = Math.max(0, score - 1);
  }

  const map = [
    { label: "Very weak", barClass: "bg-red-400" },
    { label: "Weak", barClass: "bg-orange-400" },
    { label: "Okay", barClass: "bg-amber-400" },
    { label: "Good", barClass: "bg-lime-500" },
    { label: "Strong", barClass: "bg-green-500" },
  ];
  return { score, label: map[score].label, barClass: map[score].barClass };
}
