use super::{NormalizedFile, SymbolItem, ParamItem, ReferenceItem, to_range};
use tree_sitter::Tree;

fn text_of(src: &str, node: tree_sitter::Node) -> String {
  node.utf8_text(src.as_bytes()).unwrap_or("").to_string()
}

fn has_field(node: tree_sitter::Node, field: &str) -> bool { node.child_by_field_name(field).is_some() }

fn is_type_like(kind: &str) -> Option<&'static str> {
  let k = kind.to_lowercase();
  if k.contains("class") { return Some("class"); }
  if k.contains("interface") { return Some("interface"); }
  if k.contains("trait") { return Some("trait"); }
  if k.contains("enum") { return Some("enum"); }
  if k.contains("struct") { return Some("class"); }
  if k.contains("record") { return Some("class"); }
  if k.contains("impl") { return Some("impl"); }
  if k.contains("type_alias") || k.contains("type-alias") || k == "type_declaration" { return Some("type_alias"); }
  if k.contains("union") { return Some("union"); }
  None
}

fn is_namespace_like(kind: &str) -> bool {
  let k = kind.to_lowercase();
  k.contains("namespace") || k == "module" || k.contains("package")
}

fn is_const_like(kind: &str) -> bool {
  let k = kind.to_lowercase();
  k.contains("const") || k.contains("constant_declaration") || k.contains("constant-declaration") || k == "constant" || k.contains("static")
}

fn is_function_like(node: tree_sitter::Node) -> bool {
  let k = node.kind().to_lowercase();
  if k.contains("function") || k.contains("method") || k.contains("fn") { return true; }
  let has_params = has_field(node, "parameters") || has_field(node, "parameter_list") || has_field(node, "formal_parameters") || has_field(node, "params");
  let has_name = has_field(node, "name");
  has_params && has_name
}

fn node_name(src: &str, node: tree_sitter::Node) -> Option<String> {
  if let Some(n) = node.child_by_field_name("name") { return Some(text_of(src, n)); }
  for f in ["declarator", "variable", "variable_name", "pattern", "identifier"] {
    if let Some(n) = node.child_by_field_name(f) { return Some(text_of(src, n)); }
  }
  let mut i = 0; while i < node.child_count() {
    if let Some(ch) = node.child(i) {
      let ck = ch.kind();
      if ck.ends_with("identifier") || ck == "name" || ck.ends_with("name") { return Some(text_of(src, ch)); }
    }
    i += 1;
  }
  None
}

fn extract_params(src: &str, func_node: tree_sitter::Node) -> Vec<ParamItem> {
  let param_container = func_node.child_by_field_name("parameters")
    .or_else(|| func_node.child_by_field_name("parameter_list"))
    .or_else(|| func_node.child_by_field_name("formal_parameters"))
    .or_else(|| func_node.child_by_field_name("params"));
  let mut params: Vec<ParamItem> = vec![];
  if let Some(list) = param_container {
    let mut i = 0;
    while i < list.named_child_count() {
      if let Some(pn) = list.named_child(i) {
        let pk = pn.kind().to_lowercase();
        let looks_like_param = pk.contains("param") || pk.contains("parameter") || pk.contains("argument") || pk.contains("typed_pattern") || pk.contains("required_parameter");
        if looks_like_param {
          let name = node_name(src, pn).unwrap_or_default();
          let ty = pn.child_by_field_name("type")
            .or_else(|| pn.child_by_field_name("type_annotation"))
            .or_else(|| pn.child_by_field_name("type_hint"))
            .or_else(|| pn.child_by_field_name("type_specifier"))
            .map(|n| text_of(src, n));
          params.push(ParamItem { name, ty });
        }
      }
      i += 1;
    }
  }
  params
}

