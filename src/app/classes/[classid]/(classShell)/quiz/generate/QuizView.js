'use client';

import Link from "next/link";
import { Quiz } from "@/schemas/quiz"; // <-- keep only the Zod schema value (JS-safe)
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SlideUp from "@/app/_components/SlideUp";
import {
  Image as ImageIcon,
  FileText,
  Settings,
  Wand2,
  Loader2,
  Trash2,
  Upload,
  CheckCircle2,
  Eye,
  Link as LinkIcon,
  Clock,
  Tag,
  X,
  Save,
  ArrowLeft
} from "lucide-react";
import { toast } from "react-hot-toast";
import QuizPreviewCard from "../../_components/QuizPreviewCard";
import { generateQuizAPI } from "@/app/lib/ai";

/* ---------------- Modal for Title ---------------- */
function TitleModal({ open, onClose, onConfirm }) {
  const [title, setTitle] = useState("");

  if (!open) return null;

  const capitalizeTitle = (str) =>
    str
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  const handleSave = () => {
    const final = capitalizeTitle((title || "").trim());
    onConfirm(final);
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/40 backdrop-blur-sm">
      <div className="w-[92%] max-w-md rounded-2xl bg-white shadow-xl border border-black/10">
        <div className="flex items-center justify-between p-4">
          <div className="inline-flex items-center gap-2">
            <Tag size={18} className="text-[#2E5EAA]" />
            <h3 className="font-semibold text-[#2B2D42]">Name this quiz</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-gray-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Midterm MCQ, Chapter 5 Review"
            className="w-full rounded-lg border border-gray-300/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#2E5EAA]/30"
          />
          <p className="text-xs text-gray-500">
            This title appears on the card in the quizzes list.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 p-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2E5EAA] px-3 py-2 text-sm font-semibold text-white hover:bg-[#264d8b]"
          >
            <Save size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}

/** --------- Duration selector (unchanged logic) --------- */
function DurationPicker({ minutes, setMinutes }) {
  const PRESETS = [20, 30, 45, 60];
  const [custom, setCustom] = useState("");

  useEffect(() => {
    if (PRESETS.includes(minutes)) setCustom("");
    else setCustom(String(minutes || ""));
  }, [minutes]);

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-2">Time Limit (minutes)</label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMinutes(m)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${minutes === m
              ? "bg-[#2E5EAA] text-white shadow-sm"
              : "bg-white text-[#2B2D42] border border-gray-300/70 hover:bg-gray-50"
              }`}
          >
            <span className="inline-flex items-center gap-1">
              <Clock size={14} /> {m}
            </span>
          </button>
        ))}

        <div className="inline-flex items-center gap-2 rounded-full border border-gray-300/70 bg-white px-3 py-1.5">
          <Clock size={14} className="text-[#2E5EAA]" />
          <input
            value={custom}
            onChange={(e) => {
              let v = e.target.value.replace(/[^\d]/g, "");
              let n = Number(v);
              if (n < 5 && v !== "") n = 5;
              if (n > 120) n = 120;
              setCustom(v);
              if (Number.isFinite(n) && n >= 5 && n <= 120) setMinutes(n);
            }}
            onBlur={() => {
              let n = Number(custom);
              if (!Number.isFinite(n) || n < 5) {
                setCustom("5");
                setMinutes(5);
              } else if (n > 120) {
                setCustom("120");
                setMinutes(120);
              }
            }}
            inputMode="numeric"
            placeholder="Custom"
            className="w-[64px] outline-none text-sm"
          />
          <span className="text-xs text-gray-500">min</span>
        </div>
      </div>
      <p className="mt-1 text-[11px] text-gray-500">
        Selected: <span className="font-semibold">{minutes} min</span>
      </p>
    </div>
  );
}

/* --- Normalizer: keep your shape consistent before Zod parse --- */
function normalizeToQuiz(raw, { quizType, durationMin, classId }) {
  const rawQs = Array.isArray(raw?.questions) ? raw.questions : [];

  const questions = rawQs.map((q, i) => {
    const baseText = String(q?.prompt ?? q?.text ?? q?.fact ?? "").trim();

    if ((q?.type ?? quizType) === "mcq") {
      const prompt =
        baseText.length >= 5
          ? baseText
          : `Question ${i + 1}: ${baseText || "Choose the correct option"}`;

      const choices = Array.isArray(q?.choices) ? q.choices.filter(Boolean) : [];
      const fixedChoices = choices.length >= 2 ? choices : ["Option A", "Option B"];

      let answerIndex = Number.isInteger(q?.answerIndex) ? q.answerIndex : 0;
      if (answerIndex < 0 || answerIndex >= fixedChoices.length) answerIndex = 0;

      return { type: "mcq", prompt, choices: fixedChoices, answerIndex };
    }

    const prompt =
      baseText.length >= 5
        ? baseText
        : `Write a short answer: ${baseText || "Explain briefly"}.`;

    return {
      type: "short",
      prompt,
      answer: typeof q?.answer === "string" ? q.answer : undefined,
    };
  });

  const safeQuestions =
    questions.length > 0
      ? questions
      : [
        quizType === "mcq"
          ? {
            type: "mcq",
            prompt: "Sample question generated from your material.",
            choices: ["Yes", "No"],
            answerIndex: 0,
          }
          : {
            type: "short",
            prompt: "Write a short answer based on your material.",
            answer: undefined,
          },
      ];

  return {
    id: "preview",
    classId: String(classId || ""),
    title: raw?.title || "Untitled Quiz",
    createdAt: new Date().toISOString(),
    meta: { type: quizType, durationMin },
    questions: safeQuestions,
  };
}

/* --- show first Zod error (unchanged) --- */
function showZodError(err) {
  try {
    const issues = err?.issues || err?.errors || [];
    if (Array.isArray(issues) && issues.length) {
      const first = issues[0];
      const where = Array.isArray(first?.path) ? first.path.join(".") : "field";
      return `${where}: ${first?.message || "Invalid input"}`;
    }
  } catch { }
  return "Validation failed.";
}

export default function QuizView() {
  const params = useParams();
  const classId = (params?.classid ?? params?.classId ?? "").toString();

  const [material, setMaterial] = useState("");
  const [files, setFiles] = useState([]);
  const [quizType, setQuizType] = useState("mixed");
  const [difficulty, setDifficulty] = useState(60);
  const [count, setCount] = useState(10);
  const [durationMin, setDurationMin] = useState(20);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState(null);

  const [titleOpen, setTitleOpen] = useState(false);
  const [initialTitle, setInitialTitle] = useState("");

  const [savedQuizId, setSavedQuizId] = useState(null);
  const inputRef = useRef(null);

  // revoke preview URLs on unmount
  useEffect(() => {
    return () => {
      files.forEach((f) => {
        try { URL.revokeObjectURL(f.url); } catch { }
      });
    };
  }, [files]);

  function makeShareId() {
    const id = (globalThis.crypto?.randomUUID?.() ?? `pid_${Date.now()}`).replace(/-/g, "");
    const token =
      globalThis.crypto?.getRandomValues
        ? Array.from(globalThis.crypto.getRandomValues(new Uint8Array(12)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
        : Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2);
    return { id, token };
  }

  /* ---------------- files ---------------- */
  const handleFile = (fileList) => {
    const arr = Array.from(fileList || []);
    const imgs = arr.filter((f) => f.type.startsWith("image/")).slice(0, 6);
    const previews = imgs.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type,
      size: f.size,
    }));
    setFiles((prev) => [...prev, ...previews].slice(0, 6));
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e.dataTransfer.files);
  };
  const onPick = (e) => {
    handleFile(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  };
  const removePreview = (idx) => {
    setFiles((prev) => {
      const copy = [...prev];
      try { URL.revokeObjectURL(copy[idx]?.url); } catch { }
      copy.splice(idx, 1);
      return copy;
    });
  };

  /* ---------------- form guard ---------------- */
  const canGenerate = useMemo(
    () => (material.trim().length > 0 || files.length > 0) && !!classId,
    [material, files, classId]
  );

  /* ---------------- generate ---------------- */
  const generateQuiz = async () => {
    if (!classId) {
      toast.error("No class selected. Open this page from /classes/[classid].");
      return;
    }
    if (!canGenerate || generating) return;
    setGenerating(true);

    try {
      const data = await generateQuizAPI(String(classId), {
        material,
        quizType,
        difficulty,
        count,
      });

      const normalized = normalizeToQuiz(data, { quizType, durationMin, classId });
      const valid = Quiz.parse(normalized); // Zod guard
      setQuiz(valid);

      sessionStorage.setItem(
        "inquiz_preview",
        JSON.stringify({ classId, quiz: valid })
      );

      setSavedQuizId(null);
      requestAnimationFrame(() => {
        document.getElementById("quiz-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      console.error(e);
      const msg = e?.issues?.[0]?.message || "Failed to generate quiz.";
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  /* ---------------- quick preview scroll ---------------- */
  const previewNow = () => {
    if (!quiz) return toast("Generate a quiz first", { icon: "⚠️" });
    document.getElementById("quiz-preview")?.scrollIntoView({ behavior: "smooth" });
  };

  /* ---------------- copy link (requires saved quiz first) ---------------- */
  const copyPreviewLink = async () => {
    if (!quiz) return toast("Generate a quiz first", { icon: "⚠️" });
    if (!classId) return toast.error("Missing class id");
    if (!savedQuizId) return toast.error("Please save the quiz first before sharing the link.");

    const { id: pid2, token: t } = makeShareId();
    try {
      localStorage.setItem(
        `inquiz_preview_${pid2}`,
        JSON.stringify({
          classId: String(classId),
          token: t,
          quiz,
          createdAt: Date.now(),
        })
      );
    } catch (e) {
      console.error(e);
      toast.error("Could not prepare share link");
      return;
    }

    const url = `${location.origin}/classes/${encodeURIComponent(
      String(classId)
    )}/quiz/verify?pid=${encodeURIComponent(pid2)}&t=${encodeURIComponent(t)}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Verification link copied for “${quiz.title || "Untitled Quiz"}”.`);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  /* ---------------- clear all ---------------- */
  const clearAll = () => {
    setMaterial("");
    setFiles((prev) => {
      prev.forEach((p) => {
        try { URL.revokeObjectURL(p.url); } catch { }
      });
      return [];
    });
    setQuiz(null);
    setSavedQuizId(null);
    toast.success("Cleared");
  };

  /* ---------------- save ---------------- */
  const saveAndView = async () => {
    if (!quiz || saving) return;
    if (!classId) return toast.error("Missing class id");
    setInitialTitle(quiz.title || "");
    setTitleOpen(true);
  };

  const doSave = async (finalTitle) => {
    setTitleOpen(false);
    setSaving(true);
    const quizId = `q_${Date.now()}`;

    try {
      const toSave = {
        id: quizId,
        classId: String(classId),
        title: finalTitle || "Untitled Quiz",
        createdAt: new Date().toISOString(),
        meta: { ...(quiz.meta || {}), durationMin },
        questions: quiz.questions,
      };

      const valid = Quiz.parse(toSave); // Zod guard
      localStorage.setItem(`inquiz_quiz_${quizId}`, JSON.stringify(valid));

      const idxKey = `inquiz_idx_${classId}`;
      const idx = JSON.parse(localStorage.getItem(idxKey) || "[]");
      localStorage.setItem(
        idxKey,
        JSON.stringify([
          {
            id: quizId,
            title: valid.title,
            createdAt: valid.createdAt,
            count: (quiz?.questions || []).length,
            durationMin: valid.meta?.durationMin ?? null,
            type: valid.meta?.type ?? quizType,
          },
          ...idx,
        ])
      );

      setSavedQuizId(quizId);
      setQuiz((q) => (q ? { ...q, title: valid.title } : q));
      toast.success("Quiz saved successfully!");
    } catch (e) {
      console.error("Failed to save quiz:", e);
      toast.error(showZodError(e) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SlideUp>
        <div className="space-y-8 py-9">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA] p-6">
            <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />

            <div className="relative z-10 text-white">
              <div className="flex items-center gap-3">
                {/* back arrow sits in the same row */}
                <Link
                  href={`/classes/${classId}/quiz`}
                  aria-label="Back to quizzes"
                  className="inline-flex h-10 w-10 items-center justify-center
                   rounded-full bg-white/10 text-white ring-1 ring-white/30
                   hover:bg-white/20 hover:ring-white/60 transition
                   focus:outline-none focus:ring-2 focus:ring-white/70"
                >
                  <ArrowLeft size={18} />
                </Link>

                <div className="h-10 w-10 rounded-xl bg-white/20 grid place-items-center">
                  <Wand2 size={20} />
                </div>

                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  AI Quiz Generator
                </h2>
              </div>

              <p className="mt-2 text-white/90">
                Paste material or drop reference images. Choose quiz style and hit{" "}
                <span className="font-semibold">Generate</span>.
              </p>
            </div>
          </div>



          {/* Inputs */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* left */}
            <div className="lg:col-span-2 space-y-6">
              {/* Material */}
              <div className="relative rounded-2xl bg-white border border-black/5 shadow-sm">
                <div className="flex items-center gap-2 px-5 pt-4 text-sm font-medium text-[#2B2D42]">
                  <FileText size={16} className="text-[#2E5EAA]" />
                  Material (paste or type)
                </div>
                <div className="px-5 pb-5 pt-2">
                  <textarea
                    value={material}
                    onChange={(e) => setMaterial(e.target.value)}
                    placeholder="Paste the lecture notes, topic summaries, or key points here..."
                    className="mt-2 w-full min-h-[160px] rounded-xl border border-gray-300/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#2E5EAA]/30"
                  />
                </div>
              </div>

              {/* Upload Images */}
              <div
                className="relative rounded-2xl bg-white border border-dashed border-[#2E5EAA]/40 shadow-sm p-5"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={onDrop}
              >
                <div className="flex items-center gap-2 text-sm font-medium text-[#2B2D42]">
                  <ImageIcon size={16} className="text-[#2E5EAA]" />
                  Optional: Reference images (slides, pages, screenshots)
                </div>

                <div className="mt-3 rounded-xl bg-[#F7FAFF] border border-[#2E5EAA]/15 p-5 text-center">
                  <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={onPick}
                    className="hidden"
                    id="quiz-upload"
                  />
                  <label
                    htmlFor="quiz-upload"
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold 
                      bg-gradient-to-r from-[#2E5EAA] to-[#3A86FF] text-white shadow-md cursor-pointer
                      hover:shadow-lg hover:from-[#264d8b] hover:to-[#265cff] transition-all duration-200"
                  >
                    <Upload size={18} className="opacity-90" />
                    Select Images
                  </label>

                  <p className="mt-2 text-xs text-gray-500">or drag & drop up to 6 images here</p>
                </div>

                {files.length > 0 && (
                  <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {files.map((f, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={f.url}
                          alt={f.name}
                          className="h-20 w-full object-cover rounded-lg border border-black/5"
                        />
                        <button
                          onClick={() => removePreview(idx)}
                          className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-red-600 text-white grid place-items-center shadow-md opacity-0 group-hover:opacity-100 transition"
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* right */}
            <div className="space-y-6">
              <div className="relative rounded-2xl bg-white border border-black/5 shadow-sm">
                <div className="flex items-center gap-2 px-5 pt-4 text-sm font-medium text-[#2B2D42]">
                  <Settings size={16} className="text-[#2E5EAA]" />
                  Quiz Settings
                </div>
                <div className="px-5 pb-5 pt-3 space-y-5">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <div className="grid grid-cols-3 gap-2">
                      <TypePill label="MCQs" active={quizType === "mcq"} onClick={() => setQuizType("mcq")} />
                      <TypePill label="Short" active={quizType === "short"} onClick={() => setQuizType("short")} />
                      <TypePill label="Mixed" active={quizType === "mixed"} onClick={() => setQuizType("mixed")} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-500 mb-2">Difficulty ({difficulty}%)</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={difficulty}
                      onChange={(e) => setDifficulty(Number(e.target.value))}
                      className="w-full accent-[#2E5EAA]"
                    />
                    <div className="mt-1 flex justify-between text-[11px] text-gray-500">
                      <span>Easy</span>
                      <span>Medium</span>
                      <span>Hard</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-500 mb-1"># Questions</label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={count}
                        onChange={(e) =>
                          setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))
                        }
                        className="w-full h-10 rounded-xl border border-gray-300/70 px-4 text-base outline-none focus:ring-2 focus:ring-[#2E5EAA]/30"
                      />
                    </div>

                    <div className="col-span-2">
                      <DurationPicker minutes={durationMin} setMinutes={setDurationMin} />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      disabled={!canGenerate || generating}
                      onClick={generateQuiz}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white
                        bg-[#2E5EAA] hover:bg-[#264d8b] disabled:opacity-60 disabled:cursor-not-allowed transition"
                    >
                      {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                      {generating ? "Generating..." : "Generate Quiz"}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={previewNow}
                        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium 
                          text-gray-700 border-gray-300 bg-white hover:bg-gray-100 transition"
                      >
                        <Eye size={14} className="text-[#2E5EAA]" />
                        Preview
                      </button>

                      <button
                        onClick={copyPreviewLink}
                        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium 
                          text-gray-700 border-gray-300 bg-white hover:bg-gray-100 transition"
                      >
                        <LinkIcon size={14} className="text-[#2B7A78]" />
                        Link
                      </button>

                      <button
                        onClick={clearAll}
                        className="flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium 
                          text-red-600 border-red-300 bg-white hover:bg-red-50 transition"
                      >
                        <Trash2 size={14} className="text-red-500" />
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-2xl bg-gradient-to-br from-[#F3F8FF] to-white border border-black/5 p-4">
                <p className="text-sm text-[#2B2D42] font-semibold mb-1">Tips</p>
                <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                  <li>Paste clean bullet points for best results.</li>
                  <li>Upload slide screenshots if material is image-only.</li>
                  <li>Use “Mixed” to combine MCQs + short answers.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Preview area */}
          <div id="quiz-preview" className="space-y-3">
            {quiz ? (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[#2B2D42]">
                    <CheckCircle2 className="text-[#81B29A]" size={18} />
                    <span className="font-semibold">Preview</span>
                  </div>
                  <button
                    onClick={saveAndView}
                    disabled={saving}
                    className="group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white 
                      bg-gradient-to-r from-[#2B7A78] via-[#3AAFA9] to-[#7ED0B6] 
                      hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span className="pointer-events-none absolute -left-12 top-0 h-full w-10 rotate-12 bg-white/40 
                      opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-[220%] transition-all duration-700" />
                    <Save size={16} />
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>

                <QuizPreviewCard quiz={quiz} />
              </>
            ) : (
              <div className="rounded-2xl bg-white/70 border border-dashed border-gray-300 p-8 text-center text-gray-600">
                Generate a quiz to see the preview here.
              </div>
            )}
          </div>
        </div >
      </SlideUp >

      <TitleModal
        open={titleOpen}
        onClose={() => setTitleOpen(false)}
        onConfirm={doSave}
        initialTitle={initialTitle}
      />
    </>
  );
}

function TypePill({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${active
        ? "bg-[#2E5EAA] text-white shadow-sm"
        : "bg-white text-[#2B2D42] border border-gray-300/70 hover:bg-gray-50"
        }`}
    >
      {label}
    </button>
  );
}
