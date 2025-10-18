"use client";

/**
 * Faculty Login (JS)
 * - Supabase email+password auth
 * - After login, upserts role=teacher via /profiles/ensure_teacher
 * - Verifies role using /me; if not teacher, signs out + shows error
 * - If already logged in as teacher, auto-redirects to /dashboard
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import VenomBeams from "../_components/VenomBeams";
import { LoginSchema } from "@/schemas/auth";

// ✅ correct paths
import { supabase } from "../lib/supabaseClient";
import { ensureTeacherOnce, getRole, getSessionToken } from "../lib/auth";

import "./login.css";

export default function LoginPage() {
  const router = useRouter();

  // 3D tilt card
  const cardRef = useRef(null);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [isShaking, setIsShaking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState("");

  // Env flags
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect touch, small screen, reduced motion (client-only)
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

  // Live validation (Zod)
  const parsed = LoginSchema.safeParse({ email, password });
  const canSubmit = parsed.success && !isSubmitting;

  const isEmailValid = email ? LoginSchema.shape.email.safeParse(email).success : false;
  const isPasswordValid = password ? LoginSchema.shape.password.safeParse(password).success : false;

  // ✅ If already logged-in & teacher, skip this page — but ONLY if a session exists
  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getSessionToken(); // don't ping backend if not logged in
      if (!token) return;
      const role = await getRole();          // calls /me with token
      if (!active) return;
      if (role === "teacher") router.replace("/dashboard");
    })();
    return () => { active = false; };
  }, [router]);

  // Tilt controls
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
    const rotateX = -(py * MAX_DEG);
    const rotateY = px * MAX_DEG;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
  };
  const handleTiltLeave = () => {
    if (!tiltEnabled) return;
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`;
  };

  // CapsLock detector
  const handleCapsLockState = (e) => {
    const isOn =
      e && typeof e.getModifierState === "function" ? e.getModifierState("CapsLock") : false;
    setIsCapsLockOn(!!isOn);
  };

  // ✅ Submit
  // const handleSubmit = async (e) => {
  //   e.preventDefault();
  //   setErr("");

  //   const result = LoginSchema.safeParse({ email, password });
  //   if (!result.success) {
  //     setIsShaking(true);
  //     setTimeout(() => setIsShaking(false), 450);
  //     return;
  //   }

  //   setIsSubmitting(true);
  //   try {
  //     // 1) Supabase email+password sign-in (creates the session)
  //     const { error } = await supabase.auth.signInWithPassword({
  //       email: result.data.email,
  //       password: result.data.password,
  //     });
  //     if (error) {
  //       setErr(error.message || "Unable to sign in.");
  //       setIsShaking(true);
  //       setTimeout(() => setIsShaking(false), 450);
  //       return;
  //     }

  //     // 2) Safety: verify we truly have a token
  //     const { data: sess } = await supabase.auth.getSession();
  //     const token = sess?.session?.access_token;
  //     if (!token) {
  //       setErr("Login succeeded but no session found. Please try again.");
  //       return;
  //     }

  //     // 3) Ensure teacher role on backend, then re-check via /me
  //     await ensureTeacherOnce(result.data.email);
  //     const role = await getRole();

  //     if (role !== "teacher") {
  //       await supabase.auth.signOut();
  //       setErr("Only teachers can sign in. Please use a teacher account.");
  //       setIsShaking(true);
  //       setTimeout(() => setIsShaking(false), 450);
  //       return;
  //     }

  //     // 4) Good to go
  //     router.replace("/dashboard");
  //   } catch (e) {
  //     setErr(e?.message || "Login failed.");
  //     setIsShaking(true);
  //     setTimeout(() => setIsShaking(false), 450);
  //   } finally {
  //     setIsSubmitting(false);
  //   }
  // };


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
      // 1) Sign in (creates/refreshes the session)
      const { error } = await supabase.auth.signInWithPassword({
        email: result.data.email,
        password: result.data.password,
      });
      if (error) {
        setErr(error.message || "Invalid email or password.");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 450);
        return;
      }

      // 2) Wait for a token (handles race conditions)
      const token = await getSessionToken();
      if (!token) {
        setErr("Login succeeded but no session was created. Please try again.");
        return;
      }

      // 3) Mark as teacher (safe to call every login), then verify role
      const ok = await ensureTeacherOnce(result.data.email);
      if (!ok) {
        // If backend down or role not set, don’t keep the user signed in
        await supabase.auth.signOut();
        setErr(
          "Couldn’t verify teacher access. Please try again in a moment or contact support."
        );
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 450);
        return;
      }

      // 4) Double-check role (defense in depth)
      const role = await getRole();
      if (role !== "teacher") {
        await supabase.auth.signOut();
        setErr("Only teachers can sign in. Please use a teacher account.");
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 450);
        return;
      }

      // 5) Go
      router.replace("/dashboard");
    } catch (e2) {
      setErr(e2?.message || "Login failed. Please try again.");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 450);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-4 sm:p-6"
      style={{
        backgroundImage: "url('/bgg.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <VenomBeams
        className="absolute inset-0 z-0 h-full w-full"
        colors={["#2E5EAA", "#81B29A", "#4A8FE7"]}
        density={isSmallScreen ? 6 : 14}
        speed={isSmallScreen ? 0.6 : 1.0}
        opacity={isSmallScreen ? 0.45 : 0.7}
      />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
        className="flex w-full justify-center"
      >
        <motion.div
          className="tilt-container relative z-10 w-full max-w-md"
          animate={isShaking ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          <div
            ref={cardRef}
            onMouseMove={handleTiltMove}
            onMouseLeave={handleTiltLeave}
            className={`tilt-card w-full transform-gpu overflow-hidden rounded-xl bg-[#F8F9FA] will-change-transform [transform-style:preserve-3d] ${isSmallScreen ? "p-6 shadow-md" : "p-8 shadow-lg"
              }`}
            style={{ minWidth: 320 }}
          >
            {/* Logo */}
            <div className="no-tilt mb-4 flex h-24 w-full items-center justify-center rounded-lg sm:h-32">
              <Image
                src="/lOGO.svg"
                alt="logo"
                width={isSmallScreen ? 200 : 250}
                height={isSmallScreen ? 200 : 250}
                priority
              />
            </div>

            {/* Heading */}
            <div className="mb-5 flex items-center justify-center gap-2 sm:mb-6">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#2E5EAA]/10 text-[#2E5EAA]">
                <User size={18} aria-hidden="true" />
              </div>
              <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2B2D42" }}>
                Faculty Login
              </h1>
            </div>

            {/* Form */}
            <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit} noValidate>
              {/* EMAIL */}
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="pointer-events-none absolute inset-y-0 left-3 my-auto text-gray-400" size={18} aria-hidden="true" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    placeholder="@teacher.com"
                    inputMode="email"
                    autoComplete="email"
                    className={`no-tilt h-12 w-full rounded-lg border pl-10 pr-4 text-base outline-none focus:outline-none focus:ring ${email.length === 0
                        ? "border-gray-200 focus:ring-[#2E5EAA]"
                        : isEmailValid
                          ? "border-green-400 focus:ring-green-400"
                          : "border-red-400 focus:ring-red-400"
                      }`}
                    aria-invalid={email.length > 0 && !isEmailValid}
                  />
                </div>
                {email.length > 0 && !isEmailValid && (
                  <p className="text-xs text-red-600">Enter a valid email address.</p>
                )}
              </div>

              {/* PASSWORD */}
              <div className="space-y-1">
                <div className="relative">
                  <Lock className="pointer-events-none absolute inset-y-0 left-3 my-auto text-gray-400" size={18} aria-hidden="true" />
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
                    className={`hide-native-reveal no-tilt h-12 w-full rounded-lg border pl-10 pr-12 text-base outline-none focus:outline-none focus:ring ${password.length === 0
                        ? "border-gray-200 focus:ring-[#2E5EAA]"
                        : isPasswordValid
                          ? "border-green-400 focus:ring-green-400"
                          : "border-red-400 focus:ring-red-400"
                      }`}
                    aria-invalid={!isPasswordValid && password.length > 0}
                    aria-describedby="password-help"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="no-tilt absolute inset-y-0 right-3 my-auto grid h-8 w-8 place-items-center text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div className={`flex items-center gap-1 text-xs transition-opacity ${isCapsLockOn ? "opacity-100" : "opacity-0"}`} id="password-help">
                  <AlertTriangle size={14} className="text-amber-500" aria-hidden="true" />
                  <span className="text-amber-600">Caps Lock is ON</span>
                </div>

                {password.length > 0 && !isPasswordValid && (
                  <p className="text-xs text-red-600">Password must be at least 6 characters.</p>
                )}
              </div>

              {/* SUBMIT */}
              <div className="flex flex-col items-center gap-2">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`loginbtn select-none ${!canSubmit ? "cursor-not-allowed opacity-60" : ""} no-tilt`}
                >
                  {isSubmitting ? "Login..." : "Login"}
                </button>
                {err ? <p className="text-xs text-red-600">{err}</p> : null}
              </div>
            </form>

            {/* Footer */}
            <p className="mt-5 text-center text-sm sm:mt-6" style={{ color: "#2B2D42" }}>
              Don’t have an account?{" "}
              <Link href="/signup" className="no-tilt font-semibold text-primary hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
