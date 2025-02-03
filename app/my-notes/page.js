"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

export default function MyNotes() {
  const [notes, setNotes] = useState([]);
  const [downloadingNote, setDownloadingNote] = useState(null);
  const router = useRouter();
  const downloadMenuRef = useRef(null);

  useEffect(() => {
    const savedNotes = localStorage.getItem('my-notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setDownloadingNote(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleNoteClick = (note) => {
    localStorage.setItem('current-note', JSON.stringify(note));
    router.push('/');
  };

  const handleDelete = (e, noteId) => {
    e.stopPropagation();
    const updatedNotes = notes.filter(note => note.id !== noteId);
    setNotes(updatedNotes);
    localStorage.setItem('my-notes', JSON.stringify(updatedNotes));
  };

  const generateWordDoc = async (note) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: note.title || 'Untitled',
                bold: true,
                size: 32
              })
            ]
          }),
          new Paragraph({
            children: [new TextRun("")]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: note.content,
                size: 24
              })
            ]
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    return blob;
  };

  const generatePDF = (note) => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(note.title || 'Untitled', 20, 20);
    
    // Add content
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    // Split content into lines that fit the page width
    const textLines = doc.splitTextToSize(note.content, 170);
    doc.text(textLines, 20, 40);

    // Return blob
    return doc.output('blob');
  };

  const handleDownload = async (e, note, format) => {
    e.stopPropagation();
    let blob;
    let extension;
    
    try {
      switch (format) {
        case 'txt':
          blob = new Blob([`${note.title}\n\n${note.content}`], { type: 'text/plain' });
          extension = 'txt';
          break;

        case 'rtf':
          const rtfContent = `{\\rtf1\\ansi\n{\\b ${note.title}}\\line\\line\n${note.content}\n}`;
          blob = new Blob([rtfContent], { type: 'application/rtf' });
          extension = 'rtf';
          break;

        case 'word':
          blob = await generateWordDoc(note);
          extension = 'docx';
          break;

        case 'pdf':
          blob = generatePDF(note);
          extension = 'pdf';
          break;
      }

      // Create and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${note.title || 'Untitled'}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadingNote(null);
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Failed to generate document. Please try again.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b border-white/20 dark:border-white/10 bg-white dark:bg-black">
        <div className="flex justify-between items-stretch h-14 w-full">
          <div className="flex items-center pl-4">
            <button 
              onClick={() => router.push('/')}
              className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100 hover:opacity-80"
            >
              wNotes
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-8 py-8 max-w-[1000px] mx-auto w-full">
        <h1 className="text-3xl font-medium text-zinc-800 dark:text-zinc-100 mb-8">
          My Notes ({notes.length})
        </h1>

        <div className="flex flex-col divide-y divide-white/10 dark:divide-white/5">
          {notes.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
              No saved notes yet. Start writing to create your first note!
            </div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                onClick={() => handleNoteClick(note)}
                className="group py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors -mx-4 px-4"
              >
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-100">
                    {note.title || 'Untitled'}
                  </h2>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-zinc-400">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDownloadingNote(downloadingNote === note.id ? null : note.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-opacity w-4 h-4 flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="7 10 12 15 17 10"/>
                            <line x1="12" y1="15" x2="12" y2="3"/>
                          </svg>
                        </button>
                        {downloadingNote === note.id && (
                          <div 
                            ref={downloadMenuRef}
                            className="absolute right-0 top-6 bg-zinc-800 dark:bg-zinc-700 rounded-md shadow-lg py-1 min-w-[120px] z-50"
                            onClick={e => e.stopPropagation()}
                          >
                            {[
                              { format: 'txt', label: 'Text (.txt)' },
                              { format: 'rtf', label: 'Rich Text (.rtf)' },
                              { format: 'word', label: 'Word (.docx)' },
                              { format: 'pdf', label: 'PDF (.pdf)' }
                            ].map(({ format, label }) => (
                              <button
                                key={format}
                                onClick={(e) => handleDownload(e, note, format)}
                                className="w-full px-4 py-2 text-left text-sm text-white hover:bg-zinc-700 dark:hover:bg-zinc-600"
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, note.id)}
                        className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-red-500 transition-opacity w-4 h-4 flex items-center justify-center"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                  {note.content || 'No content'}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
} 