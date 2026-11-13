import { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { SettingsModal } from "./components/SettingsModal";
import { ResultCard } from "./components/ResultCard";
import { NotebookModal } from "./components/NotebookModal";
import { ToastView } from "./components/ToastView";
import { loadSettings, saveSettings, AppSettings } from "./services/storage";
import { polishText, isProviderConfigured, PolishAnalysisItem, PolishResult } from "./services/ai";
import { appendEntries } from "./services/notes";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, RefreshCw } from "lucide-react";
import { REFINE_HOTKEY_LABEL } from "./utils/platform";

export function App() {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const isDemo = searchParams?.get("demo") === "true";

  // The auxiliary quick-replace window (index.html?view=toast) renders only
  // the floating indicator.
  if (searchParams?.get("view") === "toast") {
    return <ToastView />;
  }

  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadSettings();
    if (isDemo && !isProviderConfigured(loaded)) {
      return { ...loaded, apiKey: "AIzaSy_demo_key_example" };
    }
    return loaded;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(searchParams?.get("modal") === "settings");
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [inputText, setInputText] = useState(
    isDemo ? "I follow this artical to set you run in advisor mode, could you help and check if everything sattle down?" : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PolishResult | null>(
    isDemo
      ? {
          bestForAgent:
            "I followed this article (https://code.claude.com/docs/en/advisor) to set you up to run in advisor mode. Could you help me check whether everything is set up correctly?",
          naturalVersion:
            "I followed this article to set you up in advisor mode: https://code.claude.com/docs/en/advisor. Could you help me check if everything is set up correctly?",
          agentReasoning:
            "Only polished spelling and grammar (artical → article, I follow → I followed). No new requirements added — the request is identical to your draft.",
          analysis: [
            {
              original: "artical",
              issue: "Spelling error. In documentation contexts, 'guide' reads more natural.",
              suggestion: "article / guide",
            },
            {
              original: "I follow",
              issue: "Action is already completed; past tense is grammatically required.",
              suggestion: "I followed",
            },
            {
              original: "set you run",
              issue: "Unnatural verb phrasing in English.",
              suggestion: "enable advisor mode for you",
            },
            {
              original: "sattle down",
              issue: "Misspelling of 'settle'. 'Settle down' refers to living or calming down, not system status.",
              suggestion: "set up correctly",
            },
          ],
        }
      : null
  );
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isDemo) {
      setSettings(loadSettings());
    }
  }, [isDemo]);

  // Listen to Tauri global shortcut trigger
  useEffect(() => {
    const unlistenPromise = listen<string>("trigger-polish", (event) => {
      const grabbed = event.payload;
      if (grabbed && grabbed.trim()) {
        setInputText(grabbed.trim());
        if (isProviderConfigured(settings)) {
          handlePolish(grabbed.trim());
        }
      } else {
        inputRef.current?.focus();
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [settings]);

  // Window-level key controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        // Priority 1: close settings modal if open
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        // Priority 2: close notebook modal if open
        if (isNotebookOpen) {
          setIsNotebookOpen(false);
          return;
        }
        // Priority 3: hide main HUD window
        invoke("hide_window").catch(console.error);
      } else if (
        e.key === "Enter" &&
        e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement !== inputRef.current &&
        result
      ) {
        e.preventDefault();
        handleReplace(result.bestForAgent, true);
      } else if (
        e.key === "Enter" &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        document.activeElement !== inputRef.current &&
        result
      ) {
        e.preventDefault();
        handleReplace(result.bestForAgent);
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePolish(inputText);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [result, inputText, settings, isSettingsOpen, isNotebookOpen]);

  const handlePolish = async (textToPolish?: string) => {
    const target = textToPolish !== undefined ? textToPolish : inputText;
    if (!target.trim()) return;

    if (!isProviderConfigured(settings)) {
      setIsSettingsOpen(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await polishText(target, settings);
      setResult(data);
    } catch (err: any) {
      console.error("Polishing error:", err);
      setError(err.message || "An unexpected error occurred during synthesis.");
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = async (text: string, clearFirst = false) => {
    try {
      await invoke("replace_selection", { text, clearFirst });
    } catch (err) {
      console.error("Replace failed:", err);
      await navigator.clipboard.writeText(text);
      invoke("hide_window").catch(console.error);
    }
  };

  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleSaveNote = async (item: PolishAnalysisItem): Promise<boolean> => {
    try {
      await appendEntries([item], settings.notesDir || undefined);
      return true;
    } catch (err) {
      console.error("Failed to save note:", err);
      return false;
    }
  };

  const handleSaveAllNotes = async (): Promise<boolean> => {
    if (!result?.analysis?.length) return false;
    try {
      await appendEntries(result.analysis, settings.notesDir || undefined);
      return true;
    } catch (err) {
      console.error("Failed to save notes:", err);
      return false;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f7f6f2] text-stone-900 border border-stone-300 shadow-2xl rounded-xl overflow-hidden select-none font-sans">
      <Header
        hotkey={settings.hotkey}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenNotebook={() => setIsNotebookOpen(true)}
      />

      <main className="flex-1 flex flex-col p-3.5 space-y-3 overflow-y-auto">
        {/* Editor Box */}
        <div className="bg-[#faf9f5] border border-stone-300 rounded-lg p-2.5 shadow-2xs relative flex flex-col focus-within:border-stone-500 focus-within:ring-1 focus-within:ring-stone-400 transition-all">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Draft in any language, e.g. 'I follow this artical to set you run in advisor mode'..."
            className="w-full bg-transparent resize-none border-none outline-none text-stone-800 placeholder-stone-400 text-xs font-mono min-h-[58px] leading-relaxed"
            rows={2}
          />
          <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 mt-1">
            <span className="text-[10px] text-stone-400 font-mono">
              Press{" "}
              <kbd className="font-sans px-1 py-0.5 bg-stone-200/80 rounded border border-stone-300/80 text-[9px] text-stone-600">
                {REFINE_HOTKEY_LABEL}
              </kbd>{" "}
              to polish
            </span>
            <button
              onClick={() => handlePolish(inputText)}
              disabled={loading || !inputText.trim()}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-stone-50 text-[11px] font-sans font-medium rounded transition-colors cursor-pointer shadow-2xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3 h-3" />
                  <span>Refine</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-2.5 bg-stone-100 border border-stone-300 text-stone-800 rounded-lg text-xs flex items-center justify-between">
            <span className="font-mono text-[11px] truncate">{error}</span>
            <button
              onClick={() => handlePolish(inputText)}
              className="text-stone-900 font-bold underline ml-2 text-[11px] hover:text-stone-700 shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="space-y-2 animate-pulse">
            <div className="h-20 bg-stone-100 rounded-lg" />
            <div className="h-14 bg-stone-50 rounded" />
          </div>
        )}

        {/* Output */}
        {!loading && result && (
          <ResultCard
            key={result.bestForAgent}
            result={result}
            onReplace={handleReplace}
            onSaveNote={handleSaveNote}
            onSaveAllNotes={handleSaveAllNotes}
          />
        )}

        {/* Quiet Empty State with Prominent Brand Mark */}
        {!loading && !result && !error && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 select-none animate-fade-in">
            <div className="mb-3.5">
              <img
                src="/logo-icon.png"
                alt="Typo"
                className="w-16 h-16 rounded-2xl shadow-sm border border-stone-200/90 object-contain select-none pointer-events-none bg-white"
              />
            </div>
            <p className="font-serif italic text-stone-800 text-[13px] max-w-xs leading-relaxed">
              "The limits of my language mean the limits of my world."
            </p>
            <p className="text-[11px] text-stone-500 mt-2.5 max-w-xs leading-normal font-sans">
              Select text — or just place the cursor in a text field — and press{" "}
              <kbd className="font-mono text-stone-700 bg-stone-200/80 border border-stone-300/80 px-1.5 py-0.5 rounded text-[10px] shadow-2xs font-medium">
                {settings.hotkey}
              </kbd>
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

      <NotebookModal
        isOpen={isNotebookOpen}
        onClose={() => setIsNotebookOpen(false)}
        settings={settings}
      />
    </div>
  );
}

export default App;
