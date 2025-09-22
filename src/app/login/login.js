"use client";

/**
 * LoginPage
 * - Faculty login screen (client component).
 * - Validates with Zod schema (email/password) — semantics unchanged.
 * - Subtle 3D tilt on desktop; disabled on touch / reduced-motion.
 *
 * NOTE: Business logic intentionally unchanged. This is readability polish only.
 * TODO: put you db here (wire backend auth later yk)
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { AlertTriangle, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import VenomBeams from "../_components/VenomBeams";
import { LoginSchema } from "@/schemas/auth";
import "./login.css";

// ———————————————————————————————————————————————————————————————
// Component
// ———————————————————————————————————————————————————————————————

export default function LoginPage() {
  const router = useRouter();

  /** 3D tilt card container */
  const cardRef = useRef(null);

  // ——— Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // ——— UI state
  const [isShaking, setIsShaking] = useState(false); // little wiggle on invalid submit
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ——— Responsive / environment flags
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect touch, small screen, and reduced motion preferences (client-only)
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

  // ——— Validation (live) — keep your semantics exactly
  const parsed = LoginSchema.safeParse({ email, password });
  const canSubmit = parsed.success && !isSubmitting;

  const isEmailValid = email ? LoginSchema.shape.email.safeParse(email).success : false;
  const isPasswordValid = password ? LoginSchema.shape.password.safeParse(password).success : false;

  // ——— Tilt effect (disabled on touch or reduced motion)
  const tiltEnabled = !isTouchDevice && !prefersReducedMotion;

  /** Handle pointer movement for subtle 3D tilt */
  const handleTiltMove = (e) => {
    if (!tiltEnabled) return;
    const card = cardRef.current;
    if (!card) return;

    // Don't tilt when hovering interactives to avoid weirdness
    const target = e.target;
    if (target && target.closest("input, button, a, .no-tilt")) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const px = x / rect.width - 0.5; // -0.5 .. 0.5
    const py = y / rect.height - 0.5;

    const MAX_DEG = 10;
    const rotateX = -(py * MAX_DEG);
    const rotateY = px * MAX_DEG;

    card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
  };

  /** Reset tilt on leave */
  const handleTiltLeave = () => {
    if (!tiltEnabled) return;
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`;
  };

  /** CapsLock detector for the password field */
  const handleCapsLockState = (e) => {
    const isOn =
      e && typeof e.getModifierState === "function" ? e.getModifierState("CapsLock") : false;
    setIsCapsLockOn(!!isOn);
  };

  // ——— Submit (no backend yet; keep exact flow)
  const handleSubmit = async (e) => {
    e.preventDefault();

    const result = LoginSchema.safeParse({ email, password });
    if (!result.success) {
      // Shake the card a bit to indicate validation issue
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 450);
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: backend auth with result.data (put you db here yk)
      router.push("/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ———————————————————————————————————————————————————————————————
  // Render
  // ———————————————————————————————————————————————————————————————

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
      {/* Decorative beams over bg; slightly lighter on phones */}
      <VenomBeams
        className="absolute inset-0 z-0 h-full w-full"
        colors={["#2E5EAA", "#81B29A", "#4A8FE7"]}
        density={isSmallScreen ? 6 : 14}
        speed={isSmallScreen ? 0.6 : 1.0}
        opacity={isSmallScreen ? 0.45 : 0.7}
      />

      {/* Fade-in container */}
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.05 }}
        className="flex w-full justify-center"
      >
        {/* Shake on invalid submit */}
        <motion.div
          className="tilt-container relative z-10 w-full max-w-md"
          animate={isShaking ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          {/* 3D-tilting card (desktop only) */}
          <div
            ref={cardRef}
            onMouseMove={handleTiltMove}
            onMouseLeave={handleTiltLeave}
            className={`tilt-card w-full transform-gpu overflow-hidden rounded-xl bg-[#F8F9FA] will-change-transform [transform-style:preserve-3d] ${
              isSmallScreen ? "p-6 shadow-md" : "p-8 shadow-lg"
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

            {/* Heading with person icon */}
            <div className="mb-5 flex items-center justify-center gap-2 sm:mb-6">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#2E5EAA]/10 text-[#2E5EAA]">
                <User size={18} aria-hidden="true" />
              </div>
              <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2B2D42" }}>
                Faculty Login
              </h1>
            </div>

            {/* Form (client-side only; keep semantics the same) */}
            <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit} noValidate>
              {/* EMAIL */}
              <div className="space-y-1">
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute inset-y-0 left-3 my-auto text-gray-400"
                    size={18}
                    aria-hidden="true"
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    placeholder="@teacher.com"
                    inputMode="email"
                    autoComplete="email"
                    className={`no-tilt h-12 w-full rounded-lg border pl-10 pr-4 text-base outline-none focus:outline-none focus:ring ${
                      email.length === 0
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
                  {/* Left lock icon */}
                  <Lock
                    className="pointer-events-none absolute inset-y-0 left-3 my-auto text-gray-400"
                    size={18}
                    aria-hidden="true"
                  />

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
                      password.length === 0
                        ? "border-gray-200 focus:ring-[#2E5EAA]"
                        : isPasswordValid
                        ? "border-green-400 focus:ring-green-400"
                        : "border-red-400 focus:ring-red-400"
                    }`}
                    aria-invalid={!isPasswordValid && password.length > 0}
                    aria-describedby="password-help"
                  />

                  {/* Show/Hide password toggle (kept as button with no tab-stop to avoid focus jump) */}
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

                {/* CapsLock helper lives OUTSIDE to keep icons centered */}
                <div
                  className={`flex items-center gap-1 text-xs transition-opacity ${
                    isCapsLockOn ? "opacity-100" : "opacity-0"
                  }`}
                  id="password-help"
                >
                  <AlertTriangle size={14} className="text-amber-500" aria-hidden="true" />
                  <span className="text-amber-600">Caps Lock is ON</span>
                </div>

                {password.length > 0 && !isPasswordValid && (
                  <p className="text-xs text-red-600">Password must be at least 6 characters.</p>
                )}
              </div>

              {/* SUBMIT */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`loginbtn select-none ${
                    !canSubmit ? "cursor-not-allowed opacity-60" : ""
                  } no-tilt`}
                >
                  {isSubmitting ? "…" : "Login"}
                </button>
              </div>
            </form>

            {/* Footer link */}
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
