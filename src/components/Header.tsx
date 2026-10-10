import React from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface HeaderProps {
  hotkey: string;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ hotkey, onOpenSettings }) => {
  const handleClose = () => {
    invoke("hide_window").catch((err) => console.error("Failed to hide window", err));
  };

  const handleMouseDown = async (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("a") || target.closest(".titlebar-no-drag")) {
      return;
    }
    try {
      await invoke("start_dragging");
    } catch {
      try {
        await getCurrentWindow().startDragging();
      } catch (err) {
        console.error("Window drag error:", err);
      }
    }
  };

  return (
    <header
      data-tauri-drag-region
      onMouseDown={handleMouseDown}
      className="titlebar-drag flex items-center justify-between px-4 py-3 border-b border-stone-200/90 bg-[#faf9f5] select-none cursor-grab active:cursor-grabbing transition-colors w-full"
    >
      {/* Brand Identity: Editorial & Minimal */}
      <div data-tauri-drag-region className="titlebar-drag flex items-center gap-2">
        <img
          src="/logo.svg"
          alt="Typo Logo"
          className="w-4 h-4 rounded-[4px] select-none pointer-events-none"
        />
        <span
          data-tauri-drag-region
          className="titlebar-drag font-serif text-sm tracking-widest uppercase font-bold text-stone-900"
        >
          Typo
        </span>
        <span
          data-tauri-drag-region
          className="titlebar-drag meta-caption text-stone-400 font-sans tracking-widest text-[9px] uppercase ml-1"
        >
          Prompt & Grammar Workshop
        </span>
      </div>

      {/* Drag Canvas Middle Spacer */}
      <div
        data-tauri-drag-region
        className="titlebar-drag flex-1 h-full mx-4 cursor-grab"
      />

      {/* Right Utility Bar */}
      <div className="titlebar-no-drag flex items-center gap-3">
        <span
          data-tauri-drag-region
          className="titlebar-drag hidden sm:inline-block font-mono text-[10px] text-stone-400 tracking-wider uppercase"
        >
          {hotkey}
        </span>

        <span className="w-px h-3 bg-stone-300/80 hidden sm:inline-block" />

        <button
          onClick={onOpenSettings}
          title="Preferences & Model Selection"
          className="titlebar-no-drag p-1 text-stone-400 hover:text-stone-800 transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleClose}
          title="Dismiss (Esc)"
          className="titlebar-no-drag p-1 text-stone-400 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
