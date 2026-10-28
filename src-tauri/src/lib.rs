pub mod actions;
pub mod notes;
pub mod scrape;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, PhysicalPosition, Position, WebviewUrl, WebviewWindowBuilder,
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

    // On macOS, Ctrl+C is unbound in native text fields (copy is Cmd+C), so
    // we can ALWAYS send it before pasting: in terminals it clears the TUI
    // input line (Claude Code, Kimi Code, shells), turning the paste into a
    // true replace; in GUI apps it is a no-op and the paste replaces the
    // active selection. On Windows Ctrl+C means copy and would clobber the
    // clipboard we just wrote, so clearing stays opt-in there.
    #[cfg(target_os = "macos")]
    let clear = {
        let _ = clear_first;
        true
    };
    #[cfg(not(target_os = "macos"))]
    let clear = clear_first.unwrap_or(false);

    // 2. Hide Typo so OS focus returns to the original window — but only when
    //    Typo is actually frontmost (HUD flow). In the quick-replace flow the
    //    toast window stays visible and focus never left the source app.
    #[cfg(target_os = "macos")]
    {
        if frontmost_bundle_id().as_deref() == Some(app.config().identifier.as_str()) {
            hide_app(&app);
        }
    }
    #[cfg(not(target_os = "macos"))]
    hide_app(&app);

    // 3. Wait in a background thread until focus has actually left Typo (or a
    //    fixed delay on Windows), then simulate keystrokes on the main
    //    thread. enigo's macOS backend calls Carbon TIS APIs which assert the
    //    main dispatch queue, so doing the key simulation off the main thread
    //    crashes the app.
    #[cfg(target_os = "macos")]
    let own_id = app.config().identifier.clone();
    std::thread::spawn(move || {
        #[cfg(target_os = "macos")]
        {
            std::thread::sleep(std::time::Duration::from_millis(100));
            for _ in 0..24 {
                match frontmost_bundle_id() {
                    Some(id) if id == own_id => {
                        std::thread::sleep(std::time::Duration::from_millis(50));
                    }
                    _ => break,
                }
            }
        }
        #[cfg(not(target_os = "macos"))]
        std::thread::sleep(std::time::Duration::from_millis(200));

        let _ = app.run_on_main_thread(move || {
            if clear {
                if let Err(e) = actions::send_ctrl_c() {
                    eprintln!("Failed to clear input box: {}", e);
                }
                // Claude Code handles Ctrl+C as an async interrupt (SIGINT),
                // unlike TUIs that treat it as an ordered key event. Give the
                // clear enough time to land before the paste bytes arrive,
                // otherwise the pasted text races the clear and gets wiped
                // or appended to the draft.
                std::thread::sleep(std::time::Duration::from_millis(150));
            }
            if let Err(e) = actions::paste_selection() {
                eprintln!("Failed to paste selection: {}", e);
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
            let _ = window.emit("trigger-polish", content);
        }
    }
}

// The toast is a tiny always-on-top indicator for the quick-replace flow. It
// is created with `focused: false`, so showing it does not steal keyboard
// focus from the source app (GUI selections and TUI input stay intact).
fn show_toast_window(app: &tauri::AppHandle) {
    #[cfg(target_os = "macos")]
    let _ = app.show();

    if let Some(window) = app.get_webview_window("toast") {
        if let Some((mut cur_x, mut cur_y)) = actions::get_cursor_location() {
            cur_x += 12;
            cur_y += 16;

            if let Ok(Some(monitor)) = window.current_monitor() {
                let mon_size = monitor.size();
                let mon_pos = monitor.position();
                let max_x = mon_pos.x + (mon_size.width as i32) - 250;
                let max_y = mon_pos.y + (mon_size.height as i32) - 90;

                cur_x = cur_x.clamp(mon_pos.x + 10, max_x.max(mon_pos.x + 10));
                cur_y = cur_y.clamp(mon_pos.y + 10, max_y.max(mon_pos.y + 10));
            }

            let _ = window.set_position(Position::Physical(PhysicalPosition {
                x: cur_x,
                y: cur_y,
            }));
        }

        let _ = window.show();
    }
}

#[tauri::command]
fn present_toast(app: tauri::AppHandle) -> Result<(), String> {
    show_toast_window(&app);
    Ok(())
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

// lsappinfo reports the frontmost app's bundle id without any special
// permission.
#[cfg(target_os = "macos")]
fn frontmost_bundle_id() -> Option<String> {
    let asn = std::process::Command::new("lsappinfo")
        .arg("front")
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())
        .filter(|a| !a.is_empty())?;

    let info = std::process::Command::new("lsappinfo")
        .args(["info", "-only", "bundleID", &asn])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).to_string())?;

    let start = info.find("bundleID=\"")? + "bundleID=\"".len();
    let end = info[start..].find('"')? + start;
    Some(info[start..end].to_string())
}

