"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListChecks,
  AlertTriangle,
} from "lucide-react";
import { Quiz as QuizSchema } from "@/schemas/quiz";
import ConfirmSubmitModal from "./ConfirmSubmitModal";
import SlideUp from "@/app/_components/SlideUp";

/* ================= Theme & helpers ================= */

const THEME = {
  primary: "#2E5EAA",
};
const progressHex = (pct) =>
  pct >= 80 ? "#22c55e" : pct >= 65 ? "#f59e0b" : pct >= 50 ? "#fb923c" : "#ef4444";
const fmtSeconds = (s) => {
  s = Math.max(0, s || 0);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

/* ================= Header ================= */

function GradientHeader({ classid, title, totalQ, secondsLeft, submitted, onSubmit }) {
  const urgent = (secondsLeft ?? 0) <= 30;
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#5C9BCF] via-[#8CB8E2] to-[#7FAF9D]">
      <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-12 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
      <div className="relative z-10 max-w-5xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/20 grid place-items-center">
              <ListChecks size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight truncate">
                {title || "Quiz"}
              </h1>
              <p className="text-white/85 text-sm">
                Class {String(classid)} • {totalQ} questions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-white/20 text-white font-semibold"
              aria-live="polite"
              aria-atomic="true"
            >
              <Clock size={16} className={urgent ? "text-red-300" : "opacity-90"} />
              {fmtSeconds(secondsLeft)}
            </div>

            {!submitted && (
              <button
                onClick={onSubmit}
                className="ml-2 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white 
                           bg-[#2E5EAA] hover:bg-[#254c84] transition"
              >
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= Page ================= */

export default function TakeQuizPage() {
  const router = useRouter();
  const { classid } = useParams();
  const search = useSearchParams();
  const pid = search.get("pid");
  const token = search.get("t");

  const [invalid, setInvalid] = useState(false);
  const [quiz, setQuiz] = useState(null);

  // timer
  const [secondsLeft, setSecondsLeft] = useState(null);
  const endAtRef = useRef(null); // absolute deadline in ms

  // flow
  const [submitted, setSubmitted] = useState(false);
  const [showFocusOverlay, setShowFocusOverlay] = useState(false);
  const [focusViolations, setFocusViolations] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);


  // single-page nav (ALWAYS mixed-style)
  const [idx, setIdx] = useState(0);

  // answers: { [qIdx]: number|string }
  const [answers, setAnswers] = useState({});

  const doneKey = `inquiz_done_${pid}`;

  /* ---------- prevent re-attempts ---------- */
  useEffect(() => {
    if (pid && sessionStorage.getItem(doneKey)) {
      setInvalid(true);
    }
  }, [pid, doneKey]);

  /* ---------- load quiz snapshot & init ---------- */
  useEffect(() => {
    try {
      if (!pid || !token || !classid) {
        setInvalid(true);
        return;
      }
      // must come via verify gate
      const raw = localStorage.getItem(`inquiz_preview_${pid}`);
      const gate = sessionStorage.getItem(`inquiz_allowed_${classid}_${pid}`);
      if (!raw || !gate) {
        setInvalid(true);
        return;
      }
      const snap = JSON.parse(raw);
      if (snap?.token !== token || String(snap?.classId) !== String(classid)) {
        setInvalid(true);
        return;
      }

      // normalize and validate
      const qz = snap.quiz || {};
      const qs = Array.isArray(qz.questions) ? qz.questions : [];

      // clamp duration
      const durationMin = Math.max(5, Math.min(120, Math.floor(Number(qz?.meta?.durationMin ?? 20))));

      const candidate = {
        id: qz.id || "preview",
        classId: String(classid),
        title: (qz.title || "Quiz").toString().trim().slice(0, 120),
        createdAt: qz.createdAt || new Date().toISOString(),
        meta: {
          // we keep the type but RENDER mixed-style regardless
          type:
            (qz?.meta?.type && String(qz.meta.type).toLowerCase()) ||
            inferTypeFromQuestions(qs),
          durationMin,
          difficulty: Number.isFinite(qz?.meta?.difficulty) ? Number(qz.meta.difficulty) : 60,
        },
        questions: qs.map((q) => {
          if (Array.isArray(q?.choices)) {
            return {
              type: "mcq",
              prompt: (q.prompt || "").toString(),
              choices: q.choices.map(String),
              answerIndex: typeof q.answerIndex === "number" ? q.answerIndex : -1,
            };
          }
          return {
            type: "short",
            prompt: (q.prompt || "").toString(),
            answer: typeof q.answer === "string" ? q.answer : undefined,
          };
        }),
      };

      const parsed = QuizSchema.parse(candidate);

      const finalQuiz = {
        ...parsed,
        // RENDER mixed-style regardless of type
        meta: { ...parsed.meta, type: "mixed" },
      };

      // autosave restore
      const saved = JSON.parse(sessionStorage.getItem(`inquiz_run_${pid}`) || "{}");
      setAnswers(saved.answers || {});
      setIdx(Number.isFinite(saved.idx) ? Number(saved.idx) : 0);

      setQuiz(finalQuiz);

      // absolute deadline (+2 min buffer)
      const totalMs = (finalQuiz.meta.durationMin + 2) * 60 * 1000;
      endAtRef.current = Date.now() + totalMs;
      setSecondsLeft(Math.max(1, Math.floor((endAtRef.current - Date.now()) / 1000)));
    } catch (err) {
      console.error("Invalid quiz data:", err);
      setInvalid(true);
    }
  }, [pid, token, classid]);

  function inferTypeFromQuestions(questions = []) {
    if (!Array.isArray(questions) || questions.length === 0) return "mixed";
    const isMcq = questions.every((q) => Array.isArray(q?.choices) && q.choices.length >= 2);
    const isShort = questions.every((q) => !Array.isArray(q?.choices));
    if (isMcq) return "mcq";
    if (isShort) return "short";
    return "mixed";
  }

  /* ---------- keep idx within bounds ---------- */
  useEffect(() => {
    if (!quiz) return;
    setIdx((i) => Math.min(Math.max(0, i), Math.max(0, (quiz.questions?.length || 1) - 1)));
  }, [quiz?.questions?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- timer (absolute) ---------- */
  useEffect(() => {
    if (endAtRef.current == null || submitted) return;
    const t = setInterval(() => {
      const remain = Math.max(0, Math.floor((endAtRef.current - Date.now()) / 1000));
      setSecondsLeft(remain);
      if (remain <= 0) {
        clearInterval(t);
        setSubmitted(true); // auto-submit
      }
    }, 250);
    return () => clearInterval(t);
  }, [submitted]);

  /* ---------- autosave answers & cursor ---------- */
  useEffect(() => {
    if (!pid) return;
    sessionStorage.setItem(`inquiz_run_${pid}`, JSON.stringify({ idx, answers }));
  }, [pid, idx, answers]);

  /* ---------- anti-cheat: block paste/copy/cut/context ---------- */
  useEffect(() => {
    const onKeyDown = (e) => {
      const isPaste = (e.ctrlKey || e.metaKey) && (e.key === "v" || e.key === "V");
      const isCopyCut =
        (e.ctrlKey || e.metaKey) && ["c", "x", "C", "X"].includes(e.key);
      if (isPaste || isCopyCut) e.preventDefault();
    };
    const onContextMenu = (e) => e.preventDefault();
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("contextmenu", onContextMenu, { capture: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("contextmenu", onContextMenu, { capture: true });
    };
  }, []);
  const handlePasteBlock = (e) => e.preventDefault();

  /* ---------- anti-cheat: visibility + unload ---------- */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && !submitted) {
        if (focusViolations === 0) {
          // 1st time → show warning overlay
          setFocusViolations(1);
          setShowFocusOverlay(true);
        } else {
          // 2nd time → auto-submit
          setSubmitted(true);
        }
      }
    };
    document.addEventListener("visibilitychange", onVis);

    const onBeforeUnload = (e) => {
      if (!submitted) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [submitted, focusViolations]);

  /* ---------- helpers ---------- */
  const pick = (qIdx, val) => setAnswers((a) => ({ ...a, [qIdx]: val }));
  const totalQ = quiz?.questions?.length || 0;

  const score = useMemo(() => {
    if (!submitted || !quiz) return null;
    let total = 0,
      correct = 0;
    (quiz.questions || []).forEach((q, i) => {
      if (Array.isArray(q?.choices) && typeof q?.answerIndex === "number") {
        total += 1;
        if (answers[i] === q.answerIndex) correct += 1;
      }
    });
    return { correct, total };
  }, [submitted, quiz, answers]);

  const progressPct = useMemo(() => {
    const answered = Object.values(answers).filter(
      (v) => v !== undefined && v !== ""
    ).length;
    return Math.round((answered / Math.max(1, totalQ)) * 100);
  }, [answers, totalQ]);

  const unansweredCount = totalQ - Object.values(answers).filter(
    (v) => v !== undefined && v !== ""
  ).length;

  const handleSubmitClick = () => {
    // Always show confirmation if unanswered > 0
    if (unansweredCount > 0) {
      setShowConfirm(true);
    } else {
      // safe to submit directly
      submitNow();
    }
  };

  const submitNow = () => {
    setShowConfirm(false);
    setSubmitted(true);
  };


  /* ---------- after submit: mark attempt done & show results ---------- */
  const [showResults, setShowResults] = useState(false);
  useEffect(() => {
    if (submitted) {
      // mark as done → blocks re-attempts for this pid
      sessionStorage.setItem(doneKey, "1");
      const t = setTimeout(() => setShowResults(true), 200);
      return () => clearTimeout(t);
    }
  }, [submitted, doneKey]);

  /* ---------- guards ---------- */
  if (invalid) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#F7FAFF] px-6">
        <div className="max-w-xl w-full rounded-xl border border-blue-200 bg-white p-5">
          <p className="font-semibold text-[#2E5EAA]">Invalid, expired, or already attempted quiz.</p>
          <p className="text-sm mt-1 text-gray-600">Re-open a fresh verify link from your instructor.</p>
        </div>
      </div>
    );
  }
  if (!quiz) return null;

  /* ================= Render ================= */

  return (
    // <SlideUp>
      <div
        className="min-h-screen bg-[#F7FAFF]"
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
      >
        <GradientHeader
          classid={classid}
          title={quiz.title || "Quiz"}
          totalQ={totalQ}
          secondsLeft={secondsLeft}
          submitted={submitted}
          onSubmit={handleSubmitClick}
        />

        {/* Instructions bar (under header) */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">⚠️ Quiz Rules</p>
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>Switching tabs will show only <b>one</b> warning.</li>
            <li>After the first warning, leaving the tab again will <b>auto-submit</b> your quiz.</li>
            <li>Copy & paste are disabled during the quiz.</li>
          </ul>
        </div>

        {/* thin progress */}
        <div className="h-1 w-full bg-[#e5e7eb]">
          <div
            className="h-1 transition-all"
            style={{ width: `${progressPct}%`, background: progressHex(progressPct) }}
          />
        </div>

        <main className="max-w-5xl mx-auto px-4 py-6">
          {/* RESULTS lock modal */}
          {showResults && (
            <ResultModal
              quizTitle={quiz.title}
              score={score}
              totalQ={totalQ}
              durationUsed={Math.max(
                0,
                (quiz?.meta?.durationMin ?? 20) * 60 - (secondsLeft ?? 0)
              )}
              onClose={() => setShowResults(true)}
            />
          )}

          {/* MIXED-STYLE FOR ALL TYPES (one question per page) */}
          {!submitted && (
            <section className="grid lg:grid-cols-[1fr,260px] gap-6">
              <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-5">
                <div className="text-xs text-gray-500">
                  Question {idx + 1} / {totalQ}
                </div>
                <h2 className="mt-1 text-lg font-semibold text-[#2B2D42]">
                  {quiz.questions[idx]?.prompt}
                </h2>

                <div className="mt-4">
                  {Array.isArray(quiz.questions[idx]?.choices) ? (
                    <ul
                      className="grid gap-2"
                      role="radiogroup"
                      aria-label={`Question ${idx + 1}`}
                    >
                      {quiz.questions[idx].choices.map((c, ci) => {
                        const active = answers[idx] === ci;
                        return (
                          <li key={ci}>
                            <label
                              className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${active
                                ? "border-[#2E5EAA] bg-[#F3F8FF]"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                                }`}
                            >
                              <input
                                type="radio"
                                name={`q_mix_${idx}`}
                                className="accent-[#2E5EAA]"
                                checked={active}
                                onChange={() => pick(idx, ci)}
                                aria-label={c}
                              />
                              <span className="text-sm">{c}</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <textarea
                      value={answers[idx] || ""}
                      onChange={(e) => pick(idx, e.target.value)}
                      onPaste={handlePasteBlock}
                      placeholder="Type Your Answer Here."
                      className="w-full min-h-[140px] rounded-xl border border-gray-300/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#2E5EAA]/20"
                    />
                  )}
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={() => setIdx((i) => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm bg-white hover:bg-gray-50"
                    style={{ borderColor: "#e5e7eb", color: "#2B2D42" }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  {idx < totalQ - 1 ? (
                    <button
                      onClick={() => setIdx((i) => Math.min(totalQ - 1, i + 1))}
                      className="inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm bg-white hover:bg-gray-50"
                      style={{ borderColor: "#e5e7eb", color: "#2B2D42" }}
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitClick}
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white bg-[#2E5EAA] hover:bg-[#254c84] transition"
                    >
                      Submit
                    </button>
                  )}
                </div>
              </div>

              <aside className="rounded-2xl bg-white border border-black/5 shadow-sm p-4">
                <p className="text-sm font-semibold text-[#2B2D42]">Navigate</p>
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {quiz.questions.map((_, i) => {
                    const answered = answers[i] !== undefined && answers[i] !== "";
                    const current = i === idx;
                    const base = "h-8 w-8 rounded-md text-xs font-semibold grid place-items-center";
                    return (
                      <button
                        key={i}
                        onClick={() => setIdx(i)}
                        title={`Question ${i + 1}`}
                        className={`${base} ${current ? "text-white" : answered ? "text-white/90" : "text-white"
                          }`}
                        style={{
                          background: current
                            ? THEME.primary
                            : answered
                              ? `${THEME.primary}1F`
                              : "#cbd5e1",
                        }}
                      >
                        {i + 1}
                      </button>
                    );
                  })}
                </div>
              </aside>
            </section>
          )}
          <ConfirmSubmitModal
            open={showConfirm}
            unanswered={unansweredCount}
            onCancel={() => setShowConfirm(false)}
            onConfirm={submitNow}
          />

        </main>

        {/* Focus overlay (1st tab leave) */}
        {showFocusOverlay && !submitted && (
          <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 backdrop-blur-sm">
            <div className="w-[92%] max-w-md rounded-2xl bg-white border border-black/10 shadow-xl p-5 text-center">
              <div className="mx-auto h-10 w-10 rounded-full bg-amber-100 text-amber-700 grid place-items-center">
                <AlertTriangle size={18} />
              </div>
              <h3 className="mt-3 text-lg font-semibold text-[#2B2D42]">Please stay on this tab</h3>
              <p className="mt-1 text-sm text-gray-600">
                This is your only warning. If you leave the tab again, your quiz will be
                <b> auto-submitted</b>.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => setShowFocusOverlay(false)}
                  className="inline-flex items-center rounded-xl bg-[#2E5EAA] hover:bg-[#254c84] px-4 py-2 text-sm font-semibold text-white"
                >
                  Resume Quiz
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    // </SlideUp>
  );
}

/* ================= Result Modal ================= */

function ResultModal({ quizTitle, score, totalQ, durationUsed }) {
  const percent =
    score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;
  const remark = (() => {
    const p = percent ?? 0;
    if (p >= 90) return "Outstanding! 🎉";
    if (p >= 75) return "Great job! 🙌";
    if (p >= 60) return "Good effort! 👍";
    if (p >= 40) return "Keep practicing! 💪";
    return "Don’t give up — you’ve got this! 🌱";
  })();
  const used = Math.max(0, durationUsed || 0);
  const mins = Math.floor(used / 60);
  const secs = used % 60;

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 backdrop-blur-sm">
      <div className="w-[92%] max-w-lg rounded-2xl border border-black/10 shadow-2xl overflow-hidden">
        <div className="relative bg-gradient-to-r from-[#5C9BCF] via-[#8CB8E2] to-[#7FAF9D] p-5">
          <h3 className="text-white text-xl font-bold">{quizTitle || "Quiz"} • Results</h3>
          <p className="text-white/90 text-sm">Your submission has been recorded.</p>
        </div>

        <div className="p-6 space-y-4 bg-white">
          <div className="rounded-xl border border-black/5 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Auto-graded MCQs</p>
                <p className="text-2xl font-extrabold text-[#2B2D42]">
                  {score ? `${score.correct} / ${score.total}` : "—"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-2xl font-extrabold" style={{ color: progressHex(percent ?? 0) }}>
                  {percent != null ? `${percent}%` : "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-black/5 bg-white p-4">
            <p className="text-sm text-gray-600">Time used</p>
            <p className="text-lg font-semibold text-[#2B2D42]">
              {mins}m {secs}s
            </p>
          </div>

          <div className="rounded-xl border border-black/5 bg-[#F7FAFF] p-4">
            <p className="text-sm font-semibold text-[#2B2D42]">Remarks</p>
            <p className="text-gray-700 mt-1">{remark}</p>
          </div>

          <p className="text-xs text-gray-500">
            This result card stays open. You can close the tab when you’re done.
          </p>
        </div>
      </div>
    </div>
  );
}
