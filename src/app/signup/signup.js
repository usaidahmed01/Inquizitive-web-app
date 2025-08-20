
'use client'

import Link from "next/link";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import './signup.css'
import VenomBeams from "../_components/VenomBeams";

export default function Signup() {
  const cardRef = useRef(null);

  const handleMove = (e) => {
    const card = cardRef.current;
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;      // mouse X within card
    const y = e.clientY - rect.top;       // mouse Y within card
    const px = (x / rect.width) - 0.5;    // -0.5 .. 0.5
    const py = (y / rect.height) - 0.5;   // -0.5 .. 0.5

    const max = 10; // max tilt in degrees
    const rx = -(py * max);
    const ry = (px * max);

    card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(0)`;
  };

  const handleLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = `rotateX(0deg) rotateY(0deg) translateZ(0)`;
  };

  return (
    <div
      className="relative flex items-center justify-center min-h-screen bg-cover bg-center p-6"
      style={{
        backgroundImage: "url('/bgg.png')",
        backgroundRepeat: "no-repeat",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >

      <VenomBeams
        className="absolute inset-0 w-full h-full z-0 "
        colors={["#2E5EAA", "#81B29A", "#4A8FE7"]}
        density={14}
        speed={1.0}
        opacity={0.7}
      />

      <motion.div
        className="tilt-container relative z-10"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <div
          ref={cardRef}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
          className="tilt-card bg-white shadow-lg rounded-xl w-full max-w-md bg-[#F8F9FA] p-8"
        >
          {/* Logo */}
          <div className="w-full h-32 rounded-lg mb-6 flex items-center justify-center">
            <Image src="/lOGO.svg" alt="logo" width={250} height={250} />
          </div>

          <h1 className="text-2xl font-bold text-center mb-6" style={{ color: "#2B2D42" }}>
            Faculty Login
          </h1>

          <form className="space-y-5">
            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
            />
            <input
              type="email"
              placeholder="Email"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary outline-none"
            />
            <div className="flex justify-center">
              <Link href="/dashboard" className="w-full md:w-auto">
                <button
                  type="submit"
                  className="signupbtn"
                // className="bg-[#2E5EAA] text-white hover:bg-[#264d8b] px-8 py-3 rounded-lg font-semibold transition-all"
                >
                  Sign Up
                </button>
              </Link>
            </div>
          </form>

          <p className="mt-6 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Login
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
