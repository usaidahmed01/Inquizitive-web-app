"use client";

import { motion } from "framer-motion";
import { useSelectedLayoutSegment } from "next/navigation";
import ClassTabs from "./ClassTabs";

export default function ClassClientShell({ children }) {
  const segment = useSelectedLayoutSegment();

  return (
    <>
      <div className="mt-4">
        <ClassTabs />
      </div>
      <motion.div
        key={segment ?? "record"}
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="mt-6 pb-16"
      >
        {children}
      </motion.div>
    </>
  );
}
