import React from "react";
import { Coffee, Settings, X, Command, GripHorizontal } from "lucide-react";
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
    // Only drag on primary left click
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;
    // Do not trigger window drag if interacting with buttons or inputs
    if (target.closest("button") || target.closest("input") || target.closest("a")) {
      return;
    }

    try {
      // Direct call to Rust backend start_dragging command (guaranteed to work)
      await invoke("start_dragging");
    } catch {
      try {
        // Fallback to front-end window API
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
      className="flex items-center justify-between px-3.5 py-2.5 border-b border-stone-200/80 bg-[#f6f2ea] select-none cursor-grab active:cursor-grabbing rounded-t-2xl transition-colors relative"
    >
      <div className="flex items-center gap-2 select-none">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-xs">
          <Coffee className="w-3.5 h-3.5" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-sm tracking-tight text-stone-850">
            Typo
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-amber-100 text-amber-800 border border-amber-200">
            Cozy Coach
          </span>
        </div>
      </div>

      {/* Visual drag handle */}
      <div className="flex items-center justify-center text-stone-400 select-none pointer-events-none">
        <GripHorizontal className="w-4 h-4 opacity-60" />
      </div>

      <div className="flex items-center gap-1.5">
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[11px] font-mono border border-stone-200/80">
          <Command className="w-3 h-3 text-amber-600" />
          <span>{hotkey}</span>
        </div>

        <button
          onClick={onOpenSettings}
          title="Settings & Models"
          className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition-colors cursor-pointer"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleClose}
          title="Close (Esc)"
          className="p-1.5 rounded-lg text-stone-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
