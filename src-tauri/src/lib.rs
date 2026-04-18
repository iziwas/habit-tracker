// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Manager;
use std::fs;
use std::path::PathBuf;

#[tauri::command]
fn save_data(app_handle: tauri::AppHandle, data: String) -> Result<(), String> {
    let path = get_data_path(&app_handle);

    // Crée le répertoire s'il n'existe pas
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    fs::write(path, data).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_data(app_handle: tauri::AppHandle) -> Result<String, String> {
    let path = get_data_path(&app_handle);
    if path.exists() {
        fs::read_to_string(path).map_err(|e| e.to_string())
    } else {
        Ok(String::from("{}"))
    }
}

fn get_data_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_data_dir()
        .unwrap()
        .join("habits.json")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    /* Pour afficher dev-tools
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(debug_assertions)]
            {
                let window = app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![save_data, load_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
     */


    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![save_data, load_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
