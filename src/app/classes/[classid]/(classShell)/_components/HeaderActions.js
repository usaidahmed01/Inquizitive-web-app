"use client";

/**
 * HeaderActions
 * Small action cluster for a class header: copy invite link + delete.
 *
 * Props:
 * - classid: string | number — unique class identifier used in invite URL
 * - className?: string — extra classes for outer wrapper
 * - onDelete?: (classid) => void — parent handles actual deletion
 *
 * NOTE: Business logic unchanged. This is readability + a11y polish only.
 * TODO: if you wire real deletion later, call your API in onDelete (put you db here yk)
 */

import { useCallback, useState } from "react";
import { LinkIcon, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";

export default function HeaderActions({ classid, className = "", onDelete }) {
  const [openConfirm, setOpenConfirm] = useState(false);

  /** Copy invite link to clipboard (with prompt fallback). */
  const copyInvite = useCallback(async () => {
    const origin =
      typeof window !== "undefined" && window.location
        ? window.location.origin
        : "";

    const inviteUrl = `${origin}/join/${classid}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied!", { position: "top-center" });
    } catch {
      // Fallback for older browsers / denied permissions
      window.prompt("Copy this link:", inviteUrl);
      toast.success("Invite link ready to copy", { position: "top-center" });
    }
  }, [classid]);

  /** Confirm dialog -> parent callback (or demo toast). */
  const handleConfirmDelete = useCallback(() => {
    setOpenConfirm(false);
    if (onDelete) {
      onDelete(classid); // parent removes from state/db
    } else {
      // Demo fallback: no-op API; keep existing UX
      toast.success("Class deleted");
    }
  }, [classid, onDelete]);

  return (
    <>
      <div className={`flex items-end ${className}`}>
        <div className="flex items-center gap-2 pb-1">
          {/* ——— INVITE ——— */}
          <div className="relative group">
            <button
              type="button"
              onClick={copyInvite}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#2E5EAA] text-white shadow-sm transition hover:bg-[#264d8b]"
              aria-label="Copy class invite link"
              title="Class link"
            >
              <LinkIcon size={18} aria-hidden="true" />
            </button>
            {/* Simple tooltip (pure CSS hover) */}
            <div
              className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-[11px] text-white opacity-0 translate-y-1 shadow-md transition duration-200 group-hover:opacity-100 group-hover:translate-y-0"
              role="tooltip"
            >
              Class link
            </div>
          </div>

          {/* ——— DELETE ——— */}
          <div className="relative group">
            <button
              type="button"
              onClick={() => setOpenConfirm(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-sm transition hover:bg-red-700"
              aria-label="Delete class"
              title="Delete class"
            >
              <Trash2 size={18} aria-hidden="true" />
            </button>
            <div
              className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-[11px] text-white opacity-0 translate-y-1 shadow-md transition duration-200 group-hover:opacity-100 group-hover:translate-y-0"
              role="tooltip"
            >
              Delete class
            </div>
          </div>
        </div>
      </div>

      {/* Confirm deletion modal (same API/behavior) */}
      <ConfirmModal
        open={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={handleConfirmDelete}
        title="Delete this class?"
        message="This will permanently remove the class and its records. You can’t undo this."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}
