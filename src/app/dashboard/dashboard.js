'use client';

import BlurText from '../_components/BlurText';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import FancyClassCard from './_components/FancyClassCard';
import ClassAddModal from './_components/ClassAddModal';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const [classes, setClasses] = useState([
    { id: 'c1', title: 'Semester 1', code: '101', dept: 'CS', section: 'B', students: 42 },
    { id: 'c2', title: 'Semester 3', code: '301', dept: 'CS', section: 'A', students: 37 },
  ]);

  const [openAdd, setOpenAdd] = useState(false);

  const handleCreate = (newClass) => {
    setClasses((prev) => [newClass, ...prev]);
    toast.success('Class created successfully!');
  };

  return (
    <div className="min-h-screen">
      {/* HERO */}
      <section className="relative flex flex-col justify-center items-center h-[72vh] overflow-hidden">
        {/* Background Layer */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E5EAA] via-[#81B29A] to-[#2E5EAA] opacity-80" />
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-[#81B29A] rounded-full mix-blend-multiply blur-3xl opacity-30 animate-pulse" />
          <div className="absolute top-40 -right-40 w-[500px] h-[500px] bg-[#2E5EAA] rounded-full mix-blend-multiply blur-3xl opacity-30 animate-pulse" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent rotate-3" />
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

      {/* CLASSES SECTION (blue pattern + translucent gradient tint) */}
      <section
        className="relative pt-16 pb-12" // <-- extra breathing room on top
        style={{
          backgroundImage:
            "linear-gradient(to bottom, rgba(243,248,255,0.70), rgba(255,255,255,0.70)), url('/bgg2.png')",
          backgroundRepeat: 'no-repeat, repeat',
          backgroundSize: '100% 100%, 500px 500px',
          backgroundPosition: 'center top, left top',
        }}
      >
        {/* content sits above tint */}
        <div className="relative">
          <div className="mx-auto max-w-4xl px-6 mb-4">
            <h2 className="relative overflow-hidden">
              <span
                className="inline-block text-3xl md:text-4xl font-extrabold tracking-tight
                  bg-gradient-to-r from-gray-900 to-blue-700 bg-clip-text text-transparent drop-shadow-sm"
              >
                Your Classes
              </span>
            </h2>

            <p className="mt-2 text-gray-600">
              Manage semesters, students, and quizzes from here.
            </p>
          </div>

          <main className="mx-auto max-w-4xl px-6 pb-28 space-y-8">
            {classes.map((cls) => (
              <FancyClassCard key={cls.id} cls={cls} />
            ))}
          </main>

          {/* Floating Plus Button */}
          <div className="fixed bottom-6 right-6">
            <button
              onClick={() => setOpenAdd(true)}
              className="bg-[#2E5EAA] hover:bg-[#264d8b] text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition duration-300 hover:scale-105"
              title="Add Class"
            >
              <Plus size={28} strokeWidth={3} />
            </button>
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
