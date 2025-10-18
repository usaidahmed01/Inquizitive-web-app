
// /**
//  * VerifyPage
//  * - Route: /classes/[classid]/quiz/verify?pid=...&t=...
//  * - Verifies a student (seat/email/pass) before letting them start the quiz.
//  * - Validates the shared preview snapshot from localStorage via pid + token.
//  *
//  * NOTE: Business logic intentionally unchanged. This is readability polish only.
//  * TODO: put you db here (wire backend verify later yk)
//  */


"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import SlideUp from "@/app/_components/SlideUp";
import VenomBeams from "@/app/_components/VenomBeams";
import { ShieldCheck, Mail, IdCard, AlertTriangle } from "lucide-react";
import { VerifySchema } from "@/schemas";
import "./verify.css";

const API = process.env.NEXT_PUBLIC_API_BASE;

export default function VerifyPage() {
  const router = useRouter();
  const { classid } = useParams();
  const search = useSearchParams();
  const quizId = search.get("quiz");

  const [seat, setSeat] = useState("");
  const [email, setEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const [fxEnabled, setFxEnabled] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [errText, setErrText] = useState("");
  const [classLabel, setClassLabel] = useState(null);

  useEffect(() => { setInvalid(!quizId); }, [quizId]);

  const enableRef = useRef(true);
  useEffect(() => {
    const isTouch = typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);
    const prefersReduced = typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const enabled = !(isTouch || prefersReduced);
    setFxEnabled(enabled);
    enableRef.current = enabled;
  }, []);

  // Class Name
  useEffect(() => {
    if (!API || !classid) return;
    const cacheKey = `class_meta_${classid}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try { setClassLabel(JSON.parse(cached)?.label || null); } catch { }
    }
    (async () => {
      try {
        const r = await fetch(`${API}/classes/${classid}/meta`);
        if (!r.ok) return; // fallback stays as ID
        const m = await r.json();
        // build a nice label (adjust to taste)
        const dept = String(m?.department || "").toUpperCase();
        const label = m?.course_name
          ? `BS${dept} - ${m.course_name}`
          : `Class ${String(classid)}`;
        setClassLabel(label);
        sessionStorage.setItem(cacheKey, JSON.stringify({ label, t: Date.now() }));
      } catch { }
    })();
  }, [API, classid]);

  // validate BOTH fields
  const seatCheck = VerifySchema.shape.seat.safeParse(seat);
  const emailCheck = VerifySchema.shape.email.safeParse(email.trim());
  const canSubmit =
    seatCheck.success &&
    emailCheck.success &&
    seat.trim().length > 0 &&
    email.trim().length > 0 &&
    !submitting &&
    !invalid;

  const errs = useMemo(() => ({
    seat:
      seat.length === 0 ? "" :
        seatCheck.success ? "" :
          (seatCheck.error?.issues?.[0]?.message || "Seat # must be B + 11 digits (e.g., B23110006177)."),
    email:
      email.length === 0 ? "" :
        emailCheck.success ? "" :
          (emailCheck.error?.issues?.[0]?.message || "Enter a valid email address."),
  }), [seat, email, seatCheck, emailCheck]);

  // tilt
  const cardRef = useRef(null);
  const rafRef = useRef(0);
  const rx = useRef(0), ry = useRef(0), vx = useRef(0), vy = useRef(0);
  const targetRx = useRef(0), targetRy = useRef(0);
  const MAX_DEG = 20, STIFFNESS = 0.16, DAMPING = 0.22, JITTER_SMOOTH = 0.22;

  useEffect(() => {
    if (!enableRef.current) return;
    const animate = () => {
      const ax = (targetRx.current - rx.current) * STIFFNESS - vx.current * DAMPING;
      const ay = (targetRy.current - ry.current) * STIFFNESS - vy.current * DAMPING;
      vx.current += ax; vy.current += ay;
      rx.current += vx.current; ry.current += vy.current;
      const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
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
    const el = cardRef.current; if (!el) return;
    if (e.target?.closest("input, button, a, .no-tilt")) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    targetRy.current += ((x * MAX_DEG) - targetRy.current) * JITTER_SMOOTH;
    targetRx.current += ((-y * MAX_DEG) - targetRx.current) * JITTER_SMOOTH;
  };
  const handleLeave = () => { targetRx.current = 0; targetRy.current = 0; };

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit) { setShake(true); setTimeout(() => setShake(false), 450); return; }
    setSubmitting(true);
    setErrText("");

    try {
      const seatTrim = seat.trim().toUpperCase();
      const emailTrim = email.trim().toLowerCase();

      // require BOTH in API call
      const url = new URL(`${API}/classes/${classid}/verify_student`);
      url.searchParams.set("seat_no", seatTrim);
      url.searchParams.set("email", emailTrim);

      const r = await fetch(url.toString());
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        setErrText(j?.detail || "Verification failed. Make sure you’re enrolled in this class.");
        setShake(true); setTimeout(() => setShake(false), 450);
        return;
      }

      // gate is tied to seat (as your Take page expects)
      sessionStorage.setItem(
        `inquiz_allowed_${classid}_${quizId}_${seatTrim}`,
        "1"
      );
      sessionStorage.setItem(
        `inquiz_identity_${classid}_${quizId}_${seatTrim}`,
        JSON.stringify({ seat_no: seatTrim, email: emailTrim, t: Date.now() })
      );

      // redirect with both params
      const qp = new URLSearchParams({ quiz: String(quizId), seat: seatTrim, email: emailTrim });
      router.replace(`/classes/${encodeURIComponent(String(classid))}/quiz/take?${qp.toString()}`);
    } catch {
      setErrText("Network error. Please try again.");
      setShake(true); setTimeout(() => setShake(false), 450);
    } finally {
      setSubmitting(false);
    }
  }

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
          </div>
        </SlideUp>
      </div>
    );
  }


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
                <p className="text-xs text-gray-500">{classLabel || `Class ${String(classid)}`}</p>
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

              {/* Submit */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`verifyBtn select-none ${!canSubmit ? "cursor-not-allowed opacity-60" : ""} no-tilt`}
                >
                  {submitting ? "Verify & Start" : "Verify & Start"}
                </button>
              </div>
              {errText ? <div className="text-xs text-red-600 text-center">{errText}</div> : null}
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
