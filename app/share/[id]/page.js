"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

export default function SharedNote() {
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        const response = await fetch(`/api/share?id=${id}`);
        if (!response.ok) {
          throw new Error('Note not found');
        }
        const data = await response.json();
        setNote(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="text-zinc-600 dark:text-zinc-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-zinc-900">
      <header className="border-b border-white/20 dark:border-white/10 bg-white dark:bg-zinc-900">
        <div className="flex justify-between items-stretch h-14 w-full">
          <div className="flex items-center pl-4">
            <h1 className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100">wNotes</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col px-8 py-8 max-w-[1400px] mx-auto w-full">
        <div className="w-full px-0 py-2 text-3xl font-medium text-zinc-800 dark:text-zinc-100">
          {note.title || 'Untitled'}
        </div>

        <div className="flex-1 w-full px-0 py-4 text-lg text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
          {note.content}
        </div>

        <div className="flex items-center justify-end pt-4 border-t border-white/20 dark:border-white/10">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Shared on {new Date(note.createdAt).toLocaleDateString()}
          </div>
        </div>
      </main>
    </div>
  );
} 