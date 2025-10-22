'use client';

import Link from "next/link";
import { Quiz } from "@/schemas/quiz"; // Zod schema
import { useMemo, useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import SlideUp from "@/app/_components/SlideUp";
import {
  Image as ImageIcon,
  FileUp,
  FileText,
  Settings,
  Wand2,
  Loader2,
  Trash2,
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

const API = process.env.NEXT_PUBLIC_API_BASE;

/* ---------------- Modal for Title ---------------- */
function TitleModal({ open, onClose, onConfirm, initialTitle = "" }) {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    if (open) setTitle(initialTitle || "");
  }, [open, initialTitle]);

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

/** --------- Duration selector --------- */
function DurationPicker({ minutes, setMinutes }) {
  const PRESETS = [20, 30, 45, 60];
  const [custom, setCustom] = useState("");

  const handlePreset = (m) => {
    setMinutes(m);
    setCustom("");
  };

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-2">Time Limit (minutes)</label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handlePreset(m)}
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

/* --- Normalizer: tolerant to shapes; forces pure-short when quizType === "short" --- */
function normalizeToQuiz(raw, opts) {
  const quizType = String(opts.quizType || "").toLowerCase();
  const durationMin = opts.durationMin;
  const classId = opts.classId;

  const toStr = (v) => (v == null ? "" : String(v)).trim();
  const clampInt = (n, lo, hi) => {
    const x = Number(n);
    if (!Number.isFinite(x)) return lo;
    return Math.max(lo, Math.min(hi, Math.round(x)));
  };

  const normChoices = (src) => {
    const arr = Array.isArray(src) ? src : [];
    return arr
      .map((c, i) =>
        typeof c === "object" && c !== null
          ? (toStr(c.text ?? c.label ?? c.value) || `Option ${i + 1}`)
          : (toStr(c) || `Option ${i + 1}`)
      )
      .filter(Boolean);
  };

  const rawQs = Array.isArray(raw && raw.questions) ? raw.questions : [];

  // ensure prompts meet Zod .min(5)
  const ensurePromptLen = (txt, fallback) => {
    const base = toStr(txt) || toStr(fallback) || "Question text";
    if (base.length >= 5) return base;
    // pad to reach 5 safely
    return (base + " …..").slice(0, Math.max(5, base.length + 5));
  };

  // ---- build a tolerant questions array first (may contain MCQ + short) ----
  let questions = rawQs.map((q, i) => {
    const qType = toStr(q && q.type).toLowerCase();
    const baseText = toStr(q && (q.prompt ?? q.text ?? q.fact));

    // decide if MCQ
    const isMcq =
      qType === "mcq" ||
      Array.isArray(q && q.choices) ||
      Array.isArray(q && q.options);

    if (isMcq) {
      const prompt = ensurePromptLen(baseText, `Question ${i + 1}: Choose the correct option`);

      // accept choices | options (objects or strings)
      let choices =
        q && q.choices && q.choices.length
          ? normChoices(q.choices)
          : normChoices(q && q.options);

      if (choices.length < 2) choices = ["Option A", "Option B"];

      // prefer answerIndex, else derive from correct_answer text
      let answerIndex =
        Number.isInteger(q && q.answerIndex) &&
          q.answerIndex >= 0 &&
          q.answerIndex < choices.length
          ? q.answerIndex
          : -1;

      if (answerIndex < 0 && q && q.correct_answer) {
        const ca = toStr(q.correct_answer).toLowerCase();
        const idx = choices.findIndex((c) => toStr(c).toLowerCase() === ca);
        answerIndex = idx >= 0 ? idx : 0;
      }
      if (answerIndex < 0) answerIndex = 0;

      return { questionId: String(i + 1),type: "mcq", prompt, choices, answerIndex };
    }

    // short-answer
    const prompt = ensurePromptLen(baseText, `Write a short answer`);
    const answerRaw = q && (q.answer ?? q.correct_answer);
    const answer = typeof answerRaw === "string" ? toStr(answerRaw) : undefined;

    // return { type: "short", prompt, answer };
    return { questionId: String(i + 1), type: "short", prompt, answer };

  });

  // ---- HARD ENFORCE: if user picked "short", coerce every question to short ----
  if (quizType === "short") {
    questions = questions
      .map((q) => {
        if (Array.isArray(q && q.choices)) {
          const ai =
            Number.isInteger(q && q.answerIndex) && q.answerIndex >= 0
              ? q.answerIndex
              : -1;
          const correct =
            ai >= 0 && q.choices && ai < q.choices.length
              ? toStr(q.choices[ai])
              : undefined;
          return { type: "short", prompt: q.prompt, answer: correct };
        }
        return { type: "short", prompt: q.prompt, answer: q.answer };
      })
      .filter(Boolean);
  }

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
          },
      ];

  // infer final type (lock to 'short' if forced)
  let inferredType;
  if (quizType === "short") {
    inferredType = "short";
  } else {
    const hasMcq = safeQuestions.some((q) => Array.isArray(q && q.choices));
    const hasShort = safeQuestions.some((q) => !Array.isArray(q && q.choices));
    inferredType = hasMcq && hasShort ? "mixed" : hasMcq ? "mcq" : "short";
  }

  return {
    id: "preview",
    classId: String(classId || ""),
    title: (toStr(raw && raw.title) || "Untitled Quiz").slice(0, 120),
    createdAt: new Date().toISOString(),
    meta: {
      type: inferredType,
      durationMin: clampInt(durationMin, 5, 120),
      difficulty: 60,
    },
    questions: safeQuestions.map((q, idx) => {
      const questionId = String(idx + 1); // <<< ensure Zod gets a value
      if (Array.isArray(q.choices)) {
        const choices = q.choices.map((s, j) => toStr(s) || `Option ${j + 1}`);
        const answerIndex = clampInt(
          q.answerIndex ?? 0,
          0,
          Math.max(0, choices.length - 1)
        );
        const prompt = ensurePromptLen(q.prompt, `Question ${idx + 1}`);
        return { questionId, type: "mcq", prompt, choices, answerIndex };
      }
      return {
        questionId,
        type: "short",
        prompt: ensurePromptLen(q.prompt, `Question ${idx + 1}`),
        answer: q.answer,
      };
    }),
  };

}

