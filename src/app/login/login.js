// 'use client';

// import { LoginSchema } from '@/schemas/auth';
// import Link from 'next/link';
// import { motion } from 'framer-motion';
// import Image from 'next/image';
// import { useRef, useState } from 'react';
// import VenomBeams from '../_components/VenomBeams';
// import { useRouter } from 'next/navigation';
// import { Eye, EyeOff, AlertTriangle, Mail, Lock } from 'lucide-react';
// import './login.css';

// export default function LoginPage() {
//   const router = useRouter();
//   const cardRef = useRef(null);

//   // form state
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   // UI state
//   const [shake, setShake] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [capsOn, setCapsOn] = useState(false);

//   // validation
//   const parsed = LoginSchema.safeParse({ email, password });
//   const canSubmit = parsed.success && !submitting;

//   const emailValid = email ? LoginSchema.shape.email.safeParse(email).success : false;
//   const passwordValid = password ? LoginSchema.shape.password.safeParse(password).success : false;

//   // tilt (ignore when hovering form controls to avoid weirdness)
//   const handleMove = (e) => {
//     const card = cardRef.current;
//     if (!card) return;

//     const target = e.target;
//     if (target && target.closest('input, button, a, .no-tilt')) return;

//     const rect = card.getBoundingClientRect();
//     const x = e.clientX - rect.left;
//     const y = e.clientY - rect.top;
//     const px = x / rect.width - 0.5;
//     const py = y / rect.height - 0.5;
//     const max = 10;
//     const rx = -(py * max);
//     const ry = px * max;
//     card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
//   };

//   const handleLeave = () => {
//     const card = cardRef.current;
//     if (!card) return;
//     card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`;
//   };

//   // caps lock detector (for password field)
//   const updateCapsFromEvent = (e) => {
//     const getMod =
//       e && typeof e.getModifierState === 'function'
//         ? e.getModifierState('CapsLock')
//         : false;
//     setCapsOn(!!getMod);
//   };

//   // submit
//   const onSubmit = (e) => {
//     e.preventDefault();
//     const r = LoginSchema.safeParse({ email, password });
//     if (!r.success) return setShake(true), setTimeout(() => setShake(false), 450);
//     // TODO: backend login with r.data
//     router.push("/dashboard");
//   };

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
//       {/* Venom beams over the bg, under the card */}
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
//             className="tilt-card bg-[#F8F9FA] shadow-lg rounded-xl overflow-hidden p-8 transform-gpu will-change-transform [transform-style:preserve-3d] w-full"
//             style={{ minWidth: 320 }}
//           >
//             {/* Logo */}
//             <div className="w-full h-32 rounded-lg mb-4 flex items-center justify-center no-tilt">
//               <Image src="/lOGO.svg" alt="logo" width={250} height={250} />
//             </div>

//             <h1 className="text-2xl font-bold text-center mb-6" style={{ color: '#2B2D42' }}>
//               Faculty Login
//             </h1>

//             <form className="space-y-5" onSubmit={onSubmit} noValidate>
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

//               {/* PASSWORD */}
//               <div className="space-y-1">
//                 {/* input + icons only (relative wrapper) */}
//                 <div className="relative">
//                   {/* Left lock icon */}
//                   <Lock
//                     className="absolute left-3 inset-y-0 my-auto text-gray-400 pointer-events-none"
//                     size={18}
//                   />

//                   <input
//                     type="password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     onKeyUp={updateCapsFromEvent}
//                     onKeyDown={updateCapsFromEvent}
//                     onFocus={updateCapsFromEvent}
//                     onBlur={() => setCapsOn(false)}
//                     placeholder="●●●●●●"
//                     className={`w-full h-12 pl-10 pr-12 rounded-lg border outline-none focus:outline-none focus:ring no-tilt
//         ${password.length === 0
//                         ? "border-gray-200 focus:ring-[#2E5EAA]"
//                         : passwordValid
//                           ? "border-green-400 focus:ring-green-400"
//                           : "border-red-400 focus:ring-red-400"
//                       }`}
//                     aria-invalid={!passwordValid && password.length > 0}
//                     aria-describedby="password-help"
//                   />
//                 </div>

