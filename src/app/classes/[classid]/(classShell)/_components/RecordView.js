// "use client";

// import { useMemo, useState, useRef, useEffect } from "react";
// import SlideUp from "@/app/_components/SlideUp";
// import {
//   Upload, Filter, Users, ChevronDown, Search,
//   ChevronRight, Trophy
// } from "lucide-react";
// import { motion, AnimatePresence } from "framer-motion";
// import StudentResultModal from "../record.js/StudentResultModal";
// import { data } from "autoprefixer";

// // --- initial mock data (seed) ---
// const SEED_STUDENTS = [
//   { id: "s1", name: "Ayesha Khan", seat: "B23110006177", email: "ayesha@uni.edu", average: 86, last: { quiz: "Quiz 3", score: 18, total: 20 } },
//   { id: "s2", name: "Daniyal Raza", seat: "B23110006172", email: "daniyal@uni.edu", average: 72, last: { quiz: "Quiz 3", score: 15, total: 20 } },
//   { id: "s3", name: "Hira Shah", seat: "B23110006171", email: "hira@uni.edu", average: 91, last: { quiz: "Quiz 2", score: 19, total: 20 } },
//   { id: "s4", name: "Moiz Ali", seat: "B23110006179", email: "moiz@uni.edu", average: 65, last: { quiz: "Quiz 1", score: 13, total: 20 } },
// ];

// export default function RecordView() {
//   // students in state (so UI updates on edit/delete)
//   const [students, setStudents] = useState(SEED_STUDENTS);

//   // toolbar
//   const [query, setQuery] = useState("");
//   const [filterOpen, setFilterOpen] = useState(false);
//   const [minAvg, setMinAvg] = useState(0);
//   const [sortBy, setSortBy] = useState("name");   // "name" | "average"
//   const [sortDir, setSortDir] = useState("asc");  // "asc" | "desc"

//   // selection/modal + fetching
//   const [openId, setOpenId] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [results, setResults] = useState(null);     // { quizzes: [...] }
//   const [error, setError] = useState(null);
//   const abortRef = useRef(null);

//   // filter + sort
//   const filteredSorted = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     let list = students.filter((s) => {
//       const hit =
//         s.name.toLowerCase().includes(q) ||
//         s.seat.toLowerCase().includes(q) ||
//         s.email.toLowerCase().includes(q);
//       return hit && s.average >= minAvg;
//     });

//     list.sort((a, b) => {
//       const dir = sortDir === "asc" ? 1 : -1;
//       if (sortBy === "name") return a.name.localeCompare(b.name) * dir;
//       if (sortBy === "average") return (a.average - b.average) * dir;
//       return 0;
//     });

//     return list;
//   }, [students, query, minAvg, sortBy, sortDir]);

//   const handleExport = () => {
//     if (students.length === 0) {
//       alert("No students to export");
//       return;
//     }

//     let rows = [["Name", "Seat No", "Quiz", "Score", "Total"]];
//     students.forEach((s) => {
//       if (results?.quizzes?.length) {
//         results.quizzes.forEach((q) => {
//           rows.push([s.name, s.seat, q.title, q.score, q.total]);
//         });
//       } else {
//         rows.push([s.name, s.seat, "-", "-", "-"]);
//       }
//     });

//     const csv = rows.map((r) => r.join(",")).join("\n");
//     const blob = new Blob([csv], { type: "text/csv" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "class-records.csv";
//     a.click();
//     URL.revokeObjectURL(url);
//   };


//   // close filter popover on outside click
//   const popRef = useRef(null);
//   useEffect(() => {
//     function onDocClick(e) {
//       if (!filterOpen) return;
//       if (popRef.current && !popRef.current.contains(e.target)) {
//         setFilterOpen(false);
//       }
//     }
//     document.addEventListener("mousedown", onDocClick);
//     return () => document.removeEventListener("mousedown", onDocClick);
//   }, [filterOpen]);

//   // open student -> fetch results (with spinner + abort protection)
//   const openStudent = async (id) => {
//     setOpenId(id);
//     setResults(null);
//     setError(null);

//     if (abortRef.current) abortRef.current.abort();
//     const ac = new AbortController();
//     abortRef.current = ac;

//     setLoading(true);
//     try {
//       // TODO: replace with real API call:
//       // const res = await fetch(`/api/classes/${classId}/students/${id}/results`, { signal: ac.signal });
//       // if (!res.ok) throw new Error("Failed to load results");
//       // const data = await res.json();

