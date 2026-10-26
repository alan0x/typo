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
fn replace_selection(app: tauri::AppHandle, text: String) -> Result<(), String> {
    // 1. Write the polished text to the clipboard
    app.clipboard()
        .write_text(&text)
        .map_err(|e| format!("Clipboard error: {}", e))?;

    // 2. Hide Typo so OS focus returns to the original window (IDE, terminal, browser, etc.)
    hide_app(&app);

    // 3. Wait in a background thread for the previous window to regain focus,
    //    then simulate Ctrl+V / Cmd+V on the main thread. enigo's macOS backend
    //    calls Carbon TIS APIs which assert the main dispatch queue, so doing
    //    the key simulation off the main thread crashes the app.
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(120));
        let _ = app.run_on_main_thread(move || {
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
