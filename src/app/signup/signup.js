// 'use client'

// import { SignupSchema } from '@/schemas'
// import Link from 'next/link'
// import { motion } from 'framer-motion'
// import Image from 'next/image'
// import { useRef, useState } from 'react'
// import VenomBeams from '../_components/VenomBeams'
// import { useRouter } from 'next/navigation'
// import './signup.css'
// import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react'

// export default function Signup() {
//   const router = useRouter()
//   const cardRef = useRef(null)

//   // form state
//   const [fullName, setFullName] = useState('')
//   const [email, setEmail] = useState('')
//   const [password, setPassword] = useState('')
//   const [showPw, setShowPw] = useState(false)

//   // ui state
//   const [submitting, setSubmitting] = useState(false)
//   const [shake, setShake] = useState(false)

//   // validation
//   const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
//   const passwordValid = password.length >= 6
//   const canSubmit = emailValid && passwordValid && !submitting

//   // ---- Password strength (0..4) ----
//   const { score, label, barClass } = getPasswordStrength(password)

//   // tilt (ignore when interacting with inputs/buttons/links)
//   const handleMove = (e) => {
//     const card = cardRef.current
//     if (!card) return
//     if (e.target && e.target.closest('input, button, a, .no-tilt')) return
//     const rect = card.getBoundingClientRect()
//     const x = e.clientX - rect.left
//     const y = e.clientY - rect.top
//     const px = x / rect.width - 0.5
//     const py = y / rect.height - 0.5
//     const max = 10
//     const rx = -(py * max)
//     const ry = px * max
//     card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`
//   }
//   const handleLeave = () => {
//     const card = cardRef.current
//     if (!card) return
//     card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`
//   }

//   const onSubmit = async (e) => {
//     e.preventDefault()
//     if (!canSubmit) {
//       setShake(true)
//       setTimeout(() => setShake(false), 450)
//       return
//     }
//     setSubmitting(true)
//     try {
//       // TODO: real signup
//       router.push('/dashboard')
//     } finally {
//       setSubmitting(false)
//     }
//   }

//   return (
//     <div
//       className="relative flex items-center justify-center min-h-screen bg-cover bg-center p-6"
//       style={{
//         backgroundImage: "url('/bgg.png')",
//         backgroundRepeat: 'no-repeat',
//         backgroundSize: 'cover',
//         backgroundPosition: 'center',
//       }}
//     >
//       <VenomBeams
//         className="absolute inset-0 w-full h-full z-0"
//         colors={['#2E5EAA', '#81B29A', '#4A8FE7']}
//         density={14}
//         speed={1.0}
//         opacity={0.7}
//       />
//       <motion.div
//         initial={{ opacity: 0, y: 28 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 0.40, ease: "easeOut", delay: 0.05 }}
//         className="w-full flex justify-center"
//       >
//         <motion.div
//           className="tilt-container relative z-10 w-full max-w-md"
//           animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
//           transition={{ duration: 0.45, ease: 'easeInOut' }}
//         >
//           <div
//             ref={cardRef}
//             onMouseMove={handleMove}
//             onMouseLeave={handleLeave}
//             className="tilt-card bg-white shadow-lg rounded-xl w-full bg-[#F8F9FA] p-8 overflow-hidden transform-gpu will-change-transform [transform-style:preserve-3d]"
//             style={{ minWidth: 320 }}
//           >
//             {/* Logo */}
//             <div className="w-full h-32 rounded-lg mb-6 flex items-center justify-center no-tilt">
//               <Image src="/lOGO.svg" alt="logo" width={250} height={250} />
//             </div>

//             <h1 className="text-2xl font-bold text-center mb-6" style={{ color: '#2B2D42' }}>
//               Create Account
//             </h1>

