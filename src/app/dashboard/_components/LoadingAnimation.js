"use client";

import { motion } from "framer-motion";

export default function LoadingAnimation() {
  return (
    <div className="relative min-h-[70vh] grid place-items-center overflow-hidden">
      {/* Soft animated background blobs */}
      <motion.div
        className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#81B29A] opacity-30 blur-3xl"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-28 -right-28 h-72 w-72 rounded-full bg-[#2E5EAA] opacity-30 blur-3xl"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: 0.3, scale: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
      />

      {/* Center content */}
      <motion.div
        className="relative z-10 flex flex-col items-center text-center"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Spinner ring */}
        <div className="relative mb-5">
          <div className="h-14 w-14 rounded-full border-4 border-white/30 border-t-[#2E5EAA] animate-spin" />
          {/* Accent dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-[#2E5EAA]" />
          </div>
        </div>

        {/* Title + subtitle */}
        <h2 className="text-xl md:text-2xl font-semibold text-[#2B2D42]">
          Loading your{" "}
          <span className="bg-gradient-to-r from-[#2E5EAA] to-[#4A8FE7] bg-clip-text text-transparent">
            Inquizitive
          </span>{" "}
          dashboard…
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Fetching classes, quizzes, and performance insights.
        </p>

        {/* Skeletons (cards preview) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl bg-white p-5 shadow-sm animate-pulse">
              <div className="h-4 w-2/3 bg-gray-200 rounded mb-3" />
              <div className="h-3 w-1/3 bg-gray-200 rounded mb-5" />
              <div className="grid grid-cols-2 gap-3">
                <div className="h-10 bg-gray-200 rounded" />
                <div className="h-10 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