fn extract_return_type(src: &str, func_node: tree_sitter::Node) -> Option<String> {
  for f in ["return_type", "type", "result_type", "result", "returns", "type_annotation"] {
    if let Some(n) = func_node.child_by_field_name(f) { return Some(text_of(src, n)); }
  }
  if let Some(params) = func_node.child_by_field_name("parameters").or_else(|| func_node.child_by_field_name("parameter_list")).or_else(|| func_node.child_by_field_name("formal_parameters")).or_else(|| func_node.child_by_field_name("params")) {
    let params_end = params.end_byte();
    let mut i = 0; while i < func_node.named_child_count() { if let Some(ch) = func_node.named_child(i) {
      if ch.start_byte() >= params_end && ch.kind().to_lowercase().contains("type") { return Some(text_of(src, ch)); }
    } i += 1; }
  }
  None
}

fn has_export_ancestor(node: tree_sitter::Node) -> bool {
  let mut cur = node;
  for _ in 0..3 {
    if let Some(p) = cur.parent() {
      let k = p.kind();
      if k == "export_statement" || k == "export_declaration" { return true; }
      cur = p;
    } else { break; }
  }
  false
}

fn detect_visibility(src: &str, node: tree_sitter::Node) -> (Option<String>, Option<bool>) {
  let mut i = 0; while i < node.child_count() {
    if let Some(ch) = node.child(i) {
      let k = ch.kind().to_lowercase();
      if k == "pub" || k.contains("public") { return (Some("public".to_string()), Some(true)); }
      if k.contains("export") { return (Some("export".to_string()), Some(true)); }
      if k.contains("protected") { return (Some("protected".to_string()), Some(false)); }
      if k.contains("private") { return (Some("private".to_string()), Some(false)); }
      if k.contains("visibility") || k.contains("modifier") {
        let t = text_of(src, ch);
        let tl = t.to_lowercase();
        if tl.contains("public") || tl.contains("pub") { return (Some("public".to_string()), Some(true)); }
        if tl.contains("protected") { return (Some("protected".to_string()), Some(false)); }
        if tl.contains("private") { return (Some("private".to_string()), Some(false)); }
        if tl.contains("export") { return (Some("export".to_string()), Some(true)); }
        // Also inspect nested children (e.g., Rust's visibility_modifier -> 'pub' / 'pub(crate)')
        let mut j = 0; while j < ch.child_count() {
          if let Some(gch) = ch.child(j) {
            let gk = gch.kind().to_lowercase();
            if gk == "pub" { return (Some("public".to_string()), Some(true)); }
          }
          j += 1;
        }
      }
    }
    i += 1;
  }
  if has_export_ancestor(node) { return (Some("export".to_string()), Some(true)); }
  (None, None)
}

fn has_type_like_ancestor(mut node: tree_sitter::Node, src: &str) -> Option<String> {
  let mut depth = 0;
  while depth < 3 {
    if let Some(p) = node.parent() {
      if let Some(_) = is_type_like(p.kind()) {
        // Prefer the declared name field if present
        if let Some(nm_node) = p.child_by_field_name("name") {
          return Some(text_of(src, nm_node));
        }
        // Fallback to kind if no name
        return Some(p.kind().to_string());
      }
      node = p;
      depth += 1;
    } else { break; }
  }
  None
}

fn is_call_like(kind: &str) -> bool {
  let k = kind.to_lowercase();
  k.contains("call") || k == "call_expression" || k.contains("invocation")
}

fn is_new_like(kind: &str) -> bool {
  let k = kind.to_lowercase();
  k.contains("new") || k.contains("object_creation") || k.contains("object-creation")
}