//       await new Promise((r) => setTimeout(r, 700));
//       const data = {
//         quizzes: [
//           { id: "q3", title: "Quiz 3", date: "2025-09-10T10:30:00Z", score: 18, total: 20 },
//           { id: "q2", title: "Quiz 2", date: "2025-08-28T12:00:00Z", score: 10, total: 20 },
//           { id: "q1", title: "Quiz 1", date: "2025-08-12T09:15:00Z", score: 8, total: 20 },
//           { id: "q4", title: "Quiz 4", date: "2025-07-22T09:15:00Z", score: 12, total: 20 },
//           { id: "q5", title: "Quiz 5", date: "2025-07-05T09:15:00Z", score: 14, total: 20 },
//           { id: "q6", title: "Quiz 6", date: "2025-06-15T09:15:00Z", score: 17, total: 20 },
//           { id: "q7", title: "Quiz 7", date: "2025-06-01T09:15:00Z", score: 11, total: 20 },
//           { id: "q8", title: "Quiz 8", date: "2025-05-20T09:15:00Z", score: 9, total: 20 },
//           { id: "q9", title: "Quiz 9", date: "2025-05-05T09:15:00Z", score: 16, total: 20 },
//           { id: "q10", title: "Quiz 10", date: "2025-04-25T09:15:00Z", score: 19, total: 20 },
//         ],
//       };

//       setResults(data);
//     } catch (err) {
//       if (err.name !== "AbortError") setError("Could not load results");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const closeModal = () => {
//     setOpenId(null);
//     setResults(null);
//     setError(null);
//     if (abortRef.current) abortRef.current.abort();
//   };

//   // ===== callbacks for modal (frontend only; easy to swap for API later) =====
//   const onEditStudent = async (id, { name, seat }) => {
//     // TODO (later): await fetch(`/api/students/${id}`, { method: 'PATCH', body: JSON.stringify({ name, seat }) })
//     setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, name, seat } : s)));
//   };

//   const onDeleteStudent = async (id) => {
//     // TODO (later): await fetch(`/api/students/${id}`, { method: 'DELETE' })
//     setStudents((prev) => prev.filter((s) => s.id !== id));
//     if (openId === id) closeModal();
//   };

//   const quizCount = useMemo(() => {
//     if (students.length === 0) return 0;
//     // pick first student’s last quiz list or use results mock
//     // for now we assume quizzes come from results (later DB)
//     return results?.quizzes?.length || "-";
//   }, [students, results]);


//   return (
//     <SlideUp>
//       <div className="space-y-6">
//         {/* Small stats row */}
//         <div className="grid sm:grid-cols-2 gap-4">
//           <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5">
//             <div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-[#2E5EAA]/10 blur-2xl" />
//             <div className="p-5 flex items-center gap-4">
//               <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E5EAA]/15">
//                 <Users size={18} className="text-[#2E5EAA]" />
//               </div>
//               <div>
//                 <p className="text-xs text-gray-500">Total Students</p>
//                 <p className="text-2xl font-bold text-[#2B2D42] mt-1">{students.length}</p>
//               </div>
//             </div>
//           </div>

//           <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5">
//             <div className="absolute -top-10 -left-6 w-32 h-32 rounded-full bg-[#81B29A]/10 blur-2xl" />
//             <div className="p-5">
//               <p className="text-xs text-gray-500">Quizzes Conducted</p>
//               <p className="text-2xl font-bold text-[#2B2D42] mt-1">{quizCount === 0 ? "-" : quizCount}</p>
//             </div>
//           </div>
//         </div>

//         {/* Toolbar */}
//         <div className="relative z-40 rounded-2xl bg-white/80 backdrop-blur border border-black/5 p-4 shadow-sm">
//           <div className="flex flex-wrap items-center gap-3">
//             {/* Search input */}
//             <div className="relative flex-1 min-w-[220px]">
//               <input
//                 value={query}
//                 onChange={(e) => setQuery(e.target.value)}
//                 placeholder="Search by name, seat #, or email"
//                 className="w-full rounded-xl border border-gray-300/70 px-4 py-2.5 pr-10 text-sm outline-none focus:ring-2 focus:ring-[#2E5EAA]/30"
//               />
//               <Search className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
//             </div>

//             {/* Filter popover */}
//             <div className="relative" ref={popRef}>
//               <button
//                 onClick={() => setFilterOpen((v) => !v)}
//                 className="inline-flex items-center gap-2 rounded-xl border border-gray-300/70 px-3 py-2 text-sm hover:bg-gray-50 transition"
//               >
//                 <Filter size={16} />
//                 Filters
//                 <ChevronDown size={14} className={`transition ${filterOpen ? "rotate-180" : ""}`} />
//               </button>

