"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import TiltedCard from "./TiltedCard";

/* ---------------- Badge + Type Helpers ---------------- */
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
  return raw;
}

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
    <div className="relative overflow-hidden rounded-[18px] bg-white/40 backdrop-blur-md border border-gray-200 shadow-sm h-[260px]">
      <GlassShimmer />
      <div className="p-6 space-y-3 relative z-10">
        <div className="h-5 w-1/2 bg-gray-200 rounded" />
        <div className="h-4 w-1/3 bg-gray-200 rounded" />
        <div className="mt-6 space-y-2">
          <div className="h-3 w-3/4 bg-gray-200 rounded" />
          <div className="h-3 w-2/3 bg-gray-200 rounded" />
          <div className="h-3 w-1/2 bg-gray-200 rounded" />
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
      <div className="absolute inset-0 -translate-x-full animate-[glassmove_2s_infinite] bg-gradient-to-r from-transparent via-white/30 to-transparent" />
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
          <p className="text-gray-600 mt-1">
            Browse generated quizzes for this class. Click any quiz to view details.
          </p>
        </div>

        <Link
          href={`/classes/${classid}/quiz/generate`}
          className="group relative inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white 
             bg-gradient-to-r from-[#2B7A78] via-[#3AAFA9] to-[#7ED0B6]
             hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
          title="Create a new quiz"
        >
          <span className="pointer-events-none absolute -left-10 top-0 h-full w-10 rotate-12 bg-white/30 
                   opacity-0 group-hover:opacity-100 translate-x-0 
                   group-hover:translate-x-[220%] transition-all duration-700" />
          <Plus size={18} />
          <span className="hidden sm:inline">New Quiz</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {/* list area */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <QuizSkeletonCard key={i} />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <EmptyState classid={classid} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {quizzes.map((q, i) => (
            <QuizTiltCard key={q.id} q={q} index={i} classid={classid} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Quiz Card ---------------- */
function QuizTiltCard({ q, classid, index, delay = 0 }) {
  const displayTitle = q.title && q.title.trim() ? q.title : `Quiz ${index + 1}`;
  const cover = buildCover(CARD_GRADIENTS[index % CARD_GRADIENTS.length]);
  const quizType = getQuizType(q);
  const count = Number.isFinite(q?.count) ? q.count : q?.totalQuestions ?? "—";

  return (
    <Link href={`/classes/${classid}/quiz/${q.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ duration: 0.35, ease: "easeOut", delay }}
        className="transition-shadow rounded-[18px] shadow-sm hover:shadow-xl"
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
            <div className="relative h-full w-full rounded-[15px] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-black/5 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="bg-white rounded-xl p-4 shadow-none ring-0 border-0">
                  {/* Title + Badge */}
                  <div className="flex items-center gap-2">
                    <h3 className="text-[#1F2937] font-semibold truncate">
                      {displayTitle}
                    </h3>
                    <QuizTypeBadge type={quizType} />
                  </div>

                  {/* Meta row */}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-700">
                    <span className="inline-flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" className="-mt-px">
                        <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
                      </svg>
                      {count} {count === 1 ? "question" : "questions"}
                    </span>
                    {q.durationMin ? (
                      <span className="inline-flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" className="-mt-px">
                          <path fill="currentColor" d="M12 20a8 8 0 1 0 0-16a8 8 0 0 0 0 16m.5-12v4.25l3 1.75l-.75 1.23L11 12V8z" />
                        </svg>
                        {q.durationMin} min
                      </span>
                    ) : null}
                    {q.createdAt && (
                      <span className="inline-flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" className="-mt-px">
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
    <div className="relative overflow-hidden rounded-2xl bg-white border border-black/5 shadow-sm p-10">
      <motion.div
        aria-hidden
        className="absolute -top-20 -right-16 w-80 h-80 rounded-full bg-[#3AAFA9]/10 blur-3xl"
        animate={{ y: [0, -10, 0], x: [0, 14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-[#2B7A78]/10 blur-3xl"
        animate={{ y: [0, 12, 0], x: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          className="text-6xl md:text-7xl select-none"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          😞
        </motion.div>
        <h3 className="mt-4 text-xl font-semibold text-[#2B2D42]">No quizzes yet</h3>
        <p className="text-gray-600 mt-1">Generate your first quiz to see it here.</p>
        <Link
          href={`/classes/${classid}/quiz/generate`}
          className="group relative inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl font-semibold text-white 
                     bg-gradient-to-r from-[#2B7A78] via-[#3AAFA9] to-[#7ED0B6]
                     hover:shadow-xl transition-all duration-300"
        >
          <span className="pointer-events-none absolute -left-10 top-0 h-full w-10 rotate-12 bg-white/30 opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-[220%] transition-all duration-700" />
          <Plus size={18} />
          <span>Generate Quiz</span>
        </Link>
      </div>
    </div>
  );
}
