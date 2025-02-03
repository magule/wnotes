"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { jsPDF } from "jspdf";

export default function NoteEditor() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [shareUrl, setShareUrl] = useState(null);
  const [showCopied, setShowCopied] = useState(false);
  const [myNotes, setMyNotes] = useState([]);
  const [currentNoteId, setCurrentNoteId] = useState(null);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const router = useRouter();

  // Timer states for "Last updated" display logic
  const [isTyping, setIsTyping] = useState(false);
  const [typingStartTime, setTypingStartTime] = useState(null);
  const [stoppedTypingTime, setStoppedTypingTime] = useState(null);
  const [justStopped, setJustStopped] = useState(false);
  const [tick, setTick] = useState(0);
  const typingTimeoutRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // New state for My Notes button highlight
  const [isMyNotesHighlighted, setIsMyNotesHighlighted] = useState(false);

  // Force re-render every second so the timer display updates
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format a given number of seconds into a friendly string (seconds, minutes, hours)
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

  // Compute the text to display after "Last updated:" based on typing activity
  const getTimeDisplay = () => {
    if (!stoppedTypingTime && !isTyping) return "Never";

    if (isTyping) {
      const start = typingStartTime || Date.now();
      const seconds = Math.max(1, Math.floor((Date.now() - start) / 1000));
      return `${seconds} second${seconds !== 1 ? "s" : ""} ago`;
    } else {
      const referenceTime = stoppedTypingTime;
      const diffSeconds = Math.floor((Date.now() - referenceTime) / 1000);

      if (diffSeconds < 2 || justStopped) {
        return "Just now";
      }
      if (diffSeconds < 10) {
        return "Just now";
      } else {
        const rounded = Math.floor(diffSeconds / 10) * 10;
        return formatTime(rounded);
      }
    }
  };

  // Handle typing events for both title and content
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

    // After 1 second of no typing, save the note and mark as stopped
    saveTimeoutRef.current = setTimeout(() => {
      if (title || content) {
        localStorage.setItem('current-note', JSON.stringify({ 
          id: currentNoteId,
          title, 
          content 
        }));
        
        if (currentNoteId) {
          const timestamp = new Date().toISOString();
          const updatedNotes = myNotes.map(note => 
            note.id === currentNoteId 
              ? { ...note, title: title || 'Untitled', content, updatedAt: timestamp }
              : note
          );
          setMyNotes(updatedNotes);
          localStorage.setItem('my-notes', JSON.stringify(updatedNotes));
        }
      }
    }, 1000);

    // After 1 second of no typing, mark as stopped and trigger the "Just now" state
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      setStoppedTypingTime(Date.now());
      setJustStopped(true);
      // Remove the "just stopped" (green text) state after 2 seconds
      setTimeout(() => {
        setJustStopped(false);
      }, 2000);
    }, 1000);
  };

  // Load notes from localStorage on mount
  useEffect(() => {
    const savedNotes = localStorage.getItem('my-notes');
    if (savedNotes) {
      setMyNotes(JSON.parse(savedNotes));
    }

    // Load current note if exists
    const currentNote = localStorage.getItem('current-note');
    if (currentNote) {
      const { id, title: savedTitle, content: savedContent } = JSON.parse(currentNote);
      setTitle(savedTitle);
      setContent(savedContent);
      setCurrentNoteId(id);
    }
  }, []);

  const handleSave = () => {
    const timestamp = new Date().toISOString();
    const newNote = {
      id: Date.now(),
      title: title || 'Untitled',
      content,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const updatedNotes = [newNote, ...myNotes];
    setMyNotes(updatedNotes);
    localStorage.setItem('my-notes', JSON.stringify(updatedNotes));
    setCurrentNoteId(newNote.id);
    setStoppedTypingTime(Date.now());
    setJustStopped(true);
    setIsMyNotesHighlighted(true);
    setTimeout(() => {
      setJustStopped(false);
      setIsMyNotesHighlighted(false);
    }, 4000);
  };

  const handleShare = async () => {
    try {
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });

      if (!response.ok) {
        throw new Error('Failed to share note');
      }

      const data = await response.json();
      const fullUrl = `${window.location.origin}${data.shareUrl}`;
      setShareUrl(fullUrl);
    } catch (error) {
      console.error('Error sharing note:', error);
      alert('Failed to share note. Please try again.');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleCloseShare = () => {
    setShareUrl(null);
    setShowCopied(false);
  };

  const handleNewNote = () => {
    setTitle("");
    setContent("");
    setCurrentNoteId(null);
    setStoppedTypingTime(null);
    setIsTyping(false);
    setTypingStartTime(null);
    localStorage.removeItem('current-note');
  };

  const generateWordDoc = async () => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title || 'Untitled',
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
                text: content,
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

  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(title || 'Untitled', 20, 20);
    
    // Add content
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    
    // Split content into lines that fit the page width
    const textLines = doc.splitTextToSize(content, 170);
    doc.text(textLines, 20, 40);

    // Return blob
    return doc.output('blob');
  };

  const handleDownload = async (e, format) => {
    e.stopPropagation();
    let blob;
    let extension;
    
    try {
      switch (format) {
        case 'txt':
          blob = new Blob([`${title}\n\n${content}`], { type: 'text/plain' });
          extension = 'txt';
          break;

        case 'rtf':
          const rtfContent = `{\\rtf1\\ansi\n{\\b ${title}}\\line\\line\n${content}\n}`;
          blob = new Blob([rtfContent], { type: 'application/rtf' });
          extension = 'rtf';
          break;

        case 'word':
          blob = await generateWordDoc();
          extension = 'docx';
          break;

        case 'pdf':
          blob = generatePDF();
          extension = 'pdf';
          break;
      }

      // Create and trigger download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title || 'Untitled'}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowDownloadMenu(false);
    } catch (error) {
      console.error('Error generating document:', error);
      alert('Failed to generate document. Please try again.');
    }
  };

  const downloadMenuRef = useRef(null);

  // Add click outside handler
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

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black">
      {/* Header */}
      <header className="border-b border-white/10 dark:border-white/5 bg-white dark:bg-black">
        <div className="flex justify-between items-stretch h-16 w-full max-w-[1400px] mx-auto px-6">
          <div className="flex items-center">
            <button 
              onClick={handleNewNote}
              className="text-2xl font-semibold text-zinc-800 dark:text-zinc-100 hover:opacity-80 transition-opacity"
            >
              wNotes
            </button>
          </div>
          <div className="flex items-stretch">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowDownloadMenu(!showDownloadMenu);
              }}
              className="h-full px-8 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 border-l border-white/10 dark:border-white/5 transition-colors"
            >
              Import
            </button>
            {showDownloadMenu && (
              <div 
                ref={downloadMenuRef}
                className="absolute mt-16 bg-zinc-800 dark:bg-black border border-white/5 rounded-lg shadow-lg py-1 min-w-[140px] z-50"
              >
                {[
                  { format: 'txt', label: 'Text (.txt)' },
                  { format: 'rtf', label: 'Rich Text (.rtf)' },
                  { format: 'word', label: 'Word (.docx)' },
                  { format: 'pdf', label: 'PDF (.pdf)' }
                ].map(({ format, label }) => (
                  <button
                    key={format}
                    onClick={(e) => handleDownload(e, format)}
                    className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/5 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            <div className="relative border-l border-white/10 dark:border-white/5">
              <button 
                onClick={handleShare}
                className="h-full px-8 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
              >
                Share
              </button>
              {shareUrl && (
                <div className="absolute top-full right-0 mt-3 p-4 bg-zinc-800 dark:bg-black border border-white/5 text-white text-sm rounded-lg shadow-lg min-w-[320px] z-50">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-xs text-zinc-400 font-medium">Share URL:</div>
                    <div className="flex items-center gap-3">
                      {showCopied && (
                        <div className="text-xs text-emerald-400 font-medium">Copied!</div>
                      )}
                      <button 
                        onClick={handleCloseShare}
                        className="text-zinc-500 hover:text-white transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-white/5 px-3 py-2 rounded-md text-sm font-mono"
                    />
                    <button
                      onClick={handleCopy}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-md text-sm transition-colors font-medium"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={() => router.push('/my-notes')}
              className={`px-8 text-sm border-l border-white/10 dark:border-white/5 transition-colors duration-300 ${
                isMyNotesHighlighted 
                  ? 'text-emerald-500 dark:text-emerald-400' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              My Notes ({myNotes.length})
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-6 py-10 max-w-[1400px] mx-auto w-full">
        {/* Note Title */}
        <input
          type="text"
          placeholder="Untitled"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            handleTyping();
          }}
          className="w-full px-0 py-2 text-3xl font-medium bg-transparent border-none focus:outline-none text-zinc-800 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600"
        />

        {/* Note Content */}
        <textarea
          placeholder="Start writing..."
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            handleTyping();
          }}
          className="flex-1 w-full px-0 py-6 text-lg bg-transparent border-none focus:outline-none resize-none text-zinc-600 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-600 min-h-[calc(100vh-280px)]"
        />

        {/* Save Controls */}
        <div className="flex items-center justify-between pt-6 border-t border-white/10 dark:border-white/5">
          {!currentNoteId && (
            <button
              onClick={handleSave}
              className="px-8 py-2.5 bg-black text-white border border-white/10 rounded-md hover:bg-black/90 transition-colors"
            >
              Save
            </button>
          )}
          <div className={`flex items-center gap-4 ${!currentNoteId ? '' : 'w-full justify-end'}`}>
            <div className="flex items-center gap-2">
              <span className={`text-sm transition-colors duration-200 ${
                !isTyping && justStopped
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}>
                Last updated: {getTimeDisplay()}
              </span>
              {!isTyping && stoppedTypingTime && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  className="w-4 h-4 text-emerald-500 dark:text-emerald-400"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}