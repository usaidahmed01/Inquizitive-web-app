// src/app/classes/[classid]/layout.jsx (SERVER component)
import ClassClientShell from "./_components/ClassClientShell";
import ClassHeaderGate from "./_components/ClassHeaderGate";

export default function ClassLayout({ children }) {

  return (
    <section
      className="min-h-screen relative"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(243,248,255,0.70), rgba(255,255,255,0.70)), url('/bgg2.png')",
        backgroundRepeat: "no-repeat, repeat",
        backgroundSize: "100% 100%, 500px 500px",
        backgroundPosition: "center top, left top",
      }}
    >
      {/* Banner shows only on Record via client gate */}
      <ClassHeaderGate/>

      {/* Tabs + animated content */}
      <div className="mx-auto w-full max-w-5xl px-6">
        <ClassClientShell>{children}</ClassClientShell>
      </div>
    </section>
  );
}
