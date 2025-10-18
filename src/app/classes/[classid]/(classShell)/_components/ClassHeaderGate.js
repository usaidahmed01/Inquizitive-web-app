// src/app/classes/[classid]/_components/ClassHeaderGate.jsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useSelectedLayoutSegments } from "next/navigation";
import BlurText from "@/app/_components/BlurText";
import HeaderActions from "./HeaderActions";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_BASE;

export default function ClassHeaderGate() {
  const params = useParams();
  const classid = String(params.classid || "");

  const segments = useSelectedLayoutSegments();
  const showHeader =
    segments.length === 0 || (segments[0] === "quiz" && segments.length === 1);

  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch(`${API}/classes/${classid}/meta`);
        const j = r.ok ? await r.json() : null;
        if (!alive) return;
        setMeta(j);
      } catch (e) {
        if (alive) setMeta(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [classid]);

  if (!showHeader) return null;

  const courseName = meta?.course_name || "Class";
  const courseCode = meta?.course_code || "Course Code";
  const courseDept = meta?.department.toUpperCase();
  return (
    <div className="relative overflow-hidden">
      <div className="relative h-44 md:h-56 rounded-b-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA]" />
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-8 left-10 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
          <div className="absolute top-6 right-16 w-52 h-52 rounded-full bg-white/10 blur-3xl" />
        </div>

        <div className="absolute inset-0 z-10 flex items-end">
          <div className="mx-auto w-full max-w-5xl px-6 pb-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[12px] text-white/85 mb-1">
                  <Link href="/dashboard" className="hover:underline">Dashboard</Link>
                  <span className="px-1.5">/</span>
                  <span className="hover:underline cursor-default">Classes</span>
                  <span className="px-1.5">/</span>
                  <span className="text-white font-medium">Details</span>
                </div>

                <BlurText
                  text={courseName}
                  delay={120}
                  animateBy="words"
                  direction="top"
                  className="text-3xl md:text-4xl font-extrabold tracking-tight text-white"
                  highlight={courseName}
                  highlightClassName="bg-gradient-to-r from-[#2E5EAA] to-[#4A8FE7] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                />

                <div className="mt-2 flex items-center gap-3">
                  <p className="text-white/90 text-sm drop-shadow-sm">
                    Manage records & quizzes for this class.
                  </p>

                  {/* show course code instead of raw id */}
                  <span className="px-2.5 py-1 rounded-md bg-white/20 text-white text-xs font-semibold backdrop-blur">
                    BS{courseDept} - {courseCode}
                  </span>
                </div>
              </div>

              <HeaderActions classid={classid} className="self-end mb-0.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
