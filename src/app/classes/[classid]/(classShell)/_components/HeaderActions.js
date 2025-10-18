"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { LinkIcon, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "./ConfirmModal";

const API = process.env.NEXT_PUBLIC_API_BASE;

export default function HeaderActions({ classid, className = "", onDelete }) {
  const [openConfirm, setOpenConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

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
      window.prompt("Copy this link:", inviteUrl);
      toast.success("Invite link ready to copy", { position: "top-center" });
    }
  }, [classid]);

  /** Confirm -> delete the class via API (or parent override) */
  const handleConfirmDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(classid);
      } else {
        const res = await fetch(`${API}/classes/${classid}`, { method: "DELETE" });
        if (!res.ok) {
          let msg = "Failed to delete class";
          try {
            const j = await res.json();
            msg = j?.detail || j?.message || msg;
          } catch { }
          throw new Error(msg);
        }
      }

      toast.success("Class deleted");
      setOpenConfirm(false);

      // leave the page (we are on the deleted class)
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      const m = String(err?.message || "Failed to delete class");
      toast.error(m);
    } finally {
      setIsDeleting(false);
    }
  }, [API, classid, onDelete, router]);

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

      {/* Confirm deletion modal */}
      <ConfirmModal
        open={openConfirm}
        onClose={() => (isDeleting ? null : setOpenConfirm(false))}
        onConfirm={handleConfirmDelete}
        title="Delete this class?"
        message="This will permanently remove the class and its records. You can’t undo this."
        confirmText={isDeleting ? "Deleting…" : "Delete"}
        cancelText="Cancel"
        confirmDisabled={isDeleting}
      />
    </>
  );
}
