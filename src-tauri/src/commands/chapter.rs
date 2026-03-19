use crate::models::*;
use crate::AppState;
use tauri::State;

#[tauri::command]
pub fn list_chapters(state: State<AppState>, novel_id: String) -> Result<Vec<ChapterMeta>, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.list_chapter_metas(&novel_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_chapter(state: State<AppState>, chapter_id: i64) -> Result<Chapter, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.load_chapter(chapter_id).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_chapter_content(state: State<AppState>, chapter_id: i64) -> Result<String, String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.load_chapter_content(chapter_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_chapter(state: State<AppState>, chapter_id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let chapter = db.load_chapter(chapter_id).map_err(|e| e.to_string())?;
    db.delete_chapter(chapter_id).map_err(|e| e.to_string())?;
    db.clear_book_outline(&chapter.novel_id)
        .map_err(|e| e.to_string())?;
    db.clear_outline_cache(&chapter.novel_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_chapters(state: State<AppState>, chapter_ids: Vec<i64>) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let novel_ids = chapter_ids
        .iter()
        .filter_map(|id| db.load_chapter(*id).ok().map(|chapter| chapter.novel_id))
        .collect::<std::collections::HashSet<_>>();
    db.delete_chapters(&chapter_ids).map_err(|e| e.to_string())?;
    for novel_id in novel_ids {
        db.clear_book_outline(&novel_id)
            .map_err(|e| e.to_string())?;
        db.clear_outline_cache(&novel_id)
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn clear_chapter_analysis(state: State<AppState>, chapter_id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    db.clear_chapter_analysis(chapter_id)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn clear_chapter_outline(state: State<AppState>, chapter_id: i64) -> Result<(), String> {
    let db = state.db.lock().map_err(|e| e.to_string())?;
    let chapter = db.load_chapter(chapter_id).map_err(|e| e.to_string())?;
    db.clear_chapter_outline(chapter_id)
        .map_err(|e| e.to_string())?;
    db.clear_book_outline(&chapter.novel_id)
        .map_err(|e| e.to_string())?;
    db.clear_outline_cache(&chapter.novel_id)
        .map_err(|e| e.to_string())
}
