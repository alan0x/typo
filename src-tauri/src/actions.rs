use std::thread;
use std::time::Duration;

#[cfg(target_os = "windows")]
mod win_impl {
    use super::*;

    #[link(name = "user32")]
    unsafe extern "system" {
        fn keybd_event(b_vk: u8, b_scan: u8, dw_flags: u32, dw_extra_info: usize);
        fn GetCursorPos(lp_point: *mut POINT) -> i32;
    }

    #[repr(C)]
    struct POINT {
        x: i32,
        y: i32,
    }

    const KEYEVENTF_KEYUP: u32 = 0x0002;
    const VK_SHIFT: u8 = 0x10;
    const VK_CONTROL: u8 = 0x11;
    const VK_MENU: u8 = 0x12; // Alt key
    const VK_C: u8 = 0x43;
    const VK_V: u8 = 0x56;

    pub fn copy_selection() -> Result<(), String> {
        unsafe {
            // 1. Release modifier keys that might still be physically held down (Alt, Shift, Ctrl)
            keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0);
            keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, 0);
            keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
            thread::sleep(Duration::from_millis(30));

            // 2. Press Ctrl + C
            keybd_event(VK_CONTROL, 0, 0, 0);
            thread::sleep(Duration::from_millis(15));
            keybd_event(VK_C, 0, 0, 0);
            thread::sleep(Duration::from_millis(25));
            keybd_event(VK_C, 0, KEYEVENTF_KEYUP, 0);
            keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
        }

        // Wait for system clipboard to receive the copied text
        thread::sleep(Duration::from_millis(100));
        Ok(())
    }

    pub fn paste_selection() -> Result<(), String> {
        // Wait for the previous window to regain OS focus after Typo hides
        thread::sleep(Duration::from_millis(120));

        unsafe {
            // Ensure modifiers are released
            keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0);
            keybd_event(VK_SHIFT, 0, KEYEVENTF_KEYUP, 0);
            thread::sleep(Duration::from_millis(15));

            // Press Ctrl + V
            keybd_event(VK_CONTROL, 0, 0, 0);
            thread::sleep(Duration::from_millis(15));
            keybd_event(VK_V, 0, 0, 0);
            thread::sleep(Duration::from_millis(25));
            keybd_event(VK_V, 0, KEYEVENTF_KEYUP, 0);
            keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, 0);
        }
        Ok(())
    }

    pub fn get_cursor_location() -> Option<(i32, i32)> {
        let mut pt = POINT { x: 0, y: 0 };
        unsafe {
            if GetCursorPos(&mut pt) != 0 {
                Some((pt.x, pt.y))
            } else {
                None
            }
        }
    }
}

#[cfg(not(target_os = "windows"))]
mod unix_impl {
    use super::*;
    use enigo::{Direction, Enigo, Key, Keyboard, Mouse, Settings};

    pub fn copy_selection() -> Result<(), String> {
        let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("{:?}", e))?;
        let modifier = Key::Meta;

        enigo.key(modifier, Direction::Press).map_err(|e| format!("{:?}", e))?;
        enigo.key(Key::Unicode('c'), Direction::Click).map_err(|e| format!("{:?}", e))?;
        enigo.key(modifier, Direction::Release).map_err(|e| format!("{:?}", e))?;

        thread::sleep(Duration::from_millis(100));
        Ok(())
    }

    pub fn paste_selection() -> Result<(), String> {
        thread::sleep(Duration::from_millis(120));
        let mut enigo = Enigo::new(&Settings::default()).map_err(|e| format!("{:?}", e))?;
        let modifier = Key::Meta;

        enigo.key(modifier, Direction::Press).map_err(|e| format!("{:?}", e))?;
        enigo.key(Key::Unicode('v'), Direction::Click).map_err(|e| format!("{:?}", e))?;
        enigo.key(modifier, Direction::Release).map_err(|e| format!("{:?}", e))?;

        Ok(())
    }

    pub fn get_cursor_location() -> Option<(i32, i32)> {
        let enigo = Enigo::new(&Settings::default()).ok()?;
        enigo.location().ok()
    }
}

pub fn copy_selection() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    return win_impl::copy_selection();

    #[cfg(not(target_os = "windows"))]
    return unix_impl::copy_selection();
}

pub fn paste_selection() -> Result<(), String> {
    #[cfg(target_os = "windows")]
    return win_impl::paste_selection();

    #[cfg(not(target_os = "windows"))]
    return unix_impl::paste_selection();
}

pub fn get_cursor_location() -> Option<(i32, i32)> {
    #[cfg(target_os = "windows")]
    return win_impl::get_cursor_location();

    #[cfg(not(target_os = "windows"))]
    return unix_impl::get_cursor_location();
}
