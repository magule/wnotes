"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

export default function MyCategories() {
  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [downloadingCategory, setDownloadingCategory] = useState(null);
  const router = useRouter();
  const downloadMenuRef = useRef(null);

  useEffect(() => {
    const savedCategories = localStorage.getItem('categories');
    const savedNotes = localStorage.getItem('my-notes');
    
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
    if (savedNotes) {
      setNotes(JSON.parse(savedNotes));
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setDownloadingCategory(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleDeleteCategory = (categoryName) => {
    if (confirm("This will delete all the notes inside this category. Are you sure?")) {
      const updatedNotes = notes.filter(note => note.tag !== categoryName);
      const updatedCategories = categories.filter(cat => cat !== categoryName);
      
      localStorage.setItem('my-notes', JSON.stringify(updatedNotes));
      localStorage.setItem('categories', JSON.stringify(updatedCategories));
      
      setCategories(updatedCategories);
      setNotes(updatedNotes);
    }
  };

  const handleCreateCategory = () => {
    if (!newCategory.trim()) return;
    
    if (categories.includes(newCategory.trim())) {
      alert("This category already exists!");
      return;
    }

    const updatedCategories = [...categories, newCategory.trim()];
    setCategories(updatedCategories);
    localStorage.setItem('categories', JSON.stringify(updatedCategories));
    setNewCategory("");
    setShowNewCategoryModal(false);
  };

  const handleBulkExport = async (e, category, format) => {
    e.stopPropagation();
    const categoryNotes = notes.filter(note => note.tag === category);
    try {
      let blob;
      let extension;

      switch (format) {
        case 'txt':
          const txtContent = categoryNotes.map(note => 
            `${note.title || 'Untitled'}\n\n${note.content}\n\n---\n\n`
          ).join('');
          blob = new Blob([txtContent], { type: 'text/plain' });
          extension = 'txt';
          break;

        case 'rtf':
          const rtfContent = `{\\rtf1\\ansi\n${categoryNotes.map(note => 
            `{\\b ${note.title || 'Untitled'}}\\line\\line\n${note.content}\\line\\line\\line`
          ).join('')}}`;
          blob = new Blob([rtfContent], { type: 'application/rtf' });
          extension = 'rtf';
          break;

        case 'word':
          const doc = new Document({
            sections: [{
              properties: {},
              children: categoryNotes.flatMap(note => [
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
          
          categoryNotes.forEach((note, index) => {
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
      a.download = `${category}_notes.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadingCategory(null);
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
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        {/* Welcome Card */}
        <div className="mb-12 p-8 rounded-2xl border border-white/[0.04] bg-gradient-to-br from-indigo-500/5 to-pink-500/5 backdrop-blur-sm">
          <div className="flex items-start gap-6">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-pink-500/10 border border-white/[0.04]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400 mb-4">
                My Categories
              </h2>
              <div className="space-y-4 text-sm">
                <p className="text-white/70">
                  Organize your notes with categories. You can:
                </p>
                <ul className="space-y-2 text-white/60">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/40"></div>
                    Click on any category to view its notes
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/40"></div>
                    Create new categories while writing notes
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/40"></div>
                    Delete categories and their associated notes
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-400">
            Categories <span className="text-white/40 text-lg">({categories.length})</span>
          </h1>
          <button
            onClick={() => setShowNewCategoryModal(true)}
            className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 
                     transition-all duration-200 text-sm font-medium flex items-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
            New Category
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.length === 0 ? (
            <div className="col-span-full text-center py-20">
              <div className="inline-flex flex-col items-center gap-4">
                <div className="p-4 rounded-full bg-indigo-500/10">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                </div>
                <div className="text-white/40">No categories yet</div>
                <button
                  onClick={() => setShowNewCategoryModal(true)}
                  className="px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 
                           transition-all duration-200 text-sm font-medium flex items-center gap-2"
                >
                  Create Your First Category
                </button>
              </div>
            </div>
          ) : (
            categories.map(category => (
              <div
                key={category}
                onClick={() => router.push(`/category/${encodeURIComponent(category)}`)}
                className="group p-6 rounded-xl border border-white/[0.04] hover:border-indigo-500/20 
                         bg-white/[0.02] hover:bg-gradient-to-br hover:from-indigo-500/5 hover:to-pink-500/5 
                         cursor-pointer transition-all duration-300 hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/[0.02] text-white/60">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                        <line x1="7" y1="7" x2="7.01" y2="7"/>
                      </svg>
                    </div>
                    <h2 className="text-lg font-medium text-white/90 group-hover:text-transparent 
                                 group-hover:bg-clip-text group-hover:bg-gradient-to-r 
                                 group-hover:from-indigo-400 group-hover:to-pink-400 transition-all">
                      {category}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <div className="relative" ref={downloadMenuRef}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDownloadingCategory(downloadingCategory === category ? null : category);
                        }}
                        className="p-2 rounded-lg hover:bg-indigo-500/10 text-indigo-400 
                                 transition-all cursor-pointer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>

                      {downloadingCategory === category && (
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-white/[0.04] 
                                    bg-[#0A0A0A]/95 backdrop-blur-xl shadow-2xl py-1 z-50">
                          {[
                            { format: 'txt', label: 'Text File (.txt)' },
                            { format: 'rtf', label: 'Rich Text (.rtf)' },
                            { format: 'word', label: 'Word Document (.docx)' },
                            { format: 'pdf', label: 'PDF Document (.pdf)' }
                          ].map(({ format, label }) => (
                            <button
                              key={format}
                              onClick={(e) => handleBulkExport(e, category, format)}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(category);
                      }}
                      className="p-2 rounded-lg hover:bg-red-500/10 
                               text-red-400 transition-all cursor-pointer"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-white/40">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                    </svg>
                    <span className="text-sm">
                      {notes.filter(note => note.tag === category).length} {
                        notes.filter(note => note.tag === category).length === 1 ? 'note' : 'notes'
                      }
                    </span>
                  </div>

                  <p className="text-sm text-white/50 line-clamp-2">
                    {notes.filter(note => note.tag === category).length > 0 
                      ? `Latest note: ${notes.filter(note => note.tag === category)[0].title || 'Untitled'}`
                      : 'No notes in this category yet'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Category Modal */}
      {showNewCategoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4 p-6 rounded-xl bg-[#0A0A0A]/95 
                       backdrop-blur-xl border border-white/[0.04] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white/90">Create New Category</h3>
              <button
                onClick={() => {
                  setShowNewCategoryModal(false);
                  setNewCategory("");
                }}
                className="p-2 rounded-lg hover:bg-white/[0.04] text-white/40 
                         hover:text-white/90 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Enter category name..."
                className="w-full px-4 py-3 rounded-lg bg-white/[0.02] border border-white/[0.04] 
                         text-white/90 placeholder-white/40 focus:outline-none focus:border-indigo-500/50"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateCategory();
                  }
                }}
              />
              <button
                onClick={handleCreateCategory}
                className="w-full px-4 py-3 rounded-lg bg-indigo-500/10 text-indigo-400 
                         hover:bg-indigo-500/20 transition-all duration-200 font-medium"
              >
                Create Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 