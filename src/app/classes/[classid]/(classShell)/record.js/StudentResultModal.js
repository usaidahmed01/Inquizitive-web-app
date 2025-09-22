"use client";

import { AnimatePresence, motion } from "framer-motion";
import Portal from "@/app/_components/Portal";
import ConfirmModal from "../_components/ConfirmModal";
import { X, CheckCircle2, XCircle, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const SEAT_REGEX = /^B\d{11}$/;

/* ---------------- Polished empty-state for no quizzes ---------------- */
function NoQuizEmpty() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm p-6 text-center">
      {/* moving light streak */}
      <span className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/3 rotate-12 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shine" />
      {/* glossy icon pill */}
      <div
        className="mx-auto mb-2 h-10 w-10 rounded-full grid place-items-center"
        style={{
          background: "linear-gradient(135deg,#EAF2FF 0%,#F4FFF9 100%)",
          boxShadow:
            "0 6px 16px rgba(46,94,170,.15), inset 0 0 14px rgba(129,178,154,.25)",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" className="opacity-80">
          <path
            d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M16.3 7.7l2.1-2.1M5.6 18.4l2.1-2.1"
            stroke="#2E5EAA"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="font-semibold text-[#1F2937]">No quiz results yet</p>
      <p className="mt-1 text-sm text-gray-600">
        Once the first quiz is conducted, it’ll appear here with scores &amp; status.
      </p>
    </div>
  );
}

/* ---------------- Main modal ---------------- */
export default function StudentResultModal({
  open,
  onClose,
  student,
  results,
  error,
  onEditStudent, // (id, { name, seat }) => void
  onDeleteStudent, // (id) => void
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);

  // safe fallbacks
  const s = student || { id: "", name: "", seat: "", email: "" };

  return (
    <>
      {/* local keyframes for sheen */}
      <style>{`
        @keyframes shine {
          0%   { transform: translateX(-120%) rotate(12deg); }
          100% { transform: translateX(220%)  rotate(12deg); }
        }
        .animate-shine { animation: shine 1.8s linear infinite; }
      `}</style>

      <AnimatePresence>
        {open && (
          <Portal>
            {/* backdrop */}
            <motion.div
              className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
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
                className="w-full max-w-2xl overflow-hidden rounded-2xl shadow-xl border border-black/5"
                onClick={(e) => e.stopPropagation()}
              >
                {/* header */}
                <div className="relative px-6 py-5 bg-gradient-to-r from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA]">
                  <h3 className="text-white font-bold text-lg">Quiz History</h3>
                  <p className="text-white/90 text-sm">
                    {s.name} • {s.seat} • {s.email}
                  </p>

                  {/* actions */}
                  <div className="absolute top-3 right-3 flex items-center gap-2">
                    <button
                      onClick={() => setEditOpen(true)}
                      className="h-9 w-9 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white transition"
                      title="Edit student"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => setDelOpen(true)}
                      className="h-9 w-9 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white transition"
                      title="Delete student"
                    >
                      <Trash2 size={18} />
                    </button>
                    <button
                      onClick={onClose}
                      className="h-9 w-9 grid place-items-center rounded-full bg-white/15 hover:bg-white/25 text-white transition"
                      aria-label="Close"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* body */}
                <div className="p-6 bg-white max-h-[60vh] overflow-y-auto space-y-4">
                  {error ? (
                    <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-4 text-sm">
                      {error}
                    </div>
                  ) : !results ? (
                    <div className="text-sm text-gray-600">Preparing results…</div>
                  ) : results.quizzes?.length === 0 ? (
                    <NoQuizEmpty />
                  ) : (
                    results.quizzes.map((r) => {
                      const pct =
                        r && Number.isFinite(r?.total) && r.total > 0
                          ? Math.round((r.score / r.total) * 100)
                          : 0;
                      const pass = pct >= 50;
                      return (
                        <div
                          key={r.id}
                          className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-lg grid place-items-center ${
                                pass
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {pass ? (
                                <CheckCircle2 size={18} />
                              ) : (
                                <XCircle size={18} />
                              )}
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
                              Score:{" "}
                              <span className="font-semibold">
                                {r.score}/{r.total}
                              </span>
                            </p>
                            <p
                              className={`text-xs font-semibold ${
                                pass ? "text-emerald-700" : "text-red-700"
                              }`}
                            >
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

            {/* Edit modal */}
            <EditStudentModal
              open={editOpen}
              onClose={() => setEditOpen(false)}
              student={s}
              onSave={async (payload) => {
                await onEditStudent?.(s.id, payload);
                setEditOpen(false);
              }}
            />

            {/* Delete confirm */}
            <ConfirmModal
              open={delOpen}
              onClose={() => setDelOpen(false)}
              title="Delete student?"
              message={`This will remove ${s.name} (${s.seat}) from the class.`}
              confirmText="Delete"
              onConfirm={async () => {
                await onDeleteStudent?.(s.id);
                setDelOpen(false);
                onClose(); // close parent modal too
              }}
            />
          </Portal>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------------- Edit Student Modal (name + seat) ---------------- */
function EditStudentModal({ open, onClose, student, onSave }) {
  const [name, setName] = useState(student?.name || "");
  const [seat, setSeat] = useState(student?.seat || "");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName(student?.name || "");
      setSeat(student?.seat || "");
      setTouched(false);
    }
  }, [open, student]);

  const seatValid = SEAT_REGEX.test(seat || "");
  const nameValid = (name || "").trim().length >= 2;
  const canSave = seatValid && nameValid;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[1001] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-0 z-[1002] flex items-center justify-center p-4"
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6">
                <h3 className="text-lg font-semibold text-[#2B2D42]">Edit Student</h3>
                <p className="text-sm text-gray-600">Update name or seat number.</p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Full name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => setTouched(true)}
                    placeholder="Student name"
                    className={`w-full h-11 rounded-lg border px-3 outline-none focus:ring-2 ${
                      !touched || nameValid
                        ? "border-gray-300/70 focus:ring-[#2E5EAA]/30"
                        : "border-red-300 focus:ring-red-200"
                    }`}
                  />
                  {!nameValid && touched && (
                    <p className="mt-1 text-xs text-red-600">
                      Name must be at least 2 characters.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-gray-600 mb-1">Seat number</label>
                  <input
                    value={seat}
                    onChange={(e) => setSeat(e.target.value.toUpperCase().trim())}
                    onBlur={() => setTouched(true)}
                    placeholder="e.g. B23110006177"
                    className={`w-full h-11 rounded-lg border px-3 outline-none focus:ring-2 ${
                      !touched || seatValid
                        ? "border-gray-300/70 focus:ring-[#2E5EAA]/30"
                        : "border-red-300 focus:ring-red-200"
                    }`}
                  />
                  {!seatValid && touched && (
                    <p className="mt-1 text-xs text-red-600">
                      Seat format must match B + 11 digits (e.g. B23110006177).
                    </p>
                  )}
                </div>
              </div>
              <div className="px-6 pb-6 pt-2 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-gray-300/70 px-4 py-2 text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    onSave?.({
                      name: formatName(name),
                      seat,
                    })
                  }
                  disabled={!canSave}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition ${
                    canSave ? "bg-[#2E5EAA] hover:bg-[#264d8b]" : "bg-gray-300 cursor-not-allowed"
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------- utils ---------------- */
function formatName(input) {
  return input
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
