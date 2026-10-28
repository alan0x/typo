//! Extract a TUI input-box draft from a full terminal-screen text dump.
//!
//! TUIs like Claude Code and Kimi Code render the input box as text between
//! two horizontal rule lines, e.g.
//!
//! ```text
//! ────────────────────────────────
//! ❯ please check whether the build
//! is green
//! ────────────────────────────────
//!   ⏵⏵ auto mode on
//! ```
//!
//! The parser is deliberately strict: any ambiguity returns None and the
//! caller falls back to opening the HUD instead of polishing the wrong text.

/// A horizontal separator line: at least 10 chars, ≥80% box-drawing/dash
/// characters.
fn is_rule_line(line: &str) -> bool {
    let trimmed = line.trim();
    let len = trimmed.chars().count();
    if len < 10 {
        return false;
    }
    let rule_chars = trimmed
        .chars()
        .filter(|c| matches!(c, '─' | '═' | '-' | '='))
        .count();
    rule_chars * 5 >= len * 4
}

fn strip_prompt_prefix(line: &str) -> &str {
    let trimmed = line.trim_start();
    for prefix in ["❯ ", "› ", "> ", "❯", "›", ">"] {
        if let Some(rest) = trimmed.strip_prefix(prefix) {
            return rest;
        }
    }
    trimmed
}

/// Extract the input-box content between the last two rule lines on screen.
pub fn parse_tui_input(screen: &str) -> Option<String> {
    let lines: Vec<&str> = screen.lines().collect();
    let rule_idx: Vec<usize> = lines
        .iter()
        .enumerate()
        .filter(|(_, l)| is_rule_line(l))
        .map(|(i, _)| i)
        .collect();
    if rule_idx.len() < 2 {
        return None;
    }

    let top = rule_idx[rule_idx.len() - 2];
    let bottom = rule_idx[rule_idx.len() - 1];
    if bottom <= top + 1 {
        return None;
    }
    let region = &lines[top + 1..bottom];
    if region.is_empty() || region.len() > 10 {
        return None;
    }

    // Hard-wrapped lines reach the box width; join those without a separator,
    // softer breaks (real newlines) join with "\n".
    let box_width = lines[top].trim().chars().count();
    let mut text = String::new();
    let mut prev_raw_len = 0usize;
    for (i, raw) in region.iter().enumerate() {
        if is_rule_line(raw) {
            return None;
        }
        let content = if i == 0 {
            strip_prompt_prefix(raw).trim_end().to_string()
        } else {
            raw.trim_end().to_string()
        };
        if i > 0 {
            let hard_wrapped = box_width > 0 && prev_raw_len + 2 >= box_width;
            text.push_str(if hard_wrapped { "" } else { "\n" });
        }
        prev_raw_len = raw.chars().count();
        text.push_str(&content);
    }

    let text = text.trim().to_string();
    if text.is_empty() || text.chars().count() > 500 {
        return None;
    }
    // An empty Claude Code input shows a dimmed placeholder ("❯ Try …");
    // never polish that.
    if text.starts_with("Try ") {
        return None;
    }
    Some(text)
}
