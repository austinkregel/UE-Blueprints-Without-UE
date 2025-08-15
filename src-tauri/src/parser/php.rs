use super::{LanguageAdapter, NormalizedFile, SymbolItem, to_range};
use tree_sitter::{Language, Tree};

use tree_sitter_php as _;
extern "C" { fn tree_sitter_php() -> Language; }

pub struct PhpAdapter;
impl PhpAdapter { pub fn new() -> Box<Self> { Box::new(Self) } }

impl LanguageAdapter for PhpAdapter {
  fn id(&self) -> &'static str { "php" }
  fn language(&self) -> Language { unsafe { tree_sitter_php() } }
  fn file_extensions(&self) -> &'static [&'static str] { &["php", "phtml"] }

  fn normalize(&self, file_path: &str, source: &str, tree: &Tree) -> NormalizedFile {
    let mut nf = NormalizedFile { file_path: file_path.to_string(), language: self.id().to_string(), symbols: vec![], warnings: vec![] };
    let root = tree.root_node();

    fn walk(nf: &mut NormalizedFile, source: &str, node: tree_sitter::Node) {
      let kind = node.kind();
      match kind {
        "namespace_definition" => {
          if let Some(name) = node.child_by_field_name("name") {
            let nm = name.utf8_text(source.as_bytes()).unwrap_or("").to_string();
            nf.symbols.push(SymbolItem { name: nm, kind: "namespace".into(), fqn: None, range: Some(super::to_range(node)) });
          }
        }
        "class_declaration" | "interface_declaration" | "trait_declaration" => {
          if let Some(name) = node.child_by_field_name("name") {
            let nm = name.utf8_text(source.as_bytes()).unwrap_or("").to_string();
            let kind = if kind == "class_declaration" { "class" } else if kind == "interface_declaration" { "interface" } else { "trait" };
            nf.symbols.push(SymbolItem { name: nm, kind: kind.into(), fqn: None, range: Some(to_range(node)) });
          }
        }
        "function_definition" => {
          if let Some(name) = node.child_by_field_name("name") {
            let nm = name.utf8_text(source.as_bytes()).unwrap_or("").to_string();
            nf.symbols.push(SymbolItem { name: nm, kind: "function".into(), fqn: None, range: Some(to_range(node)) });
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
