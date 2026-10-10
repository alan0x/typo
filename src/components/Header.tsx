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
      className="titlebar-drag flex items-center justify-between px-4 py-2.5 border-b border-stone-200/90 bg-[#faf9f5] select-none cursor-grab active:cursor-grabbing transition-colors w-full"
    >
      {/* Brand Lockup: Prominent Logo & Editorial Typography */}
      <div data-tauri-drag-region className="titlebar-drag flex items-center gap-2.5">
        <img
          src="/logo.png"
          alt="Typo Logo"
          className="w-8 h-8 rounded-lg shadow-2xs border border-stone-200/90 object-cover object-top select-none pointer-events-none bg-white"
        />
        <div data-tauri-drag-region className="titlebar-drag flex flex-col justify-center">
          <div data-tauri-drag-region className="titlebar-drag flex items-center gap-1.5 leading-none">
            <span
              data-tauri-drag-region
              className="titlebar-drag font-serif text-[14px] tracking-wider uppercase font-bold text-stone-900 leading-none"
            >
              Typo
            </span>
            <span
              data-tauri-drag-region
              className="titlebar-drag font-mono text-[9px] text-stone-500 bg-stone-200/70 px-1 py-0.5 rounded leading-none"
            >
              HUD
            </span>
          </div>
          <span
            data-tauri-drag-region
            className="titlebar-drag text-stone-400 font-sans tracking-wider text-[9px] uppercase leading-none mt-1 hidden xs:inline-block"
          >
            Prompt & Grammar Workshop
          </span>
        </div>
      </div>

      {/* Drag Canvas Middle Spacer */}
      <div
        data-tauri-drag-region
        className="titlebar-drag flex-1 h-full mx-3 cursor-grab"
      />

      {/* Right Utility Bar */}
      <div className="titlebar-no-drag flex items-center gap-2.5">
        <span
          data-tauri-drag-region
          className="titlebar-drag hidden sm:inline-flex items-center px-2 py-0.5 bg-stone-200/50 border border-stone-300/60 rounded font-mono text-[10px] text-stone-500 tracking-wider"
        >
          {hotkey}
        </span>

        <span className="w-px h-3.5 bg-stone-300/70 hidden sm:inline-block" />

        <button
          onClick={onOpenSettings}
          title="Preferences & Model Selection"
          className="titlebar-no-drag p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-md transition-colors cursor-pointer"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleClose}
          title="Dismiss (Esc)"
          className="titlebar-no-drag p-1.5 text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 rounded-md transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
