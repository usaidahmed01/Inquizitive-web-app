'use client';

import BlurText from '../_components/BlurText';
import { Plus, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import FancyClassCard from './_components/FancyClassCard';
import ClassAddModal from './_components/ClassAddModal';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [classes, setClasses] = useState([
    // Start empty to see the new empty state:
    { id: 'c1', title: 'Software Project Management', sem: '4', code: '101', dept: 'CS', section: 'B', students: 42 },
    { id: 'c2', title: 'Data Communication', sem: '3', code: '301', dept: 'CS', section: 'A', students: 37 },
  ]);

  const [openAdd, setOpenAdd] = useState(false);

  const handleCreate = (newClass) => {
    setClasses((prev) => [newClass, ...prev]);
    toast.success('Class created successfully!');
  };

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative flex flex-col justify-center items-center
                    h-[56vh] md:h-[64vh] overflow-hidden">
        {/* Background Layer */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA] opacity-80" />
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#81B29A] rounded-full mix-blend-multiply blur-3xl opacity-30 animate-pulse" />
          <div className="absolute top-40 -right-40 w-[500px] h-[500px] bg-[#2E5EAA] rounded-full mix-blend-multiply blur-3xl opacity-30 animate-pulse" />
          {/* <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-3" /> */}
        </div>

        {/* Hero Text */}
        <div className="relative z-10 px-4 text-center">
          <BlurText
            text="Welcome To Inquizitive"
            delay={150}
            animateBy="words"
            direction="top"
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-white"
            highlight="Inquizitive"
            highlightClassName="bg-gradient-to-r from-[#2E5EAA] to-[#4A8FE7] bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
          />
          <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Your classes, quizzes, and performance tracking — all in one place.
          </p>
        </div>
      </section>

      {/* CLASSES SECTION (pattern + translucent tint) */}
      <section
        className="relative -mt-20 md:-mt-24 py-12 md:py-16"
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(243,248,255,0.70), rgba(255,255,255,0.70)), url('/bgg2.png')",
          backgroundRepeat: 'no-repeat, repeat',
          backgroundSize: '100% 100%, 500px 500px',
          backgroundPosition: 'center top, left top',
        }}
      >
        <div className="relative">
          {classes.length > 0 &&
            <div className="mx-auto max-w-4xl px-6 mb-6 text-center md:text-left">
              <h2 className="text-[26px] md:text-[36px] font-extrabold tracking-tight leading-tight">
                <span className="bg-gradient-to-r from-[#2E5EAA] to-[#4A8FE7] bg-clip-text text-transparent">
                  Your Classes
                </span>
              </h2>
              <p className="mt-2 text-gray-300 md:text-gray-600">
                Manage semesters, students, and quizzes from here.
              </p>
            </div>
          }

          {/* CONTENT */}
          <main className="mx-auto max-w-4xl px-6 pb-28 space-y-8">
            {classes.length === 0 ? (
              <EmptyState onAdd={() => setOpenAdd(true)} />
            ) : (

              classes.map((cls) => <FancyClassCard key={cls.id} cls={cls} />)
            )}
          </main>

          {/* Floating Plus Button (with beacon + tooltip) */}
          <div className="fixed bottom-6 right-6">
            <button
              onClick={() => setOpenAdd(true)}
              className="relative bg-[#2E5EAA] hover:bg-[#264d8b] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition duration-300 hover:scale-105"
              title="Add Class"
            >
              {/* pulsing beacon */}
              {classes.length == 0 && <span className="absolute -inset-2 rounded-full animate-ping bg-[#2E5EAA]/40" />}
              <Plus size={28} strokeWidth={3} />
            </button>
            {/* hover tooltip */}
            <div className="pointer-events-none absolute bottom-full mb-2 right-1/2 translate-x-1/2 whitespace-nowrap rounded-md bg-black px-3 py-1 text-xs text-white opacity-0 translate-y-1 shadow-md transition duration-200 hover:opacity-100 hover:translate-y-0">
              Add Class
            </div>
          </div>

          {/* Modal */}
          <ClassAddModal
            open={openAdd}
            onClose={() => setOpenAdd(false)}
            onCreate={handleCreate}
          />
        </div>
      </section>
    </div>
  );
}

/* ---------------- Empty State ---------------- */

function EmptyState({ onAdd }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-md border border-black/5 shadow-sm p-10">
      {/* soft animated blobs */}
      <motion.div
        aria-hidden
        className="absolute -top-20 -right-16 w-80 h-80 rounded-full bg-[#4A8FE7]/10 blur-3xl"
        animate={{ y: [0, -10, 0], x: [0, 14, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-[#81B29A]/10 blur-3xl"
        animate={{ y: [0, 12, 0], x: [0, -10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Animated emoji */}
        <motion.div
          className="text-6xl md:text-7xl select-none"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          📚
        </motion.div>

        <h3 className="mt-4 text-xl font-semibold text-[#2B2D42]">No classes yet</h3>
        <p className="text-gray-600 mt-1">
          Click the <span className="font-semibold">“+”</span> button to create your first class.
        </p>

        {/* CTA mirrors the floating + but also opens the modal */}
        <button
          onClick={onAdd}
          className="group relative inline-flex items-center gap-2 mt-6 px-5 py-3 rounded-xl font-semibold text-white 
                     bg-gradient-to-r from-[#2E5EAA] via-[#4A8FE7] to-[#81B29A]
                     hover:shadow-xl transition-all duration-300"
        >
          {/* sheen */}
          <span className="pointer-events-none absolute -left-10 top-0 h-full w-10 rotate-12 bg-white/30 opacity-0 group-hover:opacity-100 translate-x-0 group-hover:translate-x-[220%] transition-all duration-700" />
          Create Class
        </button>

        {/* little hint arrow towards the floating + */}
        <motion.div
          className="mt-8 flex items-center gap-2 text-xs text-gray-500"
          animate={{ opacity: [0.6, 1, 0.6], x: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          or use the button in the bottom-right
          <span>➡️</span>
        </motion.div>
      </div>
    </div>
  );
}
