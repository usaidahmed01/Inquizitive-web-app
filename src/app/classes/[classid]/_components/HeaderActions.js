"use client";

import { useCallback, useState } from "react";
import { Link2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";

export default function HeaderActions({ classId, className = "", onDelete }) {
  const [openConfirm, setOpenConfirm] = useState(false);

  const copyInvite = useCallback(async () => {
    const origin =
      typeof window !== "undefined" && window.location
        ? window.location.origin
        : "";

    const inviteUrl = `${origin}/join/${classId}`;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      toast.success("Invite link copied!", { position: "top-center" });
    } catch {
      // Fallback for browsers/permissions
      window.prompt("Copy this link:", inviteUrl);
      toast.success("Invite link ready to copy", { position: "top-center" });
    }
  }, [classId]);

  const handleConfirmDelete = useCallback(() => {
    setOpenConfirm(false);
    if (onDelete) {
      onDelete(classId); // let parent actually remove it from state/db
    } else {
      // fallback demo behavior:
      toast.success("Class deleted");
    }
  }, [classId, onDelete]);

  return (
    <>
      <div className={`flex items-end ${className}`}>
        <div className="flex items-center gap-2 pb-1">
          {/* INVITE (round icon + tooltip) */}
          <div className="relative group">
            <button
              onClick={copyInvite}
              className="w-10 h-10 inline-flex items-center justify-center rounded-full
                         bg-[#2E5EAA] hover:bg-[#264d8b] text-white shadow-sm transition"
              aria-label="Copy class invite link"
              title="Class link"
            >
              <Link2 size={18} />
            </button>
            <div
              className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2
                         whitespace-nowrap rounded-md bg-black px-2 py-1 text-[11px] text-white
                         opacity-0 translate-y-1 shadow-md transition duration-200
                         group-hover:opacity-100 group-hover:translate-y-0"
            >
              Class link
            </div>
          </div>

          {/* DELETE (round icon + tooltip + modal) */}
          <div className="relative group">
            <button
              onClick={() => setOpenConfirm(true)}
              className="w-10 h-10 inline-flex items-center justify-center rounded-full
                         bg-red-600 hover:bg-red-700 text-white shadow-sm transition"
              aria-label="Delete class"
              title="Delete class"
            >
              <Trash2 size={18} />
            </button>
            <div
              className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2
                         whitespace-nowrap rounded-md bg-black px-2 py-1 text-[11px] text-white
                         opacity-0 translate-y-1 shadow-md transition duration-200
                         group-hover:opacity-100 group-hover:translate-y-0"
            >
              Delete class
            </div>
          </div>
        </div>
      </div>

      {/* Confirm deletion modal */}
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
