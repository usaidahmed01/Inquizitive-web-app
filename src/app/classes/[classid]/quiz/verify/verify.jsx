// "use client";

// import { VerifySchema } from "@/schemas";
// import { useEffect, useMemo, useRef, useState } from "react";
// import { useParams, useRouter, useSearchParams } from "next/navigation";
// import { motion } from "framer-motion";
// import SlideUp from "@/app/_components/SlideUp";
// import VenomBeams from "@/app/_components/VenomBeams";
// import { ShieldCheck, Mail, Lock, IdCard, AlertTriangle } from "lucide-react";

// /** Regex rules (swap with Zod later) */
// const re = {
//   seat: /^B\d{11}$/, // B + 11 digits
//   email: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
//   password: /^.{6,}$/,
// };

// export default function VerifyPage() {
//   const router = useRouter();
//   const { classid } = useParams(); // route: /classes/[classid]/quiz/verify
//   const search = useSearchParams();
//   const pid = search.get("pid");
//   const token = search.get("t");

//   // form state
//   const [seat, setSeat] = useState("");
//   const [email, setEmail] = useState("");
//   const [pass, setPass] = useState("");

//   // ui state
//   const [submitting, setSubmitting] = useState(false);
//   const [shake, setShake] = useState(false);

//   // link validation
//   const [invalid, setInvalid] = useState(false);

//   // ------- validate the shared snapshot (pid + token) -------
//   useEffect(() => {
//     try {
//       if (!pid || !token) { setInvalid(true); return; }
//       const raw = localStorage.getItem(`inquiz_preview_${pid}`);
//       if (!raw) { setInvalid(true); return; }
//       const snap = JSON.parse(raw);

//       // generator saved `classId` (camelCase)
//       const classOk = String(snap?.classId) === String(classid);
//       const tokenOk = snap?.token === token;

//       if (!snap || !tokenOk || !classOk) setInvalid(true);
//     } catch {
//       setInvalid(true);
//     }
//   }, [pid, token, classid]);

//   // validation msgs + flags
//   const seatValid = re.seat.test(seat);
//   const emailValid = re.email.test(email);
//   const passValid = re.password.test(pass);
//   const errs = useMemo(
//     () => ({
//       seat:
//         seat.length === 0
//           ? ""
//           : seatValid
//             ? ""
//             : "Seat # must be B + 11 digits (e.g., B23110006177).",
//       email:
//         email.length === 0
//           ? ""
//           : emailValid
//             ? ""
//             : "Enter a valid email address.",
//       pass:
//         pass.length === 0
//           ? ""
//           : passValid
//             ? ""
//             : "Password must be at least 6 characters.",
//     }),
//     [seat, email, pass, seatValid, emailValid, passValid]
//   );

//   const canSubmit = seatValid && emailValid && passValid && !submitting && !invalid;

//   // --------- SMOOTH TILT — spring/inertia + jitter smoothing ----------
//   const cardRef = useRef(null);
//   const rafRef = useRef(0);
//   const enabledRef = useRef(true);

//   // physics state
//   const rx = useRef(0); // rotationX current
//   const ry = useRef(0); // rotationY current
//   const vx = useRef(0); // vel X
//   const vy = useRef(0); // vel Y
//   const targetRx = useRef(0);
//   const targetRy = useRef(0);

//   // tune feel here
//   const MAX_DEG = 20;        // more tilt
//   const STIFFNESS = 0.16;    // faster follow
//   const DAMPING = 0.22;      // less wobble
//   const JITTER_SMOOTH = 0.22; // input smoothing (0..1)

//   // disable tilt for touch or reduced motion
//   useEffect(() => {
//     const isTouch =
//       typeof window !== "undefined" &&
//       ("ontouchstart" in window || navigator.maxTouchPoints > 0);

//     const prefersReduced =
//       typeof window !== "undefined" &&
//       window.matchMedia &&
//       window.matchMedia("(prefers-reduced-motion: reduce)").matches;

//     enabledRef.current = !(isTouch || prefersReduced);
//   }, []);

//   useEffect(() => {
//     const animate = () => {
//       // spring toward target
//       const ax = (targetRx.current - rx.current) * STIFFNESS - vx.current * DAMPING;
//       const ay = (targetRy.current - ry.current) * STIFFNESS - vy.current * DAMPING;

