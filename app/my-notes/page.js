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
      <div className="sticky top-0 z-10 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/[0.03]">
        <div className="max-w-[1200px] mx-auto px-10 py-6 flex items-center justify-between">
          <button 
            onClick={() => router.push('/')}
            className="text-lg font-medium text-white/90 hover:text-blue-400 transition-all flex items-center gap-3"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-400">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="bg-gradient-to-r from-blue-400 to-blue-500 text-transparent bg-clip-text font-semibold">wNotes</span>
          </button>
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="text-xs px-3 py-1.5 rounded-md bg-white/[0.02] text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-all duration-200 flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Export All Notes
            </button>

            {showExportMenu && (
              <div className="absolute top-full right-0 mt-1 bg-black/95 border border-white/[0.03] rounded-lg shadow-xl py-2 min-w-[160px] backdrop-blur-xl z-20">
                {[
                  { format: 'txt', label: 'Text (.txt)' },
                  { format: 'rtf', label: 'Rich Text (.rtf)' },
                  { format: 'word', label: 'Word (.docx)' },
                  { format: 'pdf', label: 'PDF (.pdf)' }
                ].map(({ format, label }) => (
                  <button
                    key={format}
                    onClick={() => handleBulkExport(format)}
                    className="w-full px-3 py-2 text-left text-xs text-white/90 hover:bg-white/[0.03] transition-colors flex items-center gap-2"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="max-w-[1200px] mx-auto px-10 py-10">
        <h1 className="text-2xl font-medium text-white/90 mb-8">
          My Notes <span className="text-white/40">({notes.length})</span>
        </h1>

        <div className="space-y-4">
          {notes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-white/40 mb-4">No saved notes yet.</div>
              <button
                onClick={() => router.push('/')}
                className="text-xs px-3 py-1.5 rounded-md bg-white/[0.02] text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-all duration-200 inline-flex items-center gap-1.5"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                Create New Note
              </button>
            </div>
          ) : (
            notes.map(note => (
              <div
                key={note.id}
                onClick={() => handleNoteClick(note)}
                className="group p-5 rounded-xl border border-white/[0.03] hover:border-white/[0.08] bg-white/[0.02] cursor-pointer transition-all duration-200 hover:bg-white/[0.03] hover:translate-y-[-2px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-medium text-white/90 group-hover:text-blue-400 transition-colors">
                    {note.title || 'Untitled'}
                  </h2>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDownloadingNote(downloadingNote === note.id ? null : note.id);
                        }}
                        className="text-white/40 hover:text-white/90 transition-colors p-1 rounded-md hover:bg-white/[0.03]"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                      </button>
                      {downloadingNote === note.id && (
                        <div 
                          ref={downloadMenuRef}
                          className="absolute right-0 top-full mt-1 bg-black/95 border border-white/[0.03] rounded-lg shadow-xl py-2 min-w-[160px] backdrop-blur-xl z-20"
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
                              className="w-full px-3 py-2 text-left text-xs text-white/90 hover:bg-white/[0.03] transition-colors flex items-center gap-2"
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
                      className="text-white/40 hover:text-red-400 transition-colors p-1 rounded-md hover:bg-white/[0.03]"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-sm text-white/50 mb-3 line-clamp-2">
                  {note.content || 'No content'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-white/30">
                    {new Date(note.updatedAt).toLocaleString()}
                  </div>
                  {note.tag && (
                    <div className="text-xs px-2 py-1 rounded-md bg-white/[0.02] text-white/40">
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