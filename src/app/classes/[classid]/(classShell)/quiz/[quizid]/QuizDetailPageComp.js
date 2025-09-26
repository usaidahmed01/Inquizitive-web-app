'use client';

/**
 * QuizDetailPage — readable, JS-only, no logic changes
 *
 * What stays the same:
 * - Reads quiz JSON from localStorage: `inquiz_quiz_${quizid}`
 * - Validates the quiz belongs to this class (classId check)
 * - Shows a fancy gradient header picked deterministically from quiz id/title
 * - Renders MCQ options (marks the correct one) or a short-answer expected text
 * - Loading + “not found” states
 *
 * TODO (leave as-is for now): put you db here later — replace localStorage with your API/DB.
 */

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, CheckCircle2, ListChecks, ArrowLeft } from 'lucide-react';
import LoadingDetailSkeleton from '../../_components/LoadingDetailSkeleton';
import SlideUp from '@/app/_components/SlideUp';

/* ---------- tiny helper: stable gradient selection per quiz ---------- */
function hashToIndex(str = '', mod = 4) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

/* ---------- header gradient palette (brand-safe) ---------- */
const HEADER_GRADIENTS = [
  // brandy blue + green
  'from-[#2E5EAA] via-[#4A8FE7] to-[#81B29A]',
  // cool muted gradient
  'from-[#3a6073] via-[#456990] to-[#89a7b1]',
  // teal family
  'from-[#2B7A78] via-[#3AAFA9] to-[#7ED0B6]',
  // minty cyan → sky → navy
  'from-[#06beb6] via-[#48b1bf] to-[#1e3c72]',
];

