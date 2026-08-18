use super::{LanguageAdapter, NormalizedFile};
use tree_sitter::Language;

// Ensure the crate links its static lib
use tree_sitter_javascript as _;
extern "C" {
    fn tree_sitter_javascript() -> Language;
}

pub struct JavascriptAdapter;
impl JavascriptAdapter {
    pub fn new() -> Box<Self> {
        Box::new(Self)
    }
}

impl LanguageAdapter for JavascriptAdapter {
    fn id(&self) -> &'static str {
        "javascript"
    }
    fn language(&self) -> Language {
        unsafe { tree_sitter_javascript() }
    }
    fn file_extensions(&self) -> &'static [&'static str] {
        &["js", "mjs", "cjs"]
    }

    fn normalize(&self, file_path: &str, source: &str, tree: &tree_sitter::Tree) -> NormalizedFile {
        super::generic::normalize_generic(self.id(), file_path, source, tree)
    }
}
