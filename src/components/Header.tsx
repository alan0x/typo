import React from "react";
import { Coffee, Settings, X, Command } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

interface HeaderProps {
  hotkey: string;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ hotkey, onOpenSettings }) => {
  const handleClose = () => {
    invoke("hide_window").catch((err) => console.error("Failed to hide window", err));
  };

  return (
    <header
      data-tauri-drag-region
      className="flex items-center justify-between px-4 py-2.5 border-b border-stone-800/80 bg-stone-900/70 select-none cursor-grab active:cursor-grabbing rounded-t-2xl"
    >
      <div className="flex items-center gap-2.5 pointer-events-none">
        <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-stone-950 shadow-sm shadow-amber-950/40">
          <Coffee className="w-3.5 h-3.5 text-stone-900" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight text-stone-100">
              Typo
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Cozy Coach
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800/80 text-stone-400 text-[11px] font-mono border border-stone-700/50">
          <Command className="w-3 h-3 text-amber-400/80" />
          <span>{hotkey}</span>
        </div>

        <button
          onClick={onOpenSettings}
          title="Settings & Model Selection"
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleClose}
          title="Close (Esc)"
          className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