// In a terminal, Cmd+A selects the whole screen rather than an input field,
// so the select-all grab fallback would capture scrollback junk.
#[cfg(target_os = "macos")]
fn frontmost_is_terminal() -> bool {
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
    frontmost_bundle_id()
        .map(|id| TERMINALS.contains(&id.as_str()))
        .unwrap_or(false)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }

                    let quick_shortcut: Shortcut =
                        "alt+shift+r".parse().expect("valid shortcut");
                    let is_quick = shortcut == &quick_shortcut;

                    #[cfg(target_os = "macos")]
                    let is_terminal = frontmost_is_terminal();
                    #[cfg(not(target_os = "macos"))]
                    let is_terminal = false;

                    // Step 1: try to copy currently selected text
                    let before = app.clipboard().read_text().ok();
                    if let Err(e) = actions::copy_selection() {
                        eprintln!("Failed to copy selection: {}", e);
                    }
                    let mut grabbed = app.clipboard().read_text().ok();

                    // Step 2: clipboard unchanged means there is no
                    // selection; fall back to grabbing the whole focused
                    // field with Cmd/Ctrl+A + Cmd/Ctrl+C. Skipped for
                    // terminals, where Cmd+A selects the screen.
                    if grabbed == before && !is_terminal {
                        let _ = actions::select_all();
                        let _ = actions::copy_selection();
                        let grabbed_all = app.clipboard().read_text().ok();
                        if grabbed_all != before {
                            grabbed = grabbed_all;
                        }
                    }

                    // Step 3 (quick mode only): in a terminal with no mouse
                    // selection, Cmd+A grabs the whole screen and we parse
                    // the TUI input box (Claude Code / Kimi Code layout) out
                    // of it. Strict parsing falls through to the HUD path.
                    #[cfg(target_os = "macos")]
                    if is_quick && grabbed == before && is_terminal {
                        let _ = actions::select_all();
                        let _ = actions::copy_selection();
                        if let Ok(screen) = app.clipboard().read_text() {
                            if Some(&screen) != before.as_ref() {
                                if let Some(input) = scrape::parse_tui_input(&screen) {
                                    grabbed = Some(input);
                                }
                            }
                        }
                    }

                    let text = grabbed
                        .map(|t| sanitize_grabbed(&t))
                        .filter(|t| !t.is_empty());

                    if !is_quick {
                        show_hud_window(app, text.as_deref());
                        return;
                    }

                    // Quick replace: hand off to the toast window, which
                    // polishes silently and pastes the result back in place.
                    match text {
                        Some(t) if t.chars().count() > 3000 => {
                            // Probably grabbed an entire page; too risky to
                            // auto-replace, review it in the HUD instead.
                            show_hud_window(app, Some(&t));
                        }
                        Some(t) => {
                            show_toast_window(app);
                            let _ = app.emit_to("toast", "quick-polish", t);
                        }
                        None => {
                            show_toast_window(app);
                            let _ = app.emit_to("toast", "quick-empty", ());
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // Simulated keystrokes (Cmd+C / Cmd+V) require Accessibility
            // permission; ask for it up front instead of failing silently.
            #[cfg(target_os = "macos")]
            let _ = actions::accessibility::is_trusted(true);

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

            // Register global shortcuts: Alt+Shift+E opens the HUD workshop,
            // Alt+Shift+R polishes and replaces in place without the HUD.
            let shortcut: Shortcut = "alt+shift+e".parse().expect("Failed to parse shortcut");
            let _ = app.global_shortcut().register(shortcut);
            let quick_shortcut: Shortcut = "alt+shift+r".parse().expect("Failed to parse shortcut");
            let _ = app.global_shortcut().register(quick_shortcut);

            // Pre-create the hidden toast window used by quick replace.
            // `focused: false` keeps keyboard focus in the source app.
            let _toast = WebviewWindowBuilder::new(
                app,
                "toast",
                WebviewUrl::App("index.html?view=toast".into()),
            )
            .title("Typo")
            .inner_size(240.0, 76.0)
            .resizable(false)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false)
            .visible(false)
            .build()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hide_window,
            show_window,
            start_dragging,
            replace_selection,
            present_toast,
            notes::get_default_notes_dir,
            notes::append_note_entries,
            notes::read_notebook,
            notes::write_notebook
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