//             <form className="space-y-5" onSubmit={onSubmit} noValidate>
//               {/* FULL NAME */}
//               <div className="relative">
//                 <User className="absolute left-3 inset-y-0 my-auto text-gray-400" size={18} />
//                 <input
//                   type="text"
//                   value={fullName}
//                   onChange={(e) => setFullName(e.target.value)}
//                   placeholder="Full Name"
//                   className="w-full h-12 pl-10 pr-4 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2E5EAA] outline-none no-tilt"
//                 />
//               </div>

//               {/* EMAIL */}
//               <div className="space-y-1">
//                 {/* icon + input only */}
//                 <div className="relative">
//                   <Mail
//                     className="absolute left-3 inset-y-0 my-auto text-gray-400 pointer-events-none"
//                     size={18}
//                   />
//                   <input
//                     type="email"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value.trim())}
//                     placeholder="@teacher.com"
//                     className={`w-full h-12 pl-10 pr-4 rounded-lg border outline-none focus:outline-none focus:ring no-tilt
//         ${email.length === 0
//                         ? 'border-gray-200 focus:ring-[#2E5EAA]'
//                         : emailValid
//                           ? 'border-green-400 focus:ring-green-400'
//                           : 'border-red-400 focus:ring-red-400'
//                       }`}
//                   />
//                 </div>

//                 {/* helper OUTSIDE so it doesn't affect icon centering */}
//                 {email.length > 0 && !emailValid && (
//                   <p className="text-xs text-red-600">Enter a valid email address.</p>
//                 )}
//               </div>

//               {/* PASSWORD + Strength Meter */}
//               <div>
//                 <div className="relative">
//                   <Lock className="absolute left-3 inset-y-0 my-auto text-gray-400" size={18} />
//                   <input
//                     type={showPw ? 'text' : 'password'}
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     placeholder="Password (min 6 chars)"
//                     className={`w-full h-12 pl-10 pr-12 rounded-lg border outline-none focus:outline-none focus:ring no-tilt
//                     ${password.length === 0
//                         ? 'border-gray-200 focus:ring-[#2E5EAA]'
//                         : passwordValid
//                           ? 'border-green-400 focus:ring-green-400'
//                           : 'border-red-400 focus:ring-red-400'
//                       }`}
//                   />
//                 </div>

//                 {/* Strength bar */}
//                 <div className="mt-2">
//                   <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
//                     <div
//                       className={`h-full transition-all duration-300 ${barClass}`}
//                       style={{ width: `${(score / 4) * 100}%` }}
//                     />
//                   </div>
//                   <div className="mt-1 text-xs text-gray-600">
//                     {password.length === 0 ? 'Enter a password' : label}
//                   </div>
//                 </div>

//                 {password.length > 0 && !passwordValid && (
//                   <p className="mt-1 text-xs text-red-600">Password must be at least 6 characters.</p>
//                 )}
//               </div>

//               {/* SUBMIT */}
//               <div className="flex justify-center">
//                 <button
//                   type="submit"
//                   disabled={!canSubmit}
//                   className={`signupbtn no-tilt ${!canSubmit ? 'opacity-60 cursor-not-allowed' : ''}`}
//                 >
//                   {submitting ? '…' : 'Sign Up'}
//                 </button>
//               </div>
//             </form>

//             <p className="mt-6 text-center text-sm">
//               Already have an account?{' '}
//               <Link href="/login" className="text-primary font-semibold hover:underline no-tilt">
//                 Login
//               </Link>
//             </p>
//           </div>
//         </motion.div>
//       </motion.div>

//     </div>
//   )
// }

// /* unchanged */
// function getPasswordStrength(pw) {
//   const hasLower = /[a-z]/.test(pw);
//   const hasUpper = /[A-Z]/.test(pw);
//   const hasDigit = /\d/.test(pw);
//   const hasSymbol = /[^A-Za-z0-9]/.test(pw);

//   const length = pw.length;
//   const categories = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

