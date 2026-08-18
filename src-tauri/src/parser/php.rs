use super::{LanguageAdapter, NormalizedFile};
use tree_sitter::Language;

use tree_sitter_php as _;
extern "C" {
    fn tree_sitter_php() -> Language;
}

pub struct PhpAdapter;
impl PhpAdapter {
    pub fn new() -> Box<Self> {
        Box::new(Self)
    }
}

impl LanguageAdapter for PhpAdapter {
    fn id(&self) -> &'static str {
        "php"
    }
    fn language(&self) -> Language {
        unsafe { tree_sitter_php() }
    }
    fn file_extensions(&self) -> &'static [&'static str] {
        &["php", "phtml"]
    }

    fn normalize(&self, file_path: &str, source: &str, tree: &tree_sitter::Tree) -> NormalizedFile {
        // First, use the generic normalizer to extract symbols and references
        let mut nf = super::generic::normalize_generic(self.id(), file_path, source, tree);

        // PHP has two namespace forms: bracketed and unbracketed (semicolon).
        // For unbracketed, the namespace applies to the remainder of the file, but
        // generic traversal won't keep it on siblings. Patch FQNs accordingly.
        let root = tree.root_node();
        let mut default_ns: Option<String> = None;
        let mut i = 0;
        while i < root.child_count() {
            if let Some(ch) = root.child(i) {
                let k = ch.kind().to_lowercase();
                if k.contains("namespace") {
                    // Text check: if it doesn't contain '{', it's the unbracketed form
                    let txt = ch.utf8_text(source.as_bytes()).unwrap_or("");
                    if !txt.contains('{') {
                        // Extract the namespace name
                        let mut ns_name = if let Some(nm_node) = ch.child_by_field_name("name") {
                            nm_node
                                .utf8_text(source.as_bytes())
                                .unwrap_or("")
                                .to_string()
                        } else {
                            // Fallback: look for a child whose kind ends with "name"
                            let mut j = 0;
                            let mut name: Option<String> = None;
                            while j < ch.child_count() {
                                if let Some(nn) = ch.child(j) {
                                    let ck = nn.kind();
                                    if ck.ends_with("name") {
                                        name = Some(
                                            nn.utf8_text(source.as_bytes())
                                                .unwrap_or("")
                                                .to_string(),
                                        );
                                        break;
                                    }
                                }
                                j += 1;
                            }
                            name.unwrap_or_default()
                        };
                        // Normalize backslashes: collapse multiple and trim leading/trailing
                        while ns_name.contains("\\\\") {
                            ns_name = ns_name.replace("\\\\", "\\");
                        }
                        ns_name = ns_name.trim_matches('\\').to_string();
                        if !ns_name.is_empty() {
                            default_ns = Some(ns_name);
                        }
                    }
                    break; // Only consider the first namespace declaration at top
                }
            }
            i += 1;
        }

        if let Some(ns) = default_ns {
            for s in nf.symbols.iter_mut() {
                match s.kind.as_str() {
                    "class" | "interface" | "trait" | "enum" | "function" | "type_alias"
                    | "union" => {
                        // If generic set FQN to just the bare name (no namespace), or left it empty, prefix with the namespace
                        let bare = s.name.clone();
                        let should_patch = match s.fqn.as_deref() {
                            None => true,
                            Some(f) if f == bare => true,
                            Some(f) if f.contains("::") => false,
                            Some(f) if f.contains('\\') => false,
                            Some(_) => true,
                        };
                        if should_patch {
                            s.fqn = Some(format!("{}\\{}", ns, s.name));
                        }
                    }
                    _ => {}
                }
            }
        }

        // Convert any generic "::" FQNs into PHP-style backslashes
        for s in nf.symbols.iter_mut() {
            if let Some(f) = &mut s.fqn {
                if f.contains("::") {
                    *f = f.replace("::", "\\");
                }
                // Ensure we don't have duplicate backslashes sequences
                while f.contains("\\\\") {
                    *f = f.replace("\\\\", "\\");
                }
                // Trim leading/trailing backslashes
                *f = f.trim_matches('\\').to_string();
            }
        }

        // declare(strict_types=1); is a statement that should be ignored for symbol extraction.
        nf
    }
}
