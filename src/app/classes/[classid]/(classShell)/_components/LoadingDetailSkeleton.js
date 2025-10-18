'use client'
import SlideUp from "@/app/_components/SlideUp";

import { motion } from "framer-motion";

/** Small shimmer bar */
function Shimmer({ className = "" }) {
  return (
    <div className={`relative overflow-hidden rounded ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-black/5 via-black/10 to-black/5 animate-[shimmer_1.2s_infinite]"/>
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

export default function LoadingDetailSkeleton() {
  return (
    <div className="min-h-screen bg-[#F7FAFF]" role="status" aria-busy="true">
      {/* gradient header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#5C9BCF] via-[#8CB8E2] to-[#7FAF9D]">
        <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 py-5 text-white">
          <Shimmer className="h-6 w-64 bg-white/30 rounded-md mb-2" />
          <Shimmer className="h-4 w-40 bg-white/25 rounded-md" />
        </div>
      </div>

      {/* body */}
      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* meta cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-black/5 p-4">
            <Shimmer className="h-4 w-24 bg-black/10 mb-2" />
            <Shimmer className="h-6 w-20 bg-black/15" />
          </div>
          <div className="rounded-xl bg-white border border-black/5 p-4">
            <Shimmer className="h-4 w-28 bg-black/10 mb-2" />
            <Shimmer className="h-6 w-24 bg-black/15" />
          </div>
          <div className="rounded-xl bg-white border border-black/5 p-4">
            <Shimmer className="h-4 w-16 bg-black/10 mb-2" />
            <Shimmer className="h-6 w-28 bg-black/15" />
          </div>
        </div>

        {/* questions list */}
        <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-5 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pb-4 border-b last:border-0 last:pb-0 border-gray-100">
              <Shimmer className="h-4 w-3/4 bg-black/10 mb-3" />
              {/* choices row */}
              <div className="grid sm:grid-cols-2 gap-2">
                <Shimmer className="h-9 w-full bg-black/5 rounded-xl" />
                <Shimmer className="h-9 w-full bg-black/5 rounded-xl" />
                <Shimmer className="h-9 w-full bg-black/5 rounded-xl" />
                <Shimmer className="h-9 w-full bg-black/5 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

