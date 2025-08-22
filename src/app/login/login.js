'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useRef, useState } from 'react';
import VenomBeams from '../_components/VenomBeams';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, AlertTriangle } from 'lucide-react';
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

  // validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 6;
  const canSubmit = emailValid && passwordValid && !submitting;

  // tilt (ignore when hovering form controls to avoid weirdness)
  const handleMove = (e) => {
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
    if (!emailValid || !passwordValid) {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    setSubmitting(true);
    try {
      // TODO: real auth here
      router.push('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative flex items-center justify-center min-h-screen bg-cover bg-center p-6"
      style={{
        backgroundImage: "url('/bgg.png')",
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Venom beams over the bg, under the card */}
      <VenomBeams
        className="absolute inset-0 w-full h-full z-0"
        colors={['#2E5EAA', '#81B29A', '#4A8FE7']}
        density={14}
        speed={1.0}
        opacity={0.7}
      />

      <motion.div
        className="tilt-container relative z-10 w-full max-w-md"
        animate={shake ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
      >
        <div
          ref={cardRef}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          className="tilt-card bg-[#F8F9FA] shadow-lg rounded-xl overflow-hidden p-8 transform-gpu will-change-transform [transform-style:preserve-3d] w-full"
          style={{ minWidth: 320 }}
        >
          {/* Logo */}
          <div className="w-full h-32 rounded-lg mb-4 flex items-center justify-center no-tilt">
            <Image src="/lOGO.svg" alt="logo" width={250} height={250} />
          </div>

          <h1 className="text-2xl font-bold text-center mb-6" style={{ color: '#2B2D42' }}>
            Faculty Login
          </h1>

          <form className="space-y-5" onSubmit={onSubmit} noValidate>
            {/* EMAIL */}
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.trim())}
                placeholder="Email"
                className={`w-full h-12 px-4 rounded-lg border outline-none focus:outline-none focus:ring no-tilt
                  ${
                    email.length === 0
                      ? 'border-gray-200 focus:ring-[#2E5EAA]'
                      : emailValid
                      ? 'border-green-400 focus:ring-green-400'
                      : 'border-red-400 focus:ring-red-400'
                  }`}
              />
              {email.length > 0 && !emailValid && (
                <p className="mt-1 text-xs text-red-600">Enter a valid email address.</p>
              )}
            </div>

            {/* PASSWORD */}
            <div className="relative">
              <input
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={updateCapsFromEvent}
                onKeyDown={updateCapsFromEvent}
                onFocus={updateCapsFromEvent}
                onBlur={() => setCapsOn(false)}
                placeholder="Password"
                className={`w-full h-12 pr-12 px-4 rounded-lg border outline-none focus:outline-none focus:ring no-tilt
                  ${
                    password.length === 0
                      ? 'border-gray-200 focus:ring-[#2E5EAA]'
                      : passwordValid
                      ? 'border-green-400 focus:ring-green-400'
                      : 'border-red-400 focus:ring-red-400'
                  }`}
                aria-invalid={!passwordValid && password.length > 0}
                aria-describedby="password-help"
              />

              {/* Caps lock hint */}
              <div
                className={`mt-1 flex items-center gap-1 text-xs transition-opacity ${
                  capsOn ? 'opacity-100' : 'opacity-0'
                }`}
                id="password-help"
              >
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="text-amber-600">Caps Lock is ON</span>
              </div>

              {password.length > 0 && !passwordValid && (
                <p className="mt-1 text-xs text-red-600">Password must be at least 6 characters.</p>
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

          <p className="mt-6 text-center text-sm" style={{ color: '#2B2D42' }}>
            Don’t have an account?{' '}
            <Link href="/signup" className="text-primary font-semibold hover:underline no-tilt">
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
