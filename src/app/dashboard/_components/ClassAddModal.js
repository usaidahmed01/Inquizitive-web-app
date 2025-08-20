"use client";

import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Portal from "@/app/_components/Portal";

export default function ClassAddModal({ open, onClose, onCreate }) {
  const [dept, setDept] = useState("CS");      // "CS" | "SE"
  const [title, setTitle] = useState("");      // e.g., "Semester 3"
  const [code, setCode] = useState("");        // e.g., "CS-301"
  const [section, setSection] = useState("A"); // "A" | "B" (CS only)
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (dept === "SE") setSection("");
    else if (!section) setSection("A");
  }, [dept]);

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Required";
    if (!code.trim()) e.code = "Required";
    if (dept === "CS" && !section) e.section = "Select A or B";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    const cls = {
      id: "c_" + Math.random().toString(36).slice(2, 9),
      title,
      code,
      dept,
      section: dept === "CS" ? section : null,
      students: 0,
      nextQuiz: "-",
      semester: title,
    };

    onCreate?.(cls);
    onClose?.();

    // reset after close
    setTimeout(() => {
      setTitle(""); setCode("");
      setDept("CS"); setSection("A");
      setErrors({});
    }, 200);
  };

  return (
    <AnimatePresence>
      {open && (
        <Portal>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div className="w-full max-w-lg overflow-hidden rounded-2xl shadow-xl "
            onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="relative px-6 py-5 bg-gradient-to-r from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA]">
                <h3 className="text-white font-bold text-lg">Add New Class</h3>
                <p className="text-white/90 text-sm">Create a class to manage students & quizzes.</p>
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-2 rounded-full bg-white/15 hover:bg-white/25 text-white transition"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 bg-white">
                {/* Department (circle pills) */}
                <div>
                  <label className="block text-sm font-semibold text-[#2B2D42] mb-2">
                    Department
                  </label>
                  <div className="flex items-center gap-3">
                    {["CS", "SE"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDept(d)}
                        className={`h-10 px-4 rounded-full border transition font-semibold
                          ${dept === d
                            ? "bg-[#2E5EAA] text-white border-transparent shadow-sm"
                            : "bg-white text-[#2B2D42] border-gray-300 hover:bg-gray-50"}`}
                        aria-pressed={dept === d}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200" />

                {/* Class Title */}
                <div>
                  <label className="block text-sm font-semibold text-[#2B2D42] mb-2">
                    Class Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder='e.g., "Semester 3"'
                    className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#2E5EAA]/40
                      ${errors.title ? "border-red-400" : "border-gray-300"}`}
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </div>

                {/* Divider */}
                <div className="h-px bg-gray-200" />

                {/* Course Code */}
                <div>
                  <label className="block text-sm font-semibold text-[#2B2D42] mb-2">
                    Course Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder='e.g., "301" or "302"'
                    className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#2E5EAA]/40
                      ${errors.code ? "border-red-400" : "border-gray-300"}`}
                  />
                  {errors.code && <p className="text-xs text-red-500 mt-1">{errors.code}</p>}
                </div>

                {/* Divider (only show section block for CS) */}
                {dept === "CS" && <div className="h-px bg-gray-200" />}

                {/* Section (circle A/B) */}
                <AnimatePresence initial={false}>
                  {dept === "CS" && (
                    <motion.div
                      key="section"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                    >
                      <label className="block text-sm font-semibold text-[#2B2D42] mb-2">
                        Section <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-3">
                        {["A", "B"].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setSection(s)}
                            className={`h-10 w-10 rounded-full border transition font-semibold flex items-center justify-center
                              ${section === s
                                ? "bg-[#81B29A] text-white border-transparent shadow-sm"
                                : "bg-white text-[#2B2D42] border-gray-300 hover:bg-gray-50"}`}
                            aria-pressed={section === s}
                            title={`Section ${s}`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                      {errors.section && <p className="text-xs text-red-500 mt-1">{errors.section}</p>}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Divider */}
                <div className="h-px bg-gray-200" />

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>

                  {/* Attractive Create button */}
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl font-semibold text-white shadow-lg
                               bg-gradient-to-r from-[#2E5EAA] via-[#4A8FE7] to-[#81B29A]
                               hover:brightness-105 active:translate-y-[1px]
                               transition-[filter,transform] duration-200"
                  >
                    Create Class
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
