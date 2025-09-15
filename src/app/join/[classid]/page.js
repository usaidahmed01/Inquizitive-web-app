// "use client";

// import { JoinClassSchema } from "@/schemas";
// import { useParams, useRouter } from "next/navigation";
// import { useState, useMemo, useEffect } from "react";
// import { motion } from "framer-motion";
// import VenomBeams from "@/app/_components/VenomBeams";
// import toast from "react-hot-toast";

// export default function JoinClassPage() {
//   const { classid } = useParams();
//   const router = useRouter();

//   const [name, setName] = useState("");
//   const [seat, setSeat] = useState("");
//   const [email, setEmail] = useState("");

//   const [success, setSuccess] = useState(false); // <-- NEW

//   const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

//   // Helpers
//   const normalizedName = useMemo(
//     () =>
//       name
//         .replace(/\s+/g, " ")
//         .trim()
//         .replace(/\b\w/g, (c) => c.toUpperCase()),
//     [name]
//   );

// const seatUpper = seat.toUpperCase();
// const canSubmit = JoinClassSchema.safeParse({ name, seat: seatUpper, email, classId: String(classId||"") }).success;

//   const payload = {
//     name: normalizedName,
//     seat,
//     email,
//     classId,
//   };

//   const onSubmit = (e) => {
//     e.preventDefault();
//     if (!canSubmit) {
//       toast.error("Please fix the errors and try again.", {
//         position: "top-right",
//       });
//       return;
//     }

//     // TODO: real POST (await fetch/axios) then handle errors/success
//     // await fetch(`/api/classes/${classId}/students`, { method: "POST", body: JSON.stringify(payload) })

//     // Minimal toast + animated splash
//     toast.dismiss();
//     setSuccess(true);

//     // Clear fields
//     setName("");
//     setEmail("");
//     setSeat("");
//   };

//   return (
//     <div
//       className="relative min-h-screen flex items-center justify-center p-6"
//       style={{
//         backgroundImage: "url('/bgg.png')",
//         backgroundRepeat: "no-repeat",
//         backgroundSize: "cover",
//         backgroundPosition: "center",
//       }}
//     >
//       {/* Venom beams under the card */}
//       <VenomBeams
//         className="absolute inset-0 h-full w-full -z-0"
//         colors={["#2E5EAA", "#81B29A", "#4A8FE7"]}
//         density={14}
//         speed={1.0}
//         opacity={0.7}
//       />

//       {/* Soft scrim so text stays readable on busy images */}
//       <div className="absolute inset-0 bg-black/10 -z-10" />

//       {/* Card */}
//       <motion.div
//         initial={{ opacity: 0, y: 50 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.6, ease: "easeOut" }}
//         className="w-full max-w-md"
//       >
//         <div className="rounded-2xl bg-white/90 backdrop-blur-md shadow-xl p-8 border border-white/40">
//           {/* Header */}
//           <div className="text-center mb-6">
//             <p className="text-xs font-medium text-[#2E5EAA] tracking-wider">
//               JOIN CLASS
//             </p>
//             <h1 className="text-2xl font-extrabold mt-1 text-[#2B2D42]">
//               Enter Your Details
//             </h1>
//             <p className="text-sm text-gray-600 mt-1">
//               Class ID:{" "}
//               <span className="font-semibold text-gray-800">{classId}</span>
//             </p>
//           </div>

//           {/* Form */}
//           <form onSubmit={onSubmit} className="space-y-5">
//             {/* Name */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Full Name
//               </label>
//               <input
//                 type="text"
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 placeholder="e.g., Ali Raza"
//                 className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2E5EAA] outline-none"
//               />
//               {name && (
//                 <p className="mt-1 text-xs text-gray-500">
//                   Will be saved as:{" "}
//                   <span className="font-semibold">{normalizedName}</span>
//                 </p>
//               )}
//             </div>

//             {/* Seat No */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Seat No / Roll No
//               </label>
//               <input
//                 type="text"
//                 value={seat}
//                 onChange={(e) => setSeat(e.target.value.toUpperCase())}
//                 placeholder="B12345678901"
//                 className={`w-full px-4 py-3 rounded-lg border outline-none
//                   ${
//                     seat.length === 0
//                       ? "border-gray-200 focus:ring-2 focus:ring-[#2E5EAA]"
//                       : seatValid
//                       ? "border-green-300 focus:ring-2 focus:ring-green-400"
//                       : "border-red-300 focus:ring-2 focus:ring-red-400"
//                   }`}
//                 maxLength={12}
//               />
//               {seat.length > 0 && !seatValid && (
//                 <p className="mt-1 text-xs text-red-600">
//                   Seat No must be B followed by 11 digits (e.g., B12345678901).
//                 </p>
//               )}
//             </div>

