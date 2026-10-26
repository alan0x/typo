import React, { useState } from "react";
import { AppSettings, AvailableModel, TARGET_LANGUAGES } from "../services/storage";
import { Eye, EyeOff, X, ExternalLink, RefreshCw, AlertCircle, Check } from "lucide-react";
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
        text: "API key is required to connect to Gemini.",
      });
      return;
    }

    setFetching(true);
    setStatusMessage({
      type: "info",
      text: "Querying Google Generative AI registry...",
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
        text: `Connected. Found ${realModels.length} compatible generation models for your key.`,
      });
    } catch (err: any) {
      console.error("Fetch models failed:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to reach Google Gemini API.",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/30 backdrop-blur-2xs animate-fade-in">
      <div className="w-full max-w-md bg-[#faf9f5] border border-stone-300 rounded-xl shadow-xl p-5 text-stone-900 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-stone-200">
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.png"
              alt="Typo"
              className="w-9 h-9 rounded-lg shadow-2xs border border-stone-200/90 object-contain select-none pointer-events-none bg-white"
            />
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <h2 className="font-serif text-[13px] font-bold tracking-wider uppercase text-stone-900 leading-none">
                  Preferences
                </h2>
                <span className="font-mono text-[9px] text-stone-400 bg-stone-200/60 px-1 py-0.5 rounded leading-none">
                  BYOK
                </span>
              </div>
              <p className="text-[11px] text-stone-500 font-sans mt-1 leading-none">
                Model routing & API configuration
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-900 hover:bg-stone-200/50 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="py-2 space-y-4 text-xs">
          {/* Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-stone-700 tracking-wide uppercase">
                Google Gemini API Key
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] font-mono text-stone-500 hover:text-stone-900 transition-colors underline flex items-center gap-1"
              >
                <span>Generate key</span>
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
                className="w-full px-3 py-1.5 pr-8 bg-white border border-stone-300 rounded-md font-mono text-[11px] text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-800 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[10px] text-stone-400">
              Keys remain sandboxed locally on this machine.
            </p>
          </div>

          {/* Test & Fetch action */}
          <div>
            <button
              onClick={handleTestAndFetch}
              disabled={fetching || !formData.apiKey.trim()}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-stone-100 hover:bg-stone-200 border border-stone-300 disabled:opacity-50 text-stone-800 font-sans font-medium rounded-md transition-colors text-[11px] cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${fetching ? "animate-spin text-stone-500" : "text-stone-500"}`} />
              <span>{fetching ? "Querying registry..." : "Test Connection & Query Available Models"}</span>
            </button>

            {statusMessage && (
              <div
                className={`mt-2 p-2 rounded border text-[11px] flex items-start gap-1.5 leading-normal ${
                  statusMessage.type === "success"
                    ? "bg-stone-50 text-stone-800 border-stone-300"
                    : statusMessage.type === "error"
                    ? "bg-stone-50 text-rose-800 border-rose-200"
                    : "bg-stone-50 text-stone-600 border-stone-200"
                }`}
              >
                {statusMessage.type === "success" && (
                  <Check className="w-3 h-3 mt-0.5 shrink-0 text-stone-800" />
                )}
                {statusMessage.type === "error" && (
                  <AlertCircle className="w-3 h-3 mt-0.5 shrink-0 text-rose-600" />
                )}
                <span>{statusMessage.text}</span>
              </div>
            )}
          </div>

          {/* Dynamic Model Dropdown */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-stone-700 tracking-wide uppercase">
                Active Generation Model
              </label>
              <span className="font-mono text-[10px] text-stone-400">
                {modelsList.length} options
              </span>
            </div>

            <select
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-md text-stone-900 font-mono text-[11px] focus:outline-none focus:border-stone-800 transition-colors"
            >
              {modelsList.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} ({m.id})
                </option>
              ))}
            </select>

            {(() => {
              const currentModelInfo = modelsList.find((m) => m.id === formData.model);
              return currentModelInfo?.description ? (
                <p className="text-[10px] text-stone-500 leading-normal font-sans">
                  {currentModelInfo.description}
                </p>
              ) : null;
            })()}
          </div>

          {/* Target Language */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-medium text-stone-700 tracking-wide uppercase">
                Target Language
              </label>
            </div>

            <select
              value={formData.targetLanguage}
              onChange={(e) => setFormData({ ...formData, targetLanguage: e.target.value })}
              className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-md text-stone-900 font-sans text-[11px] focus:outline-none focus:border-stone-800 transition-colors"
            >
              {TARGET_LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>

            <p className="text-[10px] text-stone-500 leading-normal font-sans">
              Drafts in any language are refined into well-expressed {formData.targetLanguage}.
            </p>
          </div>

          {/* Hotkey notice */}
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-stone-500 text-[11px]">
            <span>Global summon</span>
            <span className="font-mono text-[10px] text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
              {formData.hotkey}
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-stone-200">
          <button
            onClick={onClose}
            className="px-3 py-1 text-xs text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs font-medium text-stone-50 bg-stone-900 hover:bg-stone-800 rounded-md transition-all cursor-pointer shadow-2xs"
          >
            Apply Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
