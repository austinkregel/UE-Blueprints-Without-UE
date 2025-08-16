use super::{LanguageAdapter, NormalizedFile};
use tree_sitter::Language;

use tree_sitter_php as _;
extern "C" { fn tree_sitter_php() -> Language; }

pub struct PhpAdapter;
impl PhpAdapter { pub fn new() -> Box<Self> { Box::new(Self) } }

impl LanguageAdapter for PhpAdapter {
  fn id(&self) -> &'static str { "php" }
  fn language(&self) -> Language { unsafe { tree_sitter_php() } }
  fn file_extensions(&self) -> &'static [&'static str] { &["php", "phtml"] }

  fn normalize(&self, file_path: &str, source: &str, tree: &tree_sitter::Tree) -> NormalizedFile {
    super::generic::normalize_generic(self.id(), file_path, source, tree)
  }
}
