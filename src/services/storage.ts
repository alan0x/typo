export interface AppSettings {
  apiKey: string;
  model: string;
  autoReplaceOnEnter: boolean;
  autoPolishOnTrigger: boolean;
  hotkey: string;
}

const STORAGE_KEY = "typo_settings_v1";

export const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  model: "gemini-2.5-flash",
  autoReplaceOnEnter: true,
  autoPolishOnTrigger: true,
  hotkey: "Alt + Shift + E",
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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
