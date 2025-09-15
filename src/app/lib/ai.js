// Simple API wrapper for your FastAPI backend.
// Set NEXT_PUBLIC_API_BASE in .env (e.g. http://localhost:8000)
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

/**
 * Call your FastAPI generator
 * @param {string} classId
 * @param {{
 *  material: string,
 *  quizType: 'mcq'|'short'|'mixed',
 *  difficulty: number,
 *  count: number,
 *  images?: string[] // (optional) data URLs or URLs, if you send them
 * }} payload
 * @returns {Promise<{title:string, meta:{type:string,difficulty:number,count:number}, questions:Array}>}
 */
export async function generateQuizAPI(classId, payload) {
  // If you don’t have the backend yet, keep the mock:
  if (!API_BASE) {
    // -------- MOCK (kept for local dev) --------
    const base = payload.material.split(/\s+/).filter(Boolean).slice(0, 20).join(" ");
    const questions = Array.from({ length: Math.max(1, Number(payload.count) || 10) })
      .map((_, i) => {
        const qText = `Q${i + 1}. ${base || "From uploaded material"} — concept ${i + 1}?`;
        if (payload.quizType === "short") {
          return { id: i + 1, type: "short", q: qText, a: "Short answer goes here." };
        }
        if (payload.quizType === "mcq") {
          return { id: i + 1, type: "mcq", q: qText, options: ["Option A","Option B","Option C","Option D"], answerIndex: i % 4 };
        }
        // mixed
        return i % 2 === 0
          ? { id: i + 1, type: "mcq", q: qText, options: ["Option A","Option B","Option C","Option D"], answerIndex: (i+1)%4 }
          : { id: i + 1, type: "short", q: qText, a: "Short answer goes here." };
      });

    return {
      title: "Generated Quiz (Preview)",
      meta: { type: payload.quizType, difficulty: payload.difficulty, count: questions.length },
      questions,
    };
  }

  // -------- REAL CALL (FastAPI) --------
  const res = await fetch(`${API_BASE}/classes/${classId}/quiz/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Generate failed: ${res.status}`);
  const data = await res.json();
  // Expect your FastAPI to return: { title, meta:{type,difficulty,count}, questions:[ ... ] }
  return data;
}
