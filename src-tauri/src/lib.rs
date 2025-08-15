// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Emitter;
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::thread;

mod parser;
use once_cell::sync::Lazy;
use parser::{Registry, LanguageAdapter, NormalizedFile, parse_with_adapter};
use parser::php::PhpAdapter;
use parser::javascript::JavascriptAdapter;
use parser::rust_lang::RustAdapter;

static REGISTRY: Lazy<Registry> = Lazy::new(|| {
    let mut r = Registry::new();
    r.register(PhpAdapter::new());
    r.register(JavascriptAdapter::new());
    r.register(RustAdapter::new());
    r
});

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Serialize)]
struct DirEntryInfo {
    name: String,
    path: String,
    is_dir: bool,
}

#[tauri::command]
fn list_dir(path: String) -> Result<Vec<DirEntryInfo>, String> {
    let p = PathBuf::from(&path);
    let mut out: Vec<DirEntryInfo> = Vec::new();
    let rd = fs::read_dir(&p).map_err(|e| format!("read_dir failed: {}", e))?;
    for entry in rd {
        let entry = entry.map_err(|e| format!("entry error: {}", e))?;
        let meta = entry.metadata().map_err(|e| format!("metadata error: {}", e))?;
        let ep = entry.path();
        let name = entry
            .file_name()
            .to_string_lossy()
            .to_string();
        out.push(DirEntryInfo {
            name,
            path: ep.to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
        });
    }
    // sort dirs first, then files, then by name
    out.sort_by(|a, b| match b.is_dir.cmp(&a.is_dir) {
        std::cmp::Ordering::Equal => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        other => other,
    });
    Ok(out)
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("read_to_string failed: {}", e))
}

fn walk_language_files(root: &Path, exts: &[&str], files: &mut Vec<String>) -> std::io::Result<()> {
    if root.is_dir() {
        for entry in fs::read_dir(root)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                walk_language_files(&path, exts, files)?;
            } else if let Some(ext) = path.extension() {
                let ext = ext.to_string_lossy().to_lowercase();
                if exts.iter().any(|e| *e == ext) {
                    files.push(path.to_string_lossy().to_string());
                }
            }
        }
    }
    Ok(())
}

#[tauri::command]
fn enumerate_language_files(lang: String, root_path: String) -> Result<Vec<String>, String> {
    let adapter = REGISTRY.get(&lang).ok_or_else(|| format!("Unknown language: {}", lang))?;
    let root = PathBuf::from(&root_path);
    let mut files: Vec<String> = Vec::new();
    let exts: Vec<&str> = adapter.file_extensions().iter().map(|s| *s).collect();
    walk_language_files(&root, &exts, &mut files).map_err(|e| format!("walk failed: {}", e))?;
    Ok(files)
}

#[tauri::command]
fn parse_file(lang: String, path: String) -> Result<NormalizedFile, String> {
    let adapter = REGISTRY.get(&lang).ok_or_else(|| format!("Unknown language: {}", lang))?;
    let source = fs::read_to_string(&path).map_err(|e| format!("read_to_string failed: {}", e))?;
    parse_with_adapter(adapter.as_ref(), &path, &source)
}

#[tauri::command]
fn parse_text(lang: String, text: String, path_hint: Option<String>) -> Result<NormalizedFile, String> {
    let adapter = REGISTRY.get(&lang).ok_or_else(|| format!("Unknown language: {}", lang))?;
    let hint = path_hint.unwrap_or_else(|| "<memory>".to_string());
    parse_with_adapter(adapter.as_ref(), &hint, &text)
}

// --- Backwards-compatible PHP wrappers (used by current UI) ---
#[tauri::command]
fn enumerate_php_files(root_path: String) -> Result<Vec<String>, String> {
    enumerate_language_files("php".to_string(), root_path)
}

#[derive(Serialize, Clone)]
struct PhpScanEvent {
    phase: &'static str,
    root: String,
    path: Option<String>,
    processed: usize,
    total: Option<usize>,
    message: Option<String>,
}

fn count_ext_files(root: &Path, exts: &[&str]) -> std::io::Result<usize> {
    let mut total = 0usize;
    if root.is_dir() {
        for entry in fs::read_dir(root)? {
            let entry = entry?;
            let path = entry.path();
            if path.is_dir() {
                total += count_ext_files(&path, exts)?;
            } else if let Some(ext) = path.extension() {
                let ext = ext.to_string_lossy().to_lowercase();
                if exts.iter().any(|e| *e == ext) { total += 1; }
            }
        }
    }
    Ok(total)
}

