// src/app/classes/[classId]/layout.jsx (SERVER component)
import ClassClientShell from "./_components/ClassClientShell";
import BlurText from "@/app/_components/BlurText";
import HeaderActions from "./_components/HeaderActions";
import Link from "next/link";

export default function ClassLayout({ children, params }) {
  const { classId } = params;
  

  return (
    <section
      className="min-h-screen relative -mt-px"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(243,248,255,0.70), rgba(255,255,255,0.70)), url('/bgg2.png')",
        backgroundRepeat: "no-repeat, repeat",
        backgroundSize: "100% 100%, 500px 500px",
        backgroundPosition: "center top, left top",
      }}
    >
      {/* Banner (no diagonal) */}
      <div className="relative overflow-hidden">
        <div className="relative h-44 md:h-56 rounded-b-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
          {/* Gradient base */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA]" />

          {/* Soft blobs */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-8 left-10 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
            <div className="absolute top-6 right-16 w-52 h-52 rounded-full bg-white/10 blur-3xl" />
          </div>

          {/* Title + actions (above gradient) */}
          <div className="absolute inset-0 z-10 flex items-end">
            <div className="mx-auto w-full max-w-5xl px-6 pb-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  {/* tiny breadcrumb */}
                  <div className="text-[12px] text-white/85 mb-1">
                    <Link href="/dashboard" className="hover:underline">Dashboard</Link>
                    <span className="px-1.5">/</span>
                    <span className="hover:underline cursor-default">Classes</span>
                    <span className="px-1.5">/</span>
                    <span className="text-white font-medium">Details</span>
                  </div>

                  {/* heading with blur highlight */}
                  <BlurText
                    text="Class Details"
                    delay={120}
                    animateBy="words"
                    direction="top"
                    className="text-3xl md:text-4xl font-extrabold tracking-tight text-white"
                    highlight="Details"
                    highlightClassName="bg-gradient-to-r from-[#2E5EAA] to-[#4A8FE7] bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]"
                  />

                  {/* subtitle + ID chip */}
                  <div className="mt-2 flex items-center gap-3">
                    <p className="text-white/90 text-sm drop-shadow-sm">
                      Manage records & quizzes for this class.
                    </p>
                    <span className="px-2.5 py-1 rounded-md bg-white/20 text-white text-xs font-semibold backdrop-blur">
                      ID: {classId}
                    </span>
                  </div>
                </div>

                {/* Round icon actions, baseline-aligned */}
                <HeaderActions classId={classId} className="self-end mb-0.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs + animated content */}
      <div className="mx-auto w-full max-w-5xl px-6 mt-6">
        <ClassClientShell>{children}</ClassClientShell>
      </div>
    </section>
  );
}