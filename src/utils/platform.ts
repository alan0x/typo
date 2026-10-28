export const isMac =
  typeof navigator !== "undefined" &&
  (navigator.platform?.toUpperCase().indexOf("MAC") >= 0 ||
    navigator.userAgent?.toUpperCase().indexOf("MAC") >= 0);

export const MODIFIER_KEY = isMac ? "⌘" : "Ctrl";
export const REFINE_HOTKEY_LABEL = isMac ? "⌘↵ to refine" : "Ctrl + Enter to refine";
export const DEFAULT_SUMMON_LABEL = isMac ? "⌥⇧E" : "Alt + Shift + E";
export const DEFAULT_QUICK_LABEL = isMac ? "⌥⇧R" : "Alt + Shift + R";
