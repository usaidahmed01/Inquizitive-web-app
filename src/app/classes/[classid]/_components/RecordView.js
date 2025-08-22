"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import SlideUp from "@/app/_components/SlideUp";
import { Upload, Filter, Users, ChevronDown, Search, ChevronRight, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StudentResultModal from "../record.js/StudentResultModal";

// --- mock data (swap with API later) ---
const STUDENTS = [
  { id: "s1", name: "Ayesha Khan", seat: "B23110006177", email: "ayesha@uni.edu", average: 86, last: { quiz: "Quiz 3", score: 18, total: 20 } },
  { id: "s2", name: "Daniyal Raza", seat: "B23110006172", email: "daniyal@uni.edu", average: 72, last: { quiz: "Quiz 3", score: 15, total: 20 } },
  { id: "s3", name: "Hira Shah",   seat: "B23110006171", email: "hira@uni.edu",   average: 91, last: { quiz: "Quiz 2", score: 19, total: 20 } },
  { id: "s4", name: "Moiz Ali",    seat: "B23110006179", email: "moiz@uni.edu",   average: 65, last: { quiz: "Quiz 1", score: 13, total: 20 } },
];

function badgeColor(avg) {
  if (avg >= 80) return "bg-green-100 text-green-800";
  if (avg >= 65) return "bg-amber-100 text-amber-800";
  if (avg >= 50) return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-700";
}

export default function RecordView() {
  // toolbar
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [minAvg, setMinAvg] = useState(0);
  const [sortBy, setSortBy] = useState("name");   // "name" | "average"
  const [sortDir, setSortDir] = useState("asc");  // "asc" | "desc"

  // selection/modal + fetching
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);     // { quizzes: [...] }
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  // filter + sort
  const filteredSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = STUDENTS.filter((s) => {
      const hit =
        s.name.toLowerCase().includes(q) ||
        s.seat.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q);
      return hit && s.average >= minAvg;
    });

    list.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "name") return a.name.localeCompare(b.name) * dir;
      if (sortBy === "average") return (a.average - b.average) * dir;
      return 0;
    });

    return list;
  }, [query, minAvg, sortBy, sortDir]);

  const handleImport = () => {
    // later: CSV upload
    console.log("Import CSV");
  };

  // close filter popover on outside click
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

  // open student -> fetch results (with spinner + abort protection)
  const openStudent = async (id) => {
    // clear state
    setOpenId(id);
    setResults(null);
    setError(null);

    // abort any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    try {
      // TODO: replace with your real API call like:
      // const res = await fetch(`/api/classes/${classId}/students/${id}/results`, { signal: ac.signal });
      // if (!res.ok) throw new Error("Failed to load results");
      // const data = await res.json();

      // demo: small delay + fake payload
      await new Promise((r) => setTimeout(r, 700));
      const data = {
        quizzes: [
          { id: "q3", title: "Quiz 3", date: "2025-09-10T10:30:00Z", score: 18, total: 20 },
          { id: "q2", title: "Quiz 2", date: "2025-08-28T12:00:00Z", score: 10, total: 20 },
          { id: "q1", title: "Quiz 1", date: "2025-08-12T09:15:00Z", score: 8,  total: 20 },
        ],
      };

      setResults(data);
    } catch (err) {
      if (err.name !== "AbortError") {
        setError("Could not load results");
      }
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

  return (
    <SlideUp>
      <div className="space-y-6">
        {/* Small stats row */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-[#2E5EAA]/10 blur-2xl" />
            <div className="p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E5EAA]/15">
                <Users size={18} className="text-[#2E5EAA]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-[#2B2D42] mt-1">{STUDENTS.length}</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="absolute -top-10 -left-6 w-32 h-32 rounded-full bg-[#81B29A]/10 blur-2xl" />
            <div className="p-5">
              <p className="text-xs text-gray-500">Quizzes Conducted</p>
              <p className="text-2xl font-bold text-[#2B2D42] mt-1">—</p>
              <p className="text-xs text-gray-500 mt-1">Connect data to display</p>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="relative z-40 rounded-2xl bg-white/80 backdrop-blur border border-black/5 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search input */}
            <div className="relative flex-1 min-w-[220px]">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, seat #, or email"
                className="w-full rounded-xl border border-gray-300/70 px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#2E5EAA]/30"
              />
              <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {/* Filter popover */}
            <div className="relative" ref={popRef}>
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300/70 px-3 py-2 text-sm hover:bg-gray-50 transition"
              >
                <Filter size={16} />
                Filters
                <ChevronDown size={14} className={`transition ${filterOpen ? "rotate-180" : ""}`} />
              </button>

              {filterOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-black/5 bg-white shadow-lg p-3 z-[60]">
                  <label className="block text-xs text-gray-500 mb-1">Minimum Average</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={minAvg}
                      onChange={(e) => setMinAvg(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-sm w-10 text-right">{minAvg}%</span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Sort by</label>
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
                      <label className="block text-xs text-gray-500 mb-1">Direction</label>
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

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={handleImport}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold
                           bg-white border border-gray-300/70 hover:bg-gray-50 transition"
              >
                <Upload size={16} />
                Import CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tappable List (no table) */}
        <div className="space-y-3">
          <AnimatePresence>
            {filteredSorted.map((s, i) => (
              <motion.button
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, delay: i * 0.03 }}
                onClick={() => openStudent(s.id)}
                className="w-full text-left group relative overflow-hidden rounded-2xl bg-white border border-black/5 shadow-sm p-4 hover:shadow-md transition"
              >
                {/* sheen */}
                <span className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/3 rotate-12 bg-white/10 group-hover:translate-x-[180%] transition-transform duration-700" />

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* avatar initials */}
                    <div
                      className="h-11 w-11 shrink-0 rounded-xl grid place-items-center text-white font-semibold"
                      style={{
                        background: "linear-gradient(135deg, #2E5EAA 0%, #81B29A 60%, #4A8FE7 100%)",
                      }}
                    >
                      {s.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#1F2937] truncate">{s.name}</p>
                        {s.average >= 85 && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                            <Trophy size={12} /> Top
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 truncate">{s.seat}</p>
                      <p className="text-[12px] text-gray-500">{s.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${badgeColor(s.average)}`}>
                        Avg {s.average}%
                      </div>
                      <p className="text-[12px] text-gray-500 mt-1">
                        {s.last.quiz}: {s.last.score}/{s.last.total}
                      </p>
                    </div>
                    <ChevronRight className="text-gray-400 group-hover:text-[#2E5EAA] transition" />
                  </div>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>

          {filteredSorted.length === 0 && (
            <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-10 text-center">
              <p className="mt-2 text-[#2B2D42] font-semibold">No students found</p>
              <p className="text-sm text-gray-600">Try a different search or filters.</p>
            </div>
          )}
        </div>

        {/* loading overlay while fetching */}
        <AnimatePresence>
          {loading && (
            <motion.div
              className="fixed inset-0 z-[80] grid place-items-center bg-black/25 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            >
              <div className="rounded-xl bg-white/90 px-4 py-3 shadow-sm text-sm text-gray-700 border border-white/50">
                Loading student results…
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal */}
        <StudentResultModal
          open={!!openId}
          onClose={closeModal}
          student={STUDENTS.find((s) => s.id === openId) || null}
          results={results}
          error={error}
        />
      </div>
    </SlideUp>
  );
}
