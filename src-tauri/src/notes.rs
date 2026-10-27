use serde::Deserialize;
use std::path::PathBuf;
use tauri::Manager;

const NOTEBOOK_FILE: &str = "notebook.md";
const NOTEBOOK_BACKUP_FILE: &str = "notebook.raw.md";
const NOTEBOOK_TITLE: &str = "# Typo Mistake Notebook";

#[derive(Debug, Deserialize)]
pub struct NoteEntry {
    original: String,
    issue: String,
    suggestion: String,
    category: Option<String>,
    date: Option<String>,
}

#[derive(Debug, serde::Serialize)]
pub struct AppendResult {
    pub added: usize,
    pub skipped: usize,
}

/// Canonical categories, each with the keywords used to locate its section
/// in an existing (possibly AI-reorganized) notebook.
const CATEGORIES: &[(&str, &str, &[&str])] = &[
    ("spelling", "## 拼写 Spelling", &["spelling", "拼写"]),
    ("grammar", "## 语法 Grammar", &["grammar", "语法"]),
    ("tense", "## 时态 Tense", &["tense", "时态"]),
    ("phrasing", "## 措辞 Phrasing", &["phrasing", "措辞"]),
    ("punctuation", "## 标点 Punctuation", &["punctuation", "标点"]),
    ("other", "## 其他 Other", &["other", "其他"]),
];

fn category_of(entry: &NoteEntry) -> &'static (&'static str, &'static str, &'static [&'static str]) {
    let key = entry.category.as_deref().unwrap_or("other").to_lowercase();
    CATEGORIES
        .iter()
        .find(|(k, _, _)| *k == key)
        .unwrap_or(&CATEGORIES[5])
}

fn resolve_dir(app: &tauri::AppHandle, custom_dir: &Option<String>) -> Result<PathBuf, String> {
    let dir = match custom_dir {
        Some(d) if !d.trim().is_empty() => PathBuf::from(d.trim()),
        _ => app
            .path()
            .home_dir()
            .map_err(|e| format!("Cannot resolve home directory: {}", e))?
            .join(".typo"),
    };
    std::fs::create_dir_all(&dir).map_err(|e| format!("Cannot create notes directory: {}", e))?;
    Ok(dir)
}

fn one_line(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

fn format_entry(entry: &NoteEntry) -> String {
    let date = entry.date.clone().unwrap_or_default();
    format!(
        "- ~~{}~~ → **{}** — {} *({})*",
        one_line(&entry.original),
        one_line(&entry.suggestion),
        one_line(&entry.issue),
        one_line(&date)
    )
}

/// A line counts as the same mistake when both the quoted original and the
/// suggested correction match.
fn is_duplicate(lines: &[String], entry: &NoteEntry) -> bool {
    let original_marker = format!("~~{}~~", one_line(&entry.original));
    let suggestion_marker = format!("**{}**", one_line(&entry.suggestion));
    lines
        .iter()
        .any(|l| l.contains(&original_marker) && l.contains(&suggestion_marker))
}

fn is_heading(line: &str) -> bool {
    line.trim_start().starts_with("## ")
}

fn heading_matches(line: &str, keywords: &[&str]) -> bool {
    let lower = line.to_lowercase();
    keywords.iter().any(|k| lower.contains(&k.to_lowercase()))
}

/// Insert `entry_line` at the end of the section whose heading matches
/// `keywords`; append a new canonical section when none exists.
fn insert_into_section(lines: &mut Vec<String>, entry_line: String, heading: &str, keywords: &[&str]) {
    let heading_idx = lines
        .iter()
        .position(|l| is_heading(l) && heading_matches(l, keywords));

    match heading_idx {
        Some(h) => {
            // Section runs until the next heading (or EOF); insert before any
            // trailing blank lines so sections stay visually tight.
            let mut insert_at = lines.len();
            for (i, line) in lines.iter().enumerate().skip(h + 1) {
                if is_heading(line) || line.trim_start().starts_with("# ") {
                    insert_at = i;
                    break;
                }
            }
            while insert_at > h + 1 && lines[insert_at - 1].trim().is_empty() {
                insert_at -= 1;
            }
            lines.insert(insert_at, entry_line);
        }
        None => {
            while lines.last().map(|l| l.trim().is_empty()) == Some(true) {
                lines.pop();
            }
            lines.push(String::new());
            lines.push(heading.to_string());
            lines.push(entry_line);
        }
    }
}

#[tauri::command]
pub fn get_default_notes_dir(app: tauri::AppHandle) -> Result<String, String> {
    let dir = resolve_dir(&app, &None)?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
pub fn append_note_entries(
    app: tauri::AppHandle,
    entries: Vec<NoteEntry>,
    custom_dir: Option<String>,
) -> Result<AppendResult, String> {
    let dir = resolve_dir(&app, &custom_dir)?;
    let path = dir.join(NOTEBOOK_FILE);

    let existing = std::fs::read_to_string(&path).unwrap_or_default();
    let mut lines: Vec<String> = if existing.trim().is_empty() {
        vec![NOTEBOOK_TITLE.to_string()]
    } else {
        existing.lines().map(|l| l.to_string()).collect()
    };

    let mut added = 0;
    let mut skipped = 0;
    for entry in &entries {
        if is_duplicate(&lines, entry) {
            skipped += 1;
            continue;
        }
        let &(_, heading, keywords) = category_of(entry);
        insert_into_section(&mut lines, format_entry(entry), heading, keywords);
        added += 1;
    }

    if added > 0 {
        let mut content = lines.join("\n");
        if !content.ends_with('\n') {
            content.push('\n');
        }
        std::fs::write(&path, content).map_err(|e| format!("Cannot write notebook: {}", e))?;
    }

    Ok(AppendResult { added, skipped })
}

#[tauri::command]
pub fn read_notebook(app: tauri::AppHandle, custom_dir: Option<String>) -> Result<String, String> {
    let dir = resolve_dir(&app, &custom_dir)?;
    let path = dir.join(NOTEBOOK_FILE);
    match std::fs::read_to_string(&path) {
        Ok(content) => Ok(content),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(String::new()),
        Err(e) => Err(format!("Cannot read notebook: {}", e)),
    }
}

#[tauri::command]
pub fn write_notebook(
    app: tauri::AppHandle,
    content: String,
    custom_dir: Option<String>,
) -> Result<(), String> {
    let dir = resolve_dir(&app, &custom_dir)?;
    let path = dir.join(NOTEBOOK_FILE);

    // Keep the previous version as a raw backup before an AI-organized
    // rewrite, so a bad generation can never destroy the notebook.
    if path.exists() {
        let backup = dir.join(NOTEBOOK_BACKUP_FILE);
        std::fs::copy(&path, &backup).map_err(|e| format!("Cannot back up notebook: {}", e))?;
    }

    std::fs::write(&path, content).map_err(|e| format!("Cannot write notebook: {}", e))?;
    Ok(())
}
