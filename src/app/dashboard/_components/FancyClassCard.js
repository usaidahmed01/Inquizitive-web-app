"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Users, ArrowRight, Link as LinkIcon } from "lucide-react";
import toast from "react-hot-toast";

/**
 * FancyClassCard — clickable, green gradient, smooth + dynamic.
 * Props: { cls: { id, title, code, students } }
 */
export default function FancyClassCard({ cls }) {
  
  return (
    <Link
      href={`/classes/${cls.id}`}
      className="block group"
      aria-label={`Open ${cls.title}`}
    >
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        whileHover={{
          y: -6,
          scale: 1.02,
          boxShadow: "0 18px 50px rgba(31, 97, 72, 0.22)", // greenish shadow
        }}
        className="relative rounded-2xl overflow-hidden text-white"
        style={{
          // Medium green gradient base (theme-friendly)
          background:
            "linear-gradient(135deg, #5FAF98 0%, #6FC1A8 45%, #A0D9C3 100%)",
        }}
      >
        {/* Sweep sheen on hover */}
        <motion.div
          aria-hidden
          initial={{ x: "-120%" }}
          whileHover={{ x: "120%" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="pointer-events-none absolute -inset-y-12 -left-1/3 w-1/3 rotate-12 bg-white/15 blur-2xl"
        />

        {/* Soft texture so card doesn't feel empty */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08] group-hover:opacity-[0.12] transition-opacity"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg fill='none' stroke='white' stroke-opacity='0.5'%3E%3Cpath d='M0 32 L32 0'/%3E%3C/g%3E%3C/svg%3E\")",
          }}
        />

        {/* Content */}
        <div className="relative p-6 md:p-7">
          {/* Top row: title + students */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-xl md:text-2xl font-bold tracking-tight">
                BS{cls.dept} - {cls.title}
              </h3>
              <span className="inline-flex items-center gap-2 text-[13px] font-semibold bg-white/18 px-2.5 py-1 rounded-md">
                <span className="opacity-90">Code:</span>{cls.dept}-{cls.code}

                {cls.section && <><span className="opacity-90">Section:</span> {cls.section}</>}
              </span>
            </div>

            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
                         text-sm font-medium text-[#0e3c2e]
                         bg-white/90 backdrop-blur-sm shadow-sm"
              title="Students"
            >
              <Users size={16} />
              {cls.students}
            </span>
          </div>

          {/* Divider */}
          <div className="my-5 h-px bg-white/25" />

          {/* Subtext + affordance */}
          <div className="flex items-center justify-between text-white/90">
            <p className="text-sm">
              Manage students & quizzes for this class.
            </p>
            <ArrowRight
              size={18}
              className="opacity-80 transform transition-transform duration-300 group-hover:translate-x-1"
            />
          </div>
        </div>

        {/* Bottom-right: Generate Class Link button */}
        <button
          onClick={(e) => {
            e.preventDefault(); // keep the whole card link from navigating
            // TODO: replace with real link generation + copy
            toast.success(`Invite Link Copied`);
          }}
          className="absolute bottom-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur-sm transition"
          title="Generate Class Link"
          aria-label="Generate Class Link"
        >
          <LinkIcon size={18} />
        </button>
      </motion.div>
    </Link>
  );
}
