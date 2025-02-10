"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CategoryPage({ params }) {
  const [notes, setNotes] = useState([]);
  const [formattedDates, setFormattedDates] = useState({});
  const router = useRouter();
  const categoryName = decodeURIComponent(params.name);

  useEffect(() => {
    const savedNotes = localStorage.getItem('my-notes');
    if (savedNotes) {
      const allNotes = JSON.parse(savedNotes);
      const filteredNotes = allNotes.filter(note => note.tag === categoryName);
      setNotes(filteredNotes);
      
      // Format dates on the client side
      const dates = {};
      filteredNotes.forEach(note => {
        dates[note.id] = new Date(note.updatedAt).toLocaleString();
      });
      setFormattedDates(dates);
    }
  }, [categoryName]);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/')}
                className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white/90">Category:</span>
                <span className="text-lg font-semibold bg-gradient-to-r from-indigo-400 to-pink-400 text-transparent bg-clip-text">
                  {categoryName}
                </span>
              </div>
            </div>
            <button
              onClick={() => router.push("/my-notes")}
              className="px-4 py-2 rounded-lg bg-white/[0.02] text-white/60 hover:bg-white/[0.04] 
                       hover:text-white/90 transition-all duration-200 text-sm flex items-center gap-2"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-indigo-500/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                  </svg>
                </div>
                <div className="text-white/40">No notes in this category</div>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 
                           transition-all duration-200 text-sm font-medium flex items-center gap-2"
                >
                  Create a Note
                </button>
              </div>
            </div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                onClick={() => {
                  localStorage.setItem('current-note', JSON.stringify(note));
                  router.push('/');
                }}
                className="group p-6 rounded-xl border border-white/[0.04] hover:border-indigo-500/20 
                         bg-white/[0.02] hover:bg-gradient-to-br hover:from-indigo-500/5 hover:to-pink-500/5 
                         cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-medium text-white/90 group-hover:text-transparent 
                               group-hover:bg-clip-text group-hover:bg-gradient-to-r 
                               group-hover:from-indigo-400 group-hover:to-pink-400 transition-all line-clamp-1">
                    {note.title || 'Untitled'}
                  </h2>
                </div>

                <p className="text-sm text-white/50 mb-4 line-clamp-3 min-h-[3rem]">
                  {note.content || 'No content'}
                </p>

                <div className="text-xs text-white/30">
                  {formattedDates[note.id] || ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 