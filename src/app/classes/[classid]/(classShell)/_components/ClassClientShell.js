"use client";

import { motion } from "framer-motion";
import { useSelectedLayoutSegments } from "next/navigation";
import ClassTabs from "./ClassTabs";

export default function ClassClientShell({ children }) {
  const segments = useSelectedLayoutSegments();
  const top = segments?.[0];
  const sub = segments?.[1];

  // header shows only on record root or quiz list
  const hasHeader = !top || (top === "quiz" && !sub);

  return (
    <>
      {/* Tabs only if header is visible */}
      {hasHeader && (
        <div className="mt-4">
          <ClassTabs />
        </div>
      )}

      <motion.div
        key={top ?? "record"}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        // only add top margin if header is shown
        className={`${hasHeader ? "mt-6" : "mt-0"} pb-16`}
      >
        {children}
      </motion.div>
    </>
  );
}
