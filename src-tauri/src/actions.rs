use enigo::{Direction, Enigo, Key, Keyboard, Mouse, Settings};
use std::thread;
use std::time::Duration;

pub fn copy_selection() -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Failed to init enigo: {:?}", e))?;
    
    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;

    enigo.key(modifier, Direction::Press).map_err(|e| format!("{:?}", e))?;
    enigo.key(Key::Unicode('c'), Direction::Click).map_err(|e| format!("{:?}", e))?;
    enigo.key(modifier, Direction::Release).map_err(|e| format!("{:?}", e))?;

    // Short pause to ensure clipboard is updated
    thread::sleep(Duration::from_millis(50));
    Ok(())
}

pub fn paste_selection() -> Result<(), String> {
    let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("Failed to init enigo: {:?}", e))?;
    
    #[cfg(target_os = "macos")]
    let modifier = Key::Meta;
    #[cfg(not(target_os = "macos"))]
    let modifier = Key::Control;

    // Small delay to let the previous window regain focus after Typo hides
    thread::sleep(Duration::from_millis(100));

    enigo.key(modifier, Direction::Press).map_err(|e| format!("{:?}", e))?;
    enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| format!("{:?}", e))?;
    enigo.key(modifier, Direction::Release).map_err(|e| format!("{:?}", e))?;

    Ok(())
}

pub fn get_cursor_location() -> Option<(i32, i32)> {
    let enigo = Enigo::new(&Settings::default()).ok()?;
    enigo.location().ok()
}
