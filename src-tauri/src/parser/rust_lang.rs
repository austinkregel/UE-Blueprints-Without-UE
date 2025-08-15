use super::{LanguageAdapter, NormalizedFile, SymbolItem, to_range};
use tree_sitter::{Language, Tree};

// Ensure the crate links its static lib
use tree_sitter_rust as _;
extern "C" { fn tree_sitter_rust() -> Language; }

pub struct RustAdapter;
impl RustAdapter { pub fn new() -> Box<Self> { Box::new(Self) } }

impl LanguageAdapter for RustAdapter {
  fn id(&self) -> &'static str { "rust" }
  fn language(&self) -> Language { unsafe { tree_sitter_rust() } }
  fn file_extensions(&self) -> &'static [&'static str] { &["rs"] }

  fn normalize(&self, file_path: &str, source: &str, tree: &Tree) -> NormalizedFile {
    let mut nf = NormalizedFile { file_path: file_path.to_string(), language: self.id().to_string(), symbols: vec![], warnings: vec![] };
    let root = tree.root_node();

    fn txt(src: &str, n: tree_sitter::Node) -> String { n.utf8_text(src.as_bytes()).unwrap_or("").to_string() }

    fn walk(nf: &mut NormalizedFile, source: &str, node: tree_sitter::Node) {
      let kind = node.kind();
      match kind {
        "function_item" => {
          if let Some(name) = node.child_by_field_name("name") {
            nf.symbols.push(SymbolItem { name: txt(source, name), kind: "function".into(), fqn: None, range: Some(to_range(node)) });
          }
        }
        "struct_item" => {
          if let Some(name) = node.child_by_field_name("name") {
            nf.symbols.push(SymbolItem { name: txt(source, name), kind: "class".into(), fqn: None, range: Some(to_range(node)) });
          }
        }
        "enum_item" => {
          if let Some(name) = node.child_by_field_name("name") {
            nf.symbols.push(SymbolItem { name: txt(source, name), kind: "enum".into(), fqn: None, range: Some(to_range(node)) });
          }
        }
        "trait_item" => {
          if let Some(name) = node.child_by_field_name("name") {
            nf.symbols.push(SymbolItem { name: txt(source, name), kind: "trait".into(), fqn: None, range: Some(to_range(node)) });
          }
        }
        _ => {}
      }
      for i in 0..node.child_count() { if let Some(ch) = node.child(i) { walk(nf, source, ch); } }
    }

    walk(&mut nf, source, root);
    nf
  }
}

