// "use client";

// import { useMemo, useRef, useState } from "react";
// import { motion } from "framer-motion";
// import SlideUp from "@/app/_components/SlideUp";
// import {
//   Image as ImageIcon,
//   FileText,
//   Settings,
//   Wand2,
//   Loader2,
//   Trash2,
//   Upload,
//   CheckCircle2,
// } from "lucide-react";

// export default function QuizView() {
//   const [material, setMaterial] = useState("");
//   const [files, setFiles] = useState([]);           // previews only (no upload yet)
//   const [quizType, setQuizType] = useState("mixed"); // 'mcq' | 'short' | 'mixed'
//   const [difficulty, setDifficulty] = useState(60); // 0..100
//   const [count, setCount] = useState(10);
//   const [generating, setGenerating] = useState(false);
//   const [quiz, setQuiz] = useState(null);           // preview data
//   const inputRef = useRef(null);

//   const handleFile = (fileList) => {
//     const arr = Array.from(fileList || []);
//     const imgs = arr
//       .filter((f) => f.type.startsWith("image/"))
//       .slice(0, 6); // cap previews
//     // create object URLs
//     const previews = imgs.map((f) => ({
//       name: f.name,
//       url: URL.createObjectURL(f),
//       type: f.type,
//       size: f.size,
//     }));
//     setFiles((prev) => [...prev, ...previews].slice(0, 6));
//   };

//   const onDrop = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     handleFile(e.dataTransfer.files);
//   };

//   const onPick = (e) => {
//     handleFile(e.target.files);
//     // reset input so the same file can be picked again if needed
//     if (inputRef.current) inputRef.current.value = "";
//   };

//   const removePreview = (idx) => {
//     setFiles((prev) => {
//       const copy = [...prev];
//       // revoke old URL
//       try { URL.revokeObjectURL(copy[idx]?.url); } catch {}
//       copy.splice(idx, 1);
//       return copy;
//     });
//   };

//   const canGenerate = useMemo(() => {
//     return material.trim().length > 0 || files.length > 0;
//   }, [material, files]);

//   // Fake generator (stub): turns material into mock questions
//   const generateQuiz = async () => {
//     if (!canGenerate || generating) return;
//     setGenerating(true);

//     // simulate API delay
//     await new Promise((r) => setTimeout(r, 1200));

//     // create mock questions
//     const base = material
//       .split(/\s+/)
//       .filter(Boolean)
//       .slice(0, 20)
//       .join(" ");

//     const questions = Array.from({ length: Math.max(1, Number(count) || 10) }).map((_, i) => {
//       const qText = `Q${i + 1}. ${base ? base : "From uploaded material"} — concept ${i + 1}?`;
//       if (quizType === "short") {
//         return { id: i + 1, type: "short", q: qText, a: "Short answer goes here." };
//       }
//       if (quizType === "mcq") {
//         return {
//           id: i + 1,
//           type: "mcq",
//           q: qText,
//           options: ["Option A", "Option B", "Option C", "Option D"],
//           answerIndex: i % 4,
//         };
//       }
//       // mixed
//       if (i % 2 === 0) {
//         return {
//           id: i + 1,
//           type: "mcq",
//           q: qText,
//           options: ["Option A", "Option B", "Option C", "Option D"],
//           answerIndex: (i + 1) % 4,
//         };
//       }
//       return { id: i + 1, type: "short", q: qText, a: "Short answer goes here." };
//     });

//     setQuiz({
//       meta: {
//         type: quizType,
//         difficulty,
//         count: questions.length,
//         sourceImages: files.length,
//       },
//       questions,
//       shareLink: "#", // later: actual link after saving to DB
//     });
//     setGenerating(false);
//   };

//   const clearAll = () => {
//     setMaterial("");
//     setFiles((prev) => {
//       prev.forEach((p) => {
//         try { URL.revokeObjectURL(p.url); } catch {}
//       });
//       return [];
//     });
//     setQuiz(null);
//   };

//   return (
//     <SlideUp>
//       <div className="space-y-8">
//         {/* Header / Hero */}
//         <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA] p-6">
//           {/* soft textures */}
//           <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
//           <div className="pointer-events-none absolute -bottom-12 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
//           <div className="relative z-10">
//             <div className="flex items-center gap-3 text-white">
//               <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
//                 <Wand2 size={20} />
//               </div>
//               <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Quiz Generator</h2>
//             </div>
//             <p className="mt-2 text-white/90">
//               Paste material or drop reference images. Choose quiz style and hit <span className="font-semibold">Generate</span>.
//             </p>
//           </div>
//         </div>

