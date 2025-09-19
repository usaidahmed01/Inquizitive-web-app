"use client";

import { motion } from "framer-motion";
import {
  ListChecks,
  AlignLeft,
  CheckCircle2,
  Circle,
  Eye,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

/**
 * quiz = {
 *  title: string,
 *  meta: { type: 'mcq'|'short'|'mixed', difficulty:number, count:number },
 *  questions: Array<
 *    | { id:number, type:'mcq', q:string, options:string[], answerIndex:number }
 *    | { id:number, type:'short', q:string, a:string }
 *  >
 * }
 */
export default function QuizPreviewCard({ quiz }) {
  if (!quiz) return null;

  const count = quiz.meta?.count ?? quiz.questions?.length ?? 0;
  const type = quiz.meta?.type ?? "mixed";
  const difficulty = quiz.meta?.difficulty ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-md"
    >
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#2E5EAA] via-[#4A8FE7] to-[#81B29A] px-6 py-4">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-white">
              {quiz.title || "Generated Quiz (Preview)"}
            </h3>
            <p className="mt-0.5 text-[13px] text-white/90">
              {count} Question{count > 1 ? "s" : ""} • Difficulty {difficulty}%
            </p>
          </div>

          <div className="flex items-center gap-2">
            <MetaBadge
              icon={type === "mcq" ? ListChecks : AlignLeft}
              label={type}
            />
            <span className="rounded-full bg-white/25 px-2.5 py-1 text-xs font-semibold text-white">
              Preview
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-100">
        {(quiz.questions || []).map((q, idx) => (
          <QuestionRow key={q.id ?? idx} q={q} index={idx} />
        ))}
      </div>

    </motion.div>
  );
}

/* ---------- atoms ---------- */

function MetaBadge({ icon: Icon, label }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-[#2B2D42] ring-1 ring-white/60">
      <Icon size={14} className="text-[#2E5EAA]" />
      <span className="capitalize">{label}</span>
    </span>
  );
}

function QuestionRow({ q, index }) {
  // accept both shapes
  const prompt =
    q.q ?? q.prompt ?? q.text ?? `Question ${index + 1}`;

  const options = Array.isArray(q.options)
    ? q.options
    : Array.isArray(q.choices)
      ? q.choices
      : null;

  const answerIndex = Number.isInteger(q.answerIndex)
    ? q.answerIndex
    : Number.isInteger(q.correctIndex) // optional alt key
      ? q.correctIndex
      : 0;

  const expectedShort =
    q.a ?? (typeof q.answer === "string" ? q.answer : undefined);

  const isMcq = q.type === "mcq" || Array.isArray(options);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, delay: index * 0.015 }}
      className="relative px-5 py-6"
    >
      <div className="mb-3 flex items-center gap-3">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#2E5EAA] text-xs font-bold text-white shadow-sm">
          {index + 1}
        </span>
        <p className="text-[15px] font-semibold leading-relaxed text-[#1F2937]">
          {prompt}
        </p>
      </div>

      {isMcq ? (
        <ul
          role="group"
          className="grid grid-cols-1 gap-2 md:grid-cols-2"
          aria-label="Multiple choice options"
        >
          {(options ?? []).map((opt, i) => (
            <OptionItem key={i} label={opt} correct={i === answerIndex} />
          ))}
        </ul>
      ) : (
        <ShortAnswer expected={expectedShort} />
      )}
    </motion.div>
  );
}


function OptionItem({ label, correct }) {
  return (
    <div
      className={`group flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition
        ${correct
          ? "border-emerald-300/70 bg-emerald-50"
          : "border-gray-200 bg-white hover:bg-gray-50"
        }`}
    >
      {correct ? (
        <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
      ) : (
        <Circle size={16} className="shrink-0 text-gray-400" />
      )}
      <span className="text-gray-800">{label}</span>
      {correct && (
        <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
          Correct
        </span>
      )}
    </div>
  );
}

function ShortAnswer({ expected }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        <Eye size={14} className="text-[#2E5EAA]" />
        Reveal expected answer
        <ChevronDown
          size={14}
          className={`transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <motion.div
        initial={false}
        animate={{ height: open ? "auto" : 0, opacity: open ? 1 : 0 }}
        className="overflow-hidden"
      >
        <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
          <em className="text-gray-500">Expected:</em> {expected}
        </div>
      </motion.div>
    </div>
  );
}