pub fn normalize_generic(lang_id: &str, file_path: &str, source: &str, tree: &Tree) -> NormalizedFile {
  let mut nf = NormalizedFile { file_path: file_path.to_string(), language: lang_id.to_string(), symbols: vec![], references: Some(vec![]), warnings: vec![] };
  let root = tree.root_node();

  // track namespace and current type owner stack
  let mut ns_stack: Vec<String> = vec![];
  let mut type_owner_stack: Vec<String> = vec![];

  fn walk(nf: &mut NormalizedFile, src: &str, node: tree_sitter::Node, ns_stack: &mut Vec<String>, type_owner_stack: &mut Vec<String>) {
    let kind = node.kind();

    // Namespace push/pop
    if is_namespace_like(kind) {
      if let Some(nm) = node_name(src, node) { ns_stack.push(nm); }
    }

    // Type/Class-like
    let mut pushed_type = false;
    if let Some(mapped) = is_type_like(kind) {
      if let Some(nm) = node_name(src, node) {
        let fqn = if ns_stack.is_empty() { nm.clone() } else { format!("{}::{}", ns_stack.join("::"), nm) };
        nf.symbols.push(SymbolItem {
          name: nm.clone(),
          kind: mapped.to_string(),
          fqn: Some(fqn),
          range: Some(to_range(node)),
          visibility: None,
          is_entry_point: None,
          is_method: None,
          owner_type: None,
          params: None,
          return_type: None,
        });
        type_owner_stack.push(nm);
        pushed_type = true;
      }
    }

    // Const-like
    if is_const_like(kind) {
      if let Some(nm) = node_name(src, node) {
        nf.symbols.push(SymbolItem {
          name: nm,
          kind: "const".to_string(),
          fqn: None,
          range: Some(to_range(node)),
          visibility: None,
          is_entry_point: None,
          is_method: None,
          owner_type: None,
          params: None,
          return_type: None,
        });
      }
    }

    // Function-like
    if is_function_like(node) {
      if let Some(nm) = node_name(src, node) {
        let (vis, entry) = detect_visibility(src, node);
        let owner = has_type_like_ancestor(node, src).or_else(|| type_owner_stack.last().cloned());
        let params = extract_params(src, node);
        let ret_ty = extract_return_type(src, node);
        let mut fqn = None;
        if let Some(owner_name) = owner.clone() {
          fqn = Some(if ns_stack.is_empty() { format!("{}::{}", owner_name, nm) } else { format!("{}::{}::{}", ns_stack.join("::"), owner_name, nm) });
        } else if !ns_stack.is_empty() {
          fqn = Some(format!("{}::{}", ns_stack.join("::"), nm));
        }
        nf.symbols.push(SymbolItem {
          name: nm,
          kind: "function".to_string(),
          fqn,
          range: Some(to_range(node)),
          visibility: vis,
          is_entry_point: Some(entry.unwrap_or(owner.is_none())),
          is_method: Some(owner.is_some()),
          owner_type: owner,
          params: if params.is_empty() { None } else { Some(params) },
          return_type: ret_ty,
        });
      }
    }

    // Reference detection: calls and news
    let lk = kind.to_lowercase();
    if is_call_like(&lk) {
      // try to extract callee name and qualifier (object/namespace)
      let name = node.child_by_field_name("function").or_else(|| node.child_by_field_name("name")).or_else(|| node.child_by_field_name("member"));
      let qual = node.child_by_field_name("object").or_else(|| node.child_by_field_name("receiver")).or_else(|| node.child_by_field_name("value"));
      if let Some(n) = name {
        let nm = text_of(src, n);
        let qualifier = qual.map(|q| text_of(src, q));
        nf.references.as_mut().unwrap().push(ReferenceItem { kind: "call".to_string(), name: nm, qualifier, range: Some(to_range(node)) });
      }
    } else if is_new_like(&lk) {
      if let Some(n) = node.child_by_field_name("type").or_else(|| node.child_by_field_name("name")) {
        let nm = text_of(src, n);
        nf.references.as_mut().unwrap().push(ReferenceItem { kind: "new".to_string(), name: nm, qualifier: None, range: Some(to_range(node)) });
      }
    }

    // Recurse
    let mut i = 0; while i < node.child_count() { if let Some(ch) = node.child(i) { walk(nf, src, ch, ns_stack, type_owner_stack); } i += 1; }

    // Pop stacks if pushed
    if pushed_type { type_owner_stack.pop(); }
    if is_namespace_like(kind) { let _ = ns_stack.pop(); }
  }

  walk(&mut nf, source, root, &mut ns_stack, &mut type_owner_stack);
  nf
}