//       vx.current += ax;
//       vy.current += ay;
//       rx.current += vx.current;
//       ry.current += vy.current;

//       // clamp (safety)
//       const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
//       rx.current = clamp(rx.current, -MAX_DEG, MAX_DEG);
//       ry.current = clamp(ry.current, -MAX_DEG, MAX_DEG);

//       const el = cardRef.current;
//       if (el) {
//         el.style.transform = `rotateX(${rx.current}deg) rotateY(${ry.current}deg) translateZ(0)`;
//       }
//       rafRef.current = requestAnimationFrame(animate);
//     };
//     rafRef.current = requestAnimationFrame(animate);
//     return () => cancelAnimationFrame(rafRef.current);
//   }, []);

//   const handleMove = (e) => {
//     if (!enabledRef.current) return; // disabled on touch or reduced motion
//     const el = cardRef.current;
//     if (!el) return;
//     // ignore while over inputs/buttons
//     const t = e.target;
//     if (t && t.closest("input, button, a, .no-tilt")) return;

//     const rect = el.getBoundingClientRect();
//     const x = (e.clientX - rect.left) / rect.width - 0.5;
//     const y = (e.clientY - rect.top) / rect.height - 0.5;

//     const tx = x * MAX_DEG;
//     const ty = -y * MAX_DEG;
//     // input smoothing to remove micro-jitter
//     targetRy.current = targetRy.current + (tx - targetRy.current) * JITTER_SMOOTH;
//     targetRx.current = targetRx.current + (ty - targetRx.current) * JITTER_SMOOTH;
//   };

//   const handleLeave = () => {
//     targetRx.current = 0;
//     targetRy.current = 0;
//   };

//   async function onSubmit(e) {
//     e.preventDefault();
//     if (!canSubmit) {
//       setShake(true);
//       setTimeout(() => setShake(false), 450);
//       return;
//     }

//     setSubmitting(true);
//     try {
//       // TODO: call your backend to verify seat/email/pass
//       const ok = true;

//       if (ok) {
//         // gate preview for this pid only
//         sessionStorage.setItem(
//           `inquiz_allowed_${classid}_${pid}`,
//           JSON.stringify({ seat, email, t: Date.now() })
//         );
//         router.push(
//           `/classes/${encodeURIComponent(String(classid))}/quiz/take?pid=${encodeURIComponent(pid)}&t=${encodeURIComponent(token)}`
//         );
//       } else {
//         setShake(true);
//         setTimeout(() => setShake(false), 450);
//       }
//     } finally {
//       setSubmitting(false);
//     }
//   }

//   // ---------- invalid link page ----------
//   if (invalid) {
//     return (
//       <div
//         className="relative grid place-items-center min-h-screen p-6 bg-cover bg-center"
//         style={{
//           backgroundImage: "url('/bgg.png')",
//           backgroundRepeat: "no-repeat",
//           backgroundSize: "cover",
//           backgroundPosition: "center",
//         }}
//       >
//         <VenomBeams
//           className="absolute inset-0 w-full h-full z-0"
//           colors={["#2E5EAA", "#81B29A", "#4A8FE7"]}
//           density={14}
//           speed={1.0}
//           opacity={0.7}
//         />
//         <SlideUp>
//           <div className="relative z-10 rounded-xl border border-red-200 bg-red-50 px-6 py-5 shadow">
//             <p className="font-semibold text-red-700">Invalid or expired quiz link.</p>
//             <ul className="mt-1 text-sm text-red-700 list-disc pl-4">
//               <li>Open the link in the same browser/profile where it was created.</li>
//               <li>Make sure the class in the URL matches the class you generated from.</li>
//               <li>Don’t edit the <code>pid</code> or <code>t</code> query params.</li>
//               <li>Use the same origin/port when testing locally.</li>
//             </ul>
//           </div>
//         </SlideUp>
//       </div>
//     );
//   }

