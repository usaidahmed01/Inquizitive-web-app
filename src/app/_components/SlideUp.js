"use client";

import { motion } from "framer-motion";

export default function SlideUp({ children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.40, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}