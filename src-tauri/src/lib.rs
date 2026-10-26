pub mod actions;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, PhysicalPosition, Position,
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

// Hiding only the window leaves Typo as the active application, so simulated
// keystrokes would be delivered to Typo itself instead of the previous app.
// On macOS we hide the whole app (NSApp.hide) to return focus to it.
fn hide_app(app: &tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    let _ = app.hide();

    #[cfg(not(target_os = "macos"))]
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

#[tauri::command]
fn hide_window(app: tauri::AppHandle) -> Result<(), String> {
    hide_app(&app);
    Ok(())
}

#[tauri::command]
fn show_window(app: tauri::AppHandle, text: Option<String>) -> Result<(), String> {
    show_hud_window(&app, text.as_deref());
    Ok(())
}

#[tauri::command]
fn start_dragging(window: tauri::WebviewWindow) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

#[tauri::command]
fn replace_selection(app: tauri::AppHandle, text: String, clear_first: Option<bool>) -> Result<(), String> {
    // 1. Write the polished text to the clipboard
    app.clipboard()
        .write_text(&text)
        .map_err(|e| format!("Clipboard error: {}", e))?;

    // 2. Hide Typo so OS focus returns to the original window (IDE, terminal, browser, etc.)
    hide_app(&app);

    // 3. Wait in a background thread for the previous window to regain focus,
    //    then simulate keystrokes on the main thread. enigo's macOS backend
    //    calls Carbon TIS APIs which assert the main dispatch queue, so doing
    //    the key simulation off the main thread crashes the app.
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(120));
        let _ = app.run_on_main_thread(move || {
            // Terminal screens expose no editable selection, so pasting can
            // never overwrite highlighted text there. For TUIs like Kimi Code
            // where Ctrl+C clears the input box when idle, clearing first
            // turns the paste into a true replace.
            if clear_first.unwrap_or(false) {
                if let Err(e) = actions::send_ctrl_c() {
                    eprintln!("[typo] failed to clear input box: {}", e);
                }
                std::thread::sleep(std::time::Duration::from_millis(30));
            }
            if let Err(e) = actions::paste_selection() {
                eprintln!("[typo] failed to paste selection: {}", e);
            }
        });
    });

    Ok(())
}

fn show_hud_window(app: &tauri::AppHandle, text: Option<&str>) {
    // Unhide the app first: after a previous NSApp.hide(), showing a window
    // alone may not reactivate Typo.
    #[cfg(target_os = "macos")]
    let _ = app.show();

    if let Some(window) = app.get_webview_window("main") {
        // Try positioning the window near the cursor
        if let Some((mut cur_x, mut cur_y)) = actions::get_cursor_location() {
            // Offset a little bit to avoid covering the cursor
            cur_x += 12;
            cur_y += 12;

            // Clamp coordinates to screen monitor if available
            if let Ok(Some(monitor)) = window.current_monitor() {
                let mon_size = monitor.size();
                let mon_pos = monitor.position();
                let win_width = 650;
                let win_height = 500;

                let max_x = mon_pos.x + (mon_size.width as i32) - win_width - 10;
                let max_y = mon_pos.y + (mon_size.height as i32) - win_height - 10;

                cur_x = cur_x.clamp(mon_pos.x + 10, max_x.max(mon_pos.x + 10));
                cur_y = cur_y.clamp(mon_pos.y + 10, max_y.max(mon_pos.y + 10));
            }

            let _ = window.set_position(Position::Physical(PhysicalPosition {
                x: cur_x,
                y: cur_y,
            }));
        }

        let _ = window.show();
        let _ = window.set_focus();

        // Emit text to front-end if provided
        if let Some(content) = text {
            eprintln!("[typo] emit trigger-polish ({} chars)", content.len());
            let _ = window.emit("trigger-polish", content);
        } else {
            eprintln!("[typo] no text to emit");
        }
    }
}

