"use client";
export default function QuizSkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <div className="h-36 w-full bg-gray-200/60" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-3 w-1/2 rounded bg-gray-200" />
        <div className="grid grid-cols-3 gap-2">
          <div className="h-10 rounded bg-gray-100" />
          <div className="h-10 rounded bg-gray-100" />
          <div className="h-10 rounded bg-gray-100" />
        </div>
        <div className="h-9 w-32 rounded bg-gray-200" />
      </div>
    </div>
  );
}
