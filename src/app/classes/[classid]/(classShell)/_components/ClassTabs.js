"use client";

import Link from "next/link";
import { useParams, useSelectedLayoutSegments } from "next/navigation";

export default function ClassTabs() {
  const { classid } = useParams();
  const segments = useSelectedLayoutSegments();
  // examples:
  // [] → /classes/[classid]
  // ["quiz"] → /classes/[classid]/quiz
  // ["quiz","generate"] → /classes/[classid]/quiz/generate
  // ["quiz","q_123"] → /classes/[classid]/quiz/q_123

  const top = segments?.[0] || null;
  const sub = segments?.[1] || null;

  // Only show tabs on Record page (no top segment)
  // and Quiz list page (top === "quiz" && no sub)
  const showTabs = !top || (top === "quiz" && !sub);
  if (!showTabs) return null;

  const base = `/classes/${classid}`;
  const tabs = [
    { name: "Record", href: `${base}`, active: !top },
    { name: "Quiz", href: `${base}/quiz`, active: top === "quiz" && !sub },
  ];

  return (
    <div className="relative">
      <div className="absolute inset-x-0 bottom-0 h-px bg-black/10" />
      <nav className="flex gap-6">
        {tabs.map((t) => (
          <Link
            key={t.name}
            href={t.href}
            prefetch
            className={`relative py-3 text-sm font-semibold transition-colors ${t.active ? "text-[#2B2D42]" : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {t.name}
            <span
              className={`absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full transition-all ${t.active ? "bg-[#2E5EAA]" : "bg-transparent"
                }`}
            />
          </Link>
        ))}
      </nav>
    </div>
  );
}












