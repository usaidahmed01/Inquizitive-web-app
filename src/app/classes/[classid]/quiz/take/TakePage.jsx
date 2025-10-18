"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Clock, ChevronLeft, ChevronRight, ListChecks, AlertTriangle } from "lucide-react";
import { Quiz as QuizSchema } from "@/schemas/quiz";
import ConfirmSubmitModal from "./ConfirmSubmitModal";

const API = process.env.NEXT_PUBLIC_API_BASE;

/* ================= helpers ================= */
const THEME = { primary: "#2E5EAA" };
const progressHex = (pct) =>
  pct >= 80 ? "#22c55e" : pct >= 65 ? "#f59e0b" : pct >= 50 ? "#fb923c" : "#ef4444";
const fmtSeconds = (s) => {
  const v = Math.max(0, s || 0);
  const m = Math.floor(v / 60);
  const r = v % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

/* ================= Loading Screen ================= */
function LoadingScreen() {
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[#eaf3ff] via-white to-[#e6fff3] relative overflow-hidden">
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-[#2E5EAA]/10 blur-3xl" />
      <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-[#81B29A]/10 blur-3xl" />
      <div className="relative z-10 w-[92%] max-w-md rounded-2xl border border-black/5 bg-white p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 grid place-items-center rounded-xl bg-[#2E5EAA]/10 text-[#2E5EAA]">
            <Clock className="animate-pulse" size={18} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#2B2D42]">Preparing your quiz…</h2>
            <p className="text-xs text-gray-600">Fetching questions & starting the timer</p>
          </div>
        </div>

        <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-gray-200/70">
          <div className="h-full w-1/3 animate-[loadingstripe_1.2s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#2E5EAA] to-[#81B29A]" />
        </div>

        <ul className="mt-4 space-y-1.5 text-sm text-gray-700">
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#2E5EAA] animate-[blink_1.4s_infinite]" />
            Verifying attempt
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#3AAFA9] animate-[blink_1.4s_.2s_infinite]" />
            Securing environment
          </li>
          <li className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#81B29A] animate-[blink_1.4s_.4s_infinite]" />
            Syncing timer
          </li>
        </ul>
      </div>

      <style jsx>{`
        @keyframes loadingstripe {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes blink {
          0%, 100% { opacity: .28; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

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
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-white/20 text-white font-semibold ${urgent ? "animate-pulse" : ""
                }`}
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
  const { classid } = useParams();
  const search = useSearchParams();

  // canonical params from Verify page
  const quizId = search.get("quiz"); // server quiz id
  const seat = (search.get("seat") || "").toUpperCase();
  const email = (search.get("email") || "").toLowerCase();

  const [invalid, setInvalid] = useState(false);
  const [quiz, setQuiz] = useState(null);

  // timer
  const [secondsLeft, setSecondsLeft] = useState(null);
  const endAtRef = useRef(null);
  const submittingRef = useRef(false); // prevent double submit

  // flow
  const [submitted, setSubmitted] = useState(false);
  const [showFocusOverlay, setShowFocusOverlay] = useState(false);
  const [focusViolations, setFocusViolations] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  // nav
  const [idx, setIdx] = useState(0);

  // answers: { [qIdx]: number|string }
  const [answers, setAnswers] = useState({});

  // local keys
  const doneKey = `inquiz_done_${quizId}_${seat}`;
  const endKey = `inquiz_end_${quizId}_${seat}`;

  /* ---------- Normalization ---------- */
  function normalizeServerQuiz(raw, fallbackClassId) {
    const q = raw || {};
    const meta = q.meta || q;

    const durationMin = Math.max(
      5,
      Math.min(120, Number(meta.durationMin ?? meta.duration_min ?? 20))
    );

    const srcQuestions = Array.isArray(q.questions) ? q.questions : [];

    const normQs = srcQuestions.map((qq, i) => {
      const feType = (qq.type || "").toLowerCase();
      if (feType === "mcq" || feType === "short") {
        if (feType === "mcq") {
          const choices = Array.isArray(qq.choices) ? qq.choices.map(String) : [];
          let ai = Number.isInteger(qq.answerIndex) ? qq.answerIndex : 0;
          if (choices.length >= 2) ai = Math.max(0, Math.min(choices.length - 1, ai));
          return { type: "mcq", prompt: String(qq.prompt || `Question ${i + 1}`), choices, answerIndex: ai };
        }
        return { type: "short", prompt: String(qq.prompt || `Question ${i + 1}`), answer: typeof qq.answer === "string" ? qq.answer : undefined };
      }

      const dbType = (qq.question_type || "").toLowerCase() === "short_answer" ? "short" : "mcq";
      const prompt = String(qq.question_text || `Question ${i + 1}`).trim();

      if (dbType === "mcq") {
        const choices = Array.isArray(qq.question_options)
          ? qq.question_options.map((opt) => String(opt.option_text))
          : [];
        let answerIndex = -1;
        if (choices.length > 0 && qq.correct_answer) {
          const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
          const letter = String(qq.correct_answer).trim().toUpperCase();
          const idx = letters.indexOf(letter);
          if (idx >= 0 && idx < choices.length) answerIndex = idx;
        }
        return { type: "mcq", prompt, choices, answerIndex: answerIndex >= 0 ? answerIndex : 0 };
      }

      return { type: "short", prompt, answer: qq.correct_answer ? String(qq.correct_answer) : undefined };
    });

    return {
      id: String(q.id ?? q.quiz_id ?? ""),
      classId: String(q.classId ?? q.class_id ?? fallbackClassId ?? ""),
      title: String(q.title ?? "Quiz"),
      createdAt: String(q.createdAt ?? q.created_at ?? new Date().toISOString()),
      meta: { type: String(meta.type ?? "mixed").toLowerCase(), durationMin, difficulty: Number(meta.difficulty ?? 60) },
      questions: normQs,
    };
  }

  /* ---------- prevent local re-attempts ---------- */
  useEffect(() => {
    if (quizId && seat && sessionStorage.getItem(doneKey)) setInvalid(true);
  }, [quizId, seat, doneKey]);

  /* ---------- require verify gate ---------- */
  useEffect(() => {
    if (!classid || !quizId || !seat) return;
    const gate = sessionStorage.getItem(`inquiz_allowed_${classid}_${quizId}_${seat}`);
    if (!gate) setInvalid(true);
  }, [classid, quizId, seat]);

  /* ---------- fetch quiz from backend ---------- */
  useEffect(() => {
    (async () => {
      try {
        if (!API || !classid || !quizId) return setInvalid(true);

        const res = await fetch(`${API}/quizzes/${encodeURIComponent(quizId)}/full`);
        if (!res.ok) throw new Error("Quiz not found");
        const j = await res.json();

        // Normalize BEFORE Zod parse
        const normalized = normalizeServerQuiz(j?.quiz, classid);
        const parsed = QuizSchema.parse(normalized);

        // restore autosave
        const saved = JSON.parse(sessionStorage.getItem(`inquiz_run_${quizId}_${seat}`) || "{}");
        setAnswers(saved.answers || {});
        setIdx(Number.isFinite(saved.idx) ? Number(saved.idx) : 0);

        setQuiz(parsed);

        // absolute deadline: use persisted endAt if present
        const persisted = Number(sessionStorage.getItem(endKey) || 0);
        const now = Date.now();
        let endAt = now + parsed.meta.durationMin * 60 * 1000;
        if (persisted && persisted > now) endAt = persisted;

        endAtRef.current = endAt;
        sessionStorage.setItem(endKey, String(endAt)); // persist for reloads
        setSecondsLeft(Math.max(1, Math.floor((endAt - now) / 1000)));
      } catch (err) {
        console.error("load quiz failed:", err);
        setInvalid(true);
      }
    })();
  }, [API, classid, quizId, seat]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- server-side reattempt block ---------- */
  useEffect(() => {
    (async () => {
      try {
        if (!API || !quizId) return;
        if (!seat && !email) return;

        const qp = new URLSearchParams({ quiz_id: String(quizId) });
        if (seat) qp.set("seat_no", seat);
        if (email) qp.set("email", email);

        const r = await fetch(`${API}/results/?${qp.toString()}`);
        if (!r.ok) return;
        const j = await r.json();
        if (Array.isArray(j?.rows) && j.rows.length > 0) setInvalid(true);
      } catch {
        /* fail-open; client guards still apply */
      }
    })();
  }, [API, quizId, seat, email]);

  /* ---------- keep idx within bounds ---------- */
  useEffect(() => {
    if (!quiz) return;
    setIdx((i) => Math.min(Math.max(0, i), Math.max(0, (quiz.questions?.length || 1) - 1)));
  }, [quiz?.questions?.length]);

  /* ---------- timer (absolute) ---------- */
  useEffect(() => {
    if (endAtRef.current == null || submitted) return;
    const tick = () => {
      const remain = Math.max(0, Math.floor((endAtRef.current - Date.now()) / 1000));
      setSecondsLeft(remain);
      if (remain <= 0) {
        // call submitNow exactly once
        if (!submittingRef.current) submitNow(true);
      }
    };
    tick(); // prime immediately
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, endAtRef.current]);

  /* ---------- autosave answers & cursor ---------- */
  useEffect(() => {
    if (!quizId || !seat) return;
    sessionStorage.setItem(`inquiz_run_${quizId}_${seat}`, JSON.stringify({ idx, answers }));
  }, [quizId, seat, idx, answers]);

  /* ---------- anti-cheat ---------- */
  useEffect(() => {
    const onKeyDown = (e) => {
      const isPaste = (e.ctrlKey || e.metaKey) && /v/i.test(e.key);
      const isCopyCut = (e.ctrlKey || e.metaKey) && /[cx]/i.test(e.key);
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

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && !submitted) {
        if (focusViolations === 0) {
          setFocusViolations(1);
          setShowFocusOverlay(true);
        } else {
          if (!submittingRef.current) submitNow(true); // auto-submit on 2nd leave
        }
      }
    };
    const onBeforeUnload = (e) => {
      if (!submitted) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [submitted, focusViolations]);

  /* ---------- helpers ---------- */
  const pick = (qIdx, val) => setAnswers((a) => ({ ...a, [qIdx]: val }));
  const totalQ = quiz?.questions?.length || 0;

  const mcqScore = useMemo(() => {
    if (!quiz) return { correct: 0, total: 0 };
    let total = 0,
      correct = 0;
    (quiz.questions || []).forEach((q, i) => {
      if (Array.isArray(q?.choices) && typeof q?.answerIndex === "number") {
        total += 1;
        if (answers[i] === q.answerIndex) correct += 1;
      }
    });
    return { correct, total };
  }, [quiz, answers]);

  const progressPct = useMemo(() => {
    const answered = Object.values(answers).filter((v) => v !== undefined && v !== "").length;
    return Math.round((answered / Math.max(1, totalQ)) * 100);
  }, [answers, totalQ]);

  const unansweredCount = totalQ - Object.values(answers).filter((v) => v !== undefined && v !== "").length;

  const handleSubmitClick = () => {
    if (unansweredCount > 0) setShowConfirm(true);
    else submitNow(false);
  };

  /* ---------- submit to backend ---------- */
  const submitNow = async (auto = false) => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    setShowConfirm(false);
    setSubmitted(true);

    try {
      const usedSec = Math.max(0, (quiz?.meta?.durationMin ?? 20) * 60 - (secondsLeft ?? 0));

      // what kinds of questions exist in this quiz?
      const hasMcq = (quiz?.questions || []).some(q => Array.isArray(q?.choices));
      const hasShort = (quiz?.questions || []).some(q => !Array.isArray(q?.choices));

      const percent =
        mcqScore.total > 0 ? Math.round((mcqScore.correct / mcqScore.total) * 100) : null;

      if (API && quizId) {
        const answersJson = {
          version: 1,
          answers,
          duration_used_s: usedSec,
          auto_submitted: !!auto,
          quiz_type: quiz?.meta?.type || null, // optional, for clarity
        };
        if (hasMcq) answersJson.mcq = mcqScore;                           // only if MCQs exist
        if (hasShort) answersJson.short = {
          total:
            (quiz?.questions || []).filter(q => !Array.isArray(q?.choices)).length
        }; // minimal short meta; expand later if you auto-grade shorts

        const payload = {
          quiz_id: Number(quizId),
          class_id: Number(classid),
          seat_no: seat || null,
          email: email || null,
          score: percent,
          //          answers_json: {
          //            version: 1,
          //            answers,
          //            mcq: mcqScore,
          //            duration_used_s: usedSec,
          //            auto_submitted: !!auto,
          //          },
          answers_json: answersJson,
        };

        const res = await fetch(`${API}/results`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.detail || "Submit failed");
        }
      }

      // local lock + clear autosave + clear endAt
      sessionStorage.setItem(doneKey, "1");
      sessionStorage.removeItem(`inquiz_run_${quizId}_${seat}`);
      sessionStorage.removeItem(endKey);
    } catch (e) {
      console.error(e);
      // still set local done to discourage double-submits
      sessionStorage.setItem(doneKey, "1");
    } finally {
      // let results modal show even on error
      submittingRef.current = false;
    }
  };

  /* ---------- post-submit result modal ---------- */
  const [showResults, setShowResults] = useState(false);
  useEffect(() => {
    if (submitted) {
      const t = setTimeout(() => setShowResults(true), 220);
      return () => clearTimeout(t);
    }
  }, [submitted]);

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
  if (!quiz) return <LoadingScreen />;

  /* ================= Render ================= */
  return (
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

      {/* instructions */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 text-sm text-amber-800">
        <p className="font-semibold">⚠️ Quiz Rules</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Switching tabs will show only <b>one</b> warning.</li>
          <li>After the first warning, leaving the tab again will <b>auto-submit</b> your quiz.</li>
          <li>Copy & paste are disabled during the quiz.</li>
        </ul>
      </div>

      {/* progress */}
      <div className="h-1 w-full bg-[#e5e7eb]">
        <div
          className="h-1 transition-all"
          style={{ width: `${progressPct}%`, background: progressHex(progressPct) }}
        />
      </div>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* RESULTS modal */}
        {showResults && (
          <ResultModal
            quizTitle={quiz.title}
            score={mcqScore}
            totalQ={totalQ}
            durationUsed={Math.max(0, (quiz?.meta?.durationMin ?? 20) * 60 - (secondsLeft ?? 0))}
          />
        )}

        {/* one-question-per-page */}
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
                  <ul className="grid gap-2" role="radiogroup" aria-label={`Question ${idx + 1}`}>
                    {quiz.questions[idx].choices.map((c, ci) => {
                      const active = answers[idx] === ci;
                      return (
                        <li key={ci}>
                          <label
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition ${active ? "border-[#2E5EAA] bg-[#F3F8FF]" : "border-gray-200 bg-white hover:bg-gray-50"
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
                    value={String(answers[idx] ?? "")}
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
                      className={`${base} ${current ? "text-white" : answered ? "text-white/90" : "text-white"}`}
                      style={{
                        background: current ? THEME.primary : answered ? `${THEME.primary}1F` : "#cbd5e1",
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
          onConfirm={() => submitNow(false)}
        />
      </main>

      {/* focus overlay */}
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
  );
}

/* ================= Result Modal ================= */
function ResultModal({ quizTitle, score, totalQ, durationUsed }) {
  const percent = score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;
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
                <p className="text-sm text-gray-600">Auto-graded</p>
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

          <div className="rounded-2xl border border-black/5 bg-[#F7FAFF] p-4">
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
