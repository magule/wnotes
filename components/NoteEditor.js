"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

export default function NoteEditor() {
  // Note and UI states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tag, setTag] = useState("");
  const [shareUrl, setShareUrl] = useState(null);
  const [showCopied, setShowCopied] = useState(false);
  const [myNotes, setMyNotes] = useState([]);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Typing and timing states
  const [isTyping, setIsTyping] = useState(false);
  const [typingStartTime, setTypingStartTime] = useState(null);
  const [stoppedTypingTime, setStoppedTypingTime] = useState(null);
  const [justStopped, setJustStopped] = useState(false);
  const [tick, setTick] = useState(0);
  const typingTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // My Notes button highlight state
  const [isMyNotesHighlighted, setIsMyNotesHighlighted] = useState(false);
  const router = useRouter();

  // Sidebar collapsed state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Add new state for tag suggestions
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);

  // Add new refs and state
  const categoryDropdownRef = useRef(null);
  const actionMenuRef = useRef(null);
  const [showActionMenu, setShowActionMenu] = useState(false);

  // Add new state for current timestamp
  const [currentTimestamp, setCurrentTimestamp] = useState(null);

  // Force re-render every second for the "Last updated" display
  useEffect(() => {
    setCurrentTimestamp(Date.now());
    const interval = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Helper to format seconds into a friendly string
  const formatTime = (seconds) => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
      return remainingSeconds > 0
        ? `${minutes} minute${minutes !== 1 ? "s" : ""} ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""} ago`
        : `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0
      ? `${hours} hour${hours !== 1 ? "s" : ""} ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""} ago`
      : `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  };

  // Modify the getTimeDisplay function to hide seconds after a minute
  const getTimeDisplay = () => {
    if (!stoppedTypingTime && !isTyping) return "Never";

    if (isTyping && currentTimestamp) {
      const start = typingStartTime || currentTimestamp;
      const seconds = Math.max(1, Math.floor((currentTimestamp - start) / 1000));
      if (seconds < 60) {
        return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
      }
      return formatTime(Math.floor(seconds / 60) * 60);
    } else if (stoppedTypingTime && currentTimestamp) {
      const diffSeconds = Math.floor((currentTimestamp - stoppedTypingTime) / 1000);
      if (diffSeconds < 2 || justStopped) {
        return "Just now";
      }
      if (diffSeconds < 60) {
        const rounded = Math.floor(diffSeconds / 10) * 10;
        return `${rounded} seconds ago`;
      } else {
        return formatTime(Math.floor(diffSeconds / 60) * 60);
      }
    }
    return "Never";
  };

  // Save note – new notes require a tag while updates allow tag removal
  const handleSave = () => {
    // For new notes, enforce mandatory tagging
    if (!currentNoteId && !tag.trim()) {
      setShowTagSuggestions(true);
      return;
    }

    // Don't save if there's no content
    if (!title.trim() && !content.trim()) {
      return;
    }

    const timestamp = new Date().toISOString();
    const newNote = {
      id: currentNoteId || currentTimestamp,
      title: title || "Untitled",
      content,
      tag,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    let updatedNotes;
    if (currentNoteId) {
      // Update existing note
      updatedNotes = myNotes.map((note) =>
        note.id === currentNoteId ? newNote : note
      );
    } else {
      // Create a new note
      updatedNotes = [newNote, ...myNotes];
      setCurrentNoteId(newNote.id);
    }

    setMyNotes(updatedNotes);
    localStorage.setItem("my-notes", JSON.stringify(updatedNotes));
    localStorage.setItem(
      "current-note",
      JSON.stringify({ id: newNote.id, title, content, tag })
    );

    setStoppedTypingTime(Date.now());
    setJustStopped(true);
    setIsMyNotesHighlighted(true);
    
    setTimeout(() => {
      setJustStopped(false);
      setIsMyNotesHighlighted(false);
    }, 4000);

    // Automatically add new tag to categories if not already present
    if (tag && !categories.includes(tag)) {
      const newCategories = [...categories, tag];
      setCategories(newCategories);
      localStorage.setItem("categories", JSON.stringify(newCategories));
    }
  };

  // Modify the handleTyping function to fix auto-save
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      setTypingStartTime(currentTimestamp);
      setStoppedTypingTime(null);
      setJustStopped(false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Create or update note immediately if there's content
    if (title.trim() || content.trim()) {
      const timestamp = new Date().toISOString();
      
      // If no currentNoteId or this is the first ever note, create a new note
      if (!currentNoteId || myNotes.length === 0) {
        const newId = currentTimestamp;
        setCurrentNoteId(newId);
        const newNote = {
          id: newId,
          title: title || "Untitled",
          content,
          tag,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        const updatedNotes = [newNote, ...myNotes];
        setMyNotes(updatedNotes);
        localStorage.setItem("my-notes", JSON.stringify(updatedNotes));
        localStorage.setItem(
          "current-note",
          JSON.stringify({ id: newId, title, content, tag })
        );
      } else {
        // Update existing note
        const updatedNotes = myNotes.map((note) =>
          note.id === currentNoteId
            ? {
                ...note,
                title: title || "Untitled",
                content,
                tag,
                updatedAt: timestamp,
              }
            : note
        );
        setMyNotes(updatedNotes);
        localStorage.setItem("my-notes", JSON.stringify(updatedNotes));
        localStorage.setItem(
          "current-note",
          JSON.stringify({ id: currentNoteId, title, content, tag })
        );
      }
    }

    // Mark typing as stopped after 1 second of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setStoppedTypingTime(Date.now());
      setJustStopped(true);
      setTimeout(() => {
        setJustStopped(false);
      }, 2000);
    }, 1000);
  };

  // Load stored notes, current note, and categories on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem("my-notes");
    if (savedNotes) {
      setMyNotes(JSON.parse(savedNotes));
    }
    const savedCurrentNote = localStorage.getItem("current-note");
    if (savedCurrentNote) {
      const { id, title: savedTitle, content: savedContent, tag: savedTag } = JSON.parse(savedCurrentNote);
      setTitle(savedTitle);
      setContent(savedContent);
      setTag(savedTag || "");
      setCurrentNoteId(id);
    }
    const savedCategories = localStorage.getItem("categories");
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories));
    }
  }, []);

  const handleShare = async () => {
    try {
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, content }),
      });
      if (!response.ok) {
        throw new Error("Failed to share note");
      }
      const data = await response.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
    } catch (error) {
      console.error("Error sharing note:", error);
      alert("Failed to share note. Please try again.");
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const handleCloseShare = () => {
    setShareUrl(null);
    setShowCopied(false);
  };

  // Prepare a new note
  const handleNewNote = () => {
    setTitle("");
    setContent("");
    setTag("");
    setCurrentNoteId(null);
    setStoppedTypingTime(null);
    setIsTyping(false);
    setTypingStartTime(null);
    localStorage.removeItem("current-note");
    setSelectedCategory(null);
  };

  const generateWordDoc = async () => {
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: title || "Untitled",
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph({
              children: [new TextRun("")],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: content,
                  size: 24,
                }),
              ],
            }),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    return blob;
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(title || "Untitled", 20, 20);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const textLines = doc.splitTextToSize(content, 170);
    doc.text(textLines, 20, 40);
    return doc.output("blob");
  };

  const handleDownload = async (e, format) => {
    e.stopPropagation();
    let blob;
    let extension;
    try {
      switch (format) {
        case "txt":
          blob = new Blob([`${title}\n\n${content}`], { type: "text/plain" });
          extension = "txt";
          break;
        case "rtf":
          const rtfContent = `{\\rtf1\\ansi\n{\\b ${title}}\\line\\line\n${content}\n}`;
          blob = new Blob([rtfContent], { type: "application/rtf" });
          extension = "rtf";
          break;
        case "word":
          blob = await generateWordDoc();
          extension = "docx";
          break;
        case "pdf":
          blob = generatePDF();
          extension = "pdf";
          break;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title || "Untitled"}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    } catch (error) {
      console.error("Error generating document:", error);
      alert("Failed to generate document. Please try again.");
    }
  };

  const downloadMenuRef = useRef(null);
  useEffect(() => {
    function handleClickOutside(event) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Open a note from the list view into the editor
  const openNote = (note) => {
    setCurrentNoteId(note.id);
    setTitle(note.title);
    setContent(note.content);
    setTag(note.tag || "");
    setSelectedCategory(null);
    localStorage.setItem(
      "current-note",
      JSON.stringify({ id: note.id, title: note.title, content: note.content, tag: note.tag })
    );
  };

  // Delete a category and all its associated notes
  const handleDeleteCategory = (cat) => {
    if (confirm("This will delete all the notes inside that category. Are you sure?")) {
      const updatedNotes = myNotes.filter((note) => note.tag !== cat);
      setMyNotes(updatedNotes);
      localStorage.setItem("my-notes", JSON.stringify(updatedNotes));
      const updatedCategories = categories.filter((c) => c !== cat);
      setCategories(updatedCategories);
      localStorage.setItem("categories", JSON.stringify(updatedCategories));
      if (selectedCategory === cat) setSelectedCategory(null);
    }
  };

  // Add new function to filter categories based on input
  const getFilteredCategories = () => {
    if (!tag) return categories;
    return categories.filter(cat => 
      cat.toLowerCase().includes(tag.toLowerCase()) && cat.toLowerCase() !== tag.toLowerCase()
    );
  };

  // Modify the click handler for new category creation
  const handleCreateCategory = (newCategory) => {
    if (newCategory && !categories.includes(newCategory)) {
      const newCategories = [...categories, newCategory];
      setCategories(newCategories);
      localStorage.setItem("categories", JSON.stringify(newCategories));
    }
    setTag(newCategory);
    setShowTagSuggestions(false);
    handleTyping();
  };

  // Add click outside handlers in useEffect
  useEffect(() => {
    function handleClickOutside(event) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target)) {
        setShowTagSuggestions(false);
      }
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target)) {
        setShowActionMenu(false);
      }
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target)) {
        setShowDownloadMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* Editor View */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-[#0A0A0A]/90 backdrop-blur-xl">
          <div className="flex items-center gap-4 flex-1">
            <input
              type="text"
              placeholder="Untitled"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleTyping();
              }}
              className="text-2xl font-semibold bg-transparent border-none focus:outline-none 
                       text-white/90 placeholder-white/20 flex-1"
            />
            <button
              onClick={handleNewNote}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 
                       text-indigo-400 font-medium text-sm transition-all duration-200 flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14"/>
              </svg>
              New Note
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-4 border-b border-white/10 bg-[#0A0A0A]/90 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 
                       hover:bg-indigo-500/20 transition-all duration-200 text-sm 
                       font-medium flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
              Save
            </button>

            <div className="h-4 w-px bg-white/[0.04] mx-2" />

            {/* Tag Input */}
            <div className="relative" ref={categoryDropdownRef}>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] 
                            hover:bg-white/[0.04] transition-colors border border-white/[0.04]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <input
                  type="text"
                  placeholder="Add tag..."
                  value={tag}
                  onChange={(e) => {
                    setTag(e.target.value);
                    setShowTagSuggestions(true);
                    handleTyping();
                  }}
                  onFocus={() => setShowTagSuggestions(true)}
                  className="bg-transparent border-none outline-none text-sm text-white/90 
                           placeholder-white/40 w-24"
                />
              </div>

              {/* Tag Suggestions Dropdown */}
              {showTagSuggestions && (
                <div className="absolute top-full left-0 mt-2 w-56 max-h-60 overflow-y-auto 
                              rounded-lg border border-white/[0.04] bg-[#0A0A0A]/95 
                              backdrop-blur-xl shadow-xl z-50">
                  {getFilteredCategories().map((cat) => (
                    <button
                      key={cat}
                      onClick={() => handleCreateCategory(cat)}
                      className="w-full px-3 py-2 text-left text-sm text-white/80 
                               hover:bg-white/[0.04] hover:text-white/90 transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
                  {tag && !categories.includes(tag) && (
                    <button
                      onClick={() => handleCreateCategory(tag)}
                      className="w-full px-3 py-2 text-left text-sm text-indigo-400 
                               hover:bg-indigo-500/10 transition-colors flex items-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Create "{tag}"
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleShare}
              className="px-3 py-1.5 rounded-lg bg-white/[0.02] text-white/60 
                       hover:bg-white/[0.04] hover:text-white/90 transition-all 
                       duration-200 text-sm flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                <polyline points="16 6 12 2 8 6"/>
                <line x1="12" y1="2" x2="12" y2="15"/>
              </svg>
              Share
            </button>

            <div className="relative" ref={downloadMenuRef}>
              <button
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                className="px-3 py-1.5 rounded-lg bg-white/[0.02] text-white/60 
                         hover:bg-white/[0.04] hover:text-white/90 transition-all 
                         duration-200 text-sm flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Download
              </button>

              {showDownloadMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-white/[0.04] 
                              bg-[#0A0A0A]/95 backdrop-blur-xl shadow-xl py-1 z-50">
                  {[
                    { format: 'txt', label: 'Text File (.txt)' },
                    { format: 'rtf', label: 'Rich Text (.rtf)' },
                    { format: 'word', label: 'Word Document (.docx)' },
                    { format: 'pdf', label: 'PDF Document (.pdf)' }
                  ].map(({ format, label }) => (
                    <button
                      key={format}
                      onClick={(e) => handleDownload(e, format)}
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
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-auto min-h-[45vh] relative">
          <textarea
            placeholder="Start writing..."
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              handleTyping();
            }}
            className="w-full h-full p-6 bg-transparent border-none focus:outline-none 
                     resize-none text-white/90 placeholder-white/20 text-lg leading-relaxed"
          />
          {!isTyping && stoppedTypingTime && (
            <div className="absolute bottom-2 right-4 flex items-center gap-2 text-sm text-white/40 px-2 py-1 
                          rounded-md bg-black/20 backdrop-blur-sm border border-white/5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v10l4.24 4.24"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
              Last saved {getTimeDisplay()}
            </div>
          )}
        </div>
      </div>

      {/* Categories Section */}
      <div className="mt-6 p-4 rounded-xl border border-white/10 bg-[#080808] backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/[0.02] text-white/60">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </div>
            <h2 className="text-lg font-medium text-white/80">Categories</h2>
          </div>
          <div className="text-sm text-white/40 px-2.5 py-1 rounded-lg bg-white/[0.02] border border-white/[0.04]">
            {categories.length} categories
          </div>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
          {categories.map((cat) => (
            <div
              key={cat}
              onClick={() => router.push(`/category/${encodeURIComponent(cat)}`)}
              className={`group p-2.5 rounded-lg border transition-all duration-200 cursor-pointer
                ${selectedCategory === cat 
                  ? 'border-white/10 bg-white/[0.04]' 
                  : 'border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.03] hover:border-white/10'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-lg bg-white/[0.02] text-white/60">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                    <line x1="7" y1="7" x2="7.01" y2="7"/>
                  </svg>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(cat);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/[0.04] 
                           text-white/40 hover:text-white/60 transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              </div>
              <div className="text-sm text-white/80 font-medium truncate mb-1">{cat}</div>
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                {myNotes.filter(note => note.tag === cat).length}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Share Modal */}
      {shareUrl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4 p-6 rounded-xl bg-[#0A0A0A]/95 
                       backdrop-blur-xl border border-white/[0.04] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white/90">Share Note</h3>
              <button
                onClick={handleCloseShare}
                className="p-2 rounded-lg hover:bg-white/[0.04] text-white/40 
                         hover:text-white/90 transition-all"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent border-none outline-none text-sm text-white/90"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 
                         hover:bg-indigo-500/20 transition-all duration-200 text-sm font-medium"
              >
                {showCopied ? "Copied!" : "Copy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
  