//   // ---------- normal form ----------
//   return (
//     <div
//       className="relative flex items-center justify-center min-h-screen bg-cover bg-center p-6"
//       style={{
//         backgroundImage: "url('/bgg.png')",
//         backgroundRepeat: "no-repeat",
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//         perspective: "900px",
//       }}
//     >
//       {/* Venom beams behind the card */}
//       <VenomBeams
//         className="absolute inset-0 w-full h-full z-0"
//         colors={["#2E5EAA", "#81B29A", "#4A8FE7"]}
//         density={14}
//         speed={1.0}
//         opacity={0.7}
//       />

//       <SlideUp>
//         <motion.div
//           className="tilt-container relative z-10 w-full max-w-md"
//           animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
//           transition={{ duration: 0.45, ease: "easeInOut" }}
//         >
//           <div
//             ref={cardRef}
//             onMouseMove={handleMove}
//             onMouseLeave={handleLeave}
//             className="tilt-card bg-[#F8F9FA] shadow-lg rounded-xl overflow-hidden p-8 transform-gpu will-change-transform [transform-style:preserve-3d] w-full"
//             style={{
//               minWidth: 320,
//               transition: "transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)"

//             }}
//           >
//             {/* Heading */}
//             <div
//               className="flex items-center gap-3 mb-4 no-tilt"
//               style={{
//                 transform: "translateZ(22px)",
//                 transformStyle: "preserve-3d",
//                 willChange: "transform",
//               }}
//             >
//               <div className="h-10 w-10 rounded-xl bg-[#2E5EAA]/10 text-[#2E5EAA] grid place-items-center">
//                 <ShieldCheck size={18} />
//               </div>
//               <div>
//                 <h1 className="text-2xl font-bold" style={{ color: "#2B2D42" }}>
//                   Verify to Start Quiz
//                 </h1>
//                 <p className="text-xs text-gray-500">Class {String(classid)}</p>
//               </div>
//             </div>

//             <form className="space-y-5" onSubmit={onSubmit} noValidate>
//               {/* Seat Number */}
//               <div>
//                 <div
//                   className={`flex items-center gap-2 h-12 px-4 rounded-lg border bg-white no-tilt
//                     ${seat.length === 0
//                       ? "border-gray-200"
//                       : seatValid
//                         ? "border-green-400"
//                         : "border-red-400"
//                     }`}
//                 >
//                   <IdCard size={16} className="text-[#2E5EAA]" />
//                   <input
//                     value={seat}
//                     onChange={(e) => setSeat(e.target.value.trim())}
//                     placeholder="e.g. B23110006177"
//                     className="w-full outline-none text-sm"
//                     inputMode="text"
//                     autoComplete="off"
//                   />
//                 </div>
//                 {seat.length > 0 && !seatValid && (
//                   <p className="mt-1 text-xs text-red-600">{errs.seat}</p>
//                 )}
//               </div>

//               {/* Email */}
//               <div>
//                 <div
//                   className={`flex items-center gap-2 h-12 px-4 rounded-lg border bg-white no-tilt
//                     ${email.length === 0
//                       ? "border-gray-200"
//                       : emailValid
//                         ? "border-green-400"
//                         : "border-red-400"
//                     }`}
//                 >
//                   <Mail size={16} className="text-[#2E5EAA]" />
//                   <input
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     placeholder="you@school.edu"
//                     className="w-full outline-none text-sm"
//                     inputMode="email"
//                     autoComplete="email"
//                   />
//                 </div>
//                 {email.length > 0 && !emailValid && (
//                   <p className="mt-1 text-xs text-red-600">{errs.email}</p>
//                 )}
//               </div>

//               {/* Password */}
//               <div>
//                 <div
//                   className={`flex items-center gap-2 h-12 px-4 rounded-lg border bg-white no-tilt
//                     ${pass.length === 0
//                       ? "border-gray-200"
//                       : passValid
//                         ? "border-green-400"
//                         : "border-red-400"
//                     }`}
//                 >
//                   <Lock size={16} className="text-[#2E5EAA]" />
//                   <input
//                     type="password"
//                     value={pass}
//                     onChange={(e) => setPass(e.target.value)}
//                     placeholder="••••••"
//                     className="w-full outline-none text-sm"
//                     autoComplete="current-password"
//                   />
//                 </div>
//                 {pass.length > 0 && !passValid && (
//                   <p className="mt-1 text-xs text-red-600">{errs.pass}</p>
//                 )}
//               </div>

