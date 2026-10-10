import { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { SettingsModal } from "./components/SettingsModal";
import { ResultCard } from "./components/ResultCard";
import { loadSettings, saveSettings, AppSettings } from "./services/storage";
import { polishTextWithGemini, PolishResult } from "./services/gemini";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, Key, AlertCircle, RefreshCw, Sparkles } from "lucide-react";

export function App() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PolishResult | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load settings on startup
  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Listen to Tauri "trigger-polish" event triggered by global hotkey
  useEffect(() => {
    const unlistenPromise = listen<string>("trigger-polish", (event) => {
      const grabbed = event.payload;
      if (grabbed && grabbed.trim()) {
        setInputText(grabbed.trim());
        if (settings.apiKey) {
          handlePolish(grabbed.trim());
        }
      } else {
        // If nothing was selected, focus input for user typing
        inputRef.current?.focus();
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [settings.apiKey, settings.model]);

  // Handle global keyboard shortcuts within the window
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        invoke("hide_window").catch(console.error);
      } else if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement !== inputRef.current &&
        result
      ) {
        // Pressing Enter when not editing input will trigger replacement
        e.preventDefault();
        handleReplace(result.bestForAgent);
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        // Ctrl+Enter or Cmd+Enter submits the input
        e.preventDefault();
        handlePolish(inputText);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [result, inputText]);

  const handlePolish = async (textToPolish?: string) => {
    const target = textToPolish !== undefined ? textToPolish : inputText;
    if (!target.trim()) return;

    if (!settings.apiKey) {
      setIsSettingsOpen(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await polishTextWithGemini(target, settings.apiKey, settings.model);
      setResult(data);
    } catch (err: any) {
      console.error("Polishing error:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = async (text: string) => {
    try {
      await invoke("replace_selection", { text });
    } catch (err) {
      console.error("Replace failed:", err);
      // Fallback copy to clipboard
      await navigator.clipboard.writeText(text);
      invoke("hide_window").catch(console.error);
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950/95 border border-zinc-800/80 rounded-2xl shadow-2xl backdrop-blur-2xl text-zinc-100 overflow-hidden font-sans">
      <Header
        hotkey={settings.hotkey}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 flex flex-col p-3.5 space-y-3 overflow-y-auto">
        {/* API Key Missing Banner */}
        {!settings.apiKey && (
          <div className="flex items-center justify-between p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Please configure your Google Gemini API Key to enable instant polishing.</span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-2.5 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shrink-0"
            >
              Set Key
            </button>
          </div>
        )}

        {/* Input Text Box */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-2.5 space-y-2 focus-within:border-zinc-700 transition-colors">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="font-medium flex items-center gap-1">
              <span>Input / Captured Text</span>
              <span className="text-[10px] text-zinc-500">(Ctrl+Enter to Polish)</span>
            </span>
            {inputText && (
              <button
                onClick={() => {
                  setInputText("");
                  setResult(null);
                  setError(null);
                }}
                className="text-zinc-500 hover:text-zinc-300"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            ref={inputRef}
            rows={2}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type your English draft or press Alt+Shift+E on any selected text..."
            className="w-full bg-transparent resize-none outline-none text-xs text-zinc-200 placeholder-zinc-600 font-sans leading-relaxed"
          />
          <div className="flex items-center justify-end gap-2 pt-1 border-t border-zinc-800/40">
            <button
              onClick={() => handlePolish()}
              disabled={loading || !inputText.trim()}
              className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Polish with Gemini</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 mt-0.5 text-rose-400 shrink-0" />
            <div className="flex-1">
              <p className="font-medium">Error analyzing text</p>
              <p className="text-[11px] text-rose-400/90 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => handlePolish()}
              className="p-1 hover:bg-rose-900/40 rounded text-rose-300"
              title="Retry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="p-4 bg-zinc-900/40 border border-zinc-800/50 rounded-xl space-y-3 animate-pulse">
            <div className="h-4 bg-zinc-800/80 rounded w-1/3" />
            <div className="h-10 bg-zinc-800/60 rounded" />
            <div className="h-16 bg-zinc-800/40 rounded" />
          </div>
        )}

        {/* Polish Results */}
        {!loading && result && (
          <ResultCard result={result} onReplace={handleReplace} />
        )}

        {/* Empty state tip when no result and not loading */}
        {!loading && !result && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-zinc-500 space-y-2 select-none">
            <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800/80 flex items-center justify-center text-zinc-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium text-zinc-400">Ready to boost your English</p>
            <p className="text-[11px] text-zinc-500 max-w-xs">
              Select any text in your IDE, terminal or browser, then press{" "}
              <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">
                {settings.hotkey}
              </kbd>{" "}
              to instantly analyze and replace.
            </p>
          </div>
        )}
      </main>

      <SettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />
    </div>
  );
}

export default App;
