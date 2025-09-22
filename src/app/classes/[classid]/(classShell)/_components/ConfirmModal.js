"use client";

/**
 * ConfirmModal
 * Lightweight confirm dialog rendered in a Portal with framer-motion.
 *
 * Props:
 * - open: boolean — show/hide the modal
 * - title?: string — heading text (default: "Are you sure?")
 * - desc?: string — (kept for compatibility; not shown if `message` is provided)
 * - message?: string | ReactNode — body text (what you're confirming)
 * - confirmText?: string — confirm button label (default: "Confirm")
 * - cancelText?: string — cancel button label (default: "Cancel")
 * - onConfirm: () => void — called when confirm is clicked
 * - onClose: () => void — called when overlay/cancel is clicked
 *
 * NOTE: Business logic unchanged. This is readability + a11y polish only.
 * TODO: if you later want ESC-to-close or focus-trap, add them behind a flag.
 */

import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/app/_components/Portal";

export default function ConfirmModal({
  open,
  title = "Are you sure?",
  desc = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onClose,
  message,
}) {
  // ids for a11y labels
  const headingId = "confirm-modal-title";
  const bodyId = "confirm-modal-desc";

  return (
    <AnimatePresence>
      {open && (
        <Portal>
          {/* ——— Overlay — dim background; click to close ——— */}
          <motion.div
            className="fixed inset-0 z-[1000] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* ——— Dialog — centered card with small pop-in ——— */}
          <motion.div
            className="fixed inset-0 z-[1001] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            aria-modal="true"
            role="dialog"
            aria-labelledby={headingId}
            aria-describedby={bodyId}
          >
            {/* Stop clicks from bubbling to overlay */}
            <div
              className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-black/5"
              onClick={(e) => e.stopPropagation()}
            >
              {/* ——— Header + Body ——— */}
              <div className="px-6 pt-6">
                <h3 id={headingId} className="text-xl font-semibold text-[#2B2D42]">
                  {title}
                </h3>

                {/* NOTE: keeping `desc` for compatibility; we still render `message` only,
                    same as your original. If you want a fallback, swap to: {message ?? desc} */}
                {message && (
                  <p id={bodyId} className="mt-2 text-sm text-gray-600">
                    {message}
                  </p>
                )}
              </div>

              {/* ——— Actions ——— */}
              <div className="px-6 pb-6 pt-5 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg border border-gray-300/70 px-4 py-2 text-sm hover:bg-gray-50 transition"
                >
                  {cancelText}
                </button>

                <button
                  type="button"
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