//         {/* Inputs Panel */}
//         <div className="grid lg:grid-cols-3 gap-6">
//           {/* Material & Upload (left 2/3) */}
//           <div className="lg:col-span-2 space-y-6">
//             {/* Paste Material */}
//             <div className="relative rounded-2xl bg-white border border-black/5 shadow-sm">
//               <div className="flex items-center gap-2 px-5 pt-4 text-sm font-medium text-[#2B2D42]">
//                 <FileText size={16} className="text-[#2E5EAA]" />
//                 Material (paste or type)
//               </div>
//               <div className="px-5 pb-5 pt-2">
//                 <textarea
//                   value={material}
//                   onChange={(e) => setMaterial(e.target.value)}
//                   placeholder="Paste the lecture notes, topic summaries, or key points here..."
//                   className="mt-2 w-full min-h-[160px] rounded-xl border border-gray-300/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#2E5EAA]/30"
//                 />
//               </div>
//             </div>

//             {/* Upload Images */}
//             <div
//               className="relative rounded-2xl bg-white border border-dashed border-[#2E5EAA]/40 shadow-sm p-5"
//               onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
//               onDrop={onDrop}
//             >
//               <div className="flex items-center gap-2 text-sm font-medium text-[#2B2D42]">
//                 <ImageIcon size={16} className="text-[#2E5EAA]" />
//                 Optional: Reference images (slides, pages, screenshots)
//               </div>

//               <div className="mt-3 rounded-xl bg-[#F7FAFF] border border-[#2E5EAA]/15 p-5 text-center">
//                 <input
//                   ref={inputRef}
//                   type="file"
//                   multiple
//                   accept="image/*"
//                   onChange={onPick}
//                   className="hidden"
//                   id="quiz-upload"
//                 />
//                 <label
//                   htmlFor="quiz-upload"
//                   className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/90 border border-gray-300/70 px-4 py-2 text-sm font-medium text-[#2B2D42] hover:bg-white"
//                 >
//                   <Upload size={16} />
//                   Select images
//                 </label>
//                 <p className="mt-2 text-xs text-gray-500">or drag & drop up to 6 images here</p>
//               </div>

//               {/* Thumbnails */}
//               {files.length > 0 && (
//                 <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
//                   {files.map((f, idx) => (
//                     <div key={idx} className="relative group">
//                       <img
//                         src={f.url}
//                         alt={f.name}
//                         className="h-20 w-full object-cover rounded-lg border border-black/5"
//                       />
//                       <button
//                         onClick={() => removePreview(idx)}
//                         className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition"
//                         title="Remove"
//                       >
//                         <Trash2 size={14} />
//                       </button>
//                     </div>
//                   ))}
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Settings (right 1/3) */}
//           <div className="space-y-6">
//             <div className="relative rounded-2xl bg-white border border-black/5 shadow-sm">
//               <div className="flex items-center gap-2 px-5 pt-4 text-sm font-medium text-[#2B2D42]">
//                 <Settings size={16} className="text-[#2E5EAA]" />
//                 Quiz Settings
//               </div>
//               <div className="px-5 pb-5 pt-3 space-y-5">
//                 {/* Type */}
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-1">Type</label>
//                   <div className="grid grid-cols-3 gap-2">
//                     <TypePill
//                       label="MCQs"
//                       active={quizType === "mcq"}
//                       onClick={() => setQuizType("mcq")}
//                     />
//                     <TypePill
//                       label="Short"
//                       active={quizType === "short"}
//                       onClick={() => setQuizType("short")}
//                     />
//                     <TypePill
//                       label="Mixed"
//                       active={quizType === "mixed"}
//                       onClick={() => setQuizType("mixed")}
//                     />
//                   </div>
//                 </div>

//                 {/* Difficulty */}
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-2">
//                     Difficulty ({difficulty}%)
//                   </label>
//                   <input
//                     type="range"
//                     min={0}
//                     max={100}
//                     step={5}
//                     value={difficulty}
//                     onChange={(e) => setDifficulty(Number(e.target.value))}
//                     className="w-full accent-[#2E5EAA]"
//                   />
//                   <div className="mt-1 flex justify-between text-[11px] text-gray-500">
//                     <span>Easy</span><span>Medium</span><span>Hard</span>
//                   </div>
//                 </div>

//                 {/* Count */}
//                 <div>
//                   <label className="block text-xs text-gray-500 mb-1"># Questions</label>
//                   <input
//                     type="number"
//                     min={1}
//                     max={50}
//                     value={count}
//                     onChange={(e) => setCount(Number(e.target.value))}
//                     className="w-full rounded-lg border border-gray-300/70 px-3 py-2 text-sm"
//                   />
//                 </div>

