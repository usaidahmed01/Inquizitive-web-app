'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { useRef, useState } from 'react'
import VenomBeams from '../_components/VenomBeams'
import { useRouter } from 'next/navigation'
import './signup.css'

export default function Signup() {
  const router = useRouter()
  const cardRef = useRef(null)

  // form state
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // ui state
  const [submitting, setSubmitting] = useState(false)
  const [shake, setShake] = useState(false)

  // validation
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const passwordValid = password.length >= 6
  const canSubmit = emailValid && passwordValid && !submitting

  // ---- Password strength (0..4) ----
  const { score, label, barClass } = getPasswordStrength(password)

  // tilt (ignore when interacting with inputs/buttons/links)
  const handleMove = (e) => {
    const card = cardRef.current
    if (!card) return
    if (e.target && e.target.closest('input, button, a, .no-tilt')) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const px = x / rect.width - 0.5
    const py = y / rect.height - 0.5
    const max = 10
    const rx = -(py * max)
    const ry = px * max
    card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`
  }
  const handleLeave = () => {
    const card = cardRef.current
    if (!card) return
    card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) {
      setShake(true)
      setTimeout(() => setShake(false), 450)
      return
    }
    setSubmitting(true)
    try {
      // TODO: real signup
      router.push('/dashboard')
    } finally {
      setSubmitting(false)
    }
  }

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
          className="tilt-card bg-white shadow-lg rounded-xl w-full bg-[#F8F9FA] p-8 overflow-hidden transform-gpu will-change-transform [transform-style:preserve-3d]"
          style={{ minWidth: 320 }}
        >
          {/* Logo */}
          <div className="w-full h-32 rounded-lg mb-6 flex items-center justify-center no-tilt">
            <Image src="/lOGO.svg" alt="logo" width={250} height={250} />
          </div>

          <h1 className="text-2xl font-bold text-center mb-6" style={{ color: '#2B2D42' }}>
            Create Account
          </h1>

          <form className="space-y-5" onSubmit={onSubmit} noValidate>
            {/* FULL NAME */}
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full Name"
              className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2E5EAA] outline-none no-tilt"
            />

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

            {/* PASSWORD + Strength Meter */}
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                className={`w-full h-12 px-4 rounded-lg border outline-none focus:outline-none focus:ring no-tilt
                  ${
                    password.length === 0
                      ? 'border-gray-200 focus:ring-[#2E5EAA]'
                      : passwordValid
                      ? 'border-green-400 focus:ring-green-400'
                      : 'border-red-400 focus:ring-red-400'
                  }`}
              />

              {/* Strength bar */}
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

              {password.length > 0 && !passwordValid && (
                <p className="mt-1 text-xs text-red-600">Password must be at least 6 characters.</p>
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
    </div>
  )
}

function getPasswordStrength(pw) {
  // Categories
  const hasLower = /[a-z]/.test(pw);
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /\d/.test(pw);
  const hasSymbol = /[^A-Za-z0-9]/.test(pw);

  const length = pw.length;
  const categories = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  // Medium-friendly thresholds:
  // 0  Very weak      (empty or <6)
  // 1  Weak           (>=6, 1 category)
  // 2  Okay           (>=6, 2 categories) OR (>=8, 1 category)
  // 3  Good           (>=8, 2+ categories) OR (>=10, 2 categories)
  // 4  Strong         (>=10, 3+ categories) OR (>=12, 2+ categories)
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

  // Light penalty for very common starts
  if (/^(123456|password|qwerty|111111|letmein)/i.test(pw)) {
    score = Math.max(0, score - 1);
  }

  const map = [
    { label: 'Very weak', barClass: 'bg-red-400' },
    { label: 'Weak',      barClass: 'bg-orange-400' },
    { label: 'Okay',      barClass: 'bg-amber-400' },
    { label: 'Good',      barClass: 'bg-lime-500' },
    { label: 'Strong',    barClass: 'bg-green-500' },
  ];

  return { score, label: map[score].label, barClass: map[score].barClass };
}