//               {filterOpen && (
//                 <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-black/5 bg-white shadow-lg p-3 z-[60]">
//                   <label className="block text-xs text-gray-500 mb-1">Minimum Average</label>
//                   <div className="flex items-center gap-3">
//                     <input
//                       type="range"
//                       min={0}
//                       max={100}
//                       step={1}
//                       value={minAvg}
//                       onChange={(e) => setMinAvg(Number(e.target.value))}
//                       className="w-full"
//                     />
//                     <span className="text-sm w-10 text-right">{minAvg}%</span>
//                   </div>

//                   <div className="mt-3 grid grid-cols-2 gap-2">
//                     <div>
//                       <label className="block text-xs text-gray-500 mb-1">Sort by</label>
//                       <select
//                         value={sortBy}
//                         onChange={(e) => setSortBy(e.target.value)}
//                         className="w-full rounded-lg border border-gray-300/70 px-2 py-1.5 text-sm"
//                       >
//                         <option value="name">Name</option>
//                         <option value="average">Average</option>
//                       </select>
//                     </div>
//                     <div>
//                       <label className="block text-xs text-gray-500 mb-1">Direction</label>
//                       <select
//                         value={sortDir}
//                         onChange={(e) => setSortDir(e.target.value)}
//                         className="w-full rounded-lg border border-gray-300/70 px-2 py-1.5 text-sm"
//                       >
//                         <option value="asc">Asc</option>
//                         <option value="desc">Desc</option>
//                       </select>
//                     </div>
//                   </div>
//                 </div>
//               )}
//             </div>

//             <div className="ml-auto flex items-center gap-2">
//               <button
//                 onClick={handleExport}
//                 className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold
//                            bg-white border border-gray-300/70 hover:bg-gray-50 transition"
//               >
//                 <Upload size={16} />
//                 Import CSV
//               </button>
//             </div>
//           </div>
//         </div>

//         {/* Tappable List */}
//         <div className="space-y-3">
//           <AnimatePresence>
//             {filteredSorted.map((s, i) => (
//               <motion.button
//                 key={s.id}
//                 initial={{ opacity: 0, y: 10 }}
//                 animate={{ opacity: 1, y: 0 }}
//                 exit={{ opacity: 0 }}
//                 transition={{ duration: 0.25, delay: i * 0.03 }}
//                 onClick={() => openStudent(s.id)}
//                 className="w-full text-left group relative overflow-hidden rounded-2xl bg-white border border-black/5 shadow-sm p-4 hover:shadow-md transition"
//               >
//                 {/* sheen */}
//                 <span className="pointer-events-none absolute -inset-y-10 -left-1/3 w-1/3 rotate-12 bg-white/10 group-hover:translate-x-[180%] transition-transform duration-700" />

//                 <div className="flex items-center justify-between gap-4">
//                   <div className="flex items-center gap-4 min-w-0">
//                     {/* avatar initials */}
//                     <div
//                       className="h-11 w-11 shrink-0 rounded-xl grid place-items-center text-white font-semibold"
//                       style={{ background: "linear-gradient(135deg, #2E5EAA 0%, #81B29A 60%, #4A8FE7 100%)" }}
//                     >
//                       {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
//                     </div>

//                     <div className="min-w-0">
//                       <div className="flex items-center gap-2">
//                         <p className="font-semibold text-[#1F2937] truncate">{s.name}</p>
//                         {s.average >= 85 && (
//                           <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
//                             <Trophy size={12} /> Top
//                           </span>
//                         )}
//                       </div>
//                       <p className="text-sm text-gray-600 truncate">{s.seat}</p>
//                       <p className="text-[12px] text-gray-500">{s.email}</p>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-4 shrink-0">
//                     <div className="relative h-14 w-14 rounded-full bg-gray-100 grid place-items-center">
//                       {results?.quizzes?.length > 0 ? (
//                         <>
//                           <svg className="absolute top-0 left-0 h-full w-full -rotate-90">
//                             {/* background circle */}
//                             <circle cx="28" cy="28" r="24" stroke="#e5e7eb" strokeWidth="4" fill="transparent" />
//                             {/* progress circle */}
//                             <circle
//                               cx="28" cy="28" r="24"
//                               stroke={s.average >= 80 ? "#4ade80" :
//                                 s.average >= 65 ? "#fbbf24" :
//                                   s.average >= 50 ? "#fb923c" : "#f87171"}
//                               strokeWidth="4"
//                               fill="transparent"
//                               strokeDasharray={`${2 * Math.PI * 24}`}
//                               strokeDashoffset={`${2 * Math.PI * 24 * (1 - s.average / 100)}`}
//                               strokeLinecap="round"
//                             />
//                           </svg>
//                           <span className="text-sm font-bold text-[#2B2D42]">{s.average}%</span>
//                         </>
//                       ) : (
//                         <span className="text-[11px] text-center font-medium text-gray-500 animate-pulse">
//                           Awaiting Data
//                         </span>
//                       )}
//                     </div>

