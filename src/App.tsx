import { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { SettingsModal } from "./components/SettingsModal";
import { ResultCard } from "./components/ResultCard";
import { loadSettings, saveSettings, AppSettings } from "./services/storage";
import { polishTextWithGemini, PolishResult } from "./services/gemini";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { Loader2, RefreshCw } from "lucide-react";
import { REFINE_HOTKEY_LABEL } from "./utils/platform";

export function App() {
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const isDemo = searchParams?.get("demo") === "true";

  const [settings, setSettings] = useState<AppSettings>(() => {
    const loaded = loadSettings();
    if (isDemo && !loaded.apiKey) {
      return { ...loaded, apiKey: "AIzaSy_demo_key_example" };
    }
    return loaded;
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(searchParams?.get("modal") === "settings");
  const [inputText, setInputText] = useState(
    isDemo ? "I follow this artical to set you run in advisor mode, could you help and check if everything sattle down?" : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PolishResult | null>(
    isDemo
      ? {
          bestForAgent:
            "I followed this guide to enable advisor mode for you: https://code.claude.com/docs/en/advisor. Could you check whether advisor mode is configured correctly and working as expected?",
          naturalVersion:
            "I followed this guide to enable advisor mode for you. Could you help me verify that everything is set up correctly?",
          agentReasoning:
            "Explicitly states 'working as expected' to initiate active runtime verification rather than passive check.",
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
        if (settings.apiKey) {
          handlePolish(grabbed.trim());
        }
      } else {
        inputRef.current?.focus();
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [settings.apiKey, settings.model, settings.targetLanguage]);

  // Window-level key controls
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
        e.preventDefault();
        handleReplace(result.bestForAgent);
      } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePolish(inputText);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [result, inputText, settings.apiKey, settings.model, settings.targetLanguage]);

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
      const data = await polishTextWithGemini(target, settings.apiKey, settings.model, settings.targetLanguage);
      setResult(data);
    } catch (err: any) {
      console.error("Polishing error:", err);
      setError(err.message || "An unexpected error occurred during synthesis.");
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = async (text: string) => {
    try {
      await invoke("replace_selection", { text });
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

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f7f6f2] border border-stone-300 rounded-xl shadow-2xl text-stone-900 overflow-hidden font-sans">
      <Header
        hotkey={settings.hotkey}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <main className="flex-1 flex flex-col p-4 space-y-3.5 overflow-y-auto">
        {/* Unconfigured Key Gentle Notice */}
        {!settings.apiKey && (
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border border-stone-300/80 rounded-lg text-xs">
            <span className="text-stone-600 font-sans">
              Gemini API key is not yet configured.
            </span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-stone-900 font-medium underline hover:text-stone-700 transition-colors cursor-pointer text-xs"
            >
              Set key →
            </button>
          </div>
        )}

        {/* Draft Area */}
        <div className="bg-white border border-stone-300/80 rounded-lg p-3.5 focus-within:border-stone-800 transition-colors shadow-2xs">
          <div className="flex items-center justify-between text-[10px] mb-2">
            <span className="meta-caption text-stone-700 tracking-wider">
              Input Draft
            </span>
            {inputText && (
              <button
                onClick={() => {
                  setInputText("");
                  setResult(null);
                  setError(null);
                }}
                className="text-stone-600 hover:text-stone-900 transition-colors cursor-pointer font-mono"
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
            placeholder={`Type your draft in any language, or press ${settings.hotkey} on selected text in any app...`}
            className="w-full bg-transparent resize-none outline-none text-[12px] text-stone-900 placeholder-stone-400 font-sans leading-relaxed selectable-text"
          />

          <div className="flex items-center justify-between pt-2 mt-1 border-t border-stone-100">
            <span className="font-mono text-[10px] text-stone-600">
              {settings.model}
            </span>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-stone-600 font-mono hidden sm:inline">
                {REFINE_HOTKEY_LABEL}
              </span>
              <button
                onClick={() => handlePolish()}
                disabled={loading || !inputText.trim()}
                className="px-3 py-1 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] disabled:opacity-40 text-stone-50 text-[11px] font-sans font-medium rounded-md transition-all cursor-pointer shadow-2xs"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin text-stone-300" />
                    <span>Analyzing</span>
                  </span>
                ) : (
                  <span>Refine prompt</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 bg-white border border-rose-300/80 rounded-lg text-xs text-rose-900">
            <div className="flex-1">
              <p className="font-medium text-[11px]">Analysis failed</p>
              <p className="text-[11px] text-rose-700 mt-0.5">{error}</p>
            </div>
            <button
              onClick={() => handlePolish()}
              className="p-1 hover:bg-rose-50 rounded text-rose-700 transition-colors cursor-pointer"
              title="Retry"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="p-4 bg-white border border-stone-200/80 rounded-lg space-y-2.5 animate-pulse">
            <div className="h-3 bg-stone-100 rounded w-1/4" />
            <div className="h-10 bg-stone-50 rounded" />
            <div className="h-14 bg-stone-50 rounded" />
          </div>
        )}

        {/* Output */}
        {!loading && result && (
          <ResultCard result={result} onReplace={handleReplace} />
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
              Select text anywhere and press{" "}
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
    </div>
  );
}

export default App;
