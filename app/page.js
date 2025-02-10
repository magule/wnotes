"use client";

import NoteEditor from '@/components/NoteEditor';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-indigo-600/10 to-pink-600/10 blur-3xl 
                       opacity-20 -top-20 -right-20"></div>
        <div className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-r from-pink-600/10 to-indigo-600/10 blur-3xl 
                       opacity-20 -bottom-20 -left-20"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 border border-white/10">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="text-lg font-semibold bg-gradient-to-r from-indigo-400 to-pink-400 text-transparent bg-clip-text">
                wNotes
              </span>
            </div>
            <button
              onClick={() => router.push("/my-notes")}
              className="px-4 py-2 rounded-lg bg-white/[0.02] text-white/60 hover:bg-white/[0.03] 
                       hover:text-white/90 transition-all duration-200 text-sm flex items-center gap-2
                       border border-white/10 hover:border-white/20"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              My Notes
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Editor Section */}
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-600/[0.02] to-pink-600/[0.02] 
                      backdrop-blur-sm overflow-hidden hover:border-white/20 transition-all duration-300">
          <NoteEditor />
        </div>
      </div>
    </div>
  );
}