#[tauri::command]
fn start_php_scan(app: tauri::AppHandle, root_path: String) -> Result<(), String> {
    let app_clone = app.clone();
    thread::spawn(move || {
        let root = PathBuf::from(&root_path);
        let adapter = REGISTRY.get("php").unwrap();
        let exts: Vec<&str> = adapter.file_extensions().iter().map(|s| *s).collect();
        // Count total
        let total = count_ext_files(&root, &exts).unwrap_or(0);
        let _ = app_clone.emit(
            "php_scan",
            PhpScanEvent { phase: "start", root: root_path.clone(), path: None, processed: 0, total: Some(total), message: None },
        );
        // Walk and emit per file
        let mut processed: usize = 0;
        fn walk_and_emit(app: &tauri::AppHandle, root_path: &str, p: &Path, processed: &mut usize, exts: &[&str]) -> std::io::Result<()> {
            if p.is_dir() {
                for entry in fs::read_dir(p)? {
                    let entry = entry?;
                    let path = entry.path();
                    walk_and_emit(app, root_path, &path, processed, exts)?;
                }
            } else if let Some(ext) = p.extension() {
                let ext = ext.to_string_lossy().to_lowercase();
                if exts.iter().any(|e| *e == ext) {
                    *processed += 1;
                    let _ = app.emit(
                        "php_scan",
                        PhpScanEvent { phase: "file", root: root_path.to_string(), path: Some(p.to_string_lossy().to_string()), processed: *processed, total: None, message: None }
                    );
                }
            }
            Ok(())
        }
        if let Err(e) = walk_and_emit(&app_clone, &root_path, &root, &mut processed, &exts) {
            let _ = app_clone.emit(
                "php_scan",
                PhpScanEvent { phase: "error", root: root_path.clone(), path: None, processed, total: None, message: Some(e.to_string()) },
            );
        }
        let _ = app_clone.emit(
            "php_scan",
            PhpScanEvent { phase: "done", root: root_path, path: None, processed, total: None, message: None },
        );
    });
    Ok(())
}

#[derive(Serialize, Clone, Default)]
struct PhpClassLikeCompat {
    name: String,
    fqn: String,
    namespace: String,
    #[serde(skip_serializing_if = "Option::is_none")] extends: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] implements: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")] flags: Option<String>,
}
#[derive(Serialize, Clone, Default)]
struct PhpFunctionLikeCompat { name: String, fqn: String, namespace: String }
#[derive(Serialize, Clone, Default)]
struct PhpFileSymbolsCompat {
    #[serde(rename = "filePath")] file_path: String,
    namespace: String,
    uses: std::collections::HashMap<String, String>,
    classes: Vec<PhpClassLikeCompat>,
    interfaces: Vec<PhpClassLikeCompat>,
    traits: Vec<PhpClassLikeCompat>,
    functions: Vec<PhpFunctionLikeCompat>,
}

// Temporary compatibility wrapper (UI can migrate to parse_file)
#[tauri::command]
fn parse_php_file_to_symbols(path: String) -> Result<PhpFileSymbolsCompat, String> {
    let nf = parse_file("php".to_string(), path.clone())?;
    let mut out = PhpFileSymbolsCompat { file_path: nf.file_path.clone(), namespace: String::new(), uses: Default::default(), classes: vec![], interfaces: vec![], traits: vec![], functions: vec![] };
    for s in nf.symbols {
        let base = s.fqn.unwrap_or_else(|| s.name.clone());
        let fqn = if base.starts_with('\\') { base } else { format!("\\{}", base) };
        match s.kind.as_str() {
            "class" => out.classes.push(PhpClassLikeCompat { name: s.name, fqn, namespace: String::new(), extends: None, implements: None, flags: None }),
            "interface" => out.interfaces.push(PhpClassLikeCompat { name: s.name, fqn, namespace: String::new(), extends: None, implements: None, flags: None }),
            "trait" => out.traits.push(PhpClassLikeCompat { name: s.name, fqn, namespace: String::new(), extends: None, implements: None, flags: None }),
            "function" => out.functions.push(PhpFunctionLikeCompat { name: s.name, fqn, namespace: String::new() }),
            _ => {}
        }
    }
    Ok(out)
}

#[derive(Serialize)]
struct LanguageInfo { id: String, exts: Vec<String> }

#[tauri::command]
fn list_languages() -> Vec<LanguageInfo> {
    // Collect from registry; stable sort by id for deterministic UI
    let mut out: Vec<LanguageInfo> = REGISTRY
        .enumerate()
        .into_iter()
        .filter_map(|id| REGISTRY.get(id).map(|ad| LanguageInfo { id: id.to_string(), exts: ad.file_extensions().iter().map(|s| s.to_string()).collect() }))
        .collect();
    out.sort_by(|a, b| a.id.cmp(&b.id));
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn languages_list_includes_registered() {
        let langs = list_languages();
        let ids: Vec<String> = langs.into_iter().map(|l| l.id).collect();
        assert!(ids.contains(&"php".to_string()));
        assert!(ids.contains(&"javascript".to_string()));
        assert!(ids.contains(&"rust".to_string()));
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            list_dir,
            read_text_file,
            enumerate_language_files,
            parse_file,
            parse_text,
            // PHP compatibility (existing UI)
            enumerate_php_files,
            start_php_scan,
            parse_php_file_to_symbols,
            // New: languages discovery for UI
            list_languages
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