//                 {/* Caps lock hint lives OUTSIDE, so it doesn't affect icon centering */}
//                 <div
//                   className={`flex items-center gap-1 text-xs transition-opacity ${capsOn ? "opacity-100" : "opacity-0"
//                     }`}
//                   id="password-help"
//                 >
//                   <AlertTriangle size={14} className="text-amber-500" />
//                   <span className="text-amber-600">Caps Lock is ON</span>
//                 </div>

//                 {password.length > 0 && !passwordValid && (
//                   <p className="text-xs text-red-600">Password must be at least 6 characters.</p>
//                 )}
//               </div>

//               {/* SUBMIT */}
//               <div className="flex justify-center">
//                 <button
//                   type="submit"
//                   disabled={!canSubmit}
//                   className={`loginbtn select-none ${!canSubmit ? 'opacity-60 cursor-not-allowed' : ''} no-tilt`}
//                 >
//                   {submitting ? '…' : 'Login'}
//                 </button>
//               </div>
//             </form>

//             <p className="mt-6 text-center text-sm" style={{ color: '#2B2D42' }}>
//               Don’t have an account?{' '}
//               <Link href="/signup" className="text-primary font-semibold hover:underline no-tilt">
//                 Sign Up
//               </Link>
//             </p>
//           </div>
//         </motion.div>
//       </motion.div >
//     </div>
//   );
// }

































'use client';

import { LoginSchema } from '@/schemas/auth';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import VenomBeams from '../_components/VenomBeams';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertTriangle, Mail, Lock, User } from 'lucide-react';
import './login.css';