//                     <ChevronRight className="text-gray-400 group-hover:text-[#2E5EAA] transition" />
//                   </div>
//                 </div>
//               </motion.button>
//             ))}
//           </AnimatePresence>

//           {filteredSorted.length === 0 && (
//             <div className="rounded-2xl bg-white border border-black/5 shadow-sm p-10 text-center">
//               <p className="mt-2 text-[#2B2D42] font-semibold">No students found</p>
//               <p className="text-sm text-gray-600">Try a different search or filters.</p>
//             </div>
//           )}
//         </div>

//         {/* loading overlay while fetching */}
//         <AnimatePresence>
//           {loading && (
//             <motion.div
//               className="fixed inset-0 z-[80] grid place-items-center bg-black/25 backdrop-blur-sm"
//               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
//             >
//               <div className="rounded-xl bg-white/90 px-4 py-3 shadow-sm text-sm text-gray-700 border border-white/50">
//                 Loading student results…
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>

//         {/* Modal with edit/delete callbacks */}
//         <StudentResultModal
//           open={!!openId}
//           onClose={closeModal}
//           student={students.find((s) => s.id === openId) || null}
//           results={results}
//           error={error}
//           onEditStudent={onEditStudent}
//           onDeleteStudent={onDeleteStudent}
//         />
//       </div>
//     </SlideUp>
//   );
// }















