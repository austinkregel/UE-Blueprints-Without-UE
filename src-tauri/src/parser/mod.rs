pub mod php;
pub mod javascript;
pub mod rust_lang;

use serde::Serialize;
use std::collections::HashMap;
use tree_sitter::{Language, Parser, Tree};

#[derive(Debug, Clone, Serialize, Default)]
pub struct Position { pub row: u32, pub col: u32 }
#[derive(Debug, Clone, Serialize, Default)]
pub struct Range { pub start: Position, pub end: Position }

#[derive(Debug, Clone, Serialize, Default)]
pub struct SymbolItem {
  pub name: String,
  pub kind: String, // class|interface|trait|function|namespace|other
  pub fqn: Option<String>,
  pub range: Option<Range>,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct NormalizedFile {
  #[serde(rename = "filePath")] pub file_path: String,
  pub language: String,
  pub symbols: Vec<SymbolItem>,
  pub warnings: Vec<String>,
}

pub trait LanguageAdapter: Send + Sync {
  fn id(&self) -> &'static str;
  fn language(&self) -> Language;
  fn file_extensions(&self) -> &'static [&'static str];
  fn normalize(&self, file_path: &str, source: &str, tree: &Tree) -> NormalizedFile;
}

pub struct Registry {
  adapters: HashMap<&'static str, Box<dyn LanguageAdapter>>,
}

impl Registry {
  pub fn new() -> Self { Self { adapters: HashMap::new() } }
  pub fn register(&mut self, adapter: Box<dyn LanguageAdapter>) { self.adapters.insert(adapter.id(), adapter); }
  pub fn get(&self, id: &str) -> Option<&Box<dyn LanguageAdapter>> { self.adapters.get(id) }
  pub fn enumerate(&self) -> Vec<&'static str> { self.adapters.keys().cloned().collect() }
}

pub fn parse_with_adapter(adapter: &dyn LanguageAdapter, file_path: &str, source: &str) -> Result<NormalizedFile, String> {
  let mut parser = Parser::new();
  parser.set_language(&adapter.language()).map_err(|e| format!("set_language failed: {:?}", e))?;
  let tree = parser.parse(source, None).ok_or_else(|| "parse failed".to_string())?;
  let mut nf = adapter.normalize(file_path, source, &tree);
  if nf.file_path.is_empty() { nf.file_path = file_path.to_string(); }
  if nf.language.is_empty() { nf.language = adapter.id().to_string(); }
  Ok(nf)
}

pub fn to_range(node: tree_sitter::Node) -> Range {
  let sp = node.start_position();
  let ep = node.end_position();
  Range {
    start: Position { row: sp.row as u32, col: sp.column as u32 },
    end: Position { row: ep.row as u32, col: ep.column as u32 },
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::parser::php::PhpAdapter;
  use crate::parser::javascript::JavascriptAdapter;
  use crate::parser::rust_lang::RustAdapter;

  #[test]
  fn php_adapter_parses_basic_symbols() {
    let adapter = PhpAdapter::new();
    let src = r#"<?php
    namespace App;
    class Foo {}
    interface Bar {}
    trait Baz {}
    function qux() {}
    "#;
    let nf = parse_with_adapter(adapter.as_ref(), "test.php", src).expect("parse ok");
    assert_eq!(nf.language, "php");
    let kinds: Vec<_> = nf.symbols.iter().map(|s| s.kind.as_str()).collect();
    assert!(kinds.contains(&"class"));
    assert!(kinds.contains(&"interface"));
    assert!(kinds.contains(&"trait"));
    assert!(kinds.contains(&"function"));
    let names: Vec<_> = nf.symbols.iter().map(|s| s.name.as_str()).collect();
    assert!(names.contains(&"Foo"));
    assert!(names.contains(&"Bar"));
    assert!(names.contains(&"Baz"));
    assert!(names.contains(&"qux"));
  }

  #[test]
  fn javascript_adapter_parses_basic_symbols() {
    let adapter = JavascriptAdapter::new();
    let src = r#"
      function foo() {}
      class Bar {}
    "#;
    let nf = parse_with_adapter(adapter.as_ref(), "test.js", src).expect("parse ok");
    assert_eq!(nf.language, "javascript");
    let kinds: Vec<_> = nf.symbols.iter().map(|s| s.kind.as_str()).collect();
    assert!(kinds.contains(&"function"));
    assert!(kinds.contains(&"class"));
    let names: Vec<_> = nf.symbols.iter().map(|s| s.name.as_str()).collect();
    assert!(names.contains(&"foo"));
    assert!(names.contains(&"Bar"));
  }

  #[test]
  fn rust_adapter_parses_basic_symbols() {
    let adapter = RustAdapter::new();
    let src = r#"
      struct Foo;
      enum Bar { A }
      trait Baz {}
      fn qux() {}
    "#;
    let nf = parse_with_adapter(adapter.as_ref(), "test.rs", src).expect("parse ok");
    assert_eq!(nf.language, "rust");
    let kinds: Vec<_> = nf.symbols.iter().map(|s| s.kind.as_str()).collect();
    assert!(kinds.contains(&"class")); // struct mapped to class-kind for UI
    assert!(kinds.contains(&"enum"));
    assert!(kinds.contains(&"trait"));
    assert!(kinds.contains(&"function"));
    let names: Vec<_> = nf.symbols.iter().map(|s| s.name.as_str()).collect();
    assert!(names.contains(&"Foo"));
    assert!(names.contains(&"Bar"));
    assert!(names.contains(&"Baz"));
    assert!(names.contains(&"qux"));
  }

  #[test]
  fn cross_language_similarity_for_class_and_function() {
    // PHP: class Foo, function foo
    let php = PhpAdapter::new();
    let php_src = r#"<?php
      class Foo {}
      function foo() {}
    "#;
    let php_nf = parse_with_adapter(php.as_ref(), "test.php", php_src).expect("php parse ok");

    // JavaScript: class Foo, function foo
    let js = JavascriptAdapter::new();
    let js_src = r#"
      class Foo {}
      function foo() {}
    "#;
    let js_nf = parse_with_adapter(js.as_ref(), "test.js", js_src).expect("js parse ok");

    // Rust: struct Foo, fn foo()
    let rs = RustAdapter::new();
    let rs_src = r#"
      struct Foo;
      fn foo() {}
    "#;
    let rs_nf = parse_with_adapter(rs.as_ref(), "test.rs", rs_src).expect("rust parse ok");

    // Canonicalize: collect class-like and function names
    let canon = |nf: &NormalizedFile| -> (Vec<String>, Vec<String>) {
      let mut classes = vec![];
      let mut funcs = vec![];
      for s in &nf.symbols {
        match s.kind.as_str() {
          "class" => classes.push(s.name.clone()),
          "function" => funcs.push(s.name.clone()),
          _ => {}
        }
      }
      classes.sort(); funcs.sort();
      (classes, funcs)
    };

    let (php_classes, php_funcs) = canon(&php_nf);
    let (js_classes, js_funcs) = canon(&js_nf);
    let (rs_classes, rs_funcs) = canon(&rs_nf);

    // They should each have exactly one class-like (Foo) and one function (foo)
    assert_eq!(php_classes, vec!["Foo".to_string()]);
    assert_eq!(js_classes, vec!["Foo".to_string()]);
    assert_eq!(rs_classes, vec!["Foo".to_string()]);

    assert_eq!(php_funcs, vec!["foo".to_string()]);
    assert_eq!(js_funcs, vec!["foo".to_string()]);
    assert_eq!(rs_funcs, vec!["foo".to_string()]);
  }
}