export default function QuizDetailPage() {
  const { classid, quizid } = useParams(); // route: /classes/[classid]/quiz/[quizid]
  const [quiz, setQuiz] = useState(null);
  const [missing, setMissing] = useState(false);

  /* ---------- load quiz snapshot from localStorage ---------- */
  useEffect(() => {
    try {
      if (!quizid) return;
      const raw = localStorage.getItem(`inquiz_quiz_${quizid}`);
      if (!raw) { setMissing(true); return; }

      const obj = JSON.parse(raw);

      // safety: ensure this quiz belongs to the current class page
      if (String(obj?.classId) !== String(classid)) { setMissing(true); return; }

      setQuiz(obj);
    } catch {
      setMissing(true);
    }
  }, [classid, quizid]);

  const durationMin = quiz?.meta?.durationMin ?? null;

  /* ---------- pick a nice header gradient deterministically ---------- */
  const gradientClass = useMemo(() => {
    // seed (id > title > "")
    const seed = (quizid || quiz?.title || '').toString();
    return HEADER_GRADIENTS[hashToIndex(seed, HEADER_GRADIENTS.length)];
  }, [quizid, quiz?.title]);

  /* =================== states =================== */

  // 1) invalid/missing quiz
  if (missing) {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-800">
          <p className="font-semibold">Quiz not found.</p>
          <p className="text-sm">Make sure you saved this quiz on this browser/profile.</p>
          <div className="pt-2">
            <Link
              href={`/classes/${encodeURIComponent(String(classid))}/quiz`}
              className={`group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white 
                          bg-gradient-to-r ${gradientClass} transition hover:shadow-lg`}
            >
              {/* little sheen on hover */}
              <span className="pointer-events-none absolute -left-12 top-0 h-full w-10 translate-x-0 rotate-12 bg-white/40 opacity-0 transition-all duration-700 group-hover:translate-x-[220%] group-hover:opacity-100" />
              <ArrowLeft size={16} />
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2) loading
  if (!quiz) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-gray-600">
        <LoadingDetailSkeleton />
      </div>
    );
  }

  /* =================== content =================== */
  return (
    <SlideUp>
      <div className="space-y-8 py-9">
        {/* ===== Header with dynamic gradient ===== */}
        <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradientClass} p-6`}>
          {/* soft blobs (decoration only) */}
          <div className="pointer-events-none absolute -top-10 -left-10 h-48 w-48 rounded-full bg-white/15 blur-2xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-12 -right-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" aria-hidden="true" />

          <div className="relative z-10 text-white">
            {/* title + back */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20" aria-hidden="true">
                  <ListChecks size={20} />
                </div>
                <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                  {quiz.title || 'Untitled Quiz'}
                </h2>
              </div>

              {/* Back button */}
              <Link
                href={`/classes/${encodeURIComponent(String(classid))}/quiz`}
                className="group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-black/20 via-white/10 to-black/20 px-4 py-2 font-semibold text-white ring-1 ring-white/30 backdrop-blur-md transition hover:shadow-lg hover:ring-white/60"
                aria-label="Back to quizzes"
              >
                <span className="pointer-events-none absolute -left-12 top-0 h-full w-10 translate-x-0 rotate-12 bg-white/40 opacity-0 transition-all duration-700 group-hover:translate-x-[220%] group-hover:opacity-100" />
                <ArrowLeft size={16} className="opacity-90" />
                Back
              </Link>
            </div>

            {/* meta row */}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/90">
              <span>
                {/* guard against invalid dates; keep same display intent */}
                {quiz.createdAt ? `Created ${new Date(quiz.createdAt).toLocaleString()}` : 'Created —'}
                {' '}• {(quiz.questions?.length || 0)} question{(quiz.questions?.length || 0) === 1 ? '' : 's'}
              </span>

              {quiz.meta?.type && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium">
                  {String(quiz.meta.type).toUpperCase()}
                </span>
              )}

              {durationMin && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium">
                  <Clock size={14} className="opacity-80" />
                  {durationMin} min
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ===== Questions ===== */}
        <div className="space-y-5">
          {Array.isArray(quiz.questions) && quiz.questions.length > 0 ? (
            quiz.questions.map((q, idx) => {
              const prompt = q.q || q.prompt || q.question; // keep your fallback chain
              const isMcq = q.type === 'mcq' && Array.isArray(q.options);

              return (
                <div key={idx} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                  <p className="font-semibold text-[#2B2D42]">
                    Q{idx + 1}. {prompt}
                  </p>

                  {isMcq ? (
                    <ul
                      className="mt-3 grid gap-2 sm:grid-cols-2"
                      role="group"
                      aria-label={`Question ${idx + 1} options`}
                    >
                      {q.options.map((opt, i) => {
                        const correct = i === q.answerIndex;
                        return (
                          <li
                            key={i}
                            className={`rounded-lg border px-3 py-2 text-sm transition ${correct
                                ? 'border-[#81B29A] bg-[#EAF5F0] font-medium text-[#2B2D42]'
                                : 'border-gray-200 bg-white text-gray-700'
                              }`}
                          >
                            {opt}
                            {correct && (
                              <CheckCircle2
                                size={14}
                                className="ml-2 inline-block text-[#81B29A]"
                                aria-label="Correct answer"
                              />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                      <em>Expected answer:</em> {q.a}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-gray-600">No questions in this quiz.</p>
          )}
        </div>

        {/* bottom back button (same link, same styling family) */}
        <div className="pt-4">
          <Link
            href={`/classes/${encodeURIComponent(String(classid))}/quiz`}
            className={`group relative inline-flex items-center gap-2 rounded-xl bg-gradient-to-r ${gradientClass} px-4 py-2 font-semibold text-white transition hover:shadow-lg`}
          >
            <span className="pointer-events-none absolute -left-12 top-0 h-full w-10 translate-x-0 rotate-12 bg-white/40 opacity-0 transition-all duration-700 group-hover:translate-x-[220%] group-hover:opacity-100" />
            <ArrowLeft size={16} />
            Back To Quizzes
          </Link>
        </div>
      </div>
    </SlideUp>
  );
}
