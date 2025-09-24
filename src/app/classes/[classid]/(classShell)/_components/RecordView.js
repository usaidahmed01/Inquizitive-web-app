"use client";

/**
 * RecordView — class records (readable/refactored, no logic changes)
 * - Displays student list with search/filter/sort.
 * - Opens a modal with per-student results (mocked fetch with AbortController).
 * - Exports a CSV using current mock data shape.
 *
 * TODO: put you db here later — replace local mocks & CSV data with real API:
 *   - openStudent: fetch(`/api/classes/${classId}/students/${id}/results`)
 *   - onEditStudent / onDeleteStudent: PATCH/DELETE calls
 */

import { useMemo, useState, useRef, useEffect } from "react";
import SlideUp from "@/app/_components/SlideUp";
import {
  Upload,
  Filter,
  Users,
  ChevronDown,
  Search,
  ChevronRight,
  Trophy,
  Wand2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StudentResultModal from "../record.js/StudentResultModal";

/* ------------------------ Mock seed (unchanged) ------------------------ */
const SEED_STUDENTS = [
  { id: "s1", name: "Ayesha Khan", seat: "B23110006177", email: "ayesha@uni.edu", average: 86, last: { quiz: "Quiz 3", score: 18, total: 20 } },
  { id: "s2", name: "Daniyal Raza", seat: "B23110006172", email: "daniyal@uni.edu", average: 72, last: { quiz: "Quiz 3", score: 15, total: 20 } },
  { id: "s3", name: "Hira Shah", seat: "B23110006171", email: "hira@uni.edu", average: 91, last: { quiz: "Quiz 2", score: 19, total: 20 } },
  { id: "s4", name: "Moiz Ali", seat: "B23110006179", email: "moiz@uni.edu", average: 65, last: { quiz: "Quiz 1", score: 13, total: 20 } },
];

/* ------------------------ Local CSS (spinner) ------------------------ */
const spinSlow = `
@keyframes spin-slow { to { transform: rotate(360deg) } }
.animate-spin-slow { animation: spin-slow 6s linear infinite; }
`;

export default function RecordView() {
  /* state: source of truth for the list (same behavior) */
  const [students, setStudents] = useState(SEED_STUDENTS);

  /* derived: distinct quiz titles present in "last" mocks (unchanged) */
  const quizTitles = useMemo(() => {
    const set = new Set(students.map((s) => s.last?.quiz).filter(Boolean));
    return Array.from(set);
  }, [students]);
  const quizzesConducted = quizTitles.length; // show "-" if 0 in UI

  /* derived: avg class score (same math, just named) */
  const avgClassScore = useMemo(() => {
    if (quizzesConducted === 0 || students.length === 0) return null;
    const sum = students.reduce((acc, s) => acc + (Number(s.average) || 0), 0);
    return Math.round(sum / students.length);
  }, [students, quizzesConducted]);

  /* derived: top performer (unchanged outcome) */
  const topPerformer = useMemo(() => {
    if (students.length === 0 || quizzesConducted === 0) return null;
    return students.slice().sort((a, b) => b.average - a.average)[0];
  }, [students, quizzesConducted]);

  /* toolbar filters (same semantics) */
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [minAvg, setMinAvg] = useState(0);
  const [sortBy, setSortBy] = useState("name");  // "name" | "average"
  const [sortDir, setSortDir] = useState("asc"); // "asc"  | "desc"

  /* modal + async results (unchanged behavior) */
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null); // { quizzes: [...] }
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  /* filter + sort list (same algorithm; wrapped + commented) */
  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    // text filter + min average gate
    let list = students.filter((s) => {
      const hay = `${s.name} ${s.seat} ${s.email}`.toLowerCase();
      return hay.includes(q) && s.average >= minAvg;
    });

    // stable sort by chosen key/direction
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "name") return a.name.localeCompare(b.name) * dir;
      if (sortBy === "average") return (a.average - b.average) * dir;
      return 0;
    });

    return list;
  }, [students, query, minAvg, sortBy, sortDir]);

  /* close filter on outside click (same behavior) */
  const popRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (!filterOpen) return;
      if (popRef.current && !popRef.current.contains(e.target)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filterOpen]);

  /* open student -> mock fetch results (kept identical semantics) */
  const openStudent = async (id) => {
    setOpenId(id);
    setResults(null);
    setError(null);

    // abort prior request if any
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      // TODO: put you db here later (swap to real API call)
      // const res = await fetch(`/api/classes/${classId}/students/${id}/results`, { signal: controller.signal });
      // if (!res.ok) throw new Error("Failed to load results");
      // const data = await res.json();

      await new Promise((r) => setTimeout(r, 700)); // mock latency
      const data = {
        quizzes: [
          { id: "q3", title: "Quiz 3", date: "2025-09-10T10:30:00Z", score: 18, total: 20 },
          { id: "q2", title: "Quiz 2", date: "2025-08-28T12:00:00Z", score: 10, total: 20 },
          { id: "q1", title: "Quiz 1", date: "2025-08-12T09:15:00Z", score: 8, total: 20 },
        ],
      };
      setResults(data);
    } catch (err) {
      if (err?.name !== "AbortError") setError("Could not load results");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setOpenId(null);
    setResults(null);
    setError(null);
    if (abortRef.current) abortRef.current.abort();
  };

  /* modal callbacks (frontend state only; API-ready) */
  const onEditStudent = async (id, { name, seat }) => {
    // TODO: put you db here later (PATCH)
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, name, seat } : s)));
  };

  const onDeleteStudent = async (id) => {
    // TODO: put you db here later (DELETE)
    setStudents((prev) => prev.filter((s) => s.id !== id));
    if (openId === id) closeModal();
  };

  // simple CSV escaper (handles commas, quotes, newlines)
  const csv = (v = "") => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };


  /* export CSV — uses quizTitles derived above (unchanged output intention) */

  const handleExport = () => {
    if (students.length === 0) {
      alert("No students to export");
      return;
    }

    // TODO: replace these with real values from DB later
    const meta = {
      university: "University of Karachi",
      exam: "(SEMESTER EXAMINATION)",
      faculty: "FACULTY OF SCIENCE",
      department: "Computer Science",
      class: "BS – 2nd year (Sec-B)",
      teacher: "Dr. Humera Bashir",
      courseNo: "BSCS-459",
      courseTitle: "Probability & Statistics",
      examDate: "22-05-2025",
    };

    // ---- Build quiz index (ordered) ----
    // Gather all quiz occurrences across students (preferring s.results; fallback to s.last)
    const quizSeen = new Map(); // key = canonical title; value = earliest timestamp or insertion order
    let orderCounter = 0;
    const asTime = (d) => {
      const t = Date.parse(d);
      return Number.isFinite(t) ? t : undefined;
    };

    students.forEach((s) => {
      const results = Array.isArray(s.results) && s.results.length > 0
        ? s.results
        : (s.last ? [{ title: s.last.quiz, date: s.last.date, score: s.last.score, total: s.last.total }] : []);

      results.forEach((r) => {
        if (!r?.title) return;
        const key = String(r.title);
        const t = asTime(r.date);
        if (!quizSeen.has(key)) {
          quizSeen.set(key, { key, firstTime: t ?? null, order: orderCounter++ });
        } else {
          // keep earliest time if any
          const prev = quizSeen.get(key);
          if (prev.firstTime == null && t != null) prev.firstTime = t;
          else if (prev.firstTime != null && t != null && t < prev.firstTime) prev.firstTime = t;
        }
      });
    });

    // Sort keys by date if any date exists; otherwise by first-seen order
    const quizKeysSorted = Array.from(quizSeen.values())
      .sort((a, b) => {
        if (a.firstTime != null && b.firstTime != null) return a.firstTime - b.firstTime;
        if (a.firstTime != null) return -1;
        if (b.firstTime != null) return 1;
        return a.order - b.order;
      })
      .map((q) => q.key);

    // Numbered labels: Quiz 1, Quiz 2, ...
    const numberedQuizLabels = quizKeysSorted.map((_, i) => `Quiz ${i + 1}`);

    // ---- Header block (no “Major Dept / Year / Credit hours”) ----
    const headerLines = [
      csv(meta.university),
      csv(meta.exam),
      csv(meta.faculty),
      "",
      `${csv("Department")},${csv(meta.department)}`,
      `${csv("Class")},${csv(meta.class)}`,
      `${csv("Teacher's Name")},${csv(meta.teacher)}`,
      `${csv("Course No.")},${csv(meta.courseNo)}`,
      `${csv("Date of Examination held")},${csv(meta.examDate)}`,
      `${csv("Course Title")},${csv(meta.courseTitle)}`,
      "", // spacer before the table
    ];

    // ---- Table header (no Total In Words / Final Grade / Remarks) ----
    const tableHeader = [
      "S.#",
      "Seat No.",
      "Student's Name",
      "Terminal 100",
      ...numberedQuizLabels,
    ].map(csv).join(",");

    // Helper to get a student's score for a given quiz key
    const getScoreFor = (student, quizKey) => {
      // prefer results array
      if (Array.isArray(student.results) && student.results.length > 0) {
        const r = student.results.find((q) => q.title === quizKey);
        return r ? `${r.score}/${r.total}` : "-";
      }
      // fallback to last
      if (student.last?.quiz === quizKey) {
        const r = student.last;
        return `${r.score}/${r.total}`;
      }
      return "-";
    };

    // ---- Rows ----
    const rows = students.map((s, idx) => {
      const terminal = Math.round(Number(s.average) || 0); // replace with real "Terminal 100" later
      const quizCells = quizKeysSorted.map((key) => getScoreFor(s, key));

      return [
        idx + 1,
        s.seat,
        s.name,
        terminal,
        ...quizCells,
      ].map(csv).join(",");
    });

    // ---- Build & download CSV ----
    const out = [
      ...headerLines,
      tableHeader,
      ...rows,
    ].join("\n");

    const blob = new Blob([`\uFEFF${out}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "class-marksheet.csv";
    a.click();
    URL.revokeObjectURL(url);
  };


  return (
    <SlideUp>
      {/* local animation helper */}
      <style>{spinSlow}</style>

      <div className="space-y-6">
        {/* ----------------------- Stats Row ----------------------- */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total Students */}
          <StatCard
            accent="from-[#2E5EAA]/15"
            icon={<Users size={18} className="text-[#2E5EAA]" aria-hidden="true" />}
            label="Total Students"
            value={students.length}
            hint="Active this term"
          />

          {/* Quizzes Conducted */}
          <StatPlain
            blob="bg-[#81B29A]/10"
            label="Quizzes Conducted"
            value={quizzesConducted === 0 ? "-" : quizzesConducted}
            hint={quizzesConducted === 0 ? "No quizzes yet" : "Across recent weeks"}
          />

          {/* Average Class Score */}
          <StatPlain
            blob="bg-[#4A8FE7]/10"
            label="Avg Class Score"
            value={avgClassScore == null ? "-" : `${avgClassScore}%`}
            hint={avgClassScore == null ? "Awaiting first quiz" : "Based on latest records"}
            chip={avgClassScore == null ? null : avgClassScore >= 75 ? "Great" : avgClassScore >= 60 ? "Fair" : "Needs Work"}
          />

          {/* Top Performer */}
          <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
            <div className="absolute -top-8 -right-8 h-28 w-28 rounded-full bg-[#F2A541]/15 blur-2xl" aria-hidden="true" />
            <div className="p-5">
              <p className="text-xs text-gray-500">Top Performer</p>
              {topPerformer ? (
                <>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[12px] text-amber-800">
                      <Trophy size={12} aria-hidden="true" /> {topPerformer.average}%
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] font-semibold text-[#2B2D42]">{topPerformer.name}</p>
                  <p className="text-[12px] text-gray-500">{topPerformer.seat}</p>
                </>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-[13px] text-gray-600">
                  <Wand2 size={16} className="text-[#2E5EAA]" aria-hidden="true" />
                  <span>Will appear after your first quiz</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ----------------------- Toolbar ----------------------- */}
        <div className="relative z-40 rounded-2xl border border-black/5 bg-white/80 p-4 shadow-sm backdrop-blur">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px] flex-1">
              <label htmlFor="student-search" className="sr-only">Search students</label>
              <input
                id="student-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, seat #, or email"
                className="w-full rounded-xl border border-gray-300/70 px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#2E5EAA]/30"
              />
              <Search
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                aria-hidden="true"
              />
            </div>

            {/* Filters */}
            <div className="relative" ref={popRef}>
              <button
                type="button"
                onClick={() => setFilterOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300/70 px-3 py-2 text-sm transition hover:bg-gray-50"
                aria-expanded={filterOpen}
                aria-controls="filters-popover"
              >
                <Filter size={16} aria-hidden="true" />
                Filters
                <ChevronDown size={14} className={`transition ${filterOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>

              {filterOpen && (
                <div
                  id="filters-popover"
                  role="dialog"
                  aria-label="Student filters"
                  className="absolute left-0 top-full z-[60] mt-2 w-64 rounded-xl border border-black/5 bg-white p-3 shadow-lg"
                >
                  <label className="mb-1 block text-xs text-gray-500">Minimum Average</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={minAvg}
                      onChange={(e) => setMinAvg(Number(e.target.value))}
                      className="w-full"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={minAvg}
                    />
                    <span className="w-10 text-right text-sm">{minAvg}%</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Sort by</label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full rounded-lg border border-gray-300/70 px-2 py-1.5 text-sm"
                      >
                        <option value="name">Name</option>
                        <option value="average">Average</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Direction</label>
                      <select
                        value={sortDir}
                        onChange={(e) => setSortDir(e.target.value)}
                        className="w-full rounded-lg border border-gray-300/70 px-2 py-1.5 text-sm"
                      >
                        <option value="asc">Asc</option>
                        <option value="desc">Desc</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Export */}
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300/70 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-gray-50"
                title="Export visible records as CSV"
              >
                <Upload size={16} aria-hidden="true" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* ----------------------- Tappable List ----------------------- */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredSorted.map((s, i) => (
              <motion.button
                key={s.id}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                onClick={() => openStudent(s.id)}
                className="group relative w-full overflow-hidden rounded-2xl border border-black/5 bg-white p-4 text-left shadow-sm transition hover:shadow-md"
                aria-label={`Open ${s.name}'s results`}
              >
                {/* sheen */}
                <span
                  className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/3 rotate-12 bg-white/10 transition-transform duration-700 group-hover:translate-x-[180%]"
                  aria-hidden="true"
                />

                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex items-center gap-4">
                    {/* avatar initials */}
                    <div
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl font-semibold text-white"
                      style={{ background: "linear-gradient(135deg, #2E5EAA 0%, #81B29A 60%, #4A8FE7 100%)" }}
                      aria-hidden="true"
                    >
                      {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-semibold text-[#1F2937]">{s.name}</p>
                        {s.average >= 85 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-700">
                            <Trophy size={12} aria-hidden="true" /> Top
                          </span>
                        )}
                      </div>
                      <p className="truncate text-sm text-gray-600">{s.seat}</p>
                      <p className="text-[12px] text-gray-500">{s.email}</p>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-4">
                    {/* progress ring only when at least one quiz exists */}
                    {quizzesConducted > 0 && (
                      <div className="relative grid h-14 w-14 place-items-center rounded-full bg-gray-100">
                        <svg className="absolute left-0 top-0 h-full w-full -rotate-90" aria-hidden="true">
                          {/* track */}
                          <circle cx="28" cy="28" r="24" stroke="#e5e7eb" strokeWidth="4" fill="transparent" />
                          {/* progress */}
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke={
                              s.average >= 80
                                ? "#4ade80"
                                : s.average >= 65
                                  ? "#fbbf24"
                                  : s.average >= 50
                                    ? "#fb923c"
                                    : "#f87171"
                            }
                            strokeWidth="4"
                            fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 24}`}
                            strokeDashoffset={`${2 * Math.PI * 24 * (1 - s.average / 100)}`}
                            strokeLinecap="round"
                          />
                        </svg>
                        <span className="text-sm font-bold text-[#2B2D42]">{s.average}%</span>
                      </div>
                    )}

                    <ChevronRight className="text-gray-400 transition group-hover:text-[#2E5EAA]" aria-hidden="true" />
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>

          {/* empty state (unchanged meaning) */}
          {filteredSorted.length === 0 && (
            <div className="rounded-2xl border border-black/5 bg-white p-10 text-center shadow-sm">
              <p className="mt-2 font-semibold text-[#2B2D42]">No students found</p>
              <p className="text-sm text-gray-600">Try a different search or filters.</p>
            </div>
          )}
        </div>

        {/* ----------------------- Loading Overlay ----------------------- */}
        <AnimatePresence>
          {loading && (
            <motion.div
              className="fixed inset-0 z-[80] grid place-items-center bg-black/25 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              role="status"
              aria-live="polite"
              aria-label="Loading student results"
            >
              <div className="rounded-xl border border-white/50 bg-white/90 px-4 py-3 text-sm text-gray-700 shadow-sm">
                Loading student results…
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ----------------------- Modal ----------------------- */}
        <StudentResultModal
          open={!!openId}
          onClose={closeModal}
          student={students.find((s) => s.id === openId) || null}
          results={results}
          error={error}
          onEditStudent={onEditStudent}
          onDeleteStudent={onDeleteStudent}
        />
      </div>
    </SlideUp>
  );
}

/* ============================== UI bits ============================== */

/** stat card with icon (students) */
function StatCard({ accent, icon, label, value, hint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className={`absolute -top-8 -right-6 h-28 w-28 rounded-full ${accent} blur-2xl`} aria-hidden="true" />
      <div className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E5EAA]/15">
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-bold text-[#2B2D42]">{value}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

/** simpler stat card (quizzes conducted, average) */
function StatPlain({ blob, label, value, hint, chip = null }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className={`absolute -top-10 -left-6 h-32 w-32 rounded-full ${blob} blur-2xl`} aria-hidden="true" />
      <div className="p-5">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="mt-1 flex items-end gap-2">
          <p className="text-2xl font-bold text-[#2B2D42]">{value}</p>
          {chip && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-600">
              {chip}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>
      </div>
    </div>
  );
}