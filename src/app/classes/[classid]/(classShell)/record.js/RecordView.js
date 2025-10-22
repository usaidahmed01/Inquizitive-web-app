"use client";

// /**
//  * RecordView — DB-wired (seat_no keyed)
//  * - Loads class snapshot from /classes/:id/records
//  * - Modal loads real results per student (by seat_no)
//  * - Edit wired to PATCH /classes/:id/student/:seat  ← seat-based flow
//  * - Delete wired to DELETE /classes/:id/student/:seat
//  * - CSV export fetches results per seat and builds a marksheet
//  */



import { useMemo, useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
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
import StudentResultModal from "./StudentResultModal";

const API = process.env.NEXT_PUBLIC_API_BASE;

const spinSlow = `
@keyframes spin-slow { to { transform: rotate(360deg) } }
.animate-spin-slow { animation: spin-slow 6s linear infinite; }
`;

export default function RecordView() {
  const { classid } = useParams();
  const classId = String(classid || "");

  const [students, setStudents] = useState([]);
  const [quizzesConducted, setQuizzesConducted] = useState(0);
  const [avgClassScore, setAvgClassScore] = useState(null);
  const [topPerformer, setTopPerformer] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [minAvg, setMinAvg] = useState(0);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const [classMeta, setClassMeta] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setPageLoading(true);
      try {
        const r = await fetch(`${API}/classes/${classId}/records`);
        const j = await r.json();
        if (!alive) return;
        setStudents(j.students || []);
        setQuizzesConducted(j.quizzesConducted || 0);
        setAvgClassScore(j.avgClassScore ?? null);
        setTopPerformer(j.topPerformer ?? null);
      } catch {
        if (alive) {
          setStudents([]);
          setQuizzesConducted(0);
          setAvgClassScore(null);
          setTopPerformer(null);
        }
      } finally {
        if (alive) setPageLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [classId]);

  const quizTitles = useMemo(() => {
    const set = new Set(students.map((s) => s.last?.quiz).filter(Boolean));
    return Array.from(set);
  }, [students]);

  const minAvgDisabled = students.length === 0 || quizzesConducted === 0;

  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = students.filter((s) => {
      const hay = `${s.name || ""} ${s.seat || ""} ${s.email || ""}`.toLowerCase();
      const okAvg = s.average == null ? true : s.average >= minAvg;
      return hay.includes(q) && (minAvgDisabled ? true : okAvg);
    });
    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "") * dir;
      if (sortBy === "average") return ((a.average ?? -1) - (b.average ?? -1)) * dir;
      return 0;
    });
    return list;
  }, [students, query, minAvg, sortBy, sortDir, minAvgDisabled]);

  const popRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (!filterOpen) return;
      if (popRef.current && !popRef.current.contains(e.target)) setFilterOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [filterOpen]);

  const openStudent = async (key) => {
    const seat = (key || "").toString().toUpperCase();
    if (!seat) return;
    setOpenId(seat);
    setResults(null);
    setError(null);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const r = await fetch(
        `${API}/classes/${classId}/student/${encodeURIComponent(seat)}/results`,
        { signal: controller.signal }
      );
      if (!r.ok) throw new Error("Failed to load results");
      const data = await r.json();
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

  const onEditStudent = async (idLike, { name, seat, email, prevSeat }) => {
    const seatKey = (idLike || "").toString().toUpperCase();
    const patch = {
      full_name: (name || "").trim(),
      seat_no: (seat || "").toUpperCase(),
      email: (email || "").trim(),
    };
    try {
      const res = await fetch(
        `${API}/classes/${classId}/student/${encodeURIComponent(seatKey)}`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        const msg = String(j?.detail || "Update failed");
        if (res.status === 409 || msg.toLowerCase().includes("already taken")) {
          throw new Error("That seat number is already assigned to another student.");
        }
        throw new Error(msg);
      }
      setStudents((prev) =>
        prev.map((s) =>
          (s.seat || s.id) === seatKey
            ? { ...s, name: patch.full_name || s.name, seat: patch.seat_no || s.seat, email: patch.email || s.email }
            : s
        )
      );
      if (openId && prevSeat && patch.seat_no && openId.toUpperCase() === prevSeat.toUpperCase()) {
        setOpenId(patch.seat_no.toUpperCase());
      }
    } catch (e) { alert(e?.message || "Could not update student."); }
  };

  const onDeleteStudent = async (idLike) => {
    const seatKey = (idLike || "").toString().toUpperCase();
    try {
      const res = await fetch(`${API}/classes/${classId}/student/${encodeURIComponent(seatKey)}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setStudents((prev) => prev.filter((s) => (s.seat || s.id) !== seatKey));
      if (openId === seatKey) closeModal();
    } catch { }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API}/classes/${classId}/meta`);
        const j = r.ok ? await r.json() : null;
        if (!alive) return;
        setClassMeta(j);
      } catch { if (alive) setClassMeta(null); }
    })();
    return () => { alive = false; };
  }, [classId]);

  const prettyDept = (code = "") => {
    const c = String(code).trim().toLowerCase();
    if (c === "se") return "Software Engineering";
    if (c === "cs") return "Computer Science";
    if (c === "ai") return "Artificial Intelligence";
    return code?.toString() || "-";
  };
  const semesterToYear = (sem) => {
    const n = Number(sem) || 0;
    const year = Math.max(1, Math.ceil(n / 2));
    const ord = (k) => (k === 1 ? "1st" : k === 2 ? "2nd" : k === 3 ? "3rd" : `${k}th`);
    return `${ord(year)} year`;
  };

  const resolveTeacherName = async () => {
    try {
      let token = localStorage.getItem("access_token");
      if (!token) {
        const keys = Object.keys(localStorage);
        const sbKey = keys.find((k) => k.includes("sb-") && k.endsWith("-auth-token"));
        if (sbKey) {
          const raw = localStorage.getItem(sbKey);
          if (raw) {
            try { const parsed = JSON.parse(raw); token = parsed?.access_token || parsed?.currentSession?.access_token || null; } catch { }
          }
        }
      }
      if (!token) return "";
      const r = await fetch(`${API}/profiles/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) return "";
      const j = await r.json();
      return j?.row?.full_name || j?.row?.email || "";
    } catch { return ""; }
  };

  const handleExport = async () => {
    if (!students.length) return alert("No students to export");
    const ids = students.map((s) => s.seat || s.id).filter(Boolean);
    let allResultsBySeat = new Map();
    try {
      const chunks = await Promise.all(
        ids.map((seat) => fetch(`${API}/classes/${classId}/student/${encodeURIComponent(seat)}/results`).then((r) => r.json()))
      );
      chunks.forEach((r, i) => {
        allResultsBySeat.set(String(ids[i]), Array.isArray(r?.quizzes) ? r.quizzes : []);
      });
    } catch { alert("Failed to fetch results for CSV."); return; }

    const quizSeen = new Map();
    let orderCounter = 0;
    const toTime = (d) => { const t = Date.parse(d); return Number.isFinite(t) ? t : null; };
    students.forEach((s) => {
      const sid = s.seat || s.id;
      const res = allResultsBySeat.get(String(sid)) || [];
      res.forEach((q) => {
        if (!q?.title) return;
        const key = String(q.title);
        const t = toTime(q.date);
        if (!quizSeen.has(key)) quizSeen.set(key, { firstTime: t, order: orderCounter++ });
        else {
          const prev = quizSeen.get(key);
          if (prev.firstTime == null && t != null) prev.firstTime = t;
          else if (prev.firstTime != null && t != null && t < prev.firstTime) prev.firstTime = t;
        }
      });
    });

    const quizKeysSorted = Array.from(quizSeen.entries())
      .sort((a, b) => {
        const A = a[1], B = b[1];
        if (A.firstTime != null && B.firstTime != null) return A.firstTime - B.firstTime;
        if (A.firstTime != null) return -1;
        if (B.firstTime != null) return 1;
        return A.order - B.order;
      })
      .map(([key]) => key);

    const numberLabels = quizKeysSorted.map((_, i) => `Quiz ${i + 1}`);

    const deptCode = (classMeta?.department || "").toString().toUpperCase();
    const deptFull = prettyDept(classMeta?.department);
    const courseCode = classMeta?.course_code || "";
    const courseTitle = classMeta?.course_name || "";
    const section = classMeta?.section ? `Sec-${classMeta.section}` : "";
    const classYear = classMeta?.semester ? semesterToYear(classMeta.semester) : "";
    const classLabel = ["BS", "–", classYear, section].filter(Boolean).join(" ");

    let teacherName = await resolveTeacherName();
    if (!teacherName) {
      teacherName = classMeta?.teacher_name || classMeta?.instructor_name || classMeta?.teacher_full_name || "";
    }

    const latestDateMs = Math.max(
      -Infinity,
      ...students.map((s) => Date.parse(s?.last?.date)).filter((t) => Number.isFinite(t))
    );
    const fmtDate = (ms) => {
      if (!Number.isFinite(ms)) return "-";
      const d = new Date(ms);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    };

    const meta = {
      university: "University of Karachi",
      exam: "(SEMESTER EXAMINATION)",
      faculty: "FACULTY OF SCIENCE",
      department: deptFull,
      class: classLabel,
      teacher: teacherName,
      courseNo: `BS${deptCode}-${courseCode}`.trim(),
      courseTitle: courseTitle,
      examDate: fmtDate(latestDateMs),
    };

    const csv = (v = "") => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

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
      "",
    ];

    const tableHeader = [
      "S.#",
      "Seat No.",
      "Student's Name",
      "Total Obtained",
      "Total Marks",
      ...numberLabels,
    ].map(csv).join(",");

    const scoreFor = (seatKey, quizTitle) => {
      const arr = allResultsBySeat.get(seatKey) || [];
      const r = arr.find((q) => q.title === quizTitle);
      if (!r) return "-";
      const sc = r.score ?? "-";
      const tt = r.total ?? "";
      return tt ? `${sc}\u2215${tt}` : `${sc}`;
    };

    const got = (s) =>
      Number.isFinite(s?.total_obtained) ? s.total_obtained :
        Number.isFinite(s?.totals?.obtained) ? s.totals.obtained : 0;
    const tot = (s) =>
      Number.isFinite(s?.total_possible) ? s.total_possible :
        Number.isFinite(s?.totals?.total) ? s.totals.total : 0;

    const rows = students.map((s, idx) => {
      const seatKey = s.seat || s.id;
      const quizCells = quizKeysSorted.map((title) => scoreFor(String(seatKey), title));
      return [idx + 1, s.seat || "", s.name || "", got(s), tot(s), ...quizCells].map(csv).join(",");
    });

    const out = [...headerLines, tableHeader, ...rows].join("\n");
    const blob = new Blob([`\uFEFF${out}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${meta.courseNo}-marksheet.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SlideUp>
      <style>{spinSlow}</style>

      <AnimatePresence>
        {pageLoading && (
          <motion.div
            className="rounded-2xl border border-black/5 bg-white p-4 sm:p-6 text-center shadow-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            Loading class records…
          </motion.div>
        )}
      </AnimatePresence>

      {!pageLoading && (
        <div className="space-y-4 sm:space-y-6">
          {/* Stats */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              accent="from-[#2E5EAA]/15"
              icon={<Users size={18} className="text-[#2E5EAA]" aria-hidden="true" />}
              label="Total Students"
              value={students.length}
              hint="Active this term"
            />

            <StatPlain
              blob="bg-[#81B29A]/10"
              label="Quizzes Conducted"
              value={quizzesConducted === 0 ? "-" : quizzesConducted}
              hint={quizzesConducted === 0 ? "No quizzes yet" : "Across recent weeks"}
            />

            {quizzesConducted > 0 && (
              <StatPlain
                blob="bg-[#4A8FE7]/10"
                label="Avg Class Score"
                value={avgClassScore == null ? "-" : `${avgClassScore}%`}
                hint="Based on latest records"
                chip={
                  avgClassScore == null ? null
                    : avgClassScore >= 75 ? "Great"
                      : avgClassScore >= 60 ? "Fair" : "Needs Work"
                }
              />
            )}

            {quizzesConducted > 0 && (
              <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                <div className="absolute -top-8 -right-8 h-24 sm:h-28 w-24 sm:w-28 rounded-full bg-[#F2A541]/15 blur-2xl" aria-hidden="true" />
                <div className="p-4 sm:p-5">
                  <p className="text-xs text-gray-500">Top Performer</p>
                  {topPerformer ? (
                    <>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] sm:text-[12px] text-amber-800">
                          <Trophy size={12} aria-hidden="true" /> {topPerformer.avg}%
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
            )}
          </div>

          {/* Toolbar */}
          {students.length > 0 && (
            <div className="relative z-40 rounded-2xl border border-black/5 p-3 sm:p-4 shadow-sm
                bg-white sm:bg-white/80 sm:backdrop-blur">
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
                {/* Search */}
                <div className="relative w-full sm:min-w-[220px] sm:flex-1">
                  <label htmlFor="student-search" className="sr-only">Search students</label>
                  <input
                    id="student-search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, seat #, or email"
                    className="w-full rounded-xl border px-4 py-2.5 pr-10 text-sm outline-none
             border-gray-300 bg-white sm:bg-transparent focus:ring-2 focus:ring-[#2E5EAA]/30"
                  />
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
                </div>

                {/* Filters */}
                <div className="relative sm:order-none order-2" ref={popRef}>
                  <button
                    type="button"
                    onClick={() => setFilterOpen((v) => !v)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300/70 px-3 py-2 text-sm transition hover:bg-gray-50"
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
                      className="absolute right-0 sm:left-0 top-full z-[60] mt-2 w-64 rounded-xl border border-black/5 bg-white p-3 shadow-lg"
                    >
                      <label className="mb-1 block text-xs text-gray-500">Minimum Average</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range" min={0} max={100} step={1}
                          value={minAvg} onChange={(e) => setMinAvg(Number(e.target.value))}
                          className="w-full" aria-valuemin={0} aria-valuemax={100} aria-valuenow={minAvg}
                          disabled={minAvgDisabled}
                        />
                        <span className={`w-10 text-right text-sm ${minAvgDisabled ? "text-gray-400" : ""}`}>
                          {minAvgDisabled ? "-" : `${minAvg}%`}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div>
                          <label className="mb-1 block text-xs text-gray-500">Sort by</label>
                          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                            className="w-full rounded-lg border border-gray-300/70 px-2 py-1.5 text-sm">
                            <option value="name">Name</option>
                            <option value="average">Average</option>
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-500">Direction</label>
                          <select value={sortDir} onChange={(e) => setSortDir(e.target.value)}
                            className="w-full rounded-lg border border-gray-300/70 px-2 py-1.5 text-sm">
                            <option value="asc">Asc</option>
                            <option value="desc">Desc</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Export */}
                <div className="sm:ml-auto sm:w-auto w-full order-3">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300/70 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-gray-50"
                    title="Export visible records as CSV"
                    disabled={students.length === 0}
                    aria-disabled={students.length === 0}
                  >
                    <Upload size={16} aria-hidden="true" />
                    Export CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* List */}
          <div className="space-y-3">
            <AnimatePresence>
              {filteredSorted.map((s, i) => {
                const key = s.seat || s.id;
                const clickable = Boolean(key);

                const obtained =
                  Number.isFinite(s?.total_obtained) ? s.total_obtained : s?.totals?.obtained ?? null;
                const possible =
                  Number.isFinite(s?.total_possible) ? s.total_possible : s?.totals?.total ?? null;
                const pct =
                  obtained != null && possible != null && possible > 0
                    ? Math.round((obtained / possible) * 100)
                    : typeof s.average === "number"
                      ? s.average
                      : null;

                return (
                  <motion.button
                    key={`${key ?? s.seat ?? s.id ?? i}`}
                    type="button"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03 }}
                    onClick={() => clickable && openStudent(key)}
                    disabled={!clickable}
                    aria-disabled={!clickable}
                    className={`group relative w-full overflow-hidden rounded-2xl border border-black/5 bg-white p-3 sm:p-4 text-left shadow-sm transition hover:shadow-md ${!clickable ? "cursor-not-allowed opacity-80" : ""}`}
                    aria-label={`Open ${s.name}'s results`}
                  >
                    <span className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/3 rotate-12 bg-white/10 transition-transform duration-700 group-hover:translate-x-[180%]" aria-hidden="true" />
                    <div className="flex items-center justify-between gap-3 sm:gap-4">
                      <div className="min-w-0 flex items-center gap-3 sm:gap-4">
                        <div
                          className="grid h-10 w-10 sm:h-11 sm:w-11 shrink-0 place-items-center rounded-xl font-semibold text-white"
                          style={{ background: "linear-gradient(135deg, #2E5EAA 0%, #81B29A 60%, #4A8FE7 100%)" }}
                          aria-hidden="true"
                        >
                          {(s.name || "").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-[#1F2937] text-sm sm:text-base">{s.name}</p>
                            {typeof pct === "number" && pct >= 85 && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] sm:text-[11px] text-emerald-700">
                                <Trophy size={12} aria-hidden="true" /> Top
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[12px] sm:text-sm text-gray-600">{s.seat}</p>
                          <p className="hidden sm:block text-[12px] text-gray-500">{s.email}</p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-3 sm:gap-4">
                        {/* small ring for mobile */}
                        {quizzesConducted > 0 && typeof pct === "number" && (
                          <>
                            <div className="sm:hidden relative grid h-10 w-10 place-items-center rounded-full bg-gray-100">
                              <svg className="absolute left-0 top-0 h-full w-full -rotate-90" aria-hidden="true">
                                <circle cx="20" cy="20" r="16" stroke="#e5e7eb" strokeWidth="4" fill="transparent" />
                                <circle
                                  cx="20" cy="20" r="16"
                                  stroke={pct >= 80 ? "#4ade80" : pct >= 65 ? "#fbbf24" : pct >= 50 ? "#fb923c" : "#f87171"}
                                  strokeWidth="4" fill="transparent"
                                  strokeDasharray={`${2 * Math.PI * 16}`}
                                  strokeDashoffset={`${2 * Math.PI * 16 * (1 - pct / 100)}`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="text-xs font-bold text-[#2B2D42]">{pct}%</span>
                            </div>

                            <div className="hidden sm:grid relative h-14 w-14 place-items-center rounded-full bg-gray-100">
                              <svg className="absolute left-0 top-0 h-full w-full -rotate-90" aria-hidden="true">
                                <circle cx="28" cy="28" r="24" stroke="#e5e7eb" strokeWidth="4" fill="transparent" />
                                <circle
                                  cx="28" cy="28" r="24"
                                  stroke={pct >= 80 ? "#4ade80" : pct >= 65 ? "#fbbf24" : pct >= 50 ? "#fb923c" : "#f87171"}
                                  strokeWidth="4" fill="transparent"
                                  strokeDasharray={`${2 * Math.PI * 24}`}
                                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
                                  strokeLinecap="round"
                                />
                              </svg>
                              <span className="text-sm font-bold text-[#2B2D42]">{pct}%</span>
                            </div>
                          </>
                        )}

                        {obtained != null && possible != null && (
                          <div className="text-right hidden xs:block">
                            <div className="text-xs text-gray-500">
                              {obtained}/{possible}
                            </div>
                          </div>
                        )}

                        <ChevronRight className={`transition ${!clickable ? "text-gray-300" : "text-gray-400 group-hover:text-[#2E5EAA]"}`} aria-hidden="true" />
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>

            {filteredSorted.length === 0 && (
              <div className="rounded-2xl border border-black/5 bg-white p-8 sm:p-10 text-center shadow-sm">
                <p className="mt-2 font-semibold text-[#2B2D42]">No students found</p>
                <p className="text-sm text-gray-600">
                  {students.length === 0 ? "Once students join, they’ll appear here." : "Try a different search or filters."}
                </p>
              </div>
            )}
          </div>

          {/* Loading overlay for modal */}
          <AnimatePresence>
            {loading && (
              <motion.div
                className="fixed inset-0 z-[80] grid place-items-center bg-black/25 backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                role="status" aria-live="polite" aria-label="Loading student results"
              >
                <div className="rounded-xl border border-white/50 bg-white/90 px-4 py-3 text-sm text-gray-700 shadow-sm">
                  Loading student results…
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <StudentResultModal
            open={!!openId}
            onClose={closeModal}
            student={students.find((s) => (s.seat || s.id) === openId) || null}
            results={results}
            error={error}
            onEditStudent={(payload) => openId && onEditStudent(openId, { ...payload, prevSeat: openId })}
            onDeleteStudent={onDeleteStudent}
          />
        </div>
      )}
    </SlideUp>
  );
}

/* ============================== UI bits ============================== */

function StatCard({ accent, icon, label, value, hint }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className={`absolute -top-8 -right-6 h-24 w-24 sm:h-28 sm:w-28 rounded-full ${accent} blur-2xl`} aria-hidden="true" />
      <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5">
        <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-[#2E5EAA]/15">
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-[#2B2D42]">{value}</p>
          <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function StatPlain({ blob, label, value, hint, chip = null }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className={`absolute -top-10 -left-6 h-28 w-28 sm:h-32 sm:w-32 rounded-full ${blob} blur-2xl`} aria-hidden="true" />
      <div className="p-4 sm:p-5">
        <p className="text-xs text-gray-500">{label}</p>
        <div className="mt-1 flex items-end gap-2">
          <p className="text-xl sm:text-2xl font-bold text-[#2B2D42]">{value}</p>
          {chip && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] sm:text-[11px] text-emerald-600">
              {chip}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-gray-500">{hint}</p>
      </div>
    </div>
  );
}
