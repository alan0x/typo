import React, { useCallback, useEffect, useState } from "react";
import { marked } from "marked";
import { X, RefreshCw, FolderOpen, Sparkles, Loader2, BookOpen } from "lucide-react";
import {
  getDefaultNotesDir,
  readNotebook,
  revealNotesFolder,
  writeNotebook,
} from "../services/notes";
import { organizeNotebookWithGemini } from "../services/gemini";

interface NotebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  notesDir: string;
  apiKey: string;
  model: string;
}

export const NotebookModal: React.FC<NotebookModalProps> = ({
  isOpen,
  onClose,
  notesDir,
  apiKey,
  model,
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
        readNotebook(notesDir || undefined),
        notesDir ? Promise.resolve(notesDir) : getDefaultNotesDir(),
      ]);
      setContent(md);
      setEffectiveDir(defaultDir);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to read notebook." });
    } finally {
      setLoading(false);
    }
  }, [notesDir]);

  useEffect(() => {
    if (isOpen) {
      load();
    }
  }, [isOpen, load]);

  if (!isOpen) return null;

  const handleOrganize = async () => {
    if (!content.trim() || organizing) return;
    if (!apiKey) {
      setMessage({ type: "error", text: "Set your Gemini API key first to use AI organize." });
      return;
    }
    setOrganizing(true);
    setMessage(null);
    try {
      const organized = await organizeNotebookWithGemini(content, apiKey, model);
      await writeNotebook(organized, notesDir || undefined);
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

  const html = content.trim() ? (marked.parse(content) as string) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/30 backdrop-blur-2xs animate-fade-in">
      <div className="w-full max-w-lg max-h-[85vh] flex flex-col bg-[#faf9f5] border border-stone-300 rounded-xl shadow-xl text-stone-900 font-sans">
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

        {/* Status message */}
        {message && (
          <div
            className={`mx-5 mt-3 px-3 py-2 rounded border text-[11px] shrink-0 ${
              message.type === "error"
                ? "bg-stone-50 text-rose-800 border-rose-200"
                : "bg-stone-50 text-stone-700 border-stone-300"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="space-y-2.5 animate-pulse">
              <div className="h-3 bg-stone-100 rounded w-1/3" />
              <div className="h-10 bg-stone-50 rounded" />
              <div className="h-14 bg-stone-50 rounded" />
            </div>
          ) : html ? (
            <div
              className="notebook-md text-[12px] leading-relaxed text-stone-800 select-text"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-10 select-none">
              <BookOpen className="w-8 h-8 text-stone-300 mb-3" />
              <p className="font-serif italic text-stone-700 text-[13px]">
                Your notebook is still empty.
              </p>
              <p className="text-[11px] text-stone-500 mt-2 max-w-xs leading-normal">
                After refining a draft, click the <span className="font-mono">+</span> icon on any
                Proofreading Note — or "Save all" — to collect it here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
