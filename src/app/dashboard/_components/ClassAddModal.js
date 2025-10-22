"use client";

import { useState, useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import Portal from "@/app/_components/Portal";
import { supabase } from "@/app/lib/supabaseClient";

export default function ClassAddModal({ open, onClose, onCreate }) {
  const [dept, setDept] = useState("CS");      // "CS" | "SE" | "AI"
  const [title, setTitle] = useState("");      // course_name
  const [code, setCode] = useState("");        // exactly 3 digits
  const [sem, setSem] = useState(1);           // 1..8 (int)
  const [section, setSection] = useState("A"); // shown only for CS
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Show section only for CS
  useEffect(() => {
    if (dept === "CS") {
      if (!section) setSection("A");
    } else {
      setSection(""); // clear for SE/AI
    }
  }, [dept]); // eslint-disable-line

  // digits-only, max length 3
  const onCodeChange = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 3);
    setCode(digits);
  };

  // live validity for the code field
  const codeValid = useMemo(() => {
    if (!/^\d{3}$/.test(code)) return false;
    if (!sem) return false;
    return code[0] === String(sem);
  }, [code, sem]);

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = "Required";

    if (!/^\d{3}$/.test(code)) {
      e.code = "Code must be exactly 3 digits";
    } else if (sem && code[0] !== String(sem)) {
      e.code = `Code must start with ${sem} for sem ${sem}`;
    }

    if (dept === "CS" && !section) e.section = "Select A or B";
    if (!sem) e.sem = "Select sem";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      // 1) get token + user (teacher_id)
      const [{ data: sess }, { data: userData }] = await Promise.all([
        supabase.auth.getSession(),
        supabase.auth.getUser(),
      ]);
      const token = sess?.session?.access_token;
      const user = userData?.user;
      if (!token || !user?.id) {
        setErrors({ form: "You are not logged in. Please log in again." });
        return;
      }

      // 2) build DB payload (column names from your table)
      const payload = {
        course_name: title.trim(),
        course_code: code,
        department: dept.toLowerCase(),               // ✅ spelled correctly here
        semester: Number(sem),          // int4
        section: dept === "CS" ? section : null,
        teacher_id: user.id,            // uuid
        // created_at is DEFAULT in DB
      };

      // 3) call backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/classes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data: payload }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErrors({ form: j?.detail || "Failed to create class." });
        return;
      }

      const j = await res.json();
      const row = j?.inserted?.[0];
      if (!row) {
        setErrors({ form: "No class returned from server." });
        return;
      }

      // 4) map DB → UI shape used by Dashboard cards
      const cls = {
        id: row.class_id,                // map
        title: row.course_name,
        code: row.course_code,
        dept: row.department,
        sem: String(row.semester ?? sem),
        section: row.section,
        students: 0,                     // you can replace later with a count
      };

      onCreate?.(cls);
      onClose?.();

      // reset after close
      setTimeout(() => {
        setTitle(""); setCode("");
        setDept("CS"); setSection("A");
        setSem(1);
        setErrors({});
      }, 200);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <Portal>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
          >
            <div
              // className="w-full max-w-lg overflow-hidden rounded-2xl shadow-xl"
              className="w-full max-w-lg md:max-w-lg min-[1440px]:max-w-lg max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              {/* <div className="relative px-6 py-5 bg-gradient-to-r from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA]"> */}
              <div className="relative px-6 py-5 bg-gradient-to-r from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA] sticky top-0 z-10">
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
              {/* <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5 bg-white"> */}
              <form onSubmit={handleSubmit} className="px-7 py-6 md:px-8 md:py-7 space-y-6 overflow-y-auto bg-white">
                {/* Department (pills) */}
                <div>
                  <label className="block text-sm font-semibold text-[#2B2D42] mb-2">
                    Department
                  </label>
                  <div className="flex items-center gap-3">
                    {["CS", "SE", "AI"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDept(d)}
                        className={`h-10 px-4 rounded-full border transition font-semibold
                          ${dept === d
                            ? "bg-[#2E5EAA] text-white border-transparent shadow-sm"
                            : "bg-white text-[#2B2D42] border-gray-300 hover:bg-gray-50"}`}
                        aria-pressed={dept === d}
                        title={d}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-gray-200" />

                {/* Semester */}
                <div>
                  <label className="block text-sm font-semibold text-[#2B2D42] mb-2">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setSem(n)}
                        className={`h-10 w-10 rounded-full border transition font-semibold flex items-center justify-center
                          ${sem === n
                            ? "bg-[#81B29A] text-white border-transparent shadow-sm"
                            : "bg-white text-[#2B2D42] border-gray-300 hover:bg-gray-50"}`}
                        aria-pressed={sem === n}
                        title={`Semester ${n}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  {errors.sem && <p className="text-xs text-red-500 mt-1">{errors.sem}</p>}
                </div>

                <div className="h-px bg-gray-200" />

                {/* Course Name */}
                <div>
                  <label className="block text-sm font-semibold text-[#2B2D42] mb-2">
                    Course Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder='e.g., "Software Project Management"'
                    className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2 focus:ring-[#2E5EAA]/40
                      ${errors.title ? "border-red-400" : "border-gray-300"}`}
                  />
                  {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
                </div>

                <div className="h-px bg-gray-200" />

                {/* Course Code */}
                <div>
                  <label className="block text-sm font-semibold text-[#2B2D42] mb-2">
                    Course Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    value={code}
                    onChange={(e) => onCodeChange(e.target.value)}
                    placeholder={`e.g., ${sem ?? 1}01`}
                    className={`w-full rounded-lg border px-3 py-2 outline-none focus:ring-2
                      ${code.length === 0
                        ? "border-gray-300 focus:ring-[#2E5EAA]/40"
                        : codeValid
                          ? "border-green-400 focus:ring-green-400"
                          : "border-red-400 focus:ring-red-400"
                      }`}
                    maxLength={3}
                    inputMode="numeric"
                  />
                  {code.length > 0 && !codeValid && (
                    <p className="text-xs text-red-500 mt-1">
                      Code must be 3 digits and start with {sem}.
                    </p>
                  )}
                  {errors.code && code.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">{errors.code}</p>
                  )}
                </div>

                {/* Section (A/B) — CS only */}
                <AnimatePresence initial={false} mode="sync">
                  {dept === "CS" ? (
                    <motion.div
                      key="section"
                      initial={{ height: 0, opacity: 0, y: -6 }}
                      animate={{ height: "auto", opacity: 1, y: 0 }}
                      exit={{ height: 0, opacity: 0, y: -6 }}
                      transition={{ type: "spring", stiffness: 160, damping: 24, mass: 0.7 }}
                      className="overflow-hidden will-change-transform"
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
                  ) : null}
                </AnimatePresence>

                <div className="h-px bg-gray-200" />

                {/* Form error */}
                {errors.form && (
                  <p className="text-sm text-red-600 -mt-1">{errors.form}</p>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                    disabled={submitting}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl font-semibold text-white shadow-lg
                               bg-gradient-to-r from-[#2E5EAA] via-[#4A8FE7] to-[#81B29A]
                               hover:brightness-105 active:translate-y-[1px]
                               transition-[filter,transform] duration-200"
                  >
                    {submitting ? "Creating..." : "Create Class"}
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
