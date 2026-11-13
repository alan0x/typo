import { AppSettings, ApiProvider } from "./storage";
import {
  PolishResult,
  PolishAnalysisItem,
  NoteCategory,
  NOTE_CATEGORIES,
  polishTextWithGemini,
  organizeNotebookWithGemini,
  fetchGeminiModels,
} from "./gemini";
import {
  polishTextWithDeepseek,
  organizeNotebookWithDeepseek,
  fetchDeepseekModels,
} from "./deepseek";

export type { PolishResult, PolishAnalysisItem, NoteCategory };
export { NOTE_CATEGORIES };

export function isProviderConfigured(settings: AppSettings): boolean {
  if (settings.provider === "deepseek") {
    return Boolean(settings.deepseekApiKey && settings.deepseekApiKey.trim());
  }
  return Boolean(settings.apiKey && settings.apiKey.trim());
}

export function getProviderDisplayName(provider: ApiProvider): string {
  return provider === "deepseek" ? "DeepSeek" : "Google Gemini";
}

/**
 * Unified text polishing that dispatches to either Gemini or DeepSeek
 * based on current AppSettings.
 */
export async function polishText(
  text: string,
  settings: AppSettings
): Promise<PolishResult> {
  if (settings.provider === "deepseek") {
    if (!settings.deepseekApiKey?.trim()) {
      throw new Error("DeepSeek API Key is required. Please set it in preferences.");
    }
    return polishTextWithDeepseek(
      text,
      settings.deepseekApiKey,
      settings.deepseekModel || "deepseek-chat",
      settings.targetLanguage,
      settings.deepseekBaseUrl
    );
  }

  // Fallback to Gemini
  if (!settings.apiKey?.trim()) {
    throw new Error("Gemini API Key is required. Please set it in preferences.");
  }
  return polishTextWithGemini(
    text,
    settings.apiKey,
    settings.model || "gemini-2.5-flash",
    settings.targetLanguage
  );
}

/**
 * Unified notebook organization dispatching to active provider.
 */
export async function organizeNotebook(
  notebookMarkdown: string,
  settings: AppSettings
): Promise<string> {
  if (settings.provider === "deepseek") {
    if (!settings.deepseekApiKey?.trim()) {
      throw new Error("DeepSeek API Key is required. Please set it in preferences.");
    }
    return organizeNotebookWithDeepseek(
      notebookMarkdown,
      settings.deepseekApiKey,
      settings.deepseekModel || "deepseek-chat",
      settings.deepseekBaseUrl
    );
  }

  // Fallback to Gemini
  if (!settings.apiKey?.trim()) {
    throw new Error("Gemini API Key is required. Please set it in preferences.");
  }
  return organizeNotebookWithGemini(
    notebookMarkdown,
    settings.apiKey,
    settings.model || "gemini-2.5-flash"
  );
}

export { fetchGeminiModels, fetchDeepseekModels };
