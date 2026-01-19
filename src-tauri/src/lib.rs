use std::env;

/// Get the username/granteeId for license checking
/// In a real app, this could come from OS user, stored credentials, etc.
#[tauri::command]
fn get_username() -> String {
    // First try environment variable
    if let Ok(username) = env::var("DEMO_USERNAME") {
        return username;
    }
    
    // Fallback to system username
    if let Ok(user) = env::var("USER") {
        return user;
    }
    
    // Windows fallback
    if let Ok(user) = env::var("USERNAME") {
        return user;
    }
    
    // Default
    "demo-user".to_string()
}

/// Get system information
#[tauri::command]
fn get_system_info() -> serde_json::Value {
    serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "version": env!("CARGO_PKG_VERSION")
    })
}

/// Demonstrate native capability - get current working directory
#[tauri::command]
fn get_cwd() -> Result<String, String> {
    env::current_dir()
        .map(|p| p.display().to_string())
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_username,
            get_system_info,
            get_cwd
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
