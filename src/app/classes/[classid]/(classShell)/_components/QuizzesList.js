"use client";

/**
 * QuizzesList
 * Lists generated quizzes for a given class from localStorage.
 * - Reads index: `inquiz_idx_${classid}` (array of quiz summaries).
 * - Cards link to: /classes/[classid]/quiz/[id]
 *
 * NOTE: Business logic unchanged. This is readability + a11y polish only.
 * TODO: put you db here later if you replace localStorage with a backend.
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import TiltedCard from "./TiltedCard";

/* ---------------- Badge + Type Helpers ---------------- */

/**
 * getQuizType — normalizes type-ish fields to a small label set.
 * Accepts multiple possible keys without changing semantics.
 */
function getQuizType(q) {
  const raw =
    (q?.type ?? q?.quizType ?? q?.meta?.type ?? q?.details?.type ?? "")
      .toString()
      .trim();

  if (!raw) return "Unknown";
  const t = raw.toLowerCase();
  if (t.startsWith("mcq")) return "MCQ";
  if (t.startsWith("short")) return "Short";
  if (t.startsWith("mix")) return "Mixed";
  return raw; // fallback to original
}

/** Small colored pill for quiz type. */
function QuizTypeBadge({ type, className = "" }) {
  const label = (type || "Unknown").trim();
  const map = {
    MCQ: "bg-blue-100 text-blue-600 border-blue-200",
    Short: "bg-amber-100 text-amber-600 border-amber-200",
    Mixed: "bg-purple-100 text-purple-600 border-purple-200",
    Unknown: "bg-gray-100 text-gray-600 border-gray-200",
  };
  const style = map[label] || map.Unknown;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${style} ${className}`}
    >
      {label}
    </span>
  );
}

/* ---------------- Skeleton Card with Glass Shimmer ---------------- */

function QuizSkeletonCard() {
  return (
    <div
      className="relative h-[260px] overflow-hidden rounded-[18px] border border-gray-200 bg-white/40 shadow-sm backdrop-blur-md"
      aria-hidden="true"
    >
      <GlassShimmer />
      <div className="relative z-10 space-y-3 p-6">
        <div className="h-5 w-1/2 rounded bg-gray-200" />
        <div className="h-4 w-1/3 rounded bg-gray-200" />
        <div className="mt-6 space-y-2">
          <div className="h-3 w-3/4 rounded bg-gray-200" />
          <div className="h-3 w-2/3 rounded bg-gray-200" />
          <div className="h-3 w-1/2 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

function GlassShimmer() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* frosted overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-white/10 backdrop-blur-sm" />
      {/* moving shine */}
      <div className="animate-[glassmove_2s_infinite] absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <style jsx>{`
        @keyframes glassmove {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

/* ---------------- Card Gradient Covers ---------------- */

const CARD_GRADIENTS = [
  ["#2B7A78", "#3AAFA9", "#7ED0B6"],
  ["#4A90E2", "#6CC1FF", "#A3D8FF"],
  ["#06beb6", "#48b1bf", "#1e3c72"],
  ["#5ABF90", "#81C784", "#A8E6CF"],
];

/**
 * buildCover — returns a data:URL SVG with a diagonal line pattern + gradient.
 * Purely visual; no logic or data changes.
 */
function buildCover(gradient) {
  const [c1, c2, c3] = gradient;
  return (
    "data:image/svg+xml;utf8," +
    encodeURIComponent(`
      <svg xmlns='http://www.w3.org/2000/svg' width='1600' height='900'>
        <defs>
          <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
            <stop offset='0%' stop-color='${c1}'/>
            <stop offset='50%' stop-color='${c2}'/>
            <stop offset='100%' stop-color='${c3}'/>
          </linearGradient>
          <pattern id='d' width='44' height='44' patternUnits='userSpaceOnUse' patternTransform='rotate(35)'>
            <path d='M0 0 L0 44' stroke='rgba(255,255,255,0.18)' stroke-width='6'/>
          </pattern>
        </defs>
        <rect width='100%' height='100%' fill='url(#g)'/>
        <rect width='100%' height='100%' fill='url(#d)'/>
      </svg>
    `)
  );
}

/* ---------------- Main Component ---------------- */

export default function QuizzesList() {
  const { classid } = useParams();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load quizzes from localStorage index for this class
  useEffect(() => {
    try {
      setLoading(true);
      const idxKey = `inquiz_idx_${classid}`;
      const arr = JSON.parse(localStorage.getItem(idxKey) || "[]");
      setQuizzes(Array.isArray(arr) ? arr : []);
    } catch {
      setQuizzes([]);
    } finally {
      setLoading(false);
    }
  }, [classid]);

  return (
    <div className="space-y-6 py-8">
      {/* header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#2B2D42]">
            Quizzes
          </h2>
          <p className="mt-1 text-gray-600">
            Browse generated quizzes for this class. Click any quiz to view details.
          </p>
        </div>

        <Link
          href={`/classes/${classid}/quiz/generate`}
          className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7A78] via-[#3AAFA9] to-[#7ED0B6] px-5 py-3 text-sm font-semibold text-white transition-all duration-300 hover:shadow-lg sm:text-base"
          title="Create a new quiz"
        >
          <span className="pointer-events-none absolute -left-10 top-0 h-full w-10 translate-x-0 rotate-12 bg-white/30 opacity-0 transition-all duration-700 group-hover:translate-x-[220%] group-hover:opacity-100" />
          <Plus size={18} aria-hidden="true" />
          <span className="hidden sm:inline">New Quiz</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {/* list area */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <QuizSkeletonCard key={i} />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyState classid={classid} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {quizzes.map((q, i) => (
            <QuizTiltCard key={q.id ?? i} q={q} index={i} classid={classid} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Quiz Card ---------------- */

/**
 * Visual card showing title, type, count, duration, and createdAt.
 * Uses the `TiltedCard` component for the hover tilt effect.
 */
function QuizTiltCard({ q, classid, index, delay = 0 }) {
  const displayTitle = q.title && q.title.trim() ? q.title : `Quiz ${index + 1}`;
  const cover = buildCover(CARD_GRADIENTS[index % CARD_GRADIENTS.length]);
  const quizType = getQuizType(q);

  // show count using known keys (don’t invent new ones)
  const count = Number.isFinite(q?.count) ? q.count : q?.totalQuestions ?? "—";

  return (
    <Link href={`/classes/${classid}/quiz/${q.id}`} className="block" title={displayTitle}>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ duration: 0.35, ease: "easeOut", delay }}
        className="rounded-[18px] shadow-sm transition-shadow hover:shadow-xl"
      >
        <TiltedCard
          imageSrc={cover}
          altText={`${displayTitle} cover`}
          containerHeight="260px"
          containerWidth="100%"
          imageHeight="260px"
          imageWidth="100%"
          rotateAmplitude={10}
          scaleOnHover={1.04}
          showMobileWarning={false}
          showTooltip={false}
          displayOverlayContent={true}
          overlayContent={
            <div className="relative h-full w-full overflow-hidden rounded-[15px]">
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-black/5 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="rounded-xl border-0 bg-white p-4 shadow-none ring-0">
                  {/* Title + Badge */}
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-[#1F2937]">
                      {displayTitle}
                    </h3>
                    <QuizTypeBadge type={quizType} />
                  </div>

                  {/* Meta row */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-700">
                    <span className="inline-flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" className="-mt-px" aria-hidden="true">
                        <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
                      </svg>
                      {count} {count === 1 ? "question" : "questions"}
                    </span>

                    {q.durationMin ? (
                      <span className="inline-flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" className="-mt-px" aria-hidden="true">
                          <path fill="currentColor" d="M12 20a8 8 0 1 0 0-16a8 8 0 0 0 0 16m.5-12v4.25l3 1.75l-.75 1.23L11 12V8z" />
                        </svg>
                        {q.durationMin} min
                      </span>
                    ) : null}

                    {q.createdAt && (
                      <span className="inline-flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" className="-mt-px" aria-hidden="true">
                          <path fill="currentColor" d="M12 20a8 8 0 1 0 0-16a8 8 0 0 0 0 16" />
                        </svg>
                        {new Date(q.createdAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          }
        />
      </motion.div>
    </Link>
  );
}

/* ---------------- Empty State ---------------- */

function EmptyState({ classid }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white p-10 shadow-sm">
      {/* soft blobs */}
      <motion.div
        aria-hidden="true"
        className="absolute -top-20 -right-16 h-80 w-80 rounded-full bg-[#3AAFA9]/10 blur-3xl"
        animate={{ y: [0, -10, 0], x: [0, 14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-[#2B7A78]/10 blur-3xl"
        animate={{ y: [0, 12, 0], x: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          className="select-none text-6xl md:text-7xl"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden="true"
        >
          😞
        </motion.div>

        <h3 className="mt-4 text-xl font-semibold text-[#2B2D42]">No quizzes yet</h3>
        <p className="mt-1 text-gray-600">Generate your first quiz to see it here.</p>

        <Link
          href={`/classes/${classid}/quiz/generate`}
          className="group relative mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#2B7A78] via-[#3AAFA9] to-[#7ED0B6] px-5 py-3 font-semibold text-white transition-all duration-300 hover:shadow-xl"
        >
          <span className="pointer-events-none absolute -left-10 top-0 h-full w-10 translate-x-0 rotate-12 bg-white/30 opacity-0 transition-all duration-700 group-hover:translate-x-[220%] group-hover:opacity-100" />
          <Plus size={18} aria-hidden="true" />
          <span>Generate Quiz</span>
        </Link>
      </div>
    </div>
  );
}
