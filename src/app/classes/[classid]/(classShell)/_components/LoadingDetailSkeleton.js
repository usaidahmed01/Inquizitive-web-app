export default function LoadingDetailSkeleton() {
  return (
    <div className="space-y-8 py-8">
      {/* Header skeleton with glass shimmer */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-[#e9f2ff] via-white to-[#eef7ff]">
        <GlassShimmer />
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/70 border border-white/60" />
            <div className="space-y-2">
              <div className="h-4 w-48 rounded bg-white/70" />
              <div className="h-3 w-64 rounded bg-white/60" />
            </div>
          </div>
          {/* pills / meta skeleton */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="h-6 w-24 rounded-full bg-white/40" />
            <div className="h-6 w-20 rounded-full bg-white/30" />
            <div className="h-6 w-16 rounded-full bg-white/20" />
          </div>
        </div>
      </div>

      {/* Question cards skeleton */}
      <div className="space-y-5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-2xl bg-white/40 backdrop-blur-md border border-white/30 shadow-sm p-5"
          >
            <GlassShimmer />
            <div className="space-y-3 relative z-10">
              {/* question line */}
              <div className="h-4 w-2/3 rounded bg-gray-100" />
              {/* options (pill-like) */}
              <div className="grid sm:grid-cols-2 gap-2">
                <div className="h-9 rounded-full bg-gray-100" />
                <div className="h-9 rounded-full bg-gray-100" />
                <div className="h-9 rounded-full bg-gray-100" />
                <div className="h-9 rounded-full bg-gray-100" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Glassy shimmer overlay */
function GlassShimmer() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      {/* static frosted tint */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-md" />

      {/* animated diagonal reflection sweep */}
      <div
        className="absolute inset-0 -translate-x-full animate-[shine_2.5s_infinite] bg-gradient-to-tr from-transparent via-white/40 to-transparent"
      />

      <style jsx>{`
        @keyframes shine {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
}

