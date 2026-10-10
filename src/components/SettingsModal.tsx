import React, { useState } from "react";
import { AppSettings, AvailableModel } from "../services/storage";
import { Key, Eye, EyeOff, Check, X, ExternalLink, Sparkles, RefreshCw, AlertCircle, Cpu } from "lucide-react";
import { fetchGeminiModels } from "../services/gemini";

interface SettingsModalProps {
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [showKey, setShowKey] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [modelsList, setModelsList] = useState<AvailableModel[]>(settings.availableModels || []);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleTestAndFetch = async () => {
    if (!formData.apiKey.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter your Gemini API Key first.",
      });
      return;
    }

    setFetching(true);
    setStatusMessage({
      type: "info",
      text: "Connecting to Google Gemini API and fetching available models...",
    });

    try {
      const realModels = await fetchGeminiModels(formData.apiKey);
      setModelsList(realModels);

      const hasCurrent = realModels.some((m) => m.id === formData.model);
      const nextModel = hasCurrent ? formData.model : (realModels[0]?.id || "gemini-2.5-flash");

      setFormData((prev) => ({
        ...prev,
        model: nextModel,
        availableModels: realModels,
      }));

      setStatusMessage({
        type: "success",
        text: `Connected! Found ${realModels.length} models for your account. You can now select any model below.`,
      });
    } catch (err: any) {
      console.error("Fetch models failed:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to connect. Please check your API key or network.",
      });
    } finally {
      setFetching(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...formData,
      availableModels: modelsList,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-fade-in">
      <div className="w-full max-w-md bg-[#faf8f5] border border-stone-200/90 rounded-2xl shadow-2xl p-5 text-stone-800">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight text-stone-900">Preferences & Models</h2>
              <p className="text-[11px] text-stone-500">Configure your personal Gemini API key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="py-4 space-y-4 text-xs">
          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-medium text-stone-700">Google Gemini API Key</label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-amber-700 hover:text-amber-800 transition-colors hover:underline"
              >
                <span>Get a free key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={formData.apiKey}
                onChange={(e) => {
                  setFormData({ ...formData, apiKey: e.target.value });
                  setStatusMessage(null);
                }}
                className="w-full px-3 py-2 pr-9 bg-white border border-stone-200 rounded-xl font-mono text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-colors shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 text-stone-400 hover:text-stone-600"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-stone-500">
              BYOK (Bring Your Own Key): Stored strictly locally on this machine.
            </p>
          </div>

          {/* Test & Fetch Real Models Button */}
          <div>
            <button
              onClick={handleTestAndFetch}
              disabled={fetching || !formData.apiKey.trim()}
              className="flex items-center justify-center gap-2 w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] disabled:opacity-50 text-stone-950 font-medium rounded-xl shadow-xs transition-all text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetching ? "animate-spin" : ""}`} />
              <span>{fetching ? "Testing & Fetching Models..." : "Test Connection & Fetch Model List"}</span>
            </button>

            {statusMessage && (
              <div
                className={`mt-2.5 p-2.5 rounded-xl text-[11px] flex items-start gap-2 ${
                  statusMessage.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : statusMessage.type === "error"
                    ? "bg-rose-50 text-rose-800 border border-rose-200"
                    : "bg-stone-100 text-stone-700 border border-stone-200"
                }`}
              >
                {statusMessage.type === "success" && (
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                )}
                {statusMessage.type === "error" && (
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-rose-600" />
                )}
                {statusMessage.type === "info" && (
                  <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-600" />
                )}
                <span className="leading-relaxed">{statusMessage.text}</span>
              </div>
            )}
          </div>

          {/* Dynamic Model Selector */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="font-medium text-stone-700 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-600" />
                <span>Selected Model</span>
              </label>
              <span className="text-[10px] text-stone-500 font-mono">
                {modelsList.length} models available
              </span>
            </div>

            <select
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 font-mono focus:outline-none focus:border-amber-500 transition-colors shadow-2xs"
            >
              {modelsList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.id})
                </option>
              ))}
            </select>

            {/* Display description of selected model if present */}
            {(() => {
              const currentModelInfo = modelsList.find((m) => m.id === formData.model);
              return currentModelInfo?.description ? (
                <p className="text-[11px] text-stone-500 leading-relaxed italic">
                  {currentModelInfo.description}
                </p>
              ) : null;
            })()}
          </div>

          {/* Shortcut reminder */}
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-stone-500">
            <span>Global summon hotkey</span>
            <span className="px-2 py-0.5 font-mono text-[11px] bg-stone-100 rounded-lg border border-stone-200 text-stone-700">
              {formData.hotkey}
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-stone-500 hover:text-stone-800 rounded-xl hover:bg-stone-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-xs font-medium text-stone-950 bg-amber-500 hover:bg-amber-400 active:scale-95 rounded-xl shadow-xs transition-all"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
