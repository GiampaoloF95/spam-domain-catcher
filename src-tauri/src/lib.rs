mod auth;
mod domain;
mod outlook;

#[tauri::command]
async fn greet(name: String) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn login(window: tauri::Window, client_id: String) -> Result<String, String> {
    auth::perform_login(window, client_id).await
}

#[tauri::command]
async fn get_spam_domains(token: String) -> Result<Vec<outlook::SpamEmail>, String> {
    // Fetch detailed emails via Graph API
    let emails = outlook::fetch_spam_emails(&token).await?;
    Ok(emails)
}

#[tauri::command]
async fn get_user_info(token: String) -> Result<outlook::UserProfile, String> {
    outlook::fetch_user_profile(&token).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            login,
            get_spam_domains,
            get_user_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