//             {/* Email */}
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Email
//               </label>
//               <input
//                 type="email"
//                 value={email}
//                 onChange={(e) => setEmail(e.target.value.trim())}
//                 placeholder="you@university.com"
//                 className={`w-full px-4 py-3 rounded-lg border outline-none
//                   ${
//                     email.length === 0
//                       ? "border-gray-200 focus:ring-2 focus:ring-[#2E5EAA]"
//                       : emailValid
//                       ? "border-green-300 focus:ring-2 focus:ring-green-400"
//                       : "border-red-300 focus:ring-2 focus:ring-red-400"
//                   }`}
//               />
//               {email.length > 0 && !emailValid && (
//                 <p className="mt-1 text-xs text-red-600">
//                   Please enter a valid email address.
//                 </p>
//               )}
//             </div>

//             {/* Submit */}
//             <button
//               type="submit"
//               disabled={!canSubmit}
//               className={`w-full py-3 rounded-lg font-semibold transition
//                 ${
//                   canSubmit
//                     ? "bg-[#2E5EAA] hover:bg-[#264d8b] text-white shadow-md"
//                     : "bg-gray-200 text-gray-500 cursor-not-allowed"
//                 }`}
//             >
//               Join Class
//             </button>
//           </form>

//           {/* Small footer note */}
//           <p className="text-xs text-center text-gray-500 mt-5">
//             Your details will be verified by the instructor. Make sure they’re
//             correct.
//           </p>
//         </div>
//       </motion.div>

//       {/* SUCCESS ANIMATION OVERLAY */}
//       {success && <SuccessSplash />}

//     </div>
    
//   );
// }

// /* ========== Animated Success Overlay ========== */
// function SuccessSplash() {
//   // generate a handful of confetti pieces
//   const pieces = Array.from({ length: 24 }).map((_, i) => ({
//     id: i,
//     x: Math.random() * 240 - 120, // spread horizontally
//     y: Math.random() * -40 - 20, // start slightly above
//     rot: Math.random() * 360,
//     dur: 0.9 + Math.random() * 0.4,
//     delay: Math.random() * 0.1,
//     c:
//       ["#2E5EAA", "#81B29A", "#4A8FE7", "#F2A541", "#7ED0B6"][
//         Math.floor(Math.random() * 5)
//       ],
//   }));

//   return (
//     <motion.div
//       className="fixed inset-0 z-50 grid place-items-center"
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       transition={{ duration: 0.15 }}
//     >
//       {/* backdrop */}
//       <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

//       {/* pop card */}
//       <motion.div
//         initial={{ scale: 0.8, opacity: 0 }}
//         animate={{ scale: 1, opacity: 1 }}
//         transition={{ type: "spring", stiffness: 200, damping: 18 }}
//         className="relative rounded-2xl bg-white shadow-2xl px-10 py-8 text-center"
//       >
//         {/* animated ring */}
//         <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto">
//           <motion.circle
//             cx="60"
//             cy="60"
//             r="42"
//             fill="none"
//             stroke="#81B29A"
//             strokeWidth="10"
//             strokeLinecap="round"
//             initial={{ pathLength: 0 }}
//             animate={{ pathLength: 1 }}
//             transition={{ duration: 0.5, ease: "easeOut" }}
//           />
//           {/* check mark */}
//           <motion.path
//             d="M42 62 L55 75 L80 48"
//             fill="none"
//             stroke="#2E5EAA"
//             strokeWidth="10"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             initial={{ pathLength: 0 }}
//             animate={{ pathLength: 1 }}
//             transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
//           />
//         </svg>

//         <motion.h3
//           className="text-xl font-bold text-[#2B2D42] mt-3"
//           initial={{ y: 8, opacity: 0 }}
//           animate={{ y: 0, opacity: 1 }}
//           transition={{ delay: 0.2 }}
//         >
//           You’re in!
//         </motion.h3>
//         <motion.p
//           className="text-sm text-gray-600 mt-1"
//           initial={{ y: 8, opacity: 0 }}
//           animate={{ y: 0, opacity: 1 }}
//           transition={{ delay: 0.28 }}
//         >
//           Successfully joined the class.
//         </motion.p>

