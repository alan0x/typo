import React, { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Loader2, Check, X } from "lucide-react";
import { loadSettings } from "../services/storage";
import { polishText, isProviderConfigured, getProviderDisplayName } from "../services/ai";

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
          if (!isProviderConfigured(settings)) {
            throw new Error(`${getProviderDisplayName(settings.provider)} API key not set`);
          }
          const result = await polishText(text, settings);
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
      listen("quick-empty", async () => {
        setStatus("empty");
        setTimeout(async () => {
          await dismissToast();
          setStatus("idle");
        }, 900);
      })
    );

    return () => {
      unlisteners.forEach((p) => p.then((unlisten) => unlisten()));
    };
  }, [busy]);

  return (
    <div className="w-full h-full p-2 flex items-center justify-center select-none bg-transparent">
      <div className="w-full h-full bg-[#faf9f5]/95 border border-stone-300 rounded-lg shadow-lg px-3 py-2 flex items-center gap-2.5 backdrop-blur-md">
        {status === "polishing" && (
          <>
            <Loader2 className="w-4 h-4 text-stone-700 animate-spin shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-stone-800 leading-tight">
                Polishing…
              </div>
              <div className="text-[10px] text-stone-500 font-mono truncate leading-tight mt-0.5">
                {preview}
              </div>
            </div>
          </>
        )}

        {status === "ok" && (
          <>
            <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 stroke-[3]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-stone-900 leading-tight">
                Replaced
              </div>
              <div className="text-[10px] text-stone-500 font-sans leading-tight mt-0.5">
                Polished text pasted in place
              </div>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
              <X className="w-3 h-3 stroke-[3]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-rose-800 leading-tight">
                Failed
              </div>
              <div className="text-[10px] text-stone-500 font-mono truncate leading-tight mt-0.5">
                {errorMsg}
              </div>
            </div>
          </>
        )}

        {status === "empty" && (
          <>
            <div className="w-4 h-4 rounded-full bg-stone-400 text-white flex items-center justify-center shrink-0">
              <X className="w-3 h-3 stroke-[3]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-stone-700 leading-tight">
                No draft found
              </div>
              <div className="text-[10px] text-stone-500 leading-tight mt-0.5">
                Select text or focus an input
              </div>
            </div>
          </>
        )}

        {status === "idle" && (
          <div className="text-[11px] text-stone-400 font-mono">Typo</div>
        )}
      </div>
    </div>
  );
};
