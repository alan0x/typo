import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath } from "@tauri-apps/plugin-opener";
import { NoteCategory, PolishAnalysisItem } from "./gemini";

export interface NoteEntry {
  original: string;
  issue: string;
  suggestion: string;
  category?: NoteCategory;
  date: string;
}

export interface AppendResult {
  added: number;
  skipped: number;
}

export const CATEGORY_LABELS: Record<NoteCategory, string> = {
  spelling: "拼写 Spelling",
  grammar: "语法 Grammar",
  tense: "时态 Tense",
  phrasing: "措辞 Phrasing",
  punctuation: "标点 Punctuation",
  other: "其他 Other",
};

function toEntry(item: PolishAnalysisItem): NoteEntry {
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
  return {
    original: item.original,
    issue: item.issue,
    suggestion: item.suggestion,
    category: item.category,
    date,
  };
}

export async function getDefaultNotesDir(): Promise<string> {
  return invoke<string>("get_default_notes_dir");
}

export async function appendEntries(
  items: PolishAnalysisItem[],
  customDir?: string
): Promise<AppendResult> {
  return invoke<AppendResult>("append_note_entries", {
    entries: items.map(toEntry),
    customDir: customDir && customDir.trim() ? customDir.trim() : null,
  });
}

export async function readNotebook(customDir?: string): Promise<string> {
  return invoke<string>("read_notebook", {
    customDir: customDir && customDir.trim() ? customDir.trim() : null,
  });
}

export async function writeNotebook(content: string, customDir?: string): Promise<void> {
  return invoke<void>("write_notebook", {
    content,
    customDir: customDir && customDir.trim() ? customDir.trim() : null,
  });
}

export async function pickNotesDir(defaultPath?: string): Promise<string | null> {
  const selected = await openDialog({
    directory: true,
    multiple: false,
    defaultPath,
    title: "Choose notebook folder",
  });
  return typeof selected === "string" ? selected : null;
}

export async function revealNotesFolder(dir: string): Promise<void> {
  await openPath(dir);
}
