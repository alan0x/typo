import { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { SettingsModal } from "./components/SettingsModal";
import { ResultCard } from "./components/ResultCard";
import { loadSettings, saveSettings, AppSettings } from "./services/storage";
import { polishTextWithGemini, PolishResult } from "./services/gemini";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, Key, AlertCircle, RefreshCw, Sparkles, Feather } from "lucide-react";

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
        // If nothing was selected, focus input for typing
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
    <div className="flex flex-col h-screen w-screen bg-[#faf8f5]/98 border border-stone-200/90 rounded-2xl shadow-2xl text-stone-850 overflow-hidden font-sans">
      <Header
        hotkey={settings.hotkey}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 flex flex-col p-3.5 space-y-3 overflow-y-auto">
        {/* API Key Missing Banner */}
        {!settings.apiKey && (
          <div className="flex items-center justify-between p-3.5 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-xs text-amber-900 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-amber-950">Welcome to Typo</p>
                <p className="text-[11px] text-amber-800/80">
                  Please add your Gemini API Key in preferences to start polishing.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1.5 text-xs font-medium bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-xl transition-all shadow-xs shrink-0"
            >
              Configure Key
            </button>
          </div>
        )}

        {/* Input / Captured Draft Box */}
        <div className="bg-white border border-stone-200/90 rounded-2xl p-3 space-y-2 focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/15 shadow-xs transition-all">
          <div className="flex items-center justify-between text-[11px] text-stone-500">
            <span className="font-medium flex items-center gap-1.5 text-stone-700">
              <Feather className="w-3.5 h-3.5 text-amber-600" />
              <span>Your Draft</span>
              <span className="text-[10px] text-stone-400 font-mono">(Ctrl+Enter to Polish)</span>
            </span>
            {inputText && (
              <button
                onClick={() => {
                  setInputText("");
                  setResult(null);
                  setError(null);
                }}
                className="text-stone-400 hover:text-stone-700 text-xs transition-colors"
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
            className="w-full bg-transparent resize-none outline-none text-xs text-stone-900 placeholder-stone-400 font-sans leading-relaxed selection:bg-amber-200 selection:text-amber-950"
          />
          <div className="flex items-center justify-between pt-1 border-t border-stone-100">
            <span className="text-[10px] text-stone-400 font-mono">
              Model: {settings.model}
            </span>
            <button
              onClick={() => handlePolish()}
              disabled={loading || !inputText.trim()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 disabled:opacity-40 text-stone-950 text-xs font-medium rounded-xl transition-all shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-950" />
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-stone-950" />
                  <span>Polish Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800">
            <AlertCircle className="w-4 h-4 mt-0.5 text-rose-600 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-rose-900">Could not complete analysis</p>
              <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => handlePolish()}
              className="p-1 hover:bg-rose-100 rounded-lg text-rose-700 transition-colors"
              title="Retry"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="p-4 bg-white border border-stone-200 rounded-2xl space-y-3 animate-pulse shadow-xs">
            <div className="h-4 bg-stone-100 rounded-lg w-1/3" />
            <div className="h-12 bg-stone-100 rounded-xl" />
            <div className="h-16 bg-stone-50 rounded-xl" />
          </div>
        )}

        {/* Polish Results */}
        {!loading && result && (
          <ResultCard result={result} onReplace={handleReplace} />
        )}

        {/* Empty state tip when idle */}
        {!loading && !result && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-stone-500 space-y-2.5 select-none">
            <div className="w-12 h-12 rounded-2xl bg-white border border-stone-200 flex items-center justify-center text-amber-500 shadow-2xs">
              <Sparkles className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-stone-800">Make English feel natural and effortless</p>
            <p className="text-[11px] text-stone-500 max-w-xs leading-relaxed">
              Highlight text in your terminal or editor, press{" "}
              <kbd className="px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700 font-mono text-[10px] border border-stone-200">
                {settings.hotkey}
              </kbd>
              , and let Typo transform your draft.
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
