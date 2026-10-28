import { DEFAULT_QUICK_LABEL, DEFAULT_SUMMON_LABEL } from "../utils/platform";

export interface AvailableModel {
  id: string;
  displayName: string;
  description?: string;
}

export interface AppSettings {
  apiKey: string;
  model: string;
  availableModels: AvailableModel[];
  autoReplaceOnEnter: boolean;
  autoPolishOnTrigger: boolean;
  hotkey: string;
  targetLanguage: string;
  notesDir: string;
  quickHotkey: string;
  quickOutput: "agent" | "natural";
}

const STORAGE_KEY = "typo_settings_v2";

export const TARGET_LANGUAGES: string[] = [
  "English",
  "中文（简体）",
  "中文（繁体）",
  "日本語",
  "한국어",
  "Français",
  "Deutsch",
  "Español",
  "Português",
  "Русский",
];

export const DEFAULT_MODELS: AvailableModel[] = [
  {
    id: "gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    description: "Fast, intelligent, and recommended for real-time writing",
  },
  {
    id: "gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    description: "Deep reasoning for complex agent prompt design",
  },
  {
    id: "gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash",
    description: "Next-gen speedy model",
  },
  {
    id: "gemini-1.5-flash",
    displayName: "Gemini 1.5 Flash",
    description: "Standard lightweight multimodal model",
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  model: "gemini-2.5-flash",
  availableModels: DEFAULT_MODELS,
  autoReplaceOnEnter: true,
  autoPolishOnTrigger: true,
  hotkey: DEFAULT_SUMMON_LABEL,
  targetLanguage: "English",
  notesDir: "",
  quickHotkey: DEFAULT_QUICK_LABEL,
  quickOutput: "agent",
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Try fallback to v1 if present
      const oldRaw = localStorage.getItem("typo_settings_v1");
      if (oldRaw) {
        const parsed = JSON.parse(oldRaw);
        return {
          ...DEFAULT_SETTINGS,
          ...parsed,
          availableModels: DEFAULT_MODELS,
        };
      }
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      availableModels:
        parsed.availableModels && parsed.availableModels.length > 0
          ? parsed.availableModels
          : DEFAULT_MODELS,
    };
  } catch (e) {
    console.error("Failed to load settings:", e);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
}
