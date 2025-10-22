import { getSessionToken } from "./auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "";

async function req(path, { method = "GET", body } = {}) {
  const token = await getSessionToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `HTTP ${res.status}`);
  }
  return res.json().catch(() => ({}));
}

export async function generateQuizAPI(classId, payload) {
  return req(`/classes/${encodeURIComponent(classId)}/quiz/generate`, {
    method: "POST",
    body: payload,
  });
}

export const QuizAPI = {
  listByClass: (classId) => req(`/quizzes?class_id=${encodeURIComponent(classId)}`),
  create: (payload) => req(`/quizzes`, { method: "POST", body: payload }),
  getFull: (quizId) => req(`/quizzes/${encodeURIComponent(quizId)}/full`),
  delete: (quizId) => req(`/quizzes/${encodeURIComponent(quizId)}`, { method: "DELETE" }),
  submitResult: (payload) => req(`/results`, { method: "POST", body: payload }),
};
