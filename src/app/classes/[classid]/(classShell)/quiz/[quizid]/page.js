'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Clock, CheckCircle2, ListChecks, ArrowLeft } from 'lucide-react';
import LoadingDetailSkeleton from '../../_components/LoadingDetailSkeleton';

/* ---------- small util: stable gradient selection per quiz ---------- */
function hashToIndex(str = '', mod = 4) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

const HEADER_GRADIENTS = [
  // brandy blue + green
  'from-[#2E5EAA] via-[#4A8FE7] to-[#81B29A]',
  // new cool muted gradient (replacing purplish)
  'from-[#3a6073] via-[#456990] to-[#89a7b1]',
  // teal family
  'from-[#2B7A78] via-[#3AAFA9] to-[#7ED0B6]',
  // minty cyan → sky → navy
  'from-[#06beb6] via-[#48b1bf] to-[#1e3c72]',
];




export default function QuizDetailPage() {
  const { classid, quizid } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    try {
      if (!quizid) return;
      const raw = localStorage.getItem(`inquiz_quiz_${quizid}`);
      if (!raw) { setMissing(true); return; }
      const obj = JSON.parse(raw);
      if (String(obj?.classId) !== String(classid)) { setMissing(true); return; }
      setQuiz(obj);
    } catch {
      setMissing(true);
    }
  }, [classid, quizid]);

  const durationMin = quiz?.meta?.durationMin ?? null;

  const gradientClass = useMemo(() => {
    // stable pick based on quiz id or title
    const seed = (quizid || quiz?.title || '').toString();
    return HEADER_GRADIENTS[hashToIndex(seed, HEADER_GRADIENTS.length)];
  }, [quizid, quiz?.title]);

  if (missing) {
    return (
      <div className="min-h-[60vh] grid place-items-center p-6">
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-800 p-6 space-y-2">
          <p className="font-semibold">Quiz not found.</p>
          <p className="text-sm">Make sure you saved this quiz on this browser/profile.</p>
          <div className="pt-2">
            <Link
              href={`/classes/${encodeURIComponent(String(classid))}/quiz`}
              className={`group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white 
              bg-gradient-to-r ${gradientClass} hover:shadow-lg transition`}
            >
              <span className="pointer-events-none absolute -left-12 top-0 h-full w-10 rotate-12 bg-white/40 opacity-0 
                   group-hover:opacity-100 translate-x-0 group-hover:translate-x-[220%] transition-all duration-700" />
              <ArrowLeft size={16} />
              Back
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-[50vh] grid place-items-center text-gray-600">
        <LoadingDetailSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-8 py-8">
      {/* ===== Header with dynamic gradient ===== */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradientClass} p-6`}>
        {/* soft blobs */}
        <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/20 grid place-items-center">
                <ListChecks size={20} />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                {quiz.title || 'Untitled Quiz'}
              </h2>
            </div>

            {/* Cooler Back button */}
            <Link
              href={`/classes/${encodeURIComponent(String(classid))}/quiz`}
              className="group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white 
                         bg-gradient-to-r from-black/20 via-white/10 to-black/20 backdrop-blur-md
                         ring-1 ring-white/30 hover:ring-white/60 transition hover:shadow-lg"
            >
              {/* sheen */}
              <span className="pointer-events-none absolute -left-12 top-0 h-full w-10 rotate-12 bg-white/40 opacity-0 
                               group-hover:opacity-100 translate-x-0 group-hover:translate-x-[220%] transition-all duration-700" />
              <ArrowLeft size={16} className="opacity-90" />
              Back
            </Link>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-white/90 text-sm">
            <span>
              Created {new Date(quiz.createdAt).toLocaleString()} • {quiz.questions?.length || 0} questions
            </span>
            {quiz.meta?.type && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium">
                {quiz.meta.type.toUpperCase()}
              </span>
            )}
            {durationMin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-3 py-0.5 text-xs font-medium">
                <Clock size={14} className="opacity-80" /> {durationMin} min
              </span>
            )}
          </div>

        </div>
      </div>

      {/* ===== Questions ===== */}
      <div className="space-y-5">
        {Array.isArray(quiz.questions) && quiz.questions.length > 0 ? (
          quiz.questions.map((q, idx) => (
            <div key={idx} className="rounded-2xl bg-white border border-black/5 shadow-sm p-5">
              <p className="font-semibold text-[#2B2D42]">
                Q{idx + 1}. {q.q || q.prompt || q.question}
              </p>

              {q.type === 'mcq' && Array.isArray(q.options) ? (
                <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                  {q.options.map((opt, i) => (
                    <li
                      key={i}
                      className={`rounded-lg border px-3 py-2 text-sm transition
                        ${i === q.answerIndex
                          ? 'border-[#81B29A] bg-[#EAF5F0] font-medium text-[#2B2D42]'
                          : 'border-gray-200 bg-white text-gray-700'
                        }`}
                    >
                      {opt}
                      {i === q.answerIndex && (
                        <CheckCircle2 size={14} className="inline-block ml-2 text-[#81B29A]" />
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <em>Expected answer:</em> {q.a}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-gray-600">No questions in this quiz.</p>
        )}
      </div>

      {/* Bottom back button (kept cool too) */}
      <div className="pt-4">
        <Link
          href={`/classes/${encodeURIComponent(String(classid))}/quiz`}
          className={`group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-white 
              bg-gradient-to-r ${gradientClass} hover:shadow-lg transition`}
        >
          <span className="pointer-events-none absolute -left-12 top-0 h-full w-10 rotate-12 bg-white/40 opacity-0 
                   group-hover:opacity-100 translate-x-0 group-hover:translate-x-[220%] transition-all duration-700" />
          <ArrowLeft size={16} />
          Back To Quizzes
        </Link>
      </div>
    </div>
  );
}
