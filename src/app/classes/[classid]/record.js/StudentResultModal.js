"use client";

import { AnimatePresence, motion } from "framer-motion";
import Portal from "@/app/_components/Portal";
import { X, CheckCircle2, XCircle } from "lucide-react";

export default function StudentResultModal({ open, onClose, student, results, error }) {
  return (
    <AnimatePresence>
      {open && (
        <Portal>
          {/* backdrop */}
          <motion.div
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* modal */}
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div
              className="w-full max-w-2xl overflow-hidden rounded-2xl shadow-xl border border-black/5 "
              onClick={(e) => e.stopPropagation()}
            >
              {/* header */}
              <div className="relative px-6 py-5 bg-gradient-to-r from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA]">
                <h3 className="text-white font-bold text-lg">Quiz History</h3>
                <p className="text-white/90 text-sm">
                  {student?.name} • {student?.seat} • {student?.email}
                </p>
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* body */}
              <div className="p-6 space-y-4 bg-white">
                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4 text-sm">
                    {error}
                  </div>
                ) : !results ? (
                  <div className="text-sm text-gray-600">Preparing results…</div>
                ) : results.quizzes?.length === 0 ? (
                  <div className="text-sm text-gray-600">No quiz results yet.</div>
                ) : (
                  results.quizzes.map((r) => {
                    const pct = Math.round((r.score / r.total) * 100);
                    const pass = pct >= 50;
                    return (
                      <div
                        key={r.id}
                        className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-lg grid place-items-center ${pass ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                            {pass ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                          </div>
                          <div>
                            <p className="font-semibold text-[#1F2937]">{r.title}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(r.date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-700">
                            Score: <span className="font-semibold">{r.score}/{r.total}</span>
                          </p>
                          <p className={`text-xs font-semibold ${pass ? "text-emerald-700" : "text-red-700"}`}>
                            {pct}% {pass ? "Pass" : "Fail"}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
