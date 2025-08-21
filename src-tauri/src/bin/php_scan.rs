use std::{env, fs};

use desktop_app_lib::parser::{parse_with_adapter};
use desktop_app_lib::parser::php::PhpAdapter;
use tree_sitter::{Language, Parser};

use tree_sitter_php as _;
extern "C" { fn tree_sitter_php() -> Language; }

use serde::Serialize;

#[derive(Serialize)]
struct AstPos { row: u32, col: u32 }
#[derive(Serialize)]
struct AstRange { start: AstPos, end: AstPos, start_byte: u32, end_byte: u32 }
#[derive(Serialize)]
struct AstNode {
    kind: String,
    is_named: bool,
    #[serde(skip_serializing_if = "Option::is_none")] field_name: Option<String>,
    range: AstRange,
    #[serde(skip_serializing_if = "Option::is_none")] text: Option<String>,
    children: Vec<AstNode>,
}

fn to_ast_node(node: tree_sitter::Node, source: &str, field_name: Option<&str>) -> AstNode {
    let sp = node.start_position();
    let ep = node.end_position();
    let sb = node.start_byte();
    let eb = node.end_byte();
    let is_leaf = node.child_count() == 0;
    let text = if is_leaf {
        let slice = &source.as_bytes()[sb..eb.min(source.len())];
        let s = std::str::from_utf8(slice).unwrap_or("");
        // Avoid huge blobs; cap to 256 chars
        Some(if s.len() > 256 { format!("{}…", &s[..256]) } else { s.to_string() })
    } else { None };
    let mut children: Vec<AstNode> = Vec::new();
    let mut i = 0; while i < node.child_count() { if let Some(ch) = node.child(i) {
        let fname = node.field_name_for_child(i as u32);
        children.push(to_ast_node(ch, source, fname));
    } i += 1; }
    AstNode {
        kind: node.kind().to_string(),
        is_named: node.is_named(),
        field_name: field_name.map(|s| s.to_string()),
        range: AstRange { start: AstPos { row: sp.row as u32, col: sp.column as u32 }, end: AstPos { row: ep.row as u32, col: ep.column as u32 }, start_byte: sb as u32, end_byte: eb as u32 },
        text,
        children,
    }
}

// Reconstruct code by slicing the original source covered by the node range.
// For the root node, this reproduces the exact original file including whitespace and comments.
fn reprint_from_tree(root: tree_sitter::Node, source: &str) -> String {
    let sb = root.start_byte();
    let eb = root.end_byte().min(source.len());
    source[sb..eb].to_string()
}

fn print_usage() {
    eprintln!("Usage: php_scan [--sexp-only|--json-only|--ast-json|--reprint] <path/to/file.php>");
}

fn main() {
    let mut args: Vec<String> = env::args().collect();
    // remove program name
    if !args.is_empty() { args.remove(0); }

    if args.is_empty() || args.iter().any(|a| a == "--help" || a == "-h") {
        print_usage();
        std::process::exit(1);
    }

    let mut sexp_only = false;
    let mut json_only = false;
    let mut ast_json = false;
    let mut do_reprint = false;

    // simple flags parse
    args.retain(|a| {
        match a.as_str() {
            "--sexp-only" => { sexp_only = true; false },
            "--json-only" => { json_only = true; false },
            "--ast-json" => { ast_json = true; false },
            "--reprint" => { do_reprint = true; false },
            _ => true,
        }
    });

    if args.len() != 1 {
        print_usage();
        std::process::exit(1);
    }

    let path = &args[0];
    let src = match fs::read_to_string(path) {
        Ok(s) => s,
        Err(e) => {
            eprintln!("Failed to read file {}: {}", path, e);
            std::process::exit(2);
        }
    };

    // Build a tree-sitter tree and print S-expression
    let mut parser = Parser::new();
    unsafe {
        let lang = tree_sitter_php();
        parser.set_language(&lang).expect("set_language failed");
    }

    let tree = match parser.parse(&src, None) {
        Some(t) => t,
        None => {
            eprintln!("Parse failed");
            std::process::exit(3);
        }
    };

    if ast_json {
        let ast = to_ast_node(tree.root_node(), &src, None);
        let json = serde_json::to_string_pretty(&ast).unwrap_or_else(|_| "{}".to_string());
        println!("{}", json);
        return;
    }

    if do_reprint {
        let s = reprint_from_tree(tree.root_node(), &src);
        println!("{}", s);
        return;
    }

    if !json_only {
        let sexp = tree.root_node().to_sexp();
        println!("=== Tree-sitter S-Expression ===\n{}\n", sexp);
    }

    if !sexp_only {
        // Use existing normalizer for richer data
        let adapter = PhpAdapter::new();
        match parse_with_adapter(adapter.as_ref(), path, &src) {
            Ok(nf) => {
                let json = serde_json::to_string_pretty(&nf).unwrap_or_else(|_| "{}".to_string());
                println!("=== Normalized JSON ===\n{}", json);
            },
            Err(err) => {
                eprintln!("Normalization error: {}", err);
                std::process::exit(4);
            }
        }
    }
}
