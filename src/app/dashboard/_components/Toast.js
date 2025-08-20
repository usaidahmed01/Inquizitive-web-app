"use client";

import { useEffect } from "react";
import { CheckCircle, AlertTriangle, X } from "lucide-react";

export default function Toast({
  open,
  message = "",
  onClose = () => {},
  duration = 2500,
  type = "success", // "success" | "warning" | "error"
}) {
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, duration, onClose]);

  const tone =
    type === "success"
      ? "bg-emerald-600"
      : type === "warning"
      ? "bg-amber-600"
      : "bg-rose-600";

  const Icon = type === "success" ? CheckCircle : AlertTriangle;

  return (
    <div
      className={`fixed inset-x-0 bottom-6 z-[60] flex justify-center transition-all duration-200
        ${open ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}
      aria-live="polite"
    >
      <div
        className={`${tone} text-white shadow-lg rounded-full px-4 py-2 flex items-center gap-2`}
      >
        <Icon size={18} className="shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-1 p-1 rounded-full hover:bg-white/20 transition"
          aria-label="Close"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