export default function LoginPage() {
  const router = useRouter();
  const cardRef = useRef(null);

  // form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI state
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // responsive flags
  const [isTouch, setIsTouch] = useState(false);
  const [isSmall, setIsSmall] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setIsTouch(touch);
    const mqSmall = window.matchMedia('(max-width: 640px)');
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsSmall(mqSmall.matches);
    setPrefersReduced(mqReduce.matches);

    const onSmall = (e) => setIsSmall(e.matches);
    const onReduce = (e) => setPrefersReduced(e.matches);
    mqSmall.addEventListener?.('change', onSmall);
    mqReduce.addEventListener?.('change', onReduce);
    return () => {
      mqSmall.removeEventListener?.('change', onSmall);
      mqReduce.removeEventListener?.('change', onReduce);
    };
  }, []);

  // zod validation (live)
  const parsed = LoginSchema.safeParse({ email, password });
  const canSubmit = parsed.success && !submitting;
  const emailValid = email ? LoginSchema.shape.email.safeParse(email).success : false;
  const passwordValid = password ? LoginSchema.shape.password.safeParse(password).success : false;

  // tilt (disabled on touch or reduced motion)
  const tiltEnabled = !isTouch && !prefersReduced;

  const handleMove = (e) => {
    if (!tiltEnabled) return;
    const card = cardRef.current;
    if (!card) return;

    const target = e.target;
    if (target && target.closest('input, button, a, .no-tilt')) return;

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
    if (!tiltEnabled) return;
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`;
  };

  // caps lock detector (for password field)
  const updateCapsFromEvent = (e) => {
    const getMod =
      e && typeof e.getModifierState === 'function'
        ? e.getModifierState('CapsLock')
        : false;
    setCapsOn(!!getMod);
  };

  // submit
  const onSubmit = async (e) => {
    e.preventDefault();
    const r = LoginSchema.safeParse({ email, password });
    if (!r.success) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    setSubmitting(true);
    try {
      // TODO: backend auth with r.data
      router.push('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex items-center justify-center min-h-screen bg-cover bg-center p-4 sm:p-6"
      style={{
        backgroundImage: "url('/bgg.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Venom beams (lighter on phones) */}
      <VenomBeams
        className="absolute inset-0 w-full h-full z-0"
        colors={['#2E5EAA', '#81B29A', '#4A8FE7']}
        density={isSmall ? 6 : 14}
        speed={isSmall ? 0.6 : 1.0}
        opacity={isSmall ? 0.45 : 0.7}
      />

      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.40, ease: 'easeOut', delay: 0.05 }}
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
            className={`tilt-card bg-[#F8F9FA] rounded-xl overflow-hidden transform-gpu will-change-transform [transform-style:preserve-3d] w-full
              ${isSmall ? 'p-6 shadow-md' : 'p-8 shadow-lg'}`}
            style={{ minWidth: 320 }}
          >
            {/* Logo */}
            <div className="w-full h-24 sm:h-32 rounded-lg mb-4 flex items-center justify-center no-tilt">
              <Image src="/lOGO.svg" alt="logo" width={isSmall ? 200 : 250} height={isSmall ? 200 : 250} />
            </div>

            {/* Heading with person icon */}
            <div className="flex items-center justify-center gap-2 mb-5 sm:mb-6">
              <div className="h-9 w-9 rounded-lg bg-[#2E5EAA]/10 text-[#2E5EAA] grid place-items-center">
                <User size={18} />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: '#2B2D42' }}>
                Faculty Login
              </h1>
            </div>

            <form className="space-y-4 sm:space-y-5" onSubmit={onSubmit} noValidate>
              {/* EMAIL */}
              <div className="space-y-1">
                <div className="relative">
                  <Mail
                    className="absolute left-3 inset-y-0 my-auto text-gray-400 pointer-events-none"
                    size={18}
                  />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    placeholder="@teacher.com"
                    inputMode="email"
                    autoComplete="email"
                    className={`w-full h-12 pl-10 pr-4 rounded-lg border outline-none focus:outline-none focus:ring no-tilt text-base
                      ${email.length === 0
                        ? 'border-gray-200 focus:ring-[#2E5EAA]'
                        : emailValid
                          ? 'border-green-400 focus:ring-green-400'
                          : 'border-red-400 focus:ring-red-400'
                      }`}
                  />
                </div>
                {email.length > 0 && !emailValid && (
                  <p className="text-xs text-red-600">Enter a valid email address.</p>
                )}
              </div>

              {/* PASSWORD */}
              <div className="space-y-1">
                <div className="relative">
                  <Lock
                    className="absolute left-3 inset-y-0 my-auto text-gray-400 pointer-events-none"
                    size={18}
                  />
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={updateCapsFromEvent}
                    onKeyDown={updateCapsFromEvent}
                    onFocus={updateCapsFromEvent}
                    onBlur={() => setCapsOn(false)}
                    placeholder="●●●●●●"
                    autoComplete="current-password"
                    className={`hide-native-reveal w-full h-12 pl-10 pr-12 rounded-lg border outline-none focus:outline-none focus:ring no-tilt text-base
                      ${password.length === 0
                        ? 'border-gray-200 focus:ring-[#2E5EAA]'
                        : passwordValid
                          ? 'border-green-400 focus:ring-green-400'
                          : 'border-red-400 focus:ring-red-400'
                      }`}
                    aria-invalid={!passwordValid && password.length > 0}
                    aria-describedby="password-help"
                  />
                  {/* show/hide toggle */}
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 inset-y-0 my-auto h-8 w-8 grid place-items-center text-gray-500 hover:text-gray-700 no-tilt"
                    tabIndex={-1}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <div
                  className={`flex items-center gap-1 text-xs transition-opacity ${capsOn ? 'opacity-100' : 'opacity-0'}`}
                  id="password-help"
                >
                  <AlertTriangle size={14} className="text-amber-500" />
                  <span className="text-amber-600">Caps Lock is ON</span>
                </div>

                {password.length > 0 && !passwordValid && (
                  <p className="text-xs text-red-600">Password must be at least 6 characters.</p>
                )}
              </div>

              {/* SUBMIT */}
              <div className="flex justify-center">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className={`loginbtn select-none ${!canSubmit ? 'opacity-60 cursor-not-allowed' : ''} no-tilt`}
                >
                  {submitting ? '…' : 'Login'}
                </button>
              </div>
            </form>

            <p className="mt-5 sm:mt-6 text-center text-sm" style={{ color: '#2B2D42' }}>
              Don’t have an account?{' '}
              <Link href="/signup" className="text-primary font-semibold hover:underline no-tilt">
                Sign Up
              </Link>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

