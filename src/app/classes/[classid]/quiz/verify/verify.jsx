"use client";

/**
 * VerifyPage
 * - Route: /classes/[classid]/quiz/verify?pid=...&t=...
 * - Verifies a student (seat/email/pass) before letting them start the quiz.
 * - Validates the shared preview snapshot from localStorage via pid + token.
 *
 * NOTE: Business logic intentionally unchanged. This is readability polish only.
 * TODO: put you db here (wire backend verify later yk)
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import SlideUp from "@/app/_components/SlideUp";
import VenomBeams from "@/app/_components/VenomBeams";
import { ShieldCheck, Mail, Lock, IdCard, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { VerifySchema } from "@/schemas";
import "./verify.css";

export default function VerifyPage() {
  // ——— Routing/params
  const router = useRouter();
  const { classid } = useParams();                 // route segment
  const search = useSearchParams();
  const pid = search.get("pid");                   // preview id
  const token = search.get("t");                   // signed token

  // ——— Form state
  const [seat, setSeat] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  // ——— UI state
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // Link validity (pid/token preview check)
  const [invalid, setInvalid] = useState(false);

  // FX toggles (reduce motion on touch / prefers-reduced-motion)
  const [fxEnabled, setFxEnabled] = useState(true);

  // ———————————————————————————————————————————————————————————————
  // Validate the shared snapshot (pid + token) from localStorage
  // ———————————————————————————————————————————————————————————————
  useEffect(() => {
    try {
      if (!pid || !token) {
        setInvalid(true);
        return;
      }
      const raw = localStorage.getItem(`inquiz_preview_${pid}`);
      if (!raw) {
        setInvalid(true);
        return;
      }
      const snap = JSON.parse(raw);

      // generator saved `classId` (camelCase)
      const classOk = String(snap?.classId) === String(classid);
      const tokenOk = snap?.token === token;

      if (!snap || !tokenOk || !classOk) setInvalid(true);
    } catch {
      setInvalid(true);
    }
  }, [pid, token, classid]);

  // ———————————————————————————————————————————————————————————————
  // Detect touch / reduced-motion and soften/disable FX
  // ———————————————————————————————————————————————————————————————
  const enableRef = useRef(true); // used by tilt RAF loop
  useEffect(() => {
    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const enabled = !(isTouch || prefersReduced);
    setFxEnabled(enabled);
    enableRef.current = enabled; // keeps behavior the same for tilt loop below
  }, []);

  // ———————————————————————————————————————————————————————————————
  // Live field-level validation via Zod shapes (same semantics)
  // ———————————————————————————————————————————————————————————————
  const seatCheck = VerifySchema.shape.seat.safeParse(seat);
  const emailCheck = VerifySchema.shape.email.safeParse(email.trim());
  const passCheck = VerifySchema.shape.pass.safeParse(pass);

  const canSubmit =
    VerifySchema.safeParse({ seat, email, pass }).success &&
    !submitting &&
    !invalid;

  // For helpful inline messages (memoized)
  const errs = useMemo(
    () => ({
      seat:
        seat.length === 0
          ? ""
          : seatCheck.success
          ? ""
          : (seatCheck.error?.issues?.[0]?.message ||
             "Seat # must be B + 11 digits (e.g., B23110006177)."),
      email:
        email.length === 0
          ? ""
          : emailCheck.success
          ? ""
          : (emailCheck.error?.issues?.[0]?.message || "Enter a valid email address."),
      pass:
        pass.length === 0
          ? ""
          : passCheck.success
          ? ""
          : (passCheck.error?.issues?.[0]?.message || "Password must be at least 6 characters."),
    }),
    [seat, email, pass, seatCheck, emailCheck, passCheck]
  );

  // ———————————————————————————————————————————————————————————————
  // Smooth tilt (desktop only) — same physics values
  // ———————————————————————————————————————————————————————————————
  const cardRef = useRef(null);
  const rafRef = useRef(0);

  const rx = useRef(0), ry = useRef(0);           // rotation current
  const vx = useRef(0), vy = useRef(0);           // velocity
  const targetRx = useRef(0), targetRy = useRef(0);

  const MAX_DEG = 20;           // more tilt
  const STIFFNESS = 0.16;       // faster follow
  const DAMPING = 0.22;         // less wobble
  const JITTER_SMOOTH = 0.22;   // input smoothing

  useEffect(() => {
    if (!enableRef.current) return; // don’t run RAF when disabled
    const animate = () => {
      const ax = (targetRx.current - rx.current) * STIFFNESS - vx.current * DAMPING;
      const ay = (targetRy.current - ry.current) * STIFFNESS - vy.current * DAMPING;

      vx.current += ax; vy.current += ay;
      rx.current += vx.current; ry.current += vy.current;

      // clamp for safety
      const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
      rx.current = clamp(rx.current, -MAX_DEG, MAX_DEG);
      ry.current = clamp(ry.current, -MAX_DEG, MAX_DEG);

      const el = cardRef.current;
      if (el) el.style.transform = `rotateX(${rx.current}deg) rotateY(${ry.current}deg) translateZ(0)`;
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const handleMove = (e) => {
    if (!enableRef.current) return;
    const el = cardRef.current;
    if (!el) return;

    // ignore tilt while over inputs/buttons/links
    const t = e.target;
    if (t && t.closest("input, button, a, .no-tilt")) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const tx = x * MAX_DEG;
    const ty = -y * MAX_DEG;
    // input smoothing to remove micro-jitter
    targetRy.current = targetRy.current + (tx - targetRy.current) * JITTER_SMOOTH;
    targetRx.current = targetRx.current + (ty - targetRx.current) * JITTER_SMOOTH;
  };

  const handleLeave = () => { targetRx.current = 0; targetRy.current = 0; };

  // ———————————————————————————————————————————————————————————————
  // Submit (no backend yet; exact same flow)
  // ———————————————————————————————————————————————————————————————
  async function onSubmit(e) {
    e.preventDefault();

    const parsed = VerifySchema.safeParse({ seat, email, pass });
    if (!parsed.success) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }

    setSubmitting(true);
    try {
      // TODO: call your backend to verify seat/email/pass (put you db here yk)
      const ok = true;

      if (ok) {
        // gate preview for this pid only; keep same sessionStorage key shape
        const clean = parsed.data;
        sessionStorage.setItem(
          `inquiz_allowed_${classid}_${pid}`,
          JSON.stringify({ seat: clean.seat, email: clean.email, t: Date.now() })
        );

        router.push(
          `/classes/${encodeURIComponent(String(classid))}/quiz/take?pid=${encodeURIComponent(pid)}&t=${encodeURIComponent(token)}`
        );
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 450);
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ———————————————————————————————————————————————————————————————
  // Invalid link page (unchanged behavior)
  // ———————————————————————————————————————————————————————————————
  if (invalid) {
    return (
      <div
        className="relative grid place-items-center min-h-screen p-4 sm:p-6 bg-cover bg-center"
        style={{
          backgroundImage: "url('/bgg.png')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <VenomBeams
          className="absolute inset-0 w-full h-full z-0"
          colors={["#2E5EAA", "#81B29A", "#4A8FE7"]}
          density={fxEnabled ? 14 : 8}
          speed={fxEnabled ? 1.0 : 0.6}
          opacity={fxEnabled ? 0.7 : 0.5}
        />
        <SlideUp>
          <div className="relative z-10 rounded-xl border border-red-200 bg-red-50 px-4 sm:px-6 py-5 shadow">
            <p className="font-semibold text-red-700">Invalid or expired quiz link.</p>
            <ul className="mt-1 list-disc pl-4 text-sm text-red-700">
              <li>Open the link in the same browser/profile where it was created.</li>
              <li>Make sure the class in the URL matches the class you generated from.</li>
              <li>Don’t edit the <code>pid</code> or <code>t</code> query params.</li>
              <li>Use the same origin/port when testing locally.</li>
            </ul>
          </div>
        </SlideUp>
      </div>
    );
  }

  // ———————————————————————————————————————————————————————————————
  // Normal form (same UI/logic)
  // ———————————————————————————————————————————————————————————————
  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center p-4 sm:p-6"
      style={{
        backgroundImage: "url('/bgg.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
        perspective: "900px",
      }}
    >
      {/* Decorative beams behind the card */}
      <VenomBeams
        className="absolute inset-0 w-full h-full z-0"
        colors={["#2E5EAA", "#81B29A", "#4A8FE7"]}
        density={fxEnabled ? 14 : 8}
        speed={fxEnabled ? 1.0 : 0.6}
        opacity={fxEnabled ? 0.7 : 0.5}
      />

      <SlideUp>
        <motion.div
          className="tilt-container relative z-10 w-full max-w-md"
          animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          <div
            ref={cardRef}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            className="tilt-card w-full overflow-hidden rounded-xl bg-[#F8F9FA] p-6 sm:p-8 shadow-lg transform-gpu will-change-transform [transform-style:preserve-3d]"
          >
            {/* Heading */}
            <div
              className="no-tilt mb-4 flex items-center gap-3"
              style={{ transform: "translateZ(22px)", transformStyle: "preserve-3d", willChange: "transform" }}
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#2E5EAA]/10 text-[#2E5EAA]">
                <ShieldCheck size={18} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-bold sm:text-2xl" style={{ color: "#2B2D42" }}>
                  Verify to Start Quiz
                </h1>
                <p className="text-xs text-gray-500">Class {String(classid)}</p>
              </div>
            </div>

            <form className="space-y-4 sm:space-y-5" onSubmit={onSubmit} noValidate>
              {/* Seat Number */}
              <div>
                <div
                  className={`no-tilt flex h-12 items-center gap-2 rounded-lg border bg-white px-4
                    ${seat.length === 0
                      ? "border-gray-200"
                      : seatCheck.success
                      ? "border-green-400"
                      : "border-red-400"
                    }`}
                >
                  <IdCard size={16} className="text-[#2E5EAA]" aria-hidden="true" />
                  <input
                    value={seat}
                    onChange={(e) => setSeat(e.target.value.toUpperCase())}
                    placeholder="e.g. B23110006177"
                    className="w-full outline-none text-[16px] sm:text-sm"
                    inputMode="text"
                    autoComplete="off"
                    aria-invalid={seat.length > 0 && !seatCheck.success}
                  />
                </div>
                {!seatCheck.success && seat.length > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    {errs.seat}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <div
                  className={`no-tilt flex h-12 items-center gap-2 rounded-lg border bg-white px-4
                    ${email.length === 0
                      ? "border-gray-200"
                      : emailCheck.success
                      ? "border-green-400"
                      : "border-red-400"
                    }`}
                >
                  <Mail size={16} className="text-[#2E5EAA]" aria-hidden="true" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu"
                    className="w-full outline-none text-[16px] sm:text-sm"
                    inputMode="email"
                    autoComplete="email"
                    aria-invalid={email.length > 0 && !emailCheck.success}
                  />
                </div>
                {!emailCheck.success && email.length > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    {errs.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div
                  className={`no-tilt relative flex h-12 items-center gap-2 rounded-lg border bg-white px-4
                    ${pass.length === 0
                      ? "border-gray-200"
                      : passCheck.success
                      ? "border-green-400"
                      : "border-red-400"
                    }`}
                >
                  <Lock size={16} className="text-[#2E5EAA]" aria-hidden="true" />
                  <input
                    type={showPw ? "text" : "password"}
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="••••••"
                    className="hide-native-reveal w-full pr-10 outline-none text-[16px] sm:text-sm"
                    autoComplete="current-password"
                    aria-invalid={pass.length > 0 && !passCheck.success}
                    aria-describedby="password-help"
                  />
                  {/* Show/Hide toggle (no tab-stop to avoid focus jump) */}
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 inset-y-0 my-auto grid h-8 w-8 place-items-center text-gray-600 hover:text-gray-800"
                    aria-label={showPw ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {!passCheck.success && pass.length > 0 && (
                  <p id="password-help" className="mt-1 text-xs text-red-600">
                    {errs.pass}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`verifyBtn select-none ${!canSubmit ? "cursor-not-allowed opacity-60" : ""} no-tilt`}
                >
                  {submitting ? "…" : "Verify & Start"}
                </button>
              </div>
            </form>

            {/* tiny tip */}
            <div className="no-tilt mt-4 flex items-center gap-1 text-xs text-gray-600">
              <AlertTriangle size={14} className="text-amber-500" aria-hidden="true" />
              <span>By continuing you confirm your identity for this quiz attempt.</span>
            </div>
          </div>
        </motion.div>
      </SlideUp>
    </div>
  );
}