"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import SlideUp from "@/app/_components/SlideUp";
import {
  Upload, Filter, Users, ChevronDown, Search,
  ChevronRight, Trophy, Sparkles, Wand2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StudentResultModal from "../record.js/StudentResultModal";

// --- initial mock data (seed) ---
const SEED_STUDENTS = [
  { id: "s1", name: "Ayesha Khan", seat: "B23110006177", email: "ayesha@uni.edu", average: 86, last: { quiz: "Quiz 3", score: 18, total: 20 } },
  { id: "s2", name: "Daniyal Raza", seat: "B23110006172", email: "daniyal@uni.edu", average: 72, last: { quiz: "Quiz 3", score: 15, total: 20 } },
  { id: "s3", name: "Hira Shah", seat: "B23110006171", email: "hira@uni.edu", average: 91, last: { quiz: "Quiz 2", score: 19, total: 20 } },
  { id: "s4", name: "Moiz Ali", seat: "B23110006179", email: "moiz@uni.edu", average: 65, last: { quiz: "Quiz 1", score: 13, total: 20 } },
];

/** small util */
const spinSlow = `
@keyframes spin-slow { to { transform: rotate(360deg) } }
.animate-spin-slow { animation: spin-slow 6s linear infinite; }
`;

export default function RecordView() {
  // students in state (so UI updates on edit/delete)
  const [students, setStudents] = useState(SEED_STUDENTS);

  // derive quiz titles seen in the mock (from students' "last")
  const quizTitles = useMemo(() => {
    const set = new Set(students.map(s => s.last?.quiz).filter(Boolean));
    return Array.from(set); // e.g. ["Quiz 1","Quiz 2","Quiz 3"]
  }, [students]);

   const quizzesConducted = quizTitles.length;     // condition: show '-' if 0

  const avgClassScore = useMemo(() => {
    if (quizzesConducted === 0 || students.length === 0) return null;
    const sum = students.reduce((a, s) => a + (Number(s.average) || 0), 0);
    return Math.round(sum / students.length);
  }, [students, quizzesConducted]);

  const topPerformer = useMemo(() => {
    if (students.length === 0 || quizzesConducted === 0) return null;
    return students.slice().sort((a, b) => b.average - a.average)[0];
  }, [students, quizzesConducted]);

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
    let list = students.filter((s) => {
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
  }, [students, query, minAvg, sortBy, sortDir]);

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
    setOpenId(id);
    setResults(null);
    setError(null);

    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    try {
      // MOCK load (replace later)
      await new Promise((r) => setTimeout(r, 700));
      const data = {
        quizzes: [
          { id: "q3", title: "Quiz 3", date: "2025-09-10T10:30:00Z", score: 18, total: 20 },
          { id: "q2", title: "Quiz 2", date: "2025-08-28T12:00:00Z", score: 10, total: 20 },
          { id: "q1", title: "Quiz 1", date: "2025-08-12T09:15:00Z", score: 8, total: 20 },
        ],
      };
      setResults(data);
    } catch (err) {
      if (err.name !== "AbortError") setError("Could not load results");
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

  // ===== callbacks for modal (frontend only; easy to swap for API later) =====
  const onEditStudent = async (id, { name, seat }) => {
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, name, seat } : s)));
  };

  const onDeleteStudent = async (id) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    if (openId === id) closeModal();
  };

  // ===== Export CSV (Name, Seat, each Quiz column; "-" when missing) =====
  const handleExport = () => {
    if (students.length === 0) {
      alert("No students to export");
      return;
    }
    // headers
    const headers = ["Name", "Seat No", ...quizTitles];
    const rows = [headers];

    students.forEach((s) => {
      const row = [s.name, s.seat];
      quizTitles.forEach((qt) => {
        // we only have "last" in this mock; fill where it matches, else "-"
        if (s.last?.quiz === qt) {
          row.push(`${s.last.score}/${s.last.total}`);
        } else {
          row.push("-");
        }
      });
      rows.push(row);
    });

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "class-records.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SlideUp>
      {/* local CSS for slow spin */}
      <style>{spinSlow}</style>

      <div className="space-y-6">
        {/* Rich stats row (fills the emptiness) */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Students */}
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-[#2E5EAA]/10 blur-2xl" />
            <div className="p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E5EAA]/15">
                <Users size={18} className="text-[#2E5EAA]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-[#2B2D42] mt-1">{students.length}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Active this term</p>
              </div>
            </div>
          </div>

          {/* Quizzes Conducted */}
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="absolute -top-10 -left-6 w-32 h-32 rounded-full bg-[#81B29A]/10 blur-2xl" />
            <div className="p-5">
              <p className="text-xs text-gray-500">Quizzes Conducted</p>
              <p className="text-2xl font-bold text-[#2B2D42] mt-1">
                {quizzesConducted === 0 ? "-" : quizzesConducted}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {quizzesConducted === 0 ? "No quizzes yet" : "Across recent weeks"}
              </p>
            </div>
          </div>

          {/* Avg Class Score */}
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="absolute -bottom-10 -right-6 w-32 h-32 rounded-full bg-[#4A8FE7]/10 blur-2xl" />
            <div className="p-5">
              <p className="text-xs text-gray-500">Avg Class Score</p>
              <div className="mt-1 flex items-end gap-2">
                <p className="text-2xl font-bold text-[#2B2D42]">
                  {avgClassScore == null ? "-" : `${avgClassScore}%`}
                </p>
                {avgClassScore != null && (
                  <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {avgClassScore >= 75 ? "Great" : avgClassScore >= 60 ? "Fair" : "Needs Work"}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {avgClassScore == null ? "Awaiting first quiz" : "Based on latest records"}
              </p>
            </div>
          </div>

          {/* Top Performer */}
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-[#F2A541]/15 blur-2xl" />
            <div className="p-5">
              <p className="text-xs text-gray-500">Top Performer</p>
              {topPerformer ? (
                <>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-[12px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      <Trophy size={12} /> {topPerformer.average}%
                    </span>
                  </div>
                  <p className="text-[13px] text-[#2B2D42] font-semibold mt-1">{topPerformer.name}</p>
                  <p className="text-[12px] text-gray-500">{topPerformer.seat}</p>
                </>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-[13px] text-gray-600">
                  <Wand2 size={16} className="text-[#2E5EAA]" />
                  <span>Will appear after your first quiz</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="relative z-40 rounded-2xl bg-white/80 backdrop-blur border border-black/5 p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
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
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold
                           bg-white border border-gray-300/70 hover:bg-gray-50 transition"
              >
                <Upload size={16} />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tappable List */}
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
                      style={{ background: "linear-gradient(135deg, #2E5EAA 0%, #81B29A 60%, #4A8FE7 100%)" }}
                    >
                      {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
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
                    {/* Performance: cool placeholder if no quizzes; else progress ring */}
                    {/* Performance: only show if at least one quiz exists */}
                    {quizzesConducted > 0 && (
                      <div className="relative h-14 w-14 rounded-full bg-gray-100 grid place-items-center">
                        <svg className="absolute top-0 left-0 h-full w-full -rotate-90">
                          <circle cx="28" cy="28" r="24" stroke="#e5e7eb" strokeWidth="4" fill="transparent" />
                          <circle
                            cx="28" cy="28" r="24"
                            stroke={s.average >= 80 ? "#4ade80" :
                              s.average >= 65 ? "#fbbf24" :
                                s.average >= 50 ? "#fb923c" : "#f87171"}
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

        {/* Modal with edit/delete callbacks */}
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