//                 {/* Actions */}
//                 <div className="flex items-center gap-2 pt-2">
//                   <button
//                     disabled={!canGenerate || generating}
//                     onClick={generateQuiz}
//                     className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white
//                                bg-[#2E5EAA] hover:bg-[#264d8b] disabled:opacity-60 disabled:cursor-not-allowed transition"
//                   >
//                     {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
//                     {generating ? "Generating..." : "Generate Quiz"}
//                   </button>
//                   <button
//                     onClick={clearAll}
//                     className="inline-flex items-center justify-center rounded-xl px-3 py-2.5 text-sm border border-gray-300/70 hover:bg-gray-50 transition"
//                   >
//                     Clear
//                   </button>
//                 </div>
//               </div>
//             </div>

//             {/* Tips card */}
//             <div className="rounded-2xl bg-gradient-to-br from-[#F3F8FF] to-white border border-black/5 p-4">
//               <p className="text-sm text-[#2B2D42] font-semibold mb-1">Tips</p>
//               <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
//                 <li>Paste clean bullet points for best results.</li>
//                 <li>Upload slide screenshots if material is image-only.</li>
//                 <li>Use “Mixed” to combine MCQs + short answers.</li>
//               </ul>
//             </div>
//           </div>
//         </div>

//         {/* Preview */}
//         {quiz && (
//           <motion.div
//             initial={{ opacity: 0, y: 12 }}
//             animate={{ opacity: 1, y: 0 }}
//             className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden"
//           >
//             <div className="px-5 py-4 flex items-center justify-between">
//               <div className="flex items-center gap-2">
//                 <CheckCircle2 className="text-[#81B29A]" size={18} />
//                 <h3 className="font-semibold text-[#2B2D42]">
//                   Generated Quiz — {quiz.meta.count} Question{quiz.meta.count > 1 ? "s" : ""}
//                 </h3>
//               </div>
//               {/* later: copy/share link after saving */}
//               <button
//                 className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium
//                            bg-[#2E5EAA] text-white hover:bg-[#264d8b] transition"
//                 title="(stub) Copy quiz link"
//               >
//                 Copy Link
//               </button>
//             </div>

//             <div className="divide-y divide-gray-100">
//               {quiz.questions.map((q) => (
//                 <div key={q.id} className="px-5 py-4">
//                   <p className="font-medium text-[#2B2D42]">{q.q}</p>
//                   {q.type === "mcq" ? (
//                     <ul className="mt-2 grid sm:grid-cols-2 gap-2">
//                       {q.options.map((opt, i) => (
//                         <li
//                           key={i}
//                           className={`rounded-lg border px-3 py-2 text-sm
//                                       ${i === q.answerIndex
//                                         ? "border-[#81B29A] bg-[#EAF5F0]"
//                                         : "border-gray-200 bg-white"}`}
//                         >
//                           {opt}
//                         </li>
//                       ))}
//                     </ul>
//                   ) : (
//                     <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
//                       <em>Expected answer:</em> {q.a}
//                     </div>
//                   )}
//                 </div>
//               ))}
//             </div>
//           </motion.div>
//         )}
//       </div>
//     </SlideUp>
//   );
// }

// /* ---- tiny UI helpers ---- */

// function TypePill({ label, active, onClick }) {
//   return (
//     <button
//       onClick={onClick}
//       className={`rounded-xl px-3 py-2 text-sm font-semibold transition
//         ${active
//           ? "bg-[#2E5EAA] text-white shadow-sm"
//           : "bg-white text-[#2B2D42] border border-gray-300/70 hover:bg-gray-50"}`}
//     >
//       {label}
//     </button>
//   );
// }










































































"use client";

import { useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import SlideUp from "@/app/_components/SlideUp";
import {
  Image as ImageIcon,
  FileText,
  Settings,
  Wand2,
  Loader2,
  Trash2,
  Upload,
  CheckCircle2,
} from "lucide-react";

export default function QuizView() {
  const router = useRouter();
  const { classId } = useParams(); // <-- we need classId for routing
  const [material, setMaterial] = useState("");
  const [files, setFiles] = useState([]);
  const [quizType, setQuizType] = useState("mixed");
  const [difficulty, setDifficulty] = useState(60);
  const [count, setCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [quiz, setQuiz] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (fileList) => {
    const arr = Array.from(fileList || []);
    const imgs = arr.filter((f) => f.type.startsWith("image/")).slice(0, 6);
    const previews = imgs.map((f) => ({
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type,
      size: f.size,
    }));
    setFiles((prev) => [...prev, ...previews].slice(0, 6));
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFile(e.dataTransfer.files);
  };

  const onPick = (e) => {
    handleFile(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removePreview = (idx) => {
    setFiles((prev) => {
      const copy = [...prev];
      try { URL.revokeObjectURL(copy[idx]?.url); } catch {}
      copy.splice(idx, 1);
      return copy;
    });
  };

  const canGenerate = useMemo(
    () => material.trim().length > 0 || files.length > 0,
    [material, files]
  );

  // mock generator
  const generateQuiz = async () => {
    if (!canGenerate || generating) return;
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 900));

    const base = material.split(/\s+/).filter(Boolean).slice(0, 20).join(" ");
    const questions = Array.from({ length: Math.max(1, Number(count) || 10) }).map((_, i) => {
      const qText = `Q${i + 1}. ${base || "From uploaded material"} — concept ${i + 1}?`;
      if (quizType === "short") {
        return { id: i + 1, type: "short", q: qText, a: "Short answer goes here." };
      }
      if (quizType === "mcq") {
        return {
          id: i + 1, type: "mcq", q: qText,
          options: ["Option A", "Option B", "Option C", "Option D"],
          answerIndex: i % 4
        };
      }
      // mixed
      return i % 2 === 0
        ? { id: i + 1, type: "mcq", q: qText, options: ["Option A","Option B","Option C","Option D"], answerIndex: (i+1)%4 }
        : { id: i + 1, type: "short", q: qText, a: "Short answer goes here." };
    });

    setQuiz({
      id: "preview",
      title: "Generated Quiz (Preview)",
      meta: { type: quizType, difficulty, count: questions.length, sourceImages: files.length },
      questions
    });
    setGenerating(false);
  };

  // save to localStorage and view detail page
  const saveAndView = () => {
    if (!quiz) return;
    const quizId = `q_${Date.now()}`;
    const toSave = {
      id: quizId,
      classId,
      title: quiz.title === "Generated Quiz (Preview)" ? "Untitled Quiz" : quiz.title,
      createdAt: new Date().toISOString(),
      meta: quiz.meta,
      questions: quiz.questions
    };

    try {
      // save the quiz
      localStorage.setItem(`inquiz_quiz_${quizId}`, JSON.stringify(toSave));
      // also index it under the class for a future "quizzes list"
      const idxKey = `inquiz_idx_${classId}`;
      const idx = JSON.parse(localStorage.getItem(idxKey) || "[]");
      localStorage.setItem(idxKey, JSON.stringify([{ id: quizId, title: toSave.title, createdAt: toSave.createdAt }, ...idx]));
    } catch (e) {
      console.error("Failed to save quiz:", e);
    }
    router.push(`/classes/${classId}/quiz/${quizId}`);
  };

  const clearAll = () => {
    setMaterial("");
    setFiles((prev) => { prev.forEach(p => { try { URL.revokeObjectURL(p.url); } catch {} }); return []; });
    setQuiz(null);
  };

  return (
    <SlideUp>
      <div className="space-y-8">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA] p-6">
          <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-16 w-56 h-56 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-white">
              <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Wand2 size={20} />
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">AI Quiz Generator</h2>
            </div>
            <p className="mt-2 text-white/90">
              Paste material or drop reference images. Choose quiz style and hit <span className="font-semibold">Generate</span>.
            </p>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="relative rounded-2xl bg-white border border-black/5 shadow-sm">
              <div className="flex items-center gap-2 px-5 pt-4 text-sm font-medium text-[#2B2D42]">
                <FileText size={16} className="text-[#2E5EAA]" />
                Material (paste or type)
              </div>
              <div className="px-5 pb-5 pt-2">
                <textarea
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  placeholder="Paste the lecture notes, topic summaries, or key points here..."
                  className="mt-2 w-full min-h-[160px] rounded-xl border border-gray-300/70 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#2E5EAA]/30"
                />
              </div>
            </div>

            <div
              className="relative rounded-2xl bg-white border border-dashed border-[#2E5EAA]/40 shadow-sm p-5"
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
              onDrop={onDrop}
            >
              <div className="flex items-center gap-2 text-sm font-medium text-[#2B2D42]">
                <ImageIcon size={16} className="text-[#2E5EAA]" />
                Optional: Reference images (slides, pages, screenshots)
              </div>

              <div className="mt-3 rounded-xl bg-[#F7FAFF] border border-[#2E5EAA]/15 p-5 text-center">
                <input ref={inputRef} type="file" multiple accept="image/*" onChange={onPick} className="hidden" id="quiz-upload" />
                <label
                  htmlFor="quiz-upload"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/90 border border-gray-300/70 px-4 py-2 text-sm font-medium text-[#2B2D42] hover:bg-white"
                >
                  <Upload size={16} />
                  Select images
                </label>
                <p className="mt-2 text-xs text-gray-500">or drag & drop up to 6 images here</p>
              </div>

              {files.length > 0 && (
                <div className="mt-4 grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {files.map((f, idx) => (
                    <div key={idx} className="relative group">
                      <img src={f.url} alt={f.name} className="h-20 w-full object-cover rounded-lg border border-black/5" />
                      <button
                        onClick={() => removePreview(idx)}
                        className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative rounded-2xl bg-white border border-black/5 shadow-sm">
              <div className="flex items-center gap-2 px-5 pt-4 text-sm font-medium text-[#2B2D42]">
                <Settings size={16} className="text-[#2E5EAA]" />
                Quiz Settings
              </div>
              <div className="px-5 pb-5 pt-3 space-y-5">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Type</label>
                  <div className="grid grid-cols-3 gap-2">
                    <TypePill label="MCQs"  active={quizType === "mcq"}   onClick={() => setQuizType("mcq")} />
                    <TypePill label="Short" active={quizType === "short"} onClick={() => setQuizType("short")} />
                    <TypePill label="Mixed" active={quizType === "mixed"} onClick={() => setQuizType("mixed")} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-2">Difficulty ({difficulty}%)</label>
                  <input type="range" min={0} max={100} step={5} value={difficulty} onChange={(e) => setDifficulty(Number(e.target.value))} className="w-full accent-[#2E5EAA]" />
                  <div className="mt-1 flex justify-between text-[11px] text-gray-500"><span>Easy</span><span>Medium</span><span>Hard</span></div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1"># Questions</label>
                  <input type="number" min={1} max={50} value={count} onChange={(e) => setCount(Number(e.target.value))} className="w-full rounded-lg border border-gray-300/70 px-3 py-2 text-sm" />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    disabled={!canGenerate || generating}
                    onClick={generateQuiz}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 font-semibold text-white
                               bg-[#2E5EAA] hover:bg-[#264d8b] disabled:opacity-60 disabled:cursor-not-allowed transition"
                  >
                    {generating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                    {generating ? "Generating..." : "Generate Quiz"}
                  </button>
                  <button onClick={clearAll} className="inline-flex items-center justify-center rounded-xl px-3 py-2.5 text-sm border border-gray-300/70 hover:bg-gray-50 transition">
                    Clear
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-[#F3F8FF] to-white border border-black/5 p-4">
              <p className="text-sm text-[#2B2D42] font-semibold mb-1">Tips</p>
              <ul className="text-sm text-gray-600 list-disc pl-5 space-y-1">
                <li>Paste clean bullet points for best results.</li>
                <li>Upload slide screenshots if material is image-only.</li>
                <li>Use “Mixed” to combine MCQs + short answers.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Preview + Save & View */}
        {quiz && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-white border border-black/5 shadow-sm overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="text-[#81B29A]" size={18} />
                <h3 className="font-semibold text-[#2B2D42]">
                  Generated Quiz — {quiz.meta.count} Question{quiz.meta.count > 1 ? "s" : ""}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={saveAndView}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium
                             bg-[#2E5EAA] text-white hover:bg-[#264d8b] transition"
                >
                  Save & View
                </button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {quiz.questions.map((q) => (
                <div key={q.id} className="px-5 py-4">
                  <p className="font-medium text-[#2B2D42]">{q.q}</p>
                  {q.type === "mcq" ? (
                    <ul className="mt-2 grid sm:grid-cols-2 gap-2">
                      {q.options.map((opt, i) => (
                        <li
                          key={i}
                          className={`rounded-lg border px-3 py-2 text-sm
                                      ${i === q.answerIndex ? "border-[#81B29A] bg-[#EAF5F0]" : "border-gray-200 bg-white"}`}
                        >
                          {opt}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
                      <em>Expected answer:</em> {q.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </SlideUp>
  );
}

function TypePill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-3 py-2 text-sm font-semibold transition
        ${active ? "bg-[#2E5EAA] text-white shadow-sm" : "bg-white text-[#2B2D42] border border-gray-300/70 hover:bg-gray-50"}`}
    >
      {label}
    </button>
  );
}

