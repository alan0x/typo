import React, { useState } from "react";
import { AppSettings } from "../services/storage";
import { Key, Eye, EyeOff, Check, X, ExternalLink, Zap, AlertCircle } from "lucide-react";
import { polishTextWithGemini } from "../services/gemini";

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
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  if (!isOpen) return null;

  const handleTestKey = async () => {
    if (!formData.apiKey.trim()) {
      setTestResult({ success: false, msg: "Please enter an API key first." });
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      await polishTextWithGemini("Hello world", formData.apiKey, formData.model);
      setTestResult({ success: true, msg: "Connection successful! Gemini API is working." });
    } catch (err: any) {
      setTestResult({ success: false, msg: err.message || "Failed to connect." });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-5 text-zinc-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold tracking-tight text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 space-y-4 text-xs">
          {/* API Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-medium text-zinc-300">Gemini API Key</label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
              >
                <span>Get API key</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
            <div className="relative flex items-center">
              <input
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                className="w-full px-3 py-2 pr-9 bg-zinc-950 border border-zinc-800 rounded-lg font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 text-zinc-400 hover:text-zinc-200"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-zinc-500">
              BYOK mode: Key is stored locally on your device and never uploaded to any third party.
            </p>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="font-medium text-zinc-300">Model</label>
            <select
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-100 font-mono focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended, fast & smart)</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro (Deep reasoning)</option>
            </select>
          </div>

          {/* Test API Key Button */}
          <div>
            <button
              onClick={handleTestKey}
              disabled={testing || !formData.apiKey.trim()}
              className="flex items-center justify-center gap-1.5 w-full py-1.5 px-3 bg-zinc-800/80 hover:bg-zinc-800 disabled:opacity-50 text-zinc-300 font-medium rounded-lg border border-zinc-700/60 transition-colors text-xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>{testing ? "Testing connection..." : "Test Gemini Connection"}</span>
            </button>
            {testResult && (
              <div
                className={`mt-2 p-2 rounded-lg text-[11px] flex items-start gap-1.5 ${
                  testResult.success
                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40"
                    : "bg-rose-950/40 text-rose-400 border border-rose-800/40"
                }`}
              >
                {testResult.success ? (
                  <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                )}
                <span>{testResult.msg}</span>
              </div>
            )}
          </div>

          {/* Shortcut info */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-zinc-400">
            <span>Global Trigger Shortcut</span>
            <span className="px-2 py-0.5 font-mono text-[11px] bg-zinc-950 rounded border border-zinc-800 text-zinc-300">
              {formData.hotkey}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800/60 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-sm transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
