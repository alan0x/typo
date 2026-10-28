import React, { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Loader2, Check, X } from "lucide-react";
import { loadSettings } from "../services/storage";
import { polishTextWithGemini } from "../services/gemini";

type Status = "idle" | "polishing" | "ok" | "error" | "empty";

// Dismiss the toast without disturbing focus: hide the app first (returns
// focus to the source app when the toast had it), then hide the window.
async function dismissToast() {
  try {
    await invoke("hide_window");
  } catch {
    // app was not frontmost; nothing to return focus from
  }
  await getCurrentWindow().hide().catch(() => {});
}

export const ToastView: React.FC = () => {
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unlisteners: Array<Promise<() => void>> = [];

    unlisteners.push(
      listen<string>("quick-polish", async (event) => {
        if (busy) return;
        setBusy(true);

        const text = event.payload;
        setPreview(text.length > 42 ? `${text.slice(0, 42)}…` : text);
        setErrorMsg("");
        setStatus("polishing");

        const settings = loadSettings();
        try {
          if (!settings.apiKey) {
            throw new Error("Gemini API key not set");
          }
          const result = await polishTextWithGemini(
            text,
            settings.apiKey,
            settings.model,
            settings.targetLanguage
          );
          const output =
            settings.quickOutput === "natural"
              ? result.naturalVersion || result.bestForAgent
              : result.bestForAgent;
          await invoke("replace_selection", { text: output });

          setStatus("ok");
          // The replace may have hidden the whole app (toast included);
          // re-present to show the checkmark, then dismiss.
          await invoke("present_toast").catch(() => {});
          setTimeout(async () => {
            await dismissToast();
            setStatus("idle");
            setBusy(false);
          }, 900);
        } catch (err: any) {
          console.error("Quick polish failed:", err);
          setErrorMsg(err.message || "Polish failed");
          setStatus("error");
          setTimeout(async () => {
            await dismissToast();
            setStatus("idle");
            setBusy(false);
            // Hand the draft to the HUD so the user can retry or copy.
            invoke("show_window", { text }).catch(console.error);
          }, 1400);
        }
      })
    );

    unlisteners.push(
      listen("quick-empty", () => {
        setStatus("empty");
        setTimeout(async () => {
          await dismissToast();
          setStatus("idle");
        }, 1500);
      })
    );

    return () => {
      unlisteners.forEach((p) => p.then((u) => u()));
    };
  }, [busy]);

  return (
    <div className="flex items-center justify-center h-screen w-screen bg-transparent font-sans">
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#faf9f5] border border-stone-300 rounded-xl shadow-2xl text-stone-900 max-w-[220px]">
        {status === "polishing" && (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium leading-none">Polishing…</p>
              {preview && (
                <p className="text-[9px] text-stone-400 mt-1 truncate leading-none">{preview}</p>
              )}
            </div>
          </>
        )}
        {status === "ok" && (
          <>
            <Check className="w-3.5 h-3.5 text-stone-800 shrink-0" />
            <p className="text-[11px] font-medium leading-none">Replaced</p>
          </>
        )}
        {status === "error" && (
          <>
            <X className="w-3.5 h-3.5 text-rose-700 shrink-0" />
            <p className="text-[11px] text-rose-800 leading-tight truncate">{errorMsg}</p>
          </>
        )}
        {status === "empty" && (
          <p className="text-[11px] text-stone-600 leading-tight">No text found to polish</p>
        )}
        {status === "idle" && (
          <p className="text-[11px] text-stone-400 leading-none">Typo</p>
        )}
      </div>
    </div>
  );
};
