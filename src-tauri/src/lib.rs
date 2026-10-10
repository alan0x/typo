pub mod actions;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Emitter, Manager, PhysicalPosition, Position,
};
use tauri_plugin_clipboard_manager::ClipboardExt;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[tauri::command]
fn hide_window(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.hide().map_err(|e| e.to_string())?;
    }
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
fn replace_selection(app: tauri::AppHandle, text: String) -> Result<(), String> {
    // 1. Write the polished text to the clipboard
    app.clipboard()
        .write_text(&text)
        .map_err(|e| format!("Clipboard error: {}", e))?;

    // 2. Hide the Typo window so OS focus returns to the original window (IDE, terminal, browser, etc.)
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }

    // 3. Simulate Ctrl+V / Cmd+V in a background thread
    std::thread::spawn(move || {
        if let Err(e) = actions::paste_selection() {
            eprintln!("Failed to paste selection: {}", e);
        }
    });

    Ok(())
}

fn show_hud_window(app: &tauri::AppHandle, text: Option<&str>) {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        // User pressed global shortcut!
                        // Step 1: try to copy currently selected text
                        let _ = actions::copy_selection();

                        // Step 2: Read clipboard content
                        let text = app.clipboard().read_text().ok();

                        // Step 3: Show HUD window near cursor and emit event
                        show_hud_window(app, text.as_deref());
                    }
                })
                .build(),
        )
        .setup(|app| {
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