//   let score = 0;
//   if (length >= 6) {
//     if (categories <= 1) {
//       score = length >= 8 ? 2 : 1;
//     } else if (categories === 2) {
//       if (length >= 10) score = 3;
//       else if (length >= 8) score = 3;
//       else score = 2;
//     } else if (categories >= 3) {
//       if (length >= 10) score = 4;
//       else if (length >= 8) score = 3;
//       else score = 2;
//     }
//   }
//   if (/^(123456|password|qwerty|111111|letmein)/i.test(pw)) {
//     score = Math.max(0, score - 1);
//   }

//   const map = [
//     { label: 'Very weak', barClass: 'bg-red-400' },
//     { label: 'Weak', barClass: 'bg-orange-400' },
//     { label: 'Okay', barClass: 'bg-amber-400' },
//     { label: 'Good', barClass: 'bg-lime-500' },
//     { label: 'Strong', barClass: 'bg-green-500' },
//   ];
//   return { score, label: map[score].label, barClass: map[score].barClass };
// }
















'use client';

import { SignupSchema } from '@/schemas';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import VenomBeams from '../_components/VenomBeams';
import { useRouter } from 'next/navigation';
import './signup.css';
import { User, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function Signup() {
  const router = useRouter();
  const cardRef = useRef(null);

  // form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // ui state
  const [submitting, setSubmitting] = useState(false);
  const [shake, setShake] = useState(false);

  // motion / perf toggles
  const [fxEnabled, setFxEnabled] = useState(true);
  useEffect(() => {
    const isTouch =
      typeof window !== 'undefined' &&
      (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setFxEnabled(!(isTouch || prefersReduced));
  }, []);

  /* ------------ Zod field-level validation (live) ------------ */
  const nameCheck = SignupSchema.shape.fullName.safeParse(fullName);
  const emailCheck = SignupSchema.shape.email.safeParse(email.trim());
  const passCheck = SignupSchema.shape.password.safeParse(password);

  const canSubmit = nameCheck.success && emailCheck.success && passCheck.success && !submitting;

  // strength meter (unchanged)
  const { score, label, barClass } = getPasswordStrength(password);

  // tilt (skip on touch / reduced motion)
  const handleMove = (e) => {
    if (!fxEnabled) return;
    const card = cardRef.current;
    if (!card) return;
    if (e.target && e.target.closest('input, button, a, .no-tilt')) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width - 0.5;
    const py = y / rect.height - 0.5;
    const max = 10;
    const rx = -(py * max);
    const ry = px * max;
    card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  };
  const handleLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`;
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    // run full Zod parse (this also applies fullName transform)
    const parsed = SignupSchema.safeParse({
      fullName,
      email: email.trim(),
      password,
    });

    if (!parsed.success) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }

    // ready for backend: parsed.data has normalized fullName & trimmed email
    setSubmitting(true);
    try {
      // TODO: call your signup endpoint with parsed.data
      // await fetch('/api/signup', { method:'POST', body: JSON.stringify(parsed.data) })
      router.push('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex items-center justify-center min-h-screen bg-cover bg-center p-4 md:p-6"
      style={{
        backgroundImage: "url('/bgg.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* VenomBeams: lighter on mobile/reduced-motion */}
      <VenomBeams
        className="absolute inset-0 w-full h-full z-0"
        colors={['#2E5EAA', '#81B29A', '#4A8FE7']}
        density={fxEnabled ? 14 : 8}
        speed={fxEnabled ? 1.0 : 0.6}
        opacity={fxEnabled ? 0.7 : 0.5}
      />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.40, ease: "easeOut", delay: 0.05 }}
        className="w-full flex justify-center"
      >
        <motion.div
          className="tilt-container relative z-10 w-full max-w-md"
          animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
        >
          <div
            ref={cardRef}
            onMouseMove={handleMove}
            onMouseLeave={handleLeave}
            className="tilt-card bg-[#F8F9FA] shadow-lg rounded-xl overflow-hidden w-full p-6 md:p-8 transform-gpu will-change-transform [transform-style:preserve-3d]"
            style={{ minWidth: 300 }}
          >
            {/* Logo */}
            <div className="w-full h-28 md:h-32 rounded-lg mb-4 md:mb-6 flex items-center justify-center no-tilt">
              <Image src="/lOGO.svg" alt="logo" width={220} height={220} priority />
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-center mb-4 md:mb-6" style={{ color: '#2B2D42' }}>
              Create Account
            </h1>

            <form className="space-y-4 md:space-y-5" onSubmit={onSubmit} noValidate>
              {/* FULL NAME */}
              <div className="space-y-1">
                <div className="relative">
                  <User className="absolute left-3 inset-y-0 my-auto text-gray-400" size={18} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    className={`w-full h-12 pl-10 pr-4 rounded-lg border outline-none focus:outline-none focus:ring no-tilt
                      ${fullName.length === 0
                        ? 'border-gray-200 focus:ring-[#2E5EAA]'
                        : nameCheck.success
                          ? 'border-green-400 focus:ring-green-400'
                          : 'border-red-400 focus:ring-red-400'
                      }`}
                    autoComplete="name"
                  />
                </div>
                {!nameCheck.success && fullName.length > 0 && (
                  <p className="text-xs text-red-600">
                    {nameCheck.error?.issues?.[0]?.message || 'Full name is required'}
                  </p>
                )}
              </div>

              {/* EMAIL */}
              <div className="space-y-1">
                <div className="relative">
                  <Mail className="absolute left-3 inset-y-0 my-auto text-gray-400 pointer-events-none" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="@teacher.com"
                    className={`w-full h-12 pl-10 pr-4 rounded-lg border outline-none focus:outline-none focus:ring no-tilt
                      ${email.length === 0
                        ? 'border-gray-200 focus:ring-[#2E5EAA]'
                        : emailCheck.success
                          ? 'border-green-400 focus:ring-green-400'
                          : 'border-red-400 focus:ring-red-400'
                      }`}
                    inputMode="email"
                    autoComplete="email"
                  />
                </div>
                {!emailCheck.success && email.length > 0 && (
                  <p className="text-xs text-red-600">
                    {emailCheck.error?.issues?.[0]?.message || 'Enter a valid email address.'}
                  </p>
                )}
              </div>

              {/* PASSWORD + Strength Meter */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 inset-y-0 my-auto text-gray-400" size={18} />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (min 6 chars)"
                    className={`hide-native-reveal w-full h-12 pl-10 pr-12 rounded-lg border outline-none focus:outline-none focus:ring no-tilt
                      ${password.length === 0
                        ? 'border-gray-200 focus:ring-[#2E5EAA]'
                        : passCheck.success
                          ? 'border-green-400 focus:ring-green-400'
                          : 'border-red-400 focus:ring-red-400'
                      }`}
                    autoComplete="new-password"
                    inputMode="text"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 inset-y-0 my-auto grid place-items-center h-8 w-8 text-gray-600 hover:text-gray-800 no-tilt"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Strength bar (visual only) */}
                <div className="mt-2">
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${barClass}`}
                      style={{ width: `${(score / 4) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 text-xs text-gray-600">
                    {password.length === 0 ? 'Enter a password' : label}
                  </div>
                </div>

                {!passCheck.success && password.length > 0 && (
                  <p className="mt-1 text-xs text-red-600">
                    {passCheck.error?.issues?.[0]?.message || 'Password must be at least 6 characters.'}
                  </p>
                )}
              </div>

              {/* SUBMIT */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`signupbtn no-tilt ${!canSubmit ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {submitting ? '…' : 'Sign Up'}
                </button>
              </div>
            </form>

            <p className="mt-6 text-center text-sm">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-semibold hover:underline no-tilt">
                Login
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

/* unchanged */
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
    { label: 'Very weak', barClass: 'bg-red-400' },
    { label: 'Weak', barClass: 'bg-orange-400' },
    { label: 'Okay', barClass: 'bg-amber-400' },
    { label: 'Good', barClass: 'bg-lime-500' },
    { label: 'Strong', barClass: 'bg-green-500' },
  ];
  return { score, label: map[score].label, barClass: map[score].barClass };
}
