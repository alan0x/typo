import React, { useEffect, useState } from "react";
import {
  AppSettings,
  AvailableModel,
  TARGET_LANGUAGES,
  DEFAULT_MODELS,
  DEFAULT_DEEPSEEK_MODELS,
} from "../services/storage";
import {
  Eye,
  EyeOff,
  X,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Check,
  FolderOpen,
} from "lucide-react";
import { fetchGeminiModels } from "../services/gemini";
import { fetchDeepseekModels } from "../services/deepseek";
import { getDefaultNotesDir, pickNotesDir } from "../services/notes";

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
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  const [fetching, setFetching] = useState(false);

  const [geminiModelsList, setGeminiModelsList] = useState<AvailableModel[]>(
    settings.availableModels && settings.availableModels.length > 0
      ? settings.availableModels
      : DEFAULT_MODELS
  );

  const [deepseekModelsList, setDeepseekModelsList] = useState<AvailableModel[]>(
    settings.availableDeepseekModels && settings.availableDeepseekModels.length > 0
      ? settings.availableDeepseekModels
      : DEFAULT_DEEPSEEK_MODELS
  );

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [defaultNotesDir, setDefaultNotesDir] = useState("");

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...settings });
      setStatusMessage(null);
      getDefaultNotesDir().then(setDefaultNotesDir).catch(() => setDefaultNotesDir(""));
    }
  }, [isOpen, settings]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePickNotesDir = async () => {
    try {
      const selected = await pickNotesDir(formData.notesDir || defaultNotesDir || undefined);
      if (selected) {
        setFormData((prev) => ({ ...prev, notesDir: selected }));
      }
    } catch (err) {
      console.error("Folder picker failed:", err);
    }
  };

  const handleTestAndFetch = async () => {
    const isDeepSeek = formData.provider === "deepseek";
    const currentKey = isDeepSeek ? formData.deepseekApiKey : formData.apiKey;

    if (!currentKey.trim()) {
      setStatusMessage({
        type: "error",
        text: `API key is required to connect to ${isDeepSeek ? "DeepSeek" : "Gemini"}.`,
      });
      return;
    }

    setFetching(true);
    setStatusMessage({
      type: "info",
      text: isDeepSeek
        ? "Connecting to DeepSeek endpoint..."
        : "Querying Google Generative AI registry...",
    });

    try {
      if (isDeepSeek) {
        const realModels = await fetchDeepseekModels(
          formData.deepseekApiKey,
          formData.deepseekBaseUrl
        );
        setDeepseekModelsList(realModels);

        const hasCurrent = realModels.some((m) => m.id === formData.deepseekModel);
        const nextModel = hasCurrent
          ? formData.deepseekModel
          : realModels[0]?.id || "deepseek-chat";

        setFormData((prev) => ({
          ...prev,
          deepseekModel: nextModel,
          availableDeepseekModels: realModels,
        }));

        setStatusMessage({
          type: "success",
          text: `Connected. Found ${realModels.length} models for your DeepSeek key.`,
        });
      } else {
        const realModels = await fetchGeminiModels(formData.apiKey);
        setGeminiModelsList(realModels);

        const hasCurrent = realModels.some((m) => m.id === formData.model);
        const nextModel = hasCurrent ? formData.model : realModels[0]?.id || "gemini-2.5-flash";

        setFormData((prev) => ({
          ...prev,
          model: nextModel,
          availableModels: realModels,
        }));

        setStatusMessage({
          type: "success",
          text: `Connected. Found ${realModels.length} generation models for your Gemini key.`,
        });
      }
    } catch (err: any) {
      console.error("Fetch models failed:", err);
      setStatusMessage({
        type: "error",
        text: err.message || `Failed to reach ${isDeepSeek ? "DeepSeek" : "Google Gemini"} API.`,
      });
    } finally {
      setFetching(false);
    }
  };

  const handleSave = () => {
    onSave({
      ...formData,
      availableModels: geminiModelsList,
      availableDeepseekModels: deepseekModelsList,
    });
    onClose();
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-stone-900/40 backdrop-blur-2xs animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md max-h-[min(480px,94vh)] flex flex-col bg-[#faf9f5] border border-stone-300 rounded-xl shadow-2xl p-4 text-stone-900 font-sans"
      >
        {/* Header (shrink-0) */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo-icon.png"
              alt="Typo"
              className="w-8 h-8 rounded-lg shadow-2xs border border-stone-200/90 object-contain select-none pointer-events-none bg-white"
            />
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <h2 className="font-serif text-[13px] font-bold tracking-wider uppercase text-stone-900 leading-none">
                  Preferences
                </h2>
                <span className="font-mono text-[9px] text-stone-500 bg-stone-200/70 px-1 py-0.5 rounded leading-none">
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
            title="Close (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto min-h-0 py-1 space-y-3.5 text-xs pr-1">
          {/* Provider Selection Tabs */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-stone-700 tracking-wide uppercase">
              AI Provider
            </label>
            <div className="grid grid-cols-2 p-0.5 bg-stone-200/70 rounded-lg gap-1">
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, provider: "gemini" });
                  setStatusMessage(null);
                }}
                className={`py-1.5 px-3 rounded-md text-center text-[11px] font-medium transition-all cursor-pointer ${
                  formData.provider === "gemini"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                Google Gemini
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({ ...formData, provider: "deepseek" });
                  setStatusMessage(null);
                }}
                className={`py-1.5 px-3 rounded-md text-center text-[11px] font-medium transition-all cursor-pointer ${
                  formData.provider === "deepseek"
                    ? "bg-white text-stone-900 shadow-2xs font-semibold"
                    : "text-stone-600 hover:text-stone-900"
                }`}
              >
                DeepSeek
              </button>
            </div>
          </div>

          {/* Conditional Provider Section: Gemini */}
          {formData.provider === "gemini" && (
            <>
              {/* Gemini Key Input */}
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
                    <span>Get Key</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showGeminiKey ? "text" : "password"}
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
                    onClick={() => setShowGeminiKey(!showGeminiKey)}
                    className="absolute right-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showGeminiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Gemini Model Dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-stone-700 tracking-wide uppercase">
                    Gemini Model
                  </label>
                  <span className="font-mono text-[10px] text-stone-400">
                    {geminiModelsList.length} options
                  </span>
                </div>

                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-md text-stone-900 font-mono text-[11px] focus:outline-none focus:border-stone-800 transition-colors"
                >
                  {geminiModelsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} ({m.id})
                    </option>
                  ))}
                </select>

                {(() => {
                  const info = geminiModelsList.find((m) => m.id === formData.model);
                  return info?.description ? (
                    <p className="text-[10px] text-stone-500 leading-normal font-sans">
                      {info.description}
                    </p>
                  ) : null;
                })()}
              </div>
            </>
          )}

          {/* Conditional Provider Section: DeepSeek */}
          {formData.provider === "deepseek" && (
            <>
              {/* DeepSeek Key Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-stone-700 tracking-wide uppercase">
                    DeepSeek API Key
                  </label>
                  <a
                    href="https://platform.deepseek.com/api_keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-mono text-stone-500 hover:text-stone-900 transition-colors underline flex items-center gap-1"
                  >
                    <span>Get Key</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="relative flex items-center">
                  <input
                    type={showDeepseekKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={formData.deepseekApiKey}
                    onChange={(e) => {
                      setFormData({ ...formData, deepseekApiKey: e.target.value });
                      setStatusMessage(null);
                    }}
                    className="w-full px-3 py-1.5 pr-8 bg-white border border-stone-300 rounded-md font-mono text-[11px] text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-800 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeepseekKey(!showDeepseekKey)}
                    className="absolute right-2.5 text-stone-400 hover:text-stone-700 cursor-pointer"
                  >
                    {showDeepseekKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* DeepSeek Base URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-stone-700 tracking-wide uppercase">
                    API Base URL
                  </label>
                  {formData.deepseekBaseUrl !== "https://api.deepseek.com" && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({ ...formData, deepseekBaseUrl: "https://api.deepseek.com" })
                      }
                      className="text-[10px] text-stone-500 hover:text-stone-900 underline transition-colors cursor-pointer"
                    >
                      Reset default
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="https://api.deepseek.com"
                  value={formData.deepseekBaseUrl}
                  onChange={(e) => setFormData({ ...formData, deepseekBaseUrl: e.target.value })}
                  className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-md font-mono text-[11px] text-stone-900 placeholder-stone-400 focus:outline-none focus:border-stone-800 transition-colors"
                />
              </div>

              {/* DeepSeek Model Dropdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-stone-700 tracking-wide uppercase">
                    DeepSeek Model
                  </label>
                  <span className="font-mono text-[10px] text-stone-400">
                    {deepseekModelsList.length} options
                  </span>
                </div>

                <select
                  value={formData.deepseekModel}
                  onChange={(e) => setFormData({ ...formData, deepseekModel: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-white border border-stone-300 rounded-md text-stone-900 font-mono text-[11px] focus:outline-none focus:border-stone-800 transition-colors"
                >
                  {deepseekModelsList.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.displayName} ({m.id})
                    </option>
                  ))}
                </select>

                {(() => {
                  const info = deepseekModelsList.find((m) => m.id === formData.deepseekModel);
                  return info?.description ? (
                    <p className="text-[10px] text-stone-500 leading-normal font-sans">
                      {info.description}
                    </p>
                  ) : null;
                })()}
              </div>
            </>
          )}

          {/* Test Connection Button */}
          <div>
            <button
              onClick={handleTestAndFetch}
              disabled={
                fetching ||
                !(formData.provider === "deepseek"
                  ? formData.deepseekApiKey.trim()
                  : formData.apiKey.trim())
              }
              className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-stone-100 hover:bg-stone-200 border border-stone-300 disabled:opacity-50 text-stone-800 font-sans font-medium rounded-md transition-colors text-[11px] cursor-pointer"
            >
              <RefreshCw
                className={`w-3 h-3 ${fetching ? "animate-spin text-stone-500" : "text-stone-500"}`}
              />
              <span>
                {fetching
                  ? "Testing connection..."
                  : `Test Connection & Query ${formData.provider === "deepseek" ? "DeepSeek" : "Gemini"} Models`}
              </span>
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

          {/* Target Language */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-medium text-stone-700 tracking-wide uppercase">
              Target Language
            </label>
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

          {/* Quick Replace Options */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-medium text-stone-700 tracking-wide uppercase">
              Quick Replace (no HUD)
            </label>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
                {formData.quickHotkey}
              </span>
              <select
                value={formData.quickOutput}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    quickOutput: e.target.value as "agent" | "natural",
                  })
                }
                className="flex-1 px-2 py-1 bg-white border border-stone-300 rounded-md text-stone-900 font-sans text-[11px] focus:outline-none focus:border-stone-800 transition-colors"
              >
                <option value="agent">Paste agent version</option>
                <option value="natural">Paste natural version</option>
              </select>
            </div>
            <p className="text-[10px] text-stone-400">
              Polishes selected text (or current input box) and replaces it in place without opening the HUD.
            </p>
          </div>

          {/* Mistake Notebook Folder */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[11px] font-medium text-stone-700 tracking-wide uppercase">
              Mistake Notebook Folder
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                readOnly
                value={formData.notesDir || defaultNotesDir}
                placeholder={defaultNotesDir || "~/.typo"}
                className="flex-1 min-w-0 px-3 py-1.5 bg-stone-50 border border-stone-300 rounded-md font-mono text-[10px] text-stone-700 truncate focus:outline-none"
                title={formData.notesDir || defaultNotesDir}
              />
              <button
                onClick={handlePickNotesDir}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-stone-100 border border-stone-300 rounded-md text-[10px] text-stone-700 transition-colors cursor-pointer"
              >
                <FolderOpen className="w-3 h-3" />
                <span>Choose…</span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-stone-400">
                Saved mistakes are appended to notebook.md in this folder.
              </p>
              {formData.notesDir && (
                <button
                  onClick={() => setFormData((prev) => ({ ...prev, notesDir: "" }))}
                  className="shrink-0 text-[10px] text-stone-500 hover:text-stone-900 underline transition-colors cursor-pointer"
                >
                  Reset default
                </button>
              )}
            </div>
          </div>

          {/* Hotkey Notice */}
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-stone-500 text-[11px]">
            <span>Global summon HUD</span>
            <span className="font-mono text-[10px] text-stone-700 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">
              {formData.hotkey}
            </span>
          </div>
        </div>

        {/* Footer Actions (shrink-0, pinned to bottom) */}
        <div className="flex items-center justify-end gap-2 pt-3 mt-1 border-t border-stone-200 shrink-0">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-50 bg-stone-900 hover:bg-stone-800 rounded-md transition-all cursor-pointer shadow-2xs"
          >
            Apply Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
