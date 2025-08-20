"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function QuizDetailPage() {
  const { quizId, classId } = useParams();
  const router = useRouter();
  const [quiz, setQuiz] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`inquiz_quiz_${quizId}`);
      if (raw) setQuiz(JSON.parse(raw));
    } catch {}
  }, [quizId]);

  if (!quiz) {
    return (
      <section className="max-w-3xl mx-auto p-6">
        <h1 className="text-xl font-semibold text-[#2B2D42]">Quiz not found</h1>
        <p className="text-gray-600 mt-2">It may not be saved yet.</p>
        <button
          onClick={() => router.push(`/classes/${classId}/quiz`)}
          className="mt-4 rounded-lg px-4 py-2 bg-[#2E5EAA] text-white hover:bg-[#264d8b] transition"
        >
          Back to Generate
        </button>
      </section>
    );
  }

  return (
    <section className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-[#2B2D42]">{quiz.title}</h1>
      <p className="text-sm text-gray-500 mt-1">
        Created {new Date(quiz.createdAt).toLocaleString()} • {quiz.meta?.count} question{quiz.meta?.count > 1 ? "s" : ""}
      </p>

      <div className="mt-6 space-y-5">
        {quiz.questions.map((q, idx) => (
          <div key={q.id} className="rounded-xl bg-white border border-black/5 shadow-sm p-5">
            <p className="font-semibold text-[#2B2D42]">
              Q{idx + 1}. {q.q}
            </p>

            {q.type === "mcq" ? (
              <ul className="mt-3 grid sm:grid-cols-2 gap-2">
                {q.options.map((opt, i) => (
                  <li
                    key={i}
                    className={`rounded-lg border px-3 py-2 text-sm
                                ${i === q.answerIndex ? "border-[#81B29A] bg-[#EAF5F0]" : "border-gray-200 bg-white"}`}
                  >
                    {opt}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
                <em>Expected answer:</em> {q.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
