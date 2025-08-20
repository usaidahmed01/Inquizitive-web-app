'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, ListChecks, Clock } from 'lucide-react';
import TiltedCard from './TiltedCard'; // <- your existing component (unchanged)

// toggle showing created time on the card
const SHOW_TIME = true;

// Rotate through teal, blue, purple, coral
const CARD_GRADIENTS = [
  ['#2B7A78', '#3AAFA9', '#7ED0B6'],  // teal
  ['#4A90E2', '#6CC1FF', '#A3D8FF'],  // blue
  ['#A18CD1', '#FBC2EB', '#EAD9FF'],  // purple/pink
  ['#F78CA0', '#F9748F', '#FD868C'],  // coral
];

// Build SVG data URL for a gradient
function buildCover(gradient) {
  const [c1, c2, c3] = gradient;
  return (
    'data:image/svg+xml;utf8,' +
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


export default function QuizzesList() {
  const { classId } = useParams();

  // TODO: replace with real data once API/db is ready
  const quizzes = [
    { id: 'q1', title: '', count: 10, createdAt: new Date().toISOString() },
    { id: 'q2', title: '', count: 10, createdAt: new Date().toISOString() },
    { id: 'q3', title: '', count: 10, createdAt: new Date().toISOString() },
    { id: 'q4', title: 'Midterm MCQ', count: 12, createdAt: new Date().toISOString() },
  ];
  // const quizzes = []; // <- uncomment to preview empty state

  return (
    <div className="space-y-6 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#2B2D42]">Quizzes</h2>
          <p className="text-gray-600 mt-1">
            Browse generated quizzes for this class. Click any quiz to view details.
          </p>
        </div>

        <Link
          href={`/classes/${classId}/quiz/generate`}
          className="group relative inline-flex items-center gap-2 rounded-xl px-5 py-3 font-semibold text-white 
                     bg-gradient-to-r from-[#2B7A78] via-[#3AAFA9] to-[#7ED0B6]
                     hover:shadow-lg transition-all duration-300"
          title="Create a new quiz"
        >
          <span className="pointer-events-none absolute -left-10 top-0 h-full w-10 rotate-12 bg-white/30 opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-[220%] transition-all duration-700" />
          <Plus size={18} />
          <span>New Quiz</span>
        </Link>
      </div>

      {/* Empty state */}
      {quizzes.length === 0 ? (
        <EmptyState classId={classId} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-6">
          {quizzes.map((q, i) => (
            <QuizTiltCard key={q.id} q={q} index={i} classId={classId} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Card using your TiltedCard (unchanged component) ---------- */
function QuizTiltCard({ q, classId, index, delay = 0 }) {
  // Default title if empty
  const displayTitle = q.title && q.title.trim() ? q.title : `Quiz ${index + 1}`;

  // pick a gradient by index
  const cover = buildCover(CARD_GRADIENTS[index % CARD_GRADIENTS.length]);

  return (
    <Link href={`/classes/${classId}/quiz/${q.id}`} className="block">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        whileHover={{ y: -6, scale: 1.02 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay }}
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
              {/* soft bottom fade so text pops */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-black/5 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-5">
                <div className="bg-white rounded-xl p-4 shadow-none ring-0 border-0 backdrop-blur-0">
                  <h3 className="text-[#1F2937] font-semibold truncate">{displayTitle}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-700">
                    <span className="inline-flex items-center gap-1">
                      <svg width="14" height="14" viewBox="0 0 24 24" className="-mt-px">
                        <path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/>
                      </svg>
                      {q.count ?? '—'} questions
                    </span>

                    {/* remove this block if you don't want time */}
                    {q.createdAt && (
                      <span className="inline-flex items-center gap-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" className="-mt-px">
                          <path fill="currentColor" d="M12 20a8 8 0 1 0 0-16a8 8 0 0 0 0 16m.5-12v4.25l3 1.75l-.75 1.23L11 12V8z"/>
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



/* ---------- Cute empty state (optional) ---------- */
function EmptyState({ classId }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-black/5 shadow-sm p-10">
      <motion.div
        aria-hidden
        className="absolute -top-20 -right-16 w-80 h-80 rounded-full bg-[#3AAFA9]/10 blur-3xl"
        animate={{ y: [0, -10, 0], x: [0, 14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-[#2B7A78]/10 blur-3xl"
        animate={{ y: [0, 12, 0], x: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          className="text-6xl md:text-7xl select-none"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          😞
        </motion.div>

        <h3 className="mt-4 text-xl font-semibold text-[#2B2D42]">No quizzes yet</h3>
        <p className="text-gray-600 mt-1">Generate your first quiz to see it here.</p>

        <Link
          href={`/classes/${classId}/quiz/generate`}
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