//         {/* confetti burst */}
//         <div className="pointer-events-none absolute inset-0 overflow-visible">
//           {pieces.map((p) => (
//             <motion.span
//               key={p.id}
//               className="absolute block w-1.5 h-3 rounded"
//               style={{
//                 left: "50%",
//                 top: "48%",
//                 background: p.c,
//               }}
//               initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
//               animate={{
//                 x: p.x,
//                 y: p.y - 90,
//                 rotate: p.rot,
//                 opacity: [1, 1, 0],
//               }}
//               transition={{
//                 duration: p.dur,
//                 delay: 0.15 + p.delay,
//                 ease: "easeOut",
//               }}
//             />
//           ))}
//         </div>
//       </motion.div>
//     </motion.div>
//   );
// }





















"use client";

import { JoinClassSchema } from "@/schemas/auth";
import { normalizeFullName } from "@/schemas/util";
import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import VenomBeams from "@/app/_components/VenomBeams";
import toast from "react-hot-toast";

/**
 * JoinClassPage — Zod-applied version (JSX, no TS)
 * - Uses your JoinClassSchema (auth.js) for both full form + per-field checks
 * - Keeps UI behavior: title-cased name preview, seat uppercasing, 12 max length
 */

export default function JoinClassPage() {
  const { classid } = useParams(); // URL param name stays `classid`
  const classId = String(classid || ""); // <-- normalize once

  const [name, setName] = useState("");
  const [seat, setSeat] = useState("");
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);

  // Responsiveness: soften effects on touch / reduced motion
  const [fxEnabled, setFxEnabled] = useState(true);
  useEffect(() => {
    const isTouch =
      typeof window !== "undefined" &&
      (("ontouchstart" in window) || navigator.maxTouchPoints > 0);
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setFxEnabled(!(isTouch || prefersReduced));
  }, []);

  // UI helper
  const normalizedName = useMemo(() => normalizeFullName(name), [name]);

  // Per-field checks via schema shapes
  const nameCheck  = JoinClassSchema.shape.name.safeParse(name);
  const seatCheck  = JoinClassSchema.shape.seat.safeParse(seat);
  const emailCheck = JoinClassSchema.shape.email.safeParse(email.trim());

  // ✅ IMPORTANT: send `classId` (not classid) to match your schema
  const canSubmit = JoinClassSchema.safeParse({
    name,
    seat,
    email,
    classId,
  }).success;

  const onSubmit = (e) => {
    e.preventDefault();

    const parsed = JoinClassSchema.safeParse({
      name,
      seat,
      email,
      classId, // <-- correct key
    });

    if (!parsed.success) {
      toast.error("Please fix the errors and try again.", { position: "top-right" });
      return;
    }

    // TODO: call backend with parsed.data
    // await fetch(`/api/classes/${classId}/students`, { method:'POST', body: JSON.stringify(parsed.data) })

    toast.dismiss();
    setSuccess(true);
    setName(""); setSeat(""); setEmail("");
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 md:p-6"
      style={{
        backgroundImage: "url('/bgg.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <VenomBeams
        className="absolute inset-0 h-full w-full -z-0"
        colors={["#2E5EAA", "#81B29A", "#4A8FE7"]}
        density={fxEnabled ? 14 : 8}
        speed={fxEnabled ? 1.0 : 0.6}
        opacity={fxEnabled ? 0.7 : 0.5}
      />
      <div className="absolute inset-0 bg-black/10 -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="rounded-2xl bg-white/90 backdrop-blur-md shadow-xl p-6 md:p-8 border border-white/40">
          {/* Header */}
          <div className="text-center mb-5 md:mb-6">
            <p className="text-xs font-medium text-[#2E5EAA] tracking-wider">JOIN CLASS</p>
            <h1 className="text-xl md:text-2xl font-extrabold mt-1 text-[#2B2D42]">Enter Your Details</h1>
            <p className="text-sm text-gray-600 mt-1">
              Class ID: <span className="font-semibold text-gray-800">{classId}</span>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={onSubmit} className="space-y-4 md:space-y-5" noValidate>
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Ali Raza"
                className={`w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 ${
                  name.length === 0
                    ? "border-gray-200 focus:ring-[#2E5EAA]"
                    : nameCheck.success
                    ? "border-green-300 focus:ring-green-400"
                    : "border-red-300 focus:ring-red-400"
                }`}
                autoComplete="name"
                inputMode="text"
              />
              {name && (
                <p className="mt-1 text-xs text-gray-500">
                  Will be saved as: <span className="font-semibold">{normalizedName}</span>
                </p>
              )}
              {!nameCheck.success && name.length > 0 && (
                <p className="mt-1 text-xs text-red-600">
                  {nameCheck.error.issues[0]?.message || "Enter a valid name."}
                </p>
              )}
            </div>

            {/* Seat */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seat No / Roll No</label>
              <input
                type="text"
                value={seat}
                onChange={(e) => setSeat(e.target.value.toUpperCase())}
                placeholder="B12345678901"
                className={`w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 ${
                  seat.length === 0
                    ? "border-gray-200 focus:ring-[#2E5EAA]"
                    : seatCheck.success
                    ? "border-green-300 focus:ring-green-400"
                    : "border-red-300 focus:ring-red-400"
                }`}
                maxLength={12}
                inputMode="text"
                autoComplete="off"
              />
              {!seatCheck.success && seat.length > 0 && (
                <p className="mt-1 text-xs text-red-600">{seatCheck.error.issues[0]?.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                placeholder="you@university.com"
                className={`w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 ${
                  email.length === 0
                    ? "border-gray-200 focus:ring-[#2E5EAA]"
                    : emailCheck.success
                    ? "border-green-300 focus:ring-green-400"
                    : "border-red-300 focus:ring-red-400"
                }`}
                inputMode="email"
                autoComplete="email"
              />
              {!emailCheck.success && email.length > 0 && (
                <p className="mt-1 text-xs text-red-600">{emailCheck.error.issues[0]?.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full py-3 rounded-lg font-semibold transition ${
                canSubmit
                  ? "bg-[#2E5EAA] hover:bg-[#264d8b] text-white shadow-md"
                  : "bg-gray-200 text-gray-500 cursor-not-allowed"
              }`}
            >
              Join Class
            </button>
          </form>

          <p className="text-xs text-center text-gray-500 mt-5">
            Your details will be verified by the instructor. Make sure they’re correct.
          </p>
        </div>
      </motion.div>

      {success && <SuccessSplash />}
    </div>
  );
}

/* Success overlay unchanged */
import { motion as fm } from "framer-motion"; // (optional alias if you prefer)

function SuccessSplash() {
  const pieces = Array.from({ length: 24 }).map((_, i) => ({
    id: i,
    x: Math.random() * 240 - 120,
    y: Math.random() * -40 - 20,
    rot: Math.random() * 360,
    dur: 0.9 + Math.random() * 0.4,
    delay: Math.random() * 0.1,
    c: ["#2E5EAA", "#81B29A", "#4A8FE7", "#F2A541", "#7ED0B6"][Math.floor(Math.random() * 5)],
  }));

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
        className="relative rounded-2xl bg-white shadow-2xl px-10 py-8 text-center"
      >
        <svg width="120" height="120" viewBox="0 0 120 120" className="mx-auto">
          <motion.circle cx="60" cy="60" r="42" fill="none" stroke="#81B29A" strokeWidth="10" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} />
          <motion.path d="M42 62 L55 75 L80 48" fill="none" stroke="#2E5EAA" strokeWidth="10"
            strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }} />
        </svg>

        <motion.h3 className="text-xl font-bold text-[#2B2D42] mt-3"
          initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          You’re in!
        </motion.h3>
        <motion.p className="text-sm text-gray-600 mt-1"
          initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.28 }}>
          Successfully joined the class.
        </motion.p>

        <div className="pointer-events-none absolute inset-0 overflow-visible">
          {pieces.map((p) => (
            <motion.span
              key={p.id}
              className="absolute block w-1.5 h-3 rounded"
              style={{ left: "50%", top: "48%", background: p.c }}
              initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
              animate={{ x: p.x, y: p.y - 90, rotate: p.rot, opacity: [1, 1, 0] }}
              transition={{ duration: p.dur, delay: 0.15 + p.delay, ease: "easeOut" }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
