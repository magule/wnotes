"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

export default function MyNotes() {
  const [notes, setNotes] = useState([]);
  const [downloadingNote, setDownloadingNote] = useState(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const router = useRouter();
  const downloadMenuRef = useRef(null);
  const exportMenuRef = useRef(null);

  useEffect(() => {
    const savedNotes = localStorage.getItem('my-notes');
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  // Add click outside handlers
  useEffect(() => {
    function handleClickOutside(event) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setDownloadingNote(null);
      }
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
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
    if (confirm("Are you sure you want to delete this note?")) {
      const updatedNotes = notes.filter(note => note.id !== noteId);
      setNotes(updatedNotes);
      localStorage.setItem('my-notes', JSON.stringify(updatedNotes));
    }
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
    return await Packer.toBlob(doc);
  };

  const generatePDF = (note) => {
    const doc = new jsPDF();
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(note.title || 'Untitled', 20, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const textLines = doc.splitTextToSize(note.content, 170);
    doc.text(textLines, 20, 40);
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

  const handleBulkExport = async (format) => {
    try {
      let blob;
      let extension;

      switch (format) {
        case 'txt':
          const txtContent = notes.map(note => 
            `${note.title || 'Untitled'}\n\n${note.content}\n\n---\n\n`
          ).join('');
          blob = new Blob([txtContent], { type: 'text/plain' });
          extension = 'txt';
          break;

        case 'rtf':
          const rtfContent = `{\\rtf1\\ansi\n${notes.map(note => 
            `{\\b ${note.title || 'Untitled'}}\\line\\line\n${note.content}\\line\\line\\line`
          ).join('')}}`;
          blob = new Blob([rtfContent], { type: 'application/rtf' });
          extension = 'rtf';
          break;

        case 'word':
          const doc = new Document({
            sections: [{
              properties: {},
              children: notes.flatMap(note => [
                new Paragraph({
                  children: [new TextRun({ text: note.title || 'Untitled', bold: true, size: 32 })],
                }),
                new Paragraph({ children: [new TextRun("")] }),
                new Paragraph({
                  children: [new TextRun({ text: note.content, size: 24 })],
                }),
                new Paragraph({ children: [new TextRun("")] }),
                new Paragraph({
                  children: [new TextRun({ text: "---", size: 24 })],
                }),
                new Paragraph({ children: [new TextRun("")] }),
              ])
            }]
          });
          blob = await Packer.toBlob(doc);
          extension = 'docx';
          break;

        case 'pdf':
          const pdf = new jsPDF();
          let yOffset = 20;
          
          notes.forEach((note, index) => {
            if (index > 0) {
              pdf.addPage();
              yOffset = 20;
            }
            
            pdf.setFontSize(24);
            pdf.setFont("helvetica", "bold");
            pdf.text(note.title || 'Untitled', 20, yOffset);
            
            pdf.setFontSize(12);
            pdf.setFont("helvetica", "normal");
            const textLines = pdf.splitTextToSize(note.content, 170);
            pdf.text(textLines, 20, yOffset + 20);
          });
          
          blob = pdf.output('blob');
          extension = 'pdf';
          break;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `all_notes.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExportMenu(false);
    } catch (error) {
      console.error('Error generating bulk export:', error);
      alert('Failed to export notes. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center gap-3 group"
          >
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20 transition-all">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-indigo-400 to-pink-400 text-transparent bg-clip-text">
              wNotes
            </span>
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 
                       transition-all duration-200 text-sm font-medium flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Export All Notes
            </button>

            {showExportMenu && (
              <div className="absolute top-full right-0 mt-2 w-56 rounded-lg border border-white/[0.04] 
                            bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl py-1 z-50">
                {[
                  { format: 'txt', label: 'Text File (.txt)' },
                  { format: 'rtf', label: 'Rich Text (.rtf)' },
                  { format: 'word', label: 'Word Document (.docx)' },
                  { format: 'pdf', label: 'PDF Document (.pdf)' }
                ].map(({ format, label }) => (
                  <button
                    key={format}
                    onClick={() => handleBulkExport(format)}
                    className="w-full px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/[0.04] 
                             hover:text-white/90 transition-all flex items-center gap-3"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                      <polyline points="13 2 13 9 20 9"/>
                    </svg>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Welcome Card */}
        <div className="mb-12 p-8 rounded-2xl border border-white/[0.04] bg-gradient-to-br from-indigo-500/5 to-pink-500/5 backdrop-blur-sm">
          <div className="flex items-start gap-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-pink-500/10 border border-white/[0.04]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 mb-4">
                Welcome to wNotes! 👋
              </h2>
              <div className="space-y-4 text-sm">
                <p className="text-white/70">
                  Your notes are stored locally in your browser's cache. While this makes them easily accessible, please keep in mind:
                </p>
                <ul className="space-y-2 text-white/60">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/40"></div>
                    Clearing your browser cache will delete your notes
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/40"></div>
                    Notes are only accessible from this browser and device
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/40"></div>
                    For safekeeping, regularly export your notes using the "Export All Notes" button
                  </li>
                </ul>
                <div className="flex items-center gap-3 mt-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                  <p className="text-white/50 text-xs">
                    Pro tip: Use categories to organize your notes and the export feature to keep backups
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notes Section */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
            My Notes <span className="text-white/40 text-lg">({notes.length})</span>
          </h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 
                     transition-all duration-200 text-sm font-medium flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Note
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-indigo-500/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                </div>
                <div className="text-white/40">No saved notes yet</div>
                <button
                  onClick={() => router.push('/')}
                  className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 
                           transition-all duration-200 text-sm font-medium flex items-center gap-2"
                >
                  Create Your First Note
                </button>
              </div>
            </div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                onClick={() => handleNoteClick(note)}
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
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDownloadingNote(downloadingNote === note.id ? null : note.id);
                        }}
                        className="p-2 rounded-lg hover:bg-white/[0.04] text-white/40 
                                 hover:text-indigo-400 transition-all"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                      </button>

                      {downloadingNote === note.id && (
                        <div 
                          ref={downloadMenuRef}
                          className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-white/[0.04] 
                                  bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl py-1 z-50"
                        >
                          {[
                            { format: 'txt', label: 'Text File (.txt)' },
                            { format: 'rtf', label: 'Rich Text (.rtf)' },
                            { format: 'word', label: 'Word Document (.docx)' },
                            { format: 'pdf', label: 'PDF Document (.pdf)' }
                          ].map(({ format, label }) => (
                            <button
                              key={format}
                              onClick={(e) => handleDownload(e, note, format)}
                              className="w-full px-4 py-2.5 text-left text-sm text-white/80 
                                       hover:bg-white/[0.04] hover:text-white/90 transition-all 
                                       flex items-center gap-3"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                                <polyline points="13 2 13 9 20 9"/>
                              </svg>
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => handleDelete(e, note.id)}
                      className="p-2 rounded-lg hover:bg-white/[0.04] text-white/40 
                               hover:text-red-400 transition-all"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <p className="text-sm text-white/50 mb-4 line-clamp-3 min-h-[3rem]">
                  {note.content || 'No content'}
                </p>

                <div className="flex items-center justify-between mt-auto">
                  <div className="text-xs text-white/30">
                    {new Date(note.updatedAt).toLocaleString()}
                  </div>
                  {note.tag && (
                    <div className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 
                                 text-indigo-400 border border-indigo-500/20">
                      {note.tag}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 