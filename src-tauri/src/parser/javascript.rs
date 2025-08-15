use super::{LanguageAdapter, NormalizedFile, SymbolItem, to_range};
use tree_sitter::{Language, Tree};

// Ensure the crate links its static lib
use tree_sitter_javascript as _;
extern "C" { fn tree_sitter_javascript() -> Language; }

pub struct JavascriptAdapter;
impl JavascriptAdapter { pub fn new() -> Box<Self> { Box::new(Self) } }

impl LanguageAdapter for JavascriptAdapter {
  fn id(&self) -> &'static str { "javascript" }
  fn language(&self) -> Language { unsafe { tree_sitter_javascript() } }
  fn file_extensions(&self) -> &'static [&'static str] { &["js", "mjs", "cjs"] }

  fn normalize(&self, file_path: &str, source: &str, tree: &Tree) -> NormalizedFile {
    let mut nf = NormalizedFile { file_path: file_path.to_string(), language: self.id().to_string(), symbols: vec![], warnings: vec![] };
    let root = tree.root_node();

    fn name_text(source: &str, node: tree_sitter::Node) -> String {
      node.utf8_text(source.as_bytes()).unwrap_or("").to_string()
    }

    fn walk(nf: &mut NormalizedFile, source: &str, node: tree_sitter::Node) {
      let kind = node.kind();
      match kind {
        "function_declaration" => {
          if let Some(name) = node.child_by_field_name("name") {
            nf.symbols.push(SymbolItem { name: name_text(source, name), kind: "function".into(), fqn: None, range: Some(to_range(node)) });
          }
        }
        "class_declaration" => {
          if let Some(name) = node.child_by_field_name("name") {
            nf.symbols.push(SymbolItem { name: name_text(source, name), kind: "class".into(), fqn: None, range: Some(to_range(node)) });
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

