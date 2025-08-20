"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import SlideUp from "@/app/_components/SlideUp";
import { Upload, Filter, Users, ChevronDown } from "lucide-react";

export default function RecordView() {
  // ---- mock data (replace with API later) ----
  const [query, setQuery] = useState("");
  const students = useMemo(
    () => [
      { id: "s1", name: "Ayesha Khan", seat: "B23110006177", email: "ayesha@uni.edu", average: 86 },
      { id: "s2", name: "Daniyal Raza", seat: "B23110006172", email: "daniyal@uni.edu", average: 72 },
      { id: "s3", name: "Hira Shah",   seat: "B23110006171", email: "hira@uni.edu",   average: 91 },
      { id: "s4", name: "Moiz Ali",    seat: "B23110006179", email: "moiz@uni.edu",   average: 65 },
    ],
    []
  );

  // ---- filters / sorting ----
  const [filterOpen, setFilterOpen] = useState(false);
  const [minAvg, setMinAvg] = useState(0);
  const [sortBy, setSortBy] = useState("name");   // "name" | "average"
  const [sortDir, setSortDir] = useState("asc");  // "asc" | "desc"

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

  const handleImport = () => {
    // later: CSV -> add rows
    console.log("Import CSV");
  };

  // close popover on outside click
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

  return (
    <SlideUp>
      <div className="space-y-6">
        {/* Stats (Avg removed) */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-white shadow-sm border border-black/5">
            <div className="absolute -top-8 -right-6 w-28 h-28 rounded-full bg-[#2E5EAA]/10 blur-2xl" />
            <div className="p-5 flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2E5EAA]/15">
                <Users size={18} className="text-[#2E5EAA]" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Students</p>
                <p className="text-2xl font-bold text-[#2B2D42] mt-1">{students.length}</p>
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

        {/* Toolbar — give it higher z so popover stays above table */}
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
              <svg
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.387a1 1 0 01-1.414 1.414l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            {/* Filters button + popover */}
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
              {/* Export removed */}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="relative z-0 rounded-2xl border border-black/5 bg-white shadow-sm overflow-visible">
          {/* Sticky header */}
          <div className="sticky top-0 z-10">
            <div
              className="px-5 py-3
                         bg-[linear-gradient(180deg,rgba(243,248,255,0.9)_0%,rgba(255,255,255,0.85)_100%)]
                         backdrop-blur supports-[backdrop-filter]:backdrop-blur-sm
                         shadow-[inset_0_-1px_0_rgba(0,0,0,0.06),0_6px_16px_-10px_rgba(0,0,0,0.12)]"
            >
              <div className="grid grid-cols-[2fr_1fr_2fr_1fr] gap-3 text-[13px] font-semibold text-[#2B2D42]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E5EAA]/70" />
                  Name
                </div>
                <div>Seat #</div>
                <div>Email</div>
                <div className="text-right pr-2">Average</div>
              </div>
            </div>
            <div className="h-px bg-black/5" />
          </div>

          {/* Rows: give only rows scrolling so popovers aren't clipped */}
          <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-100">
            {filteredSorted.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-sm">
                No students found. Try a different search or filters.
              </div>
            ) : (
              filteredSorted.map((s, i) => (
                <div
                  key={s.id}
                  className={`grid grid-cols-[2fr_1fr_2fr_1fr] gap-3 px-5 py-3 text-sm items-center transition
                              hover:bg-[#F7FAFF] ${i % 2 === 0 ? "bg-white" : "bg-gray-50/60"}`}
                >
                  <div className="font-medium text-[#2B2D42]">{s.name}</div>
                  <div className="text-gray-700">{s.seat}</div>
                  <div className="text-gray-600 truncate">{s.email}</div>
                  <div className="text-right pr-2">
                    <span className={badgeColor(s.average)}>{s.average}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SlideUp>
  );
}

// Badge colors
function badgeColor(avg) {
  if (avg >= 80) return "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-green-100 text-green-800";
  if (avg >= 65) return "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800";
  if (avg >= 50) return "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800";
  return "inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-red-100 text-red-700";
}