// Terminal mouse selections pad each visual line with trailing spaces up to
// the window width, polluting the captured text. Right-trimming every line
// removes that padding and is harmless for GUI text sources.
fn sanitize_grabbed(text: &str) -> String {
    text.lines()
        .map(|line| line.trim_end())
        .collect::<Vec<_>>()
        .join("\n")
        .trim()
        .to_string()
}

// In a terminal, Cmd+A selects the whole screen rather than an input field,
// so the select-all grab fallback would capture scrollback junk. lsappinfo
// reports the frontmost app's bundle id without any special permission.
#[cfg(target_os = "macos")]
fn frontmost_is_terminal() -> bool {
    let asn = std::process::Command::new("lsappinfo")
        .arg("front")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());
    let Some(asn) = asn.filter(|a| !a.is_empty()) else {
        return false;
    };

    let info = std::process::Command::new("lsappinfo")
        .args(["info", "-only", "bundleID", &asn])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string());
    let Some(info) = info else {
        return false;
    };

    const TERMINALS: &[&str] = &[
        "com.apple.Terminal",
        "com.googlecode.iterm2",
        "dev.warp.Warp-Stable",
        "com.mitchellh.ghostty",
        "org.alacritty",
        "net.kovidgoyal.kitty",
        "com.github.wez.wezterm",
        "co.zeit.hyper",
    ];
    TERMINALS
        .iter()
        .any(|t| info.contains(&format!("bundleID=\"{}\"", t)))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        eprintln!("[typo] hotkey pressed");
                        // Step 1: try to copy currently selected text
                        let before = app.clipboard().read_text().ok();
                        match actions::copy_selection() {
                            Ok(_) => eprintln!("[typo] copy_selection ok"),
                            Err(e) => eprintln!("[typo] copy_selection error: {}", e),
                        }
                        let mut grabbed = app.clipboard().read_text().ok();

                        // Step 2: clipboard unchanged means there is no
                        // selection; fall back to grabbing the whole focused
                        // field with Cmd/Ctrl+A + Cmd/Ctrl+C. Skipped for
                        // terminals, where Cmd+A selects the screen.
                        if grabbed == before {
                            #[cfg(target_os = "macos")]
                            let is_terminal = frontmost_is_terminal();
                            #[cfg(not(target_os = "macos"))]
                            let is_terminal = false;

                            if is_terminal {
                                eprintln!("[typo] frontmost app is a terminal; skipping select-all grab");
                            } else {
                                eprintln!("[typo] no selection detected, trying select-all grab");
                                let _ = actions::select_all();
                                let _ = actions::copy_selection();
                                let grabbed_all = app.clipboard().read_text().ok();
                                if grabbed_all != before {
                                    grabbed = grabbed_all;
                                }
                            }
                        }

                        // Step 3: clean up and emit
                        let text = grabbed
                            .map(|t| sanitize_grabbed(&t))
                            .filter(|t| !t.is_empty());
                        eprintln!(
                            "[typo] captured text: {:?}",
                            text.as_deref().map(|t| t.chars().take(60).collect::<String>())
                        );

                        // Step 4: Show HUD window near cursor and emit event
                        show_hud_window(app, text.as_deref());
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Simulated keystrokes (Cmd+C / Cmd+V) require Accessibility
            // permission; ask for it up front instead of failing silently.
            #[cfg(target_os = "macos")]
            {
                let trusted = actions::accessibility::is_trusted(true);
                eprintln!("[typo] accessibility trusted: {}", trusted);
            }

            // Setup system tray menu
            let show_item = MenuItem::with_id(app, "show", "Show Typo (Alt+Shift+E)", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "show" => {
                        show_hud_window(app, None);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_hud_window(tray.app_handle(), None);
                    }
                })
                .build(app)?;

            // Register default global shortcut (Alt+Shift+E)
            let shortcut: Shortcut = "alt+shift+e".parse().expect("Failed to parse shortcut");
            let _ = app.global_shortcut().register(shortcut);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hide_window,
            show_window,
            start_dragging,
            replace_selection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
