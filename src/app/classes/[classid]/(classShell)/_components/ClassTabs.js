"use client";

import Link from "next/link";
import { useParams, useSelectedLayoutSegment } from "next/navigation";

export default function ClassTabs() {
  const segment = useSelectedLayoutSegment(); // null = Record (default), "quiz" = Quiz
  const { classid } = useParams();            // read [classid] from the URL

  const base = `/classes/${classid}`;
  const tabs = [
    { name: "Record", href: `${base}`,      active: segment === null },
    { name: "Quiz",   href: `${base}/quiz`, active: segment === "quiz" },
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
            className={`relative py-3 text-sm font-semibold transition-colors ${
              t.active ? "text-[#2B2D42]" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.name}
            <span
              className={`absolute left-0 right-0 -bottom-[1px] h-[2px] rounded-full transition-all ${
                t.active ? "bg-[#2E5EAA]" : "bg-transparent"
              }`}
            />
          </Link>
        ))}
      </nav>
    </div>
  );
}
