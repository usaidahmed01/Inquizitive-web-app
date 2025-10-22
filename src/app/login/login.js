"use client";

/**
 * Faculty Login (JS) — role-less edition
 * - We keep your conditions but redefine "teacher":
 *   teacher === authenticated user WITH a profile row.
 * - After login, we upsert a profile row and then check /profiles/me.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import VenomBeams from "../_components/VenomBeams";
import { LoginSchema } from "@/schemas/auth";
import { supabase } from "../lib/supabaseClient";
import { ensureTeacherOnce, getRole, getSessionToken } from "../lib/auth";
import "./login.css";

export default function LoginPage() {
  const router = useRouter();
  const cardRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");

  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    setIsTouchDevice(touch);
    const mqSmall = window.matchMedia("(max-width: 640px)");
    const mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    setIsSmallScreen(mqSmall.matches);
    setPrefersReducedMotion(mqReduce.matches);
    const onSmallChange = (e) => setIsSmallScreen(e.matches);
    const onReduceChange = (e) => setPrefersReducedMotion(e.matches);
    mqSmall.addEventListener?.("change", onSmallChange);
    mqReduce.addEventListener?.("change", onReduceChange);
    return () => {
      mqSmall.removeEventListener?.("change", onSmallChange);
      mqReduce.removeEventListener?.("change", onReduceChange);
    };
  }, []);

  const parsed = LoginSchema.safeParse({ email, password });
  const canSubmit = parsed.success && !isSubmitting;
  const isEmailValid = email ? LoginSchema.shape.email.safeParse(email).success : false;
  const isPasswordValid = password ? LoginSchema.shape.password.safeParse(password).success : false;

  // 🔁 Keep your condition: if (role === "teacher") redirect to /dashboard
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getSessionToken();
      if (!token) return;
      const role = await getRole();
      if (!active) return;
      if (role === "teacher") router.replace("/dashboard");
    })();
    return () => { active = false; };
  }, [router]);

  const tiltEnabled = !isTouchDevice && !prefersReducedMotion;
  const handleTiltMove = (e) => {
    if (!tiltEnabled) return;
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
    if (!tiltEnabled) return;
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`;
  };

  const handleCapsLockState = (e) => {
    const isOn = e && typeof e.getModifierState === "function" ? e.getModifierState("CapsLock") : false;
    setIsCapsLockOn(!!isOn);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const result = LoginSchema.safeParse({ email, password });
    if (!result.success) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 450);
      return;
    }

    setIsSubmitting(true);
    try {
      // 1) sign in
      const { error } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });
      if (error) {
        setErr(error.message || "Invalid email or password.");
        setIsShaking(true); setTimeout(() => setIsShaking(false), 450);
        return;
      }

      // 2) ensure session
      const token = await getSessionToken();
      if (!token) {
        setErr("Login succeeded but no session was created. Please try again.");
        return;
      }

      // 3) upsert profile row (no role)
      const ok = await ensureTeacherOnce(result.data.email);
      if (!ok) {
        await supabase.auth.signOut();
        setErr("Couldn’t verify access. Please try again in a moment.");
        setIsShaking(true); setTimeout(() => setIsShaking(false), 450);
        return;
      }

      // 4) check teacher via /profiles/me -> "teacher"
      const role = await getRole();
      if (role !== "teacher") {
        await supabase.auth.signOut();
        setErr("Only teachers can sign in. Please use a teacher account.");
        setIsShaking(true); setTimeout(() => setIsShaking(false), 450);
        return;
      }

      // 5) go
      router.replace("/dashboard");
    } catch (e2) {
      setErr(e2?.message || "Login failed. Please try again.");
      setIsShaking(true); setTimeout(() => setIsShaking(false), 450);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-4 sm:p-6"
      style={{ backgroundImage: "url('/bgg.png')", backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <VenomBeams className="absolute inset-0 z-0 h-full w-full" colors={["#2E5EAA", "#81B29A", "#4A8FE7"]} density={isSmallScreen ? 6 : 14} speed={isSmallScreen ? 0.6 : 1.0} opacity={isSmallScreen ? 0.45 : 0.7} />

      <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }} className="flex w-full justify-center">
        <motion.div className="tilt-container relative z-10 w-full max-w-md" animate={isShaking ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.45, ease: "easeInOut" }}>
          <div
            ref={cardRef}
            onMouseMove={handleTiltMove}
            onMouseLeave={handleTiltLeave}
            className={`tilt-card w-full transform-gpu overflow-hidden rounded-xl bg-[#F8F9FA] will-change-transform [transform-style:preserve-3d] ${isSmallScreen ? "p-6 shadow-md" : "p-8 shadow-lg"}`}
            style={{ minWidth: 320 }}
          >
            <div className="no-tilt mb-4 flex h-24 w-full items-center justify-center rounded-lg sm:h-32">
              <Image src="/lOGO.svg" alt="logo" width={isSmallScreen ? 200 : 250} height={isSmallScreen ? 200 : 250} priority />
            </div>

            <div className="mb-5 flex items-center justify-center gap-2 sm:mb-6">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#2E5EAA]/10 text-[#2E5EAA]"><User size={18} /></div>
              <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2B2D42" }}>Faculty Login</h1>
            </div>

            <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="pointer-events-none absolute inset-y-0 left-3 my-auto text-gray-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    placeholder="@teacher.com"
                    inputMode="email"
                    autoComplete="email"
                    className={`no-tilt h-12 w-full rounded-lg border pl-10 pr-4 text-base outline-none focus:outline-none focus:ring ${
                      email.length === 0 ? "border-gray-200 focus:ring-[#2E5EAA]" : isEmailValid ? "border-green-400 focus:ring-green-400" : "border-red-400 focus:ring-red-400"
                    }`}
                    aria-invalid={email.length > 0 && !isEmailValid}
                  />
                </div>
                {email.length > 0 && !isEmailValid && <p className="text-xs text-red-600">Enter a valid email address.</p>}
              </div>

              <div className="space-y-1">
                <div className="relative">
                  <Lock className="pointer-events-none absolute inset-y-0 left-3 my-auto text-gray-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={handleCapsLockState}
                    onKeyDown={handleCapsLockState}
                    onFocus={handleCapsLockState}
                    onBlur={() => setIsCapsLockOn(false)}
                    placeholder="●●●●●●"
                    autoComplete="current-password"
                    className={`hide-native-reveal no-tilt h-12 w-full rounded-lg border pl-10 pr-12 text-base outline-none focus:outline-none focus:ring ${
                      password.length === 0 ? "border-gray-200 focus:ring-[#2E5EAA]" : isPasswordValid ? "border-green-400 focus:ring-green-400" : "border-red-400 focus:ring-red-400"
                    }`}
                    aria-invalid={!isPasswordValid && password.length > 0}
                    aria-describedby="password-help"
                  />
                  <button type="button" onClick={() => setShowPassword((s) => !s)} className="no-tilt absolute inset-y-0 right-3 my-auto grid h-8 w-8 place-items-center text-gray-500 hover:text-gray-700" tabIndex={-1} aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className={`flex items-center gap-1 text-xs transition-opacity ${isCapsLockOn ? "opacity-100" : "opacity-0"}`} id="password-help">
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="text-amber-600">Caps Lock is ON</span>
                </div>

                {password.length > 0 && !isPasswordValid && <p className="text-xs text-red-600">Password must be at least 6 characters.</p>}
              </div>

              <div className="flex flex-col items-center gap-2">
                <button type="submit" disabled={!canSubmit} className={`loginbtn select-none ${!canSubmit ? "cursor-not-allowed opacity-60" : ""} no-tilt`}>
                  {isSubmitting ? "Login..." : "Login"}
                </button>
                {err ? <p className="text-xs text-red-600">{err}</p> : null}
              </div>
            </form>

            <p className="mt-5 text-center text-sm sm:mt-6" style={{ color: "#2B2D42" }}>
              Don’t have an account?{" "}
              <Link href="/signup" className="no-tilt font-semibold text-primary hover:underline">Sign Up</Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

