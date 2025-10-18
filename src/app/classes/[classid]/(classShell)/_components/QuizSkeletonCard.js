"use client";
import { motion } from "framer-motion";

function Shimmer({ className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-black/10 to-black/5 animate-[shimmer_1.2s_infinite]" />
      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        div > div { background-size: 200% 100%; }
      `}</style>
    </div>
  );
}

/** One quiz card skeleton (matches your FancyClassCard-ish glass look) */
function QuizCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="relative h-[164px] sm:h-[186px] rounded-2xl overflow-hidden shadow-sm"
      style={{
        background: "linear-gradient(135deg, #5FAF98 0%, #6FC1A8 45%, #A0D9C3 100%)",
      }}
      aria-hidden
    >
      {/* sheen */}
      <motion.div
        initial={{ x: "-120%" }}
        animate={{ x: "120%" }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
        className="pointer-events-none absolute -inset-y-12 -left-1/3 w-1/3 rotate-12 bg-white/15 blur-2xl"
      />

      <div className="relative p-5 md:p-6 text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 w-full max-w-[72%]">
            <Shimmer className="h-5 w-3/4 bg-white/40" />
            <div className="flex items-center gap-2">
              <Shimmer className="h-6 w-24 bg-white/30" />
              <Shimmer className="h-6 w-20 bg-white/30" />
              <Shimmer className="h-6 w-16 bg-white/30" />
            </div>
          </div>
          <div className="hidden sm:block">
            <div className="rounded-full bg-white/90 px-3 py-1.5 text-[#0e3c2e] shadow-sm">
              <Shimmer className="h-4 w-12 bg-black/10" />
            </div>
          </div>
        </div>

        <div className="my-5 h-px bg-white/25" />
        <Shimmer className="h-4 w-44 bg-white/30" />
      </div>

      <div className="absolute bottom-4 right-4 bg-white/30 p-2 rounded-full">
        <Shimmer className="h-4 w-4 bg-black/10 rounded-full" />
      </div>
    </motion.div>
  );
}

/** Grid skeleton for the list page */
export default function QuizSkeletonCard({ rows = 6 }) {
  return (
    <div className="mx-auto max-w-4xl px-6 pb-28 space-y-8" role="status" aria-busy="true">
      {/* section header shimmer */}
      <div className="mb-2">
        <div className="mx-auto max-w-4xl">
          <Shimmer className="h-8 w-56 bg-[#2E5EAA]/15 rounded-md mb-2" />
          <Shimmer className="h-4 w-80 bg-[#2E5EAA]/10 rounded-md" />
        </div>
      </div>

      {Array.from({ length: rows }).map((_, i) => (
        <QuizCardSkeleton key={i} />
      ))}
    </div>
  );
}
