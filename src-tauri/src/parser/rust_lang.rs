use super::{LanguageAdapter, NormalizedFile};
use tree_sitter::Language;

// Ensure the crate links its static lib
use tree_sitter_rust as _;
extern "C" {
    fn tree_sitter_rust() -> Language;
}

pub struct RustAdapter;
impl RustAdapter {
    pub fn new() -> Box<Self> {
        Box::new(Self)
    }
}

impl LanguageAdapter for RustAdapter {
    fn id(&self) -> &'static str {
        "rust"
    }
    fn language(&self) -> Language {
        unsafe { tree_sitter_rust() }
    }
    fn file_extensions(&self) -> &'static [&'static str] {
        &["rs"]
    }

    fn normalize(&self, file_path: &str, source: &str, tree: &tree_sitter::Tree) -> NormalizedFile {
        super::generic::normalize_generic(self.id(), file_path, source, tree)
    }
}