/* --- show first Zod error (hardened) --- */
function showZodError(err) {
  try {
    const issues = err?.issues || err?.errors || [];
    if (Array.isArray(issues) && issues.length) {
      const first = issues[0];
      const where = Array.isArray(first?.path) ? first.path.join(".") : "field";
      return `${where}: ${first?.message || "Invalid input"}`;
    }
    if (typeof err?.format === "function") {
      const fmt = err.format();
      const keys = Object.keys(fmt || {});
      if (keys.length) return `Invalid: ${keys.join(", ")}`;
    }
    return JSON.stringify(err ?? {}, null, 2);
  } catch {
    return "Validation failed.";
  }
}

export default function QuizView() {
  const params = useParams();
  const classId = (params?.classid ?? params?.classId ?? "").toString();

  const pdfInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const [imageFile, setImageFile] = useState(null);
  const [topic, setTopic] = useState("");
  const [pdfFile, setPdfFile] = useState(null);

  const [quizType, setQuizType] = useState("mixed");
  const [count, setCount] = useState(5);
  const [durationMin, setDurationMin] = useState(20);

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quiz, setQuiz] = useState(null);

  const [titleOpen, setTitleOpen] = useState(false);
  const [initialTitle, setInitialTitle] = useState("");

  const [savedQuizId, setSavedQuizId] = useState(null);
  const [editPrompt, setEditPrompt] = useState("");

  /* ---------------- form guard ---------------- */
  const canGenerate = useMemo(
    () => (!!topic.trim() || !!pdfFile || !!imageFile) && !!classId,
    [topic, pdfFile, classId, imageFile]
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
      const fd = new FormData();
      fd.append("n_questions", String(count));
      fd.append("format", quizType === "mixed" ? "mixed" : quizType);
      if (topic.trim()) fd.append("topic", topic.trim());
      if (pdfFile) fd.append("pdf", pdfFile, pdfFile.name);
      if (imageFile) fd.append("image", imageFile, imageFile.name);
      fd.append("preview", "1"); // preview mode

      const res = await fetch(
        `${API}/generate_quiz?class_id=${encodeURIComponent(classId)}`,
        { method: "POST", body: fd }
      );

      if (!res.ok) {
        let errText = "Generation failed";
        try {
          const j = await res.json();
          errText = j?.detail || j?.message || errText;
        } catch {
          const t = await res.text();
          if (t) errText = t;
        }
        throw new Error(errText);
      }

      const j = await res.json();

      // tolerant extractor
      const pickPreview = (obj) => {
        if (!obj || typeof obj !== "object") return null;
        if (Array.isArray(obj.questions)) return obj;            // { title?, questions }
        if (obj.preview && Array.isArray(obj.preview.questions)) return obj.preview;
        if (obj.data && Array.isArray(obj.data.questions)) return obj.data;
        if (obj.quiz && Array.isArray(obj.quiz.questions)) return obj.quiz;
        return null;
      };

      const p = pickPreview(j);
      if (!p || !Array.isArray(p.questions)) {
        console.debug("Unexpected preview payload:", j);
        throw new Error("Invalid preview response");
      }

      const normalized = normalizeToQuiz(
        {
          title: p.title || topic || "Generated Quiz",
          questions: p.questions || [],
        },
        { quizType, durationMin, classId }
      );

      const parsed = Quiz.safeParse(normalized);
      if (!parsed.success) {
        console.error("ZOD PREVIEW ERROR:", parsed.error?.format?.() || parsed.error || {});
        toast.error(showZodError(parsed.error));
        return;
      }
      const valid = parsed.data;

      setQuiz(valid);
      setSavedQuizId(null);

      sessionStorage.setItem(
        "inquiz_preview",
        JSON.stringify({ classId, quiz: valid })
      );

      requestAnimationFrame(() => {
        document
          .getElementById("quiz-preview")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Failed to generate quiz.");
    } finally {
      setGenerating(false);
    }
  };

  /* ---------------- re-generate with edits (optional AI) ---------------- */
  const regenerateWithEdits = async () => {
    if (!classId || !quiz) return;
    setGenerating(true);

    try {
      const data = await generateQuizAPI(String(classId), {
        material: topic,
        quizType,
        count,
        editPrompt: editPrompt.trim(),
      });

      const normalized = normalizeToQuiz(data, { quizType, durationMin, classId });

      const parsed = Quiz.safeParse(normalized);
      if (!parsed.success) {
        console.error("ZOD PREVIEW ERROR:", parsed.error?.format?.() || parsed.error || {});
        toast.error(showZodError(parsed.error));
        return;
      }
      setQuiz(parsed.data);
      setSavedQuizId(null);
      toast.success("Applied edits. Review the new preview.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to apply edits.");
    } finally {
      setGenerating(false);
    }
  };

  /* ---------------- quick preview scroll ---------------- */
  const previewNow = () => {
    if (!quiz) return toast("Generate a quiz first", { icon: "⚠️" });
    document.getElementById("quiz-preview")?.scrollIntoView({ behavior: "smooth" });
  };

  const copyPreviewLink = async () => {
    if (!quiz) return toast("Generate a quiz first", { icon: "⚠️" });
    if (!classId) return toast.error("Missing class id");
    if (!savedQuizId) return toast.error("Please save the quiz first before sharing the link.");

    const url = `${location.origin}/classes/${encodeURIComponent(
      String(classId)
    )}/quiz/verify?quiz=${encodeURIComponent(String(savedQuizId))}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success(`Verification link copied for “${quiz.title || "Untitled Quiz"}”.`);
    } catch {
      window.prompt("Copy this link:", url);
    }
  };

  /* ---------------- clear all ---------------- */
  const clearAll = () => {
    setTopic("");
    setPdfFile(null);
    setQuiz(null);
    setSavedQuizId(null);
    setImageFile(null);
    if (pdfInputRef.current) pdfInputRef.current.value = "";
    if (imageInputRef.current) imageInputRef.current.value = "";
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

    try {
      const payload = {
        class_id: Number(classId),
        title: finalTitle || quiz.title || "Untitled Quiz",
        type: (quiz?.meta?.type || quizType || "mixed").toLowerCase(),
        duration_min: Number(durationMin),
        questions: (quiz?.questions || []).map((q) => {
          if (Array.isArray(q?.choices)) {
            return {
              type: "mcq",
              prompt: q.prompt,
              choices: q.choices,
              answerIndex: Number.isInteger(q.answerIndex) ? q.answerIndex : 0,
            };
          }
          return {
            type: "short",
            prompt: q.prompt,
            answer: q.answer ?? null,
          };
        }),
      };

      const res = await fetch(`${API}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.detail || "Save failed");
      }

      const j = await res.json();
      const newId = j.quiz_id;

      setSavedQuizId(newId);
      toast.success("Quiz saved to class!");

      setQuiz((qz) => (qz ? { ...qz, title: finalTitle || qz.title } : qz));
    } catch (e) {
      console.error(e);
      toast.error(String(e?.message || "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  // Count questions by type + total marks (fixed policy)
  const { mcqCount, shortCount, totalMarks } = useMemo(() => {
    let mcq = 0, short = 0;
    (quiz?.questions || []).forEach((q) => {
      if (Array.isArray(q?.choices)) mcq += 1;
      else short += 1;
    });
    const t = mcq * 1 + short * 3; // MCQ=1, Short=3
    return { mcqCount: mcq, shortCount: short, totalMarks: t };
  }, [quiz]);

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
                Enter a topic or upload a text PDF, or a text-only image. Choose quiz style and hit{" "}
                <span className="font-semibold">Generate</span>
              </p>
            </div>
          </div>

          {/* Inputs */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* left */}
            <div className="lg:col-span-2 space-y-6">
              {/* Topic name */}
              <div className="relative rounded-2xl bg-white border border-black/5 shadow-sm">
                <div className="flex items-center gap-2 px-5 pt-4 text-sm font-medium text-[#2B2D42]">
                  <FileText size={16} className="text-[#2E5EAA]" />
                  Topic Name
                </div>
                <div className="px-5 pb-5 pt-2">
                  <input
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Photosynthesis, Sorting Algorithms, WW2 Causes"
                    className="mt-2 w-full h-10 rounded-xl border border-gray-300/70 px-4 text-sm outline-none focus:ring-2 focus:ring-[#2E5EAA]/30"
                  />
                  <p className="mt-2 text-[11px] text-gray-500">
                    You can leave this empty if you’re uploading a PDF or image.
                  </p>
                </div>
              </div>

              {/* PDF upload */}
              <div className="relative rounded-2xl bg_white border border-dashed border-[#2E5EAA]/40 shadow-sm p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-[#2B2D42]">
                  <FileUp size={16} className="text-[#2E5EAA]" />
                  Optional: Upload PDF (text-based, not scanned)
                </div>

                <div className="mt-3 rounded-xl bg-[#F7FAFF] border border-[#2E5EAA]/15 p-5 text-center">
                  <input
                    ref={pdfInputRef}
                    type="file"
                    accept="application/pdf"
                    disabled={!!imageFile}
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setPdfFile(f);
                      if (f) {
                        setImageFile(null);
                        if (imageInputRef.current) imageInputRef.current.value = "";
                      }
                    }}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label
                    htmlFor="pdf-upload"
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold 
                      bg-gradient-to-r from-[#2E5EAA] to-[#3A86FF] text-white shadow-md
                      transition-all duration-200
                      ${imageFile
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-pointer hover:shadow-lg hover:from-[#264d8b] hover:to-[#265cff]"
                      }`}
                    aria-disabled={!!imageFile}
                  >
                    <FileUp size={18} className="opacity-90" />
                    Select PDF
                  </label>

                  <p className="mt-2 text-xs text-gray-500">
                    Text PDFs work best. Scanned PDFs will try OCR (results vary).
                  </p>

                  {pdfFile && (
                    <div className="mt-2 text-xs text-gray-600 flex items-center justify-center gap-2">
                      Selected: <b>{pdfFile.name}</b>
                      <button
                        type="button"
                        className="text-blue-600 underline"
                        onClick={() => {
                          setPdfFile(null);
                          if (pdfInputRef.current) pdfInputRef.current.value = "";
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {imageFile && (
                    <div className="mt-2 text-xs text-amber-700">
                      PDF upload is disabled while an image is selected.{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          setImageFile(null);
                          if (imageInputRef.current) imageInputRef.current.value = "";
                        }}
                      >
                        Use PDF instead
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Image upload */}
              <div className="relative rounded-2xl bg-white border border-dashed border-[#2E5EAA]/40 shadow-sm p-5">
                <div className="flex items-center gap-2 text-sm font-medium text-[#2B2D42]">
                  <ImageIcon size={16} className="text-[#2E5EAA]" />
                  Optional: Upload Image (printed text only)
                </div>

                <div className="mt-3 rounded-xl bg-[#F7FAFF] border border-[#2E5EAA]/15 p-5 text-center">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    disabled={!!pdfFile}
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setImageFile(f);
                      if (f) {
                        setPdfFile(null);
                        if (pdfInputRef.current) pdfInputRef.current.value = "";
                      }
                    }}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold 
                      bg-gradient-to-r from-[#2E5EAA] to-[#3A86FF] text-white shadow-md
                      transition-all duration-200
                      ${pdfFile
                        ? "opacity-60 cursor-not-allowed"
                        : "cursor-pointer hover:shadow-lg hover:from-[#264d8b] hover:to-[#265cff]"
                      }`}
                    aria-disabled={!!pdfFile}
                  >
                    <FileUp size={18} className="opacity-90" />
                    Select Image
                  </label>

                  <p className="mt-2 text-xs text-gray-500">
                    Must contain printed text (no handwriting / diagrams / tables).
                  </p>

                  {imageFile && (
                    <div className="mt-2 text-xs text-gray-600 flex items-center justify-center gap-2">
                      Selected: <b>{imageFile.name}</b>
                      <button
                        type="button"
                        className="text-blue-600 underline"
                        onClick={() => {
                          setImageFile(null);
                          if (imageInputRef.current) imageInputRef.current.value = "";
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  {pdfFile && (
                    <div className="mt-2 text-xs text-amber-700">
                      Image upload is disabled while a PDF is selected.{" "}
                      <button
                        type="button"
                        className="underline"
                        onClick={() => {
                          setPdfFile(null);
                          if (pdfInputRef.current) pdfInputRef.current.value = "";
                        }}
                      >
                        Use Image instead
                      </button>
                    </div>
                  )}
                </div>
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

                    {/* Fixed marks policy (no inputs) */}
                    <div className="col-span-2">
                      <div className="rounded-xl border border-gray-200 bg-white p-3">
                        <p className="text-sm text-[#2B2D42] font-semibold mb-1">Marks Policy</p>
                        <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                          <li>MCQ = <b>1</b> mark</li>
                          <li>Short = <b>3</b> marks</li>
                        </ul>
                      </div>
                      {quiz && (
                        <p className="mt-2 text-[11px] text-gray-500">
                          MCQ: {mcqCount} • Short: {shortCount} •{" "}
                          <span className="font-semibold">Total Marks: {totalMarks}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 pt-2">
                    <div className="flex flex-wrap items-center gap-2">
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
                          disabled={!savedQuizId}
                          title={!savedQuizId ? "Save the quiz first to get a link" : ""}
                          className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium 
                            border-gray-300 bg-white transition
                            ${!savedQuizId ? "text-gray-400 cursor-not-allowed" : "text-gray-700 hover:bg-gray-100"}`}
                        >
                          <LinkIcon size={14} className={!savedQuizId ? "text-gray-300" : "text-[#2B7A78]"} />
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

                    {generating && (
                      <p className="text-[11px] text-gray-500 pl-[2px]">
                        This may take a moment…
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Tips */}
              <div className="rounded-2xl bg-gradient-to-br from-[#F3F8FF] to-white border border-black/5 p-4">
                <p className="text-sm text-[#2B2D42] font-semibold mb-1">Tips</p>
                <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                  <li>Enter a clear topic, or upload a PDF, or a text and table based image.</li>
                  <li>Scanned PDFs and images are OCR’d; quality depends on clarity (no handwriting/diagrams).</li>
                  <li>“Mixed” creates both MCQs and short answers.</li>
                  <li>Click <b>Generate</b> to preview. Click <b>Save</b> to store and enable the share link.</li>
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
                    <span className="rounded-full bg_white px-2.5 py-1 text-xs font-semibold text-grey">
                      Total: {totalMarks}
                    </span>
                  </div>

                  <button
                    onClick={saveAndView}
                    disabled={saving}
                    className="group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white 
                      bg-gradient-to-r from-[#2B7A78] via-[#3AAFA9] to-[#7ED0B6] hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
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

          {/* Edit & Regenerate (AI) */}
          {false &&  (
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-5">
              <div className="flex items-center justify_between">
                <p className="text-sm font-semibold text-[#2B2D42]">Edit & Regenerate (AI)</p>
                <span className="text-xs text-gray-500">
                  Total Marks: <b>{totalMarks}</b>
                </span>
              </div>

              <p className="mt-1 text-xs text-gray-500">
                Describe changes (e.g., “replace Q3 with harder one”, “add 2 more MCQs about photosynthesis”, “increase difficulty”).
              </p>

              <textarea
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                placeholder="Type instructions for the AI to modify this quiz…"
                className="mt-3 w-full min-h-[110px] rounded-xl border border-gray-300/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#2E5EAA]/30"
              />

              <div className="mt-3 flex items-center gap-2">
                <button
                  disabled={generating || !editPrompt.trim()}
                  onClick={regenerateWithEdits}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text_white
                    bg-[#2E5EAA] hover:bg-[#264d8b] disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                  {generating ? "Applying edits…" : "Apply edits (AI)"}
                </button>
                <span className="text-xs text-gray-500">
                  This will regenerate a new <b>Quiz</b>.
                </span>
              </div>
            </div>
          )}
        </div>
      </SlideUp>

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
