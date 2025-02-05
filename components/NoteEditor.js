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

  // Force re-render every second for the "Last updated" display
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
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

    if (isTyping) {
      const start = typingStartTime || Date.now();
      const seconds = Math.max(1, Math.floor((Date.now() - start) / 1000));
      if (seconds < 60) {
        return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
      }
      return formatTime(Math.floor(seconds / 60) * 60);
    } else {
      const diffSeconds = Math.floor((Date.now() - stoppedTypingTime) / 1000);
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
      id: currentNoteId || Date.now(),
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
      setTypingStartTime(Date.now());
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
        const newId = Date.now();
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
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Main Content */}
      <div className="w-full">
        {selectedCategory ? (
          // Category View
          <div className="p-10">
            <div className="flex items-center justify-between mb-10">
              <h1 className="text-2xl font-medium text-white/90">Notes in <span className="text-blue-400">{selectedCategory}</span></h1>
              <button
                onClick={() => setSelectedCategory(null)}
                className="px-5 py-2.5 rounded-lg bg-blue-500/[0.08] text-blue-400 hover:bg-blue-500/[0.12] transition-all duration-200 text-sm font-medium"
              >
                Back to Editor
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myNotes
                .filter((note) => note.tag === selectedCategory)
                .map((note) => (
                  <div
                    key={note.id}
                    onClick={() => openNote(note)}
                    className="p-5 rounded-xl border border-white/[0.03] hover:border-white/[0.08] bg-white/[0.02] cursor-pointer transition-all duration-200 group hover:bg-white/[0.03] hover:translate-y-[-2px]"
                  >
                    <h3 className="text-lg font-medium text-white/90 mb-3 group-hover:text-blue-400 line-clamp-1">{note.title}</h3>
                    <p className="text-sm text-white/50 mb-4 line-clamp-3">{note.content}</p>
                    <div className="text-xs text-white/30">{new Date(note.updatedAt).toLocaleString()}</div>
                  </div>
                ))}
            </div>
          </div>
        ) : (
          // Editor View
          <>
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/[0.03]">
              <div className="max-w-[1200px] mx-auto px-10 py-6 flex items-center justify-between">
                <button 
                  onClick={handleNewNote}
                  className="text-lg font-medium text-white/90 hover:text-blue-400 transition-all flex items-center gap-3"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-blue-400">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="bg-gradient-to-r from-blue-400 to-blue-500 text-transparent bg-clip-text font-semibold">wNotes</span>
                </button>
                <button
                  onClick={() => router.push("/my-notes")}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 text-sm ${
                    isMyNotesHighlighted 
                      ? "bg-emerald-500/[0.08] text-emerald-400 ring-1 ring-emerald-500/20" 
                      : "bg-white/[0.02] text-white hover:bg-white/[0.04] hover:text-white/90"
                  }`}
                >
                  My Notes ({myNotes.length})
                </button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="max-w-[1200px] mx-auto px-10 py-10">
              <input
                type="text"
                placeholder="Untitled"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  handleTyping();
                }}
                className="w-full text-4xl font-medium bg-transparent border-none focus:outline-none text-white/90 placeholder-white/20"
              />
              
              {/* Action Buttons and Tag Input */}
              <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleNewNote}
                    className="text-xs px-3 py-1.5 rounded-md bg-white/[0.02] text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-all duration-200 flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14"/>
                    </svg>
                    New Note
                  </button>

                  <button
                    onClick={handleSave}
                    className="text-xs px-3 py-1.5 rounded-md bg-white/[0.02] text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-all duration-200 flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H16L21 8V19C21 20.1046 20.1046 21 19 21Z"/>
                      <path d="M17 21V13H7V21"/>
                      <path d="M7 3V8H15"/>
                    </svg>
                    Save
                  </button>

                  {/* Tag Input with Dropdown */}
                  <div className="relative" ref={categoryDropdownRef}>
                    <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md bg-white/[0.02] text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-all duration-200">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                        <line x1="7" y1="7" x2="7.01" y2="7"/>
                      </svg>
                      <input
                        type="text"
                        placeholder="Add category..."
                        value={tag}
                        onChange={(e) => {
                          setTag(e.target.value);
                          setShowTagSuggestions(true);
                          handleTyping();
                        }}
                        onFocus={() => setShowTagSuggestions(true)}
                        className="bg-transparent border-none outline-none text-white/90 placeholder-white/60 w-28"
                      />
                      {tag && (
                        <button
                          onClick={() => setTag("")}
                          className="text-white/40 hover:text-white/60"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 6L6 18M6 6l12 12"/>
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Tag Suggestions Dropdown */}
                    {showTagSuggestions && (
                      <div className="absolute top-full left-0 mt-1 w-48 max-h-48 overflow-y-auto bg-black/95 border border-white/[0.03] rounded-lg shadow-xl backdrop-blur-xl z-20">
                        {getFilteredCategories().map((cat) => (
                          <button
                            key={cat}
                            onClick={() => {
                              setTag(cat);
                              setShowTagSuggestions(false);
                              handleTyping();
                            }}
                            className="w-full px-3 py-2 text-left text-xs text-white/90 hover:bg-white/[0.03] transition-colors flex items-center gap-2"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                              <line x1="7" y1="7" x2="7.01" y2="7"/>
                            </svg>
                            {cat}
                          </button>
                        ))}
                        {tag && !categories.includes(tag) && (
                          <button
                            onClick={() => handleCreateCategory(tag)}
                            className="w-full px-3 py-2 text-left text-xs text-emerald-400 hover:bg-white/[0.03] transition-colors flex items-center gap-2"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 5v14M5 12h14"/>
                            </svg>
                            Add category "{tag}"
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative" ref={actionMenuRef}>
                  <button
                    onClick={() => setShowActionMenu(!showActionMenu)}
                    className="text-xs px-3 py-1.5 rounded-md bg-white/[0.02] text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-all duration-200 flex items-center gap-1.5"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"/>
                      <circle cx="19" cy="12" r="1"/>
                      <circle cx="5" cy="12" r="1"/>
                    </svg>
                    Actions
                  </button>

                  {/* Actions Menu Dropdown */}
                  {showActionMenu && (
                    <div className="absolute top-full right-0 mt-1 w-48 bg-black/95 border border-white/[0.03] rounded-lg shadow-xl backdrop-blur-xl z-20">
                      <button
                        onClick={handleShare}
                        className="w-full px-3 py-2.5 text-left text-xs text-white/90 hover:bg-white/[0.03] transition-colors flex items-center gap-2"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>
                        </svg>
                        Share Note
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDownloadMenu(!showDownloadMenu);
                          setShowActionMenu(false);
                        }}
                        className="w-full px-3 py-2.5 text-left text-xs text-white/90 hover:bg-white/[0.03] transition-colors flex items-center gap-2 border-t border-white/[0.03]"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                        </svg>
                        Export As...
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <textarea
                placeholder="Start writing..."
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  handleTyping();
                }}
                className="w-full mt-8 min-h-[400px] bg-transparent border-none focus:outline-none resize-none text-white/80 placeholder-white/20 text-lg leading-relaxed scrollbar-hide"
              />

              {/* Add last saved indicator between textarea and categories */}
              {!isTyping && stoppedTypingTime && (
                <div className="max-w-[1200px] mx-auto px-0 pt-4 pb-0">
                  <div className="flex justify-end">
                    <div className="text-xs text-white/40 flex items-center gap-2 mr-0">
                      Last saved: {getTimeDisplay()}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-emerald-400">
                        <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Categories Section (Below Content) */}
            <div className="max-w-[1200px] mx-auto px-10 py-10 border-t border-white/[0.03]">
              <h2 className="text-sm font-medium text-white/40 tracking-wider mb-6">CATEGORIES</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categories.map((cat) => (
                  <div
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedCategory === cat 
                        ? "bg-blue-500/[0.08] text-blue-400 ring-1 ring-blue-500/20" 
                        : "hover:bg-white/[0.02] text-white/80 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-60 shrink-0">
                        <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 7H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 12H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 17H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="text-sm truncate">{cat}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCategory(cat);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all rounded-md hover:bg-red-500/10 p-1 shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 6L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Download Menu */}
      {showDownloadMenu && (
        <div 
          ref={downloadMenuRef}
          className="fixed top-32 right-10 bg-black/95 border border-white/[0.03] rounded-lg shadow-xl py-2 min-w-[200px] backdrop-blur-xl z-30"
        >
          {[
            { format: "txt", label: "Text File (.txt)" },
            { format: "rtf", label: "Rich Text (.rtf)" },
            { format: "word", label: "Word Document (.docx)" },
            { format: "pdf", label: "PDF Document (.pdf)" },
          ].map(({ format, label }) => (
            <button
              key={format}
              onClick={(e) => handleDownload(e, format)}
              className="w-full px-4 py-3 text-left text-sm text-white/90 hover:bg-white/[0.03] transition-colors flex items-center gap-3"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white/40">
                <path d="M13 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V9L13 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13 2V9H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Share URL Modal */}
      {shareUrl && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black/95 border border-white/[0.03] rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-white/90">Share Note</h3>
              <button
                onClick={handleCloseShare}
                className="text-white/40 hover:text-white/60 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-2 bg-white/[0.02] rounded-lg p-2 mb-4">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 bg-transparent border-none text-xs text-white/90 focus:outline-none"
              />
              <button
                onClick={handleCopy}
                className="text-xs px-3 py-1.5 rounded-md bg-white/[0.02] text-white/60 hover:text-white/90 hover:bg-white/[0.04] transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
              >
                {showCopied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17L4 12"/>
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                    </svg>
                    Copy Link
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-white/40">Anyone with this link can view this note.</p>
          </div>
        </div>
      )}
    </div>
  );
}
  