//               {/* Submit */}
//               <div className="flex justify-center">
//                 <button
//                   type="submit"
//                   disabled={!canSubmit}
//                   className={`select-none no-tilt rounded-lg h-12 px-6 text-white font-semibold shadow-md
//                     ${!canSubmit ? "opacity-60 cursor-not-allowed" : ""}`}
//                   style={{
//                     background:
//                       "linear-gradient(90deg, #2E5EAA, #3A86FF, #81B29A)",
//                   }}
//                 >
//                   {submitting ? "…" : "Verify & Start"}
//                 </button>
//               </div>
//             </form>

//             {/* tiny tip */}
//             <div className="mt-4 flex items-center gap-1 text-xs text-gray-600 no-tilt">
//               <AlertTriangle size={14} className="text-amber-500" />
//               <span>
//                 By continuing you confirm your identity for this quiz attempt.
//               </span>
//             </div>
//           </div>
//         </motion.div>
//       </SlideUp>
//     </div>
//   );
// }




























"use client";

import { VerifySchema } from "@/schemas";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import SlideUp from "@/app/_components/SlideUp";
import VenomBeams from "@/app/_components/VenomBeams";
import { ShieldCheck, Mail, Lock, IdCard, AlertTriangle } from "lucide-react";

export default function VerifyPage() {
  const router = useRouter();
  const { classid } = useParams();
  const search = useSearchParams();
  const pid = search.get("pid");
  const token = search.get("t");

  // form state
  const [seat, setSeat] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  // link validation
  const [invalid, setInvalid] = useState(false);

  // FX toggles
  const [fxEnabled, setFxEnabled] = useState(true);

  // ------- validate the shared snapshot (pid + token) -------
  useEffect(() => {
    try {
      if (!pid || !token) { setInvalid(true); return; }
      const raw = localStorage.getItem(`inquiz_preview_${pid}`);
      if (!raw) { setInvalid(true); return; }
      const snap = JSON.parse(raw);

      const classOk = String(snap?.classId) === String(classid);
      const tokenOk = snap?.token === token;

      if (!snap || !tokenOk || !classOk) setInvalid(true);
    } catch {
      setInvalid(true);
    }
  }, [pid, token, classid]);

  // detect touch / reduced-motion and soften or disable FX
  useEffect(() => {
    const isTouch =
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0);

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    setFxEnabled(!(isTouch || prefersReduced));
    enabledRef.current = !(isTouch || prefersReduced); // also affects tilt loop
  }, []);

  /* ------------ Zod field-level validation (live UI) ------------ */
  const seatCheck = VerifySchema.shape.seat.safeParse(seat);
  const emailCheck = VerifySchema.shape.email.safeParse(email.trim());
  const passCheck = VerifySchema.shape.pass.safeParse(pass);

  const canSubmit =
    VerifySchema.safeParse({ seat, email, pass }).success &&
    !submitting &&
    !invalid;

  /* --------- SMOOTH TILT (desktop only) ---------- */
  const cardRef = useRef(null);
  const rafRef = useRef(0);
  const enabledRef = useRef(true);

  const rx = useRef(0), ry = useRef(0);
  const vx = useRef(0), vy = useRef(0);
  const targetRx = useRef(0), targetRy = useRef(0);

  const MAX_DEG = 20;
  const STIFFNESS = 0.16;
  const DAMPING = 0.22;
  const JITTER_SMOOTH = 0.22;

  useEffect(() => {
    if (!enabledRef.current) return; // don't run RAF on mobile / reduced motion
    const animate = () => {
      const ax = (targetRx.current - rx.current) * STIFFNESS - vx.current * DAMPING;
      const ay = (targetRy.current - ry.current) * STIFFNESS - vy.current * DAMPING;

      vx.current += ax; vy.current += ay;
      rx.current += vx.current; ry.current += vy.current;

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
    if (!enabledRef.current) return;
    const el = cardRef.current;
    if (!el) return;
    const t = e.target;
    if (t && t.closest("input, button, a, .no-tilt")) return;

    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    const tx = x * MAX_DEG;
    const ty = -y * MAX_DEG;
    targetRy.current = targetRy.current + (tx - targetRy.current) * JITTER_SMOOTH;
    targetRx.current = targetRx.current + (ty - targetRx.current) * JITTER_SMOOTH;
  };

  const handleLeave = () => { targetRx.current = 0; targetRy.current = 0; };

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
      // TODO: call your backend
      const ok = true;
      if (ok) {
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

  // ---------- invalid link page ----------
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
            <ul className="mt-1 text-sm text-red-700 list-disc pl-4">
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

  // ---------- normal form ----------
  return (
    <div
      className="relative flex items-center justify-center min-h-screen bg-cover bg-center p-4 sm:p-6"
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
            className="tilt-card bg-[#F8F9FA] shadow-lg rounded-xl overflow-hidden w-full p-6 sm:p-8 transform-gpu will-change-transform [transform-style:preserve-3d]"
          >
            {/* Heading */}
            <div
              className="flex items-center gap-3 mb-4 no-tilt"
              style={{ transform: "translateZ(22px)", transformStyle: "preserve-3d", willChange: "transform" }}
            >
              <div className="h-10 w-10 rounded-xl bg-[#2E5EAA]/10 text-[#2E5EAA] grid place-items-center">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold" style={{ color: "#2B2D42" }}>
                  Verify to Start Quiz
                </h1>
                <p className="text-xs text-gray-500">Class {String(classid)}</p>
              </div>
            </div>

            <form className="space-y-4 sm:space-y-5" onSubmit={onSubmit} noValidate>
              {/* Seat Number */}
              <div>
                <div
                  className={`flex items-center gap-2 h-12 px-4 rounded-lg border bg-white no-tilt
                    ${seat.length === 0
                      ? "border-gray-200"
                      : seatCheck.success
                        ? "border-green-400"
                        : "border-red-400"
                    }`}
                >
                  <IdCard size={16} className="text-[#2E5EAA]" />
                  <input
                    value={seat}
                    onChange={(e) => setSeat(e.target.value.toUpperCase())}
                    placeholder="e.g. B23110006177"
                    className="w-full outline-none text-[16px] sm:text-sm"
                    inputMode="text"
                    autoComplete="off"
                  />
                </div>
                {!seatCheck.success && seat.length > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    {seatCheck.error.issues[0]?.message || "Enter a valid seat number."}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <div
                  className={`flex items-center gap-2 h-12 px-4 rounded-lg border bg-white no-tilt
                    ${email.length === 0
                      ? "border-gray-200"
                      : emailCheck.success
                        ? "border-green-400"
                        : "border-red-400"
                    }`}
                >
                  <Mail size={16} className="text-[#2E5EAA]" />
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu"
                    className="w-full outline-none text-[16px] sm:text-sm"
                    inputMode="email"
                    autoComplete="email"
                  />
                </div>
                {!emailCheck.success && email.length > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    {emailCheck.error.issues[0]?.message || "Enter a valid email."}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div
                  className={`flex items-center gap-2 h-12 px-4 rounded-lg border bg-white no-tilt
                    ${pass.length === 0
                      ? "border-gray-200"
                      : passCheck.success
                        ? "border-green-400"
                        : "border-red-400"
                    }`}
                >
                  <Lock size={16} className="text-[#2E5EAA]" />
                  <input
                    type="password"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="••••••"
                    className="w-full outline-none text-[16px] sm:text-sm"
                    autoComplete="current-password"
                  />
                </div>
                {!passCheck.success && pass.length > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    {passCheck.error.issues[0]?.message || "Password must be at least 6 characters."}
                  </p>
                )}
              </div>

              {/* Submit */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`select-none no-tilt rounded-lg h-12 px-6 text-white font-semibold shadow-md
                    ${!canSubmit ? "opacity-60 cursor-not-allowed" : ""}`}
                  style={{ background: "linear-gradient(90deg, #2E5EAA, #3A86FF, #81B29A)" }}
                >
                  {submitting ? "…" : "Verify & Start"}
                </button>
              </div>
            </form>

            {/* tiny tip */}
            <div className="mt-4 flex items-center gap-1 text-xs text-gray-600 no-tilt">
              <AlertTriangle size={14} className="text-amber-500" />
              <span>By continuing you confirm your identity for this quiz attempt.</span>
            </div>
          </div>
        </motion.div>
      </SlideUp>
    </div>
  );
}
