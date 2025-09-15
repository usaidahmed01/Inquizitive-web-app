"use client";

import Portal from "@/app/_components/Portal";
import { motion, AnimatePresence } from "framer-motion";

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  desc = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose,
  message
}) {
  return (
    <AnimatePresence>
      {open && (
        <Portal>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Dialog */}
          <motion.div
            className="fixed inset-0 z-[1001] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
          >
            <div
              className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-6 pt-6">
                <h3 className="text-xl font-semibold text-[#2B2D42]">{title}</h3>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
              </div>
              <div className="px-6 pb-6 pt-5 flex items-center justify-end gap-3">
                <button
                  onClick={onClose}
                  className="rounded-lg border border-gray-300/70 px-4 py-2 text-sm hover:bg-gray-50 transition"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition"
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </Portal>
      )}
    </AnimatePresence>
  );
}
