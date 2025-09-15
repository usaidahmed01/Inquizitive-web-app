// src/schemas/quiz.js
import { z } from "zod";

const trimOne = (s) => s.trim();
const trimSquish = (s) => s.trim().replace(/\s+/g, " ");
const titleCase = (s) =>
  s
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export const QuizType = z.enum(["mcq", "short", "mixed"]);

/* ---------- Questions ---------- */
export const McqQuestion = z.object({
  type: z.literal("mcq"),
  prompt: z.string().min(5, "Question is too short").transform(trimSquish),
  choices: z
    .array(z.string().min(1).transform(trimSquish))
    .min(2, "At least 2 choices")
    .max(8, "Max 8 choices"),
  answerIndex: z.number().int().nonnegative(),
}).refine(
  (q) => q.answerIndex >= 0 && q.answerIndex < q.choices.length,
  { path: ["answerIndex"], message: "answerIndex must point to a choice" }
);

export const ShortQuestion = z.object({
  type: z.literal("short"),
  prompt: z.string().min(5, "Question is too short").transform(trimSquish),
  // optional model answer for later AI/manual grading
  answer: z.string().optional().transform((v) => (v ? trimSquish(v) : v)),
});

export const AnyQuestion = z.discriminatedUnion("type", [McqQuestion, ShortQuestion]);

/* ---------- Meta ---------- */
export const QuizMeta = z.object({
  type: QuizType,
  durationMin: z.number().int().min(5).max(120),
  difficulty: z.number().int().min(0).max(100).default(60),
});

/* ---------- Full quiz (saved/rendered) ---------- */
export const Quiz = z.object({
  id: z.string().transform(trimOne),
  classId: z.string().transform(trimOne),
  title: z.string().min(3).max(120).transform((t) => titleCase(trimSquish(t))),
  createdAt: z.string(), // ISO
  meta: QuizMeta,
  questions: z.array(AnyQuestion).min(1).max(50),
}).superRefine((quiz, ctx) => {
  const qs = quiz.questions;
  const hasMCQ = qs.some((q) => q.type === "mcq");
  const hasShort = qs.some((q) => q.type === "short");
  if (quiz.meta.type === "mcq" && hasShort) {
    ctx.addIssue({ path: ["meta", "type"], code: "custom", message: "meta.type is 'mcq' but found short questions" });
  }
  if (quiz.meta.type === "short" && hasMCQ) {
    ctx.addIssue({ path: ["meta", "type"], code: "custom", message: "meta.type is 'short' but found MCQ questions" });
  }
});

/* ---------- Generator input + preview ---------- */
export const GenerateQuizRequest = z.object({
  material: z.string().min(10, "Please provide more material"),
  quizType: QuizType,
  difficulty: z.number().int().min(0).max(100),
  count: z.number().int().min(1).max(50),
  durationMin: z.number().int().min(5).max(120),
});

export const QuizPreview = z.object({
  title: z.string().min(1).transform(trimSquish),
  meta: QuizMeta,
  questions: z.array(AnyQuestion).min(1),
});
