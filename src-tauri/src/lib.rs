// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::Emitter;
use serde::{Serialize, Deserialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::thread;
use tree_sitter::Parser;

pub mod parser;
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
    let result = parse_with_adapter(adapter.as_ref(), &path, &source)?;
    // Save to JSON file for later reference
    if let Err(e) = save_normalized_file_json(&result, "gen/scanned_code.json") {
        eprintln!("Failed to save scanned code: {}", e);
    }
    Ok(result)
}

#[tauri::command]
fn parse_text(lang: String, text: String, path_hint: Option<String>) -> Result<NormalizedFile, String> {
    let adapter = REGISTRY.get(&lang).ok_or_else(|| format!("Unknown language: {}", lang))?;
    let hint = path_hint.unwrap_or_else(|| "<memory>".to_string());
    let result = parse_with_adapter(adapter.as_ref(), &hint, &text)?;
    // Save to JSON file for later reference
    if let Err(e) = save_normalized_file_json(&result, "gen/scanned_code.json") {
        eprintln!("Failed to save scanned code: {}", e);
    }
    Ok(result)
}

fn save_normalized_file_json(nf: &NormalizedFile, rel_path: &str) -> std::io::Result<()> {
    use std::fs::{self, File};
    use std::io::Write;
    use std::path::Path;
    let base = Path::new(env!("CARGO_MANIFEST_DIR")).join(rel_path);
    if let Some(parent) = base.parent() {
        fs::create_dir_all(parent)?;
    }
    let json = serde_json::to_string_pretty(nf).unwrap();
    let mut file = File::create(base)?;
    file.write_all(json.as_bytes())?;
    Ok(())
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

#[derive(Serialize, Clone, Default)]
struct GraphPortRef { nodeId: String, output: String }
#[derive(Serialize, Clone, Default)]
struct GraphPortDst { nodeId: String, input: String }
#[derive(Serialize, Clone, Default)]
struct GraphConnection { from: GraphPortRef, to: GraphPortDst }

#[derive(Serialize, Clone, Default)]
struct IoItem { name: String, #[serde(skip_serializing_if = "Option::is_none")] r#type: Option<String> }

#[derive(Serialize, Clone, Default)]
struct GraphNode {
    id: String,
    r#type: String,
    #[serde(skip_serializing_if = "Option::is_none")] nodeDefId: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] funcName: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] varName: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] varType: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")] varAction: Option<String>,
    x: i32,
    y: i32,
    #[serde(skip_serializing_if = "Option::is_none")] inputs: Option<Vec<IoItem>>,
    #[serde(skip_serializing_if = "Option::is_none")] outputs: Option<Vec<IoItem>>,
    #[serde(skip_serializing_if = "Option::is_none")] category: Option<String>,
}

#[derive(Serialize, Clone, Default)]
struct GraphResult {
    nodes: Vec<GraphNode>,
    connections: Vec<GraphConnection>,
    warnings: Vec<String>,
}

fn next_id(prefix: &str, counter: &mut i32) -> String {
    *counter += 1; format!("{}-{}", prefix, *counter)
}

#[tauri::command]
fn parse_code_to_graph(lang: String, text: String, _path_hint: Option<String>) -> Result<GraphResult, String> {
    let mut out = GraphResult::default();
    let mut fcnt = 0i32; let mut vcnt = 0i32;
    let spacing_y = 120i32;

    fn pos_for(row: usize, spacing_y: i32) -> (i32, i32) { (100, 100 + (row as i32) * spacing_y) }

    // helpers to push nodes consistently
    fn push_func(nodes: &mut Vec<GraphNode>, id: String, name: &str, x: i32, y: i32, in_names: &[(&str, &str)], out_names: &[(&str, &str)]) {
        nodes.push(GraphNode {
            id,
            r#type: "function".into(),
            nodeDefId: None,
            funcName: Some(name.to_string()),
            varName: None,
            varType: None,
            varAction: None,
            x, y,
            inputs: Some(in_names.iter().map(|(n,t)| IoItem { name: (*n).into(), r#type: Some((*t).into()) }).collect()),
            outputs: Some(out_names.iter().map(|(n,t)| IoItem { name: (*n).into(), r#type: Some((*t).into()) }).collect()),
            category: Some("FUNCTION".into()),
        });
    }
    fn push_var(nodes: &mut Vec<GraphNode>, id: String, name: &str, ty: &str, action: &str, x: i32, y: i32, with_io: bool) {
        nodes.push(GraphNode {
            id,
            r#type: "variable".into(),
            nodeDefId: None,
            funcName: None,
            varName: Some(name.to_string()),
            varType: Some(ty.to_string()),
            varAction: Some(action.to_string()),
            x, y,
            inputs: if with_io && action=="set" { Some(vec![IoItem { name: "value".into(), r#type: Some(ty.into()) }]) } else { Some(vec![]) },
            outputs: if with_io && action=="get" { Some(vec![IoItem { name: "value".into(), r#type: Some(ty.into()) }]) } else { Some(vec![]) },
            category: Some("VARIABLE".into()),
        });
    }

    fn node_output_name(node: &GraphNode) -> String {
        if let Some(outs) = &node.outputs { if !outs.is_empty() { return outs[0].name.clone(); } }
        "value".into()
    }

    match lang.as_str() {
        "php" => {
            // Parse with tree-sitter
            let adapter = REGISTRY.get("php").ok_or_else(|| "PHP adapter not registered".to_string())?;
            let mut parser = Parser::new();
            parser.set_language(&adapter.language()).map_err(|e| format!("set_language failed: {:?}", e))?;
            let tree = parser.parse(&text, None).ok_or_else(|| "parse failed".to_string())?;
            let root = tree.root_node();

            // We walk top-level statements. For each, lower to nodes + connections
            // Return value of expression walker: index into out.nodes for produced node
            fn lower_expr(text: &str, n: tree_sitter::Node, out: &mut GraphResult, fcnt: &mut i32, vcnt: &mut i32, spacing_y: i32) -> Option<usize> {
                let kind = n.kind();
                let (x,y) = pos_for(n.start_position().row, spacing_y);
                match kind {
                    // literals
                    "integer" | "float" | "string" | "encapsed_string" => {
                        let ty = if kind=="float" { "float" } else if kind=="integer" { "int" } else { "string" };
                        let id = next_id("function", fcnt);
                        push_func(&mut out.nodes, id.clone(), "literal", x, y, &[], &[("value", ty)]);
                        return out.nodes.iter().position(|gn| gn.id == id);
                    }
                    // variable read
                    "variable_name" => {
                        // variable_name usually has a child name or text like $foo
                        let name_txt = n.utf8_text(text.as_bytes()).unwrap_or("");
                        let var = name_txt.trim().trim_start_matches('$');
                        let id = next_id("variable", vcnt);
                        push_var(&mut out.nodes, id.clone(), var, "mixed", "get", x, y, true);
                        return out.nodes.iter().position(|gn| gn.id == id);
                    }
                    // function call
                    "function_call_expression" => {
                        // child_by_field_name("function") may hold the name
                        let func_name = if let Some(fn_node) = n.child_by_field_name("function") {
                            fn_node.utf8_text(text.as_bytes()).unwrap_or("").to_string()
                        } else { n.utf8_text(text.as_bytes()).unwrap_or("").split('(').next().unwrap_or("").trim().to_string() };
                        let id = next_id("function", fcnt);
                        // Count args to create input pins
                        let mut arg_nodes: Vec<usize> = vec![];
                        let mut inputs: Vec<(String,String)> = vec![];
                        if let Some(args) = n.child_by_field_name("arguments") { // arg list node
                            let mut i = 0; while i < args.named_child_count() {
                                if let Some(an) = args.named_child(i) {
                                    if let Some(idx) = lower_expr(text, an, out, fcnt, vcnt, spacing_y) { arg_nodes.push(idx); inputs.push((format!("arg{}", arg_nodes.len()), "mixed".into())); }
                                }
                                i += 1;
                            }
                        }
                        let in_spec: Vec<(&str,&str)> = inputs.iter().map(|(n,_)| (n.as_str(), "mixed")).collect();
                        push_func(&mut out.nodes, id.clone(), &func_name, x, y, &in_spec, &[("result","mixed")]);
                        let this_idx = out.nodes.iter().position(|gn| gn.id == id).unwrap();
                        // connect args
                        for (i, arg_idx) in arg_nodes.into_iter().enumerate() {
                            let from = out.nodes[arg_idx].id.clone();
                            let from_out = node_output_name(&out.nodes[arg_idx]);
                            out.connections.push(GraphConnection { from: GraphPortRef { nodeId: from, output: from_out }, to: GraphPortDst { nodeId: out.nodes[this_idx].id.clone(), input: format!("arg{}", i+1) } });
                        }
                        return Some(this_idx);
                    }
                    // binary
                    "binary_expression" => {
                        // lower left/right
                        let left = n.child_by_field_name("left");
                        let right = n.child_by_field_name("right");
                        let mut left_idx = None; let mut right_idx = None;
                        if let Some(l) = left { left_idx = lower_expr(text, l, out, fcnt, vcnt, spacing_y); }
                        if let Some(r) = right { right_idx = lower_expr(text, r, out, fcnt, vcnt, spacing_y); }
                        let id = next_id("function", fcnt);
                        push_func(&mut out.nodes, id.clone(), "binary", x, y, &[("a","mixed"),("b","mixed")], &[("result","mixed")]);
                        let this_idx = out.nodes.iter().position(|gn| gn.id == id).unwrap();
                        if let Some(li) = left_idx { let from = out.nodes[li].id.clone(); let outn = node_output_name(&out.nodes[li]); out.connections.push(GraphConnection { from: GraphPortRef { nodeId: from, output: outn }, to: GraphPortDst { nodeId: out.nodes[this_idx].id.clone(), input: "a".into() } }); }
                        if let Some(ri) = right_idx { let from = out.nodes[ri].id.clone(); let outn = node_output_name(&out.nodes[ri]); out.connections.push(GraphConnection { from: GraphPortRef { nodeId: from, output: outn }, to: GraphPortDst { nodeId: out.nodes[this_idx].id.clone(), input: "b".into() } }); }
                        return Some(this_idx);
                    }
                    _ => {
                        // try children
                        let mut i = 0; while i < n.named_child_count() {
                            if let Some(ch) = n.named_child(i) { if let Some(idx) = lower_expr(text, ch, out, fcnt, vcnt, spacing_y) { return Some(idx); } }
                            i += 1;
                        }
                    }
                }
                None
            }

            fn lower_stmt(text: &str, n: tree_sitter::Node, out: &mut GraphResult, fcnt: &mut i32, vcnt: &mut i32, spacing_y: i32) {
                let kind = n.kind();
                let (x,y) = pos_for(n.start_position().row, spacing_y);
                match kind {
                    "echo_statement" => {
                        // create print node and connect expressions
                        let id = next_id("function", fcnt);
                        push_func(&mut out.nodes, id.clone(), "print", x, y, &[("msg","string")], &[]);
                        let this_idx = out.nodes.iter().position(|gn| gn.id == id).unwrap();
                        // find child expressions of echo
                        let mut i = 0; while i < n.named_child_count() {
                            if let Some(ch) = n.named_child(i) {
                                if let Some(src_idx) = lower_expr(text, ch, out, fcnt, vcnt, spacing_y) {
                                    let from = out.nodes[src_idx].id.clone(); let outn = node_output_name(&out.nodes[src_idx]);
                                    out.connections.push(GraphConnection { from: GraphPortRef { nodeId: from, output: outn }, to: GraphPortDst { nodeId: out.nodes[this_idx].id.clone(), input: "msg".into() } });
                                }
                            }
                            i += 1;
                        }
                    }
                    "expression_statement" => {
                        if let Some(expr) = n.child_by_field_name("expression") { lower_expr(text, expr, out, fcnt, vcnt, spacing_y); }
                    }
                    "return_statement" => {
                        let id = next_id("function", fcnt);
                        push_func(&mut out.nodes, id.clone(), "return", x, y, &[("value","mixed")], &[]);
                        let this_idx = out.nodes.iter().position(|gn| gn.id == id).unwrap();
                        if let Some(expr) = n.child_by_field_name("value") {
                            if let Some(src_idx) = lower_expr(text, expr, out, fcnt, vcnt, spacing_y) {
                                let from = out.nodes[src_idx].id.clone(); let outn = node_output_name(&out.nodes[src_idx]);
                                out.connections.push(GraphConnection { from: GraphPortRef { nodeId: from, output: outn }, to: GraphPortDst { nodeId: out.nodes[this_idx].id.clone(), input: "value".into() } });
                            }
                        }
                    }
                    "assignment_expression" => {
                        // left variable, right expr
                        let var = n.child_by_field_name("left");
                        let rval = n.child_by_field_name("right");
                        let var_name = var.and_then(|vn| vn.utf8_text(text.as_bytes()).ok()).unwrap_or("").trim().trim_start_matches('$').to_string();
                        let id = next_id("variable", vcnt);
                        push_var(&mut out.nodes, id.clone(), &var_name, "mixed", "set", x, y, true);
                        let this_idx = out.nodes.iter().position(|gn| gn.id == id).unwrap();
                        if let Some(rv) = rval { if let Some(src_idx) = lower_expr(text, rv, out, fcnt, vcnt, spacing_y) {
                            let from = out.nodes[src_idx].id.clone(); let outn = node_output_name(&out.nodes[src_idx]);
                            out.connections.push(GraphConnection { from: GraphPortRef { nodeId: from, output: outn }, to: GraphPortDst { nodeId: out.nodes[this_idx].id.clone(), input: "value".into() } });
                        }}
                    }
                    // ignore directives and namespaces
                    "declare_directive" | "declare_statement" | "namespace_definition" | "namespace_use_declaration" => {}
                    _ => {
                        // attempt to lower nested blocks
                        let mut i = 0; while i < n.named_child_count() { if let Some(ch) = n.named_child(i) { lower_stmt(text, ch, out, fcnt, vcnt, spacing_y); } i += 1; }
                    }
                }
            }

            // Iterate top-level children under program node
            let mut i = 0; while i < root.named_child_count() {
                if let Some(ch) = root.named_child(i) { lower_stmt(&text, ch, &mut out, &mut fcnt, &mut vcnt, spacing_y); }
                i += 1;
            }

            if out.nodes.is_empty() {
                out.warnings.push("No statements lowered from PHP AST".into());
            }
            Ok(out)
        }
        _ => Err(format!("Graph lowering not implemented for language: {}", lang))
    }
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
            list_dir,
            read_text_file,
            enumerate_language_files,
            parse_file,
            parse_text,
            enumerate_php_files,
            start_php_scan,
            parse_php_file_to_symbols,
            list_languages,
            parse_code_to_graph
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
