import React, { useCallback, useEffect, useState } from "react";
import { marked } from "marked";
import { X, RefreshCw, FolderOpen, Sparkles, Loader2, BookOpen, Trash2 } from "lucide-react";
import {
  getDefaultNotesDir,
  readNotebook,
  revealNotesFolder,
  writeNotebook,
} from "../services/notes";
import { organizeNotebook, isProviderConfigured, getProviderDisplayName } from "../services/ai";
import { AppSettings } from "../services/storage";

interface NotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
}

interface NotebookBlock {
  kind: "h1" | "h2" | "entry" | "para";
  lineIndex: number;
  text: string;
}

function parseBlocks(markdown: string): NotebookBlock[] {
  const blocks: NotebookBlock[] = [];
  markdown.split("\n").forEach((line, i) => {
    const t = line.trim();
    if (!t) return;
    if (t.startsWith("## ")) {
      blocks.push({ kind: "h2", lineIndex: i, text: t.slice(3) });
    } else if (t.startsWith("# ")) {
      blocks.push({ kind: "h1", lineIndex: i, text: t.slice(2) });
    } else if (t.startsWith("- ")) {
      blocks.push({ kind: "entry", lineIndex: i, text: line.trim().slice(2) });
    } else {
      blocks.push({ kind: "para", lineIndex: i, text: t });
    }
  });
  return blocks;
}

function inlineHtml(text: string): string {
  return marked.parseInline(text) as string;
}

export const NotebookModal: React.FC<NotebookModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [organizing, setOrganizing] = useState(false);
  const [effectiveDir, setEffectiveDir] = useState("");
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const [md, defaultDir] = await Promise.all([
        readNotebook(settings.notesDir || undefined),
        settings.notesDir ? Promise.resolve(settings.notesDir) : getDefaultNotesDir(),
      ]);
      setContent(md);
      setEffectiveDir(defaultDir);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to read notebook." });
    } finally {
      setLoading(false);
    }
  }, [settings.notesDir]);

  useEffect(() => {
    if (isOpen) {
      load();
    }
  }, [isOpen, load]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOrganize = async () => {
    if (!content.trim() || organizing) return;
    if (!isProviderConfigured(settings)) {
      setMessage({
        type: "error",
        text: `Set your ${getProviderDisplayName(settings.provider)} API key first to use AI organize.`,
      });
      return;
    }
    setOrganizing(true);
    setMessage(null);
    try {
      const organized = await organizeNotebook(content, settings);
      await writeNotebook(organized, settings.notesDir || undefined);
      setContent(organized);
      setMessage({ type: "info", text: "Organized. Previous version kept as notebook.raw.md." });
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "AI organize failed." });
    } finally {
      setOrganizing(false);
    }
  };

  const handleReveal = async () => {
    try {
      await revealNotesFolder(effectiveDir);
    } catch (err) {
      console.error("Reveal failed:", err);
    }
  };

  const handleDeleteEntry = async (lineIndex: number) => {
    const lines = content.split("\n");
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    lines.splice(lineIndex, 1);
    const next = lines.join("\n");
    setContent(next);
    try {
      await writeNotebook(next, settings.notesDir || undefined);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to delete entry." });
      load();
    }
  };

  // Group consecutive entries into <ul> lists; other blocks render as-is.
  const renderBlocks = () => {
    const blocks = parseBlocks(content);
    const nodes: React.ReactNode[] = [];
    let listBuffer: NotebookBlock[] = [];

    const flushList = () => {
      if (listBuffer.length === 0) return;
      nodes.push(
        <ul key={`ul-${listBuffer[0].lineIndex}`}>
          {listBuffer.map((b) => (
            <li key={b.lineIndex}>
              <span
                className="flex-1 min-w-0"
                dangerouslySetInnerHTML={{ __html: inlineHtml(b.text) }}
              />
              <button
                onClick={() => handleDeleteEntry(b.lineIndex)}
                title="Delete this entry"
                className="entry-delete shrink-0 p-0.5 text-stone-300 hover:text-rose-700 rounded transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    };

    for (const b of blocks) {
      if (b.kind === "entry") {
        listBuffer.push(b);
      } else {
        flushList();
        if (b.kind === "h1") {
          nodes.push(
            <h1 key={`h1-${b.lineIndex}`} className="font-serif text-[15px] font-bold text-stone-900 mt-1 mb-2">
              {b.text}
            </h1>
          );
        } else if (b.kind === "h2") {
          nodes.push(
            <h2
              key={`h2-${b.lineIndex}`}
              className="font-mono text-[11px] font-bold uppercase tracking-wider text-stone-600 mt-4 mb-2 pb-1 border-b border-stone-200"
            >
              {b.text}
            </h2>
          );
        } else {
          nodes.push(
            <p key={`p-${b.lineIndex}`} className="text-xs text-stone-500 my-1 leading-relaxed">
              {b.text}
            </p>
          );
        }
      }
    }
    flushList();
    return nodes;
  };

  const hasContent = content.trim().length > 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/30 backdrop-blur-2xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#faf9f5] border border-stone-300 rounded-xl shadow-xl text-stone-900 font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-stone-500" />
            <h2 className="font-serif text-[13px] font-bold tracking-wider uppercase text-stone-900">
              Mistake Notebook
            </h2>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleOrganize}
              disabled={organizing || loading || !content.trim()}
              title="Dedupe and regroup the whole notebook with AI (backs up first)"
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 disabled:opacity-40 rounded-md transition-colors cursor-pointer"
            >
              {organizing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Sparkles className="w-3 h-3" />
              )}
              <span>{organizing ? "Organizing…" : "AI Organize"}</span>
            </button>
            <button
              onClick={handleReveal}
              title={effectiveDir ? `Show in folder: ${effectiveDir}` : "Show in folder"}
              className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-200/60 rounded-md transition-colors cursor-pointer"
            >
              <FolderOpen className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={load}
              title="Refresh"
              className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-200/60 rounded-md transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-200/60 rounded-md transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Message banner */}
        {message && (
          <div
            className={`px-5 py-2 text-[11px] border-b ${
              message.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-200"
                : "bg-stone-100 text-stone-700 border-stone-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-stone-400 text-xs gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading notebook…</span>
            </div>
          ) : !hasContent ? (
            <div className="text-center py-12 text-stone-400 text-xs space-y-1">
              <p>Your mistake notebook is empty.</p>
              <p className="text-[11px] text-stone-400">
                Click “Save to Notebook” on any proofreading note to collect it here.
              </p>
            </div>
          ) : (
            <div className="notebook-content text-xs leading-relaxed space-y-1">
              {renderBlocks()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-stone-200 bg-stone-50/60 flex items-center justify-between text-[10px] text-stone-400 shrink-0 font-mono">
          <span className="truncate" title={effectiveDir}>
            {effectiveDir}
          </span>
          <span className="shrink-0 text-stone-400">notebook.md</span>
        </div>
      </div>
    </div>
  );
};
