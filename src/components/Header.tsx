import React from "react";
import { Sparkles, Settings, X, Terminal } from "lucide-react";
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
      className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-900/60 select-none cursor-grab active:cursor-grabbing rounded-t-2xl"
    >
      <div className="flex items-center gap-2 pointer-events-none">
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-500 text-white shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <span className="font-semibold text-sm tracking-tight text-zinc-100 flex items-center gap-1.5">
          Typo
          <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Agent Coach
          </span>
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/60 text-zinc-400 text-[11px] font-mono border border-zinc-700/40">
          <Terminal className="w-3 h-3 text-zinc-400" />
          <span>{hotkey}</span>
        </div>

        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleClose}
          title="Close (Esc)"
          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
