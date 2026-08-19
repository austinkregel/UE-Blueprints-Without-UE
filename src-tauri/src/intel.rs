//! Corpus intelligence (generic): semantic search over source, backed by LanceDB
//! + local embeddings.
//!
//! This is the "IDE brain" layer. It walks a source tree, splits it into units
//! (functions), embeds each with a local ONNX model (fastembed), and stores the
//! vectors + metadata in an embedded LanceDB table. `intel_search` then answers
//! meaning-based queries ("missions where you blow up a bridge") by nearest-vector
//! lookup. Nothing here is domain-specific — a caller points it at any tree.

use arrow_array::{
    Array, FixedSizeListArray, Float32Array, RecordBatch, RecordBatchIterator, RecordBatchReader,
    StringArray,
};
use arrow_schema::{DataType, Field, Schema};
use fastembed::{EmbeddingModel, InitOptions, TextEmbedding};
use futures::TryStreamExt;
use lancedb::connect;
use lancedb::query::{ExecutableQuery, QueryBase};
use once_cell::sync::OnceCell;
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::Mutex;
use tree_sitter::Parser;

// BGE-small-en-v1.5: 384-dim, small enough to ship, downloaded once on first use.
const EMBED_DIM: i32 = 384;
const TABLE: &str = "units";

#[derive(Serialize, Clone)]
pub struct SearchHit {
    pub id: String,
    pub name: String,
    pub path: String,
    pub kind: String,
    /// vector distance (smaller = closer)
    pub score: f32,
}

pub struct Unit {
    pub id: String,
    pub name: String,
    pub kind: String,
    pub path: String,
    pub lang: String,
    pub text: String,
}

// The embedder is expensive to construct (loads an ONNX session), so build it
// once. It is not Sync, so guard it behind a Mutex.
static EMBEDDER: OnceCell<Mutex<TextEmbedding>> = OnceCell::new();

fn embedder() -> Result<&'static Mutex<TextEmbedding>, String> {
    EMBEDDER.get_or_try_init(|| {
        TextEmbedding::try_new(InitOptions::new(EmbeddingModel::BGESmallENV15))
            .map(Mutex::new)
            .map_err(|e| format!("embedder init failed: {e}"))
    })
}

fn embed_texts(texts: Vec<String>) -> Result<Vec<Vec<f32>>, String> {
    let cell = embedder()?;
    let mut model = cell
        .lock()
        .map_err(|_| "embedder mutex poisoned".to_string())?;
    model
        .embed(texts, None)
        .map_err(|e| format!("embed failed: {e}"))
}

fn walk_lua(root: &Path, out: &mut Vec<PathBuf>) {
    let Ok(entries) = fs::read_dir(root) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if path.is_dir() {
            walk_lua(&path, out);
        } else if path.extension().and_then(|e| e.to_str()) == Some("lua") {
            out.push(path);
        }
    }
}

/// Split a Lua source tree into units — one per top-level function declaration.
pub fn extract_lua_units(root: &str) -> Vec<Unit> {
    let mut files = Vec::new();
    walk_lua(Path::new(root), &mut files);

    let mut parser = Parser::new();
    if parser
        .set_language(&tree_sitter_lua::LANGUAGE.into())
        .is_err()
    {
        return Vec::new();
    }

    let mut units = Vec::new();
    for path in files {
        let Ok(src) = fs::read_to_string(&path) else {
            continue;
        };
        let Some(tree) = parser.parse(&src, None) else {
            continue;
        };
        let root_node = tree.root_node();
        let path_str = path.to_string_lossy().to_string();
        let mut i = 0;
        while i < root_node.named_child_count() {
            if let Some(ch) = root_node.named_child(i) {
                if ch.kind() == "function_declaration" {
                    let name = ch
                        .child_by_field_name("name")
                        .and_then(|n| n.utf8_text(src.as_bytes()).ok())
                        .unwrap_or("fn")
                        .to_string();
                    let text = ch.utf8_text(src.as_bytes()).unwrap_or("").to_string();
                    units.push(Unit {
                        id: format!("{}#{}", path_str, name),
                        name,
                        kind: "function".into(),
                        path: path_str.clone(),
                        lang: "lua".into(),
                        text,
                    });
                }
            }
            i += 1;
        }
    }
    units
}

fn str_col(values: impl Iterator<Item = String>) -> StringArray {
    values.map(Some).collect::<StringArray>()
}

fn vector_schema() -> Arc<Schema> {
    let item = Arc::new(Field::new("item", DataType::Float32, true));
    Arc::new(Schema::new(vec![
        Field::new("id", DataType::Utf8, false),
        Field::new("name", DataType::Utf8, true),
        Field::new("kind", DataType::Utf8, true),
        Field::new("path", DataType::Utf8, true),
        Field::new("lang", DataType::Utf8, true),
        Field::new("text", DataType::Utf8, true),
        Field::new("vector", DataType::FixedSizeList(item, EMBED_DIM), true),
    ]))
}

/// Embed every unit and write the vectors + metadata to the LanceDB table,
/// replacing any previous index. Returns the number of units indexed.
pub async fn index_units(db_path: &str, units: Vec<Unit>) -> Result<usize, String> {
    if units.is_empty() {
        return Ok(0);
    }
    // Embed the unit text (name + body); embedding is CPU-bound, so offload it.
    let texts: Vec<String> = units
        .iter()
        .map(|u| format!("{}\n{}", u.name, u.text))
        .collect();
    let vectors = tokio::task::spawn_blocking(move || embed_texts(texts))
        .await
        .map_err(|e| format!("embed task failed: {e}"))??;

    let dim = vectors
        .first()
        .map(|v| v.len())
        .unwrap_or(EMBED_DIM as usize);
    let flat: Vec<f32> = vectors.into_iter().flatten().collect();
    let values = Float32Array::from(flat);
    let item = Arc::new(Field::new("item", DataType::Float32, true));
    let vector = FixedSizeListArray::try_new(item, dim as i32, Arc::new(values), None)
        .map_err(|e| format!("vector column failed: {e}"))?;

    let ids = str_col(units.iter().map(|u| u.id.clone()));
    let names = str_col(units.iter().map(|u| u.name.clone()));
    let kinds = str_col(units.iter().map(|u| u.kind.clone()));
    let paths = str_col(units.iter().map(|u| u.path.clone()));
    let langs = str_col(units.iter().map(|u| u.lang.clone()));
    let bodies = str_col(units.iter().map(|u| u.text.clone()));

    let schema = vector_schema();
    let batch = RecordBatch::try_new(
        schema.clone(),
        vec![
            Arc::new(ids),
            Arc::new(names),
            Arc::new(kinds),
            Arc::new(paths),
            Arc::new(langs),
            Arc::new(bodies),
            Arc::new(vector),
        ],
    )
    .map_err(|e| format!("record batch failed: {e}"))?;

    let db = connect(db_path)
        .execute()
        .await
        .map_err(|e| format!("lancedb connect failed: {e}"))?;
    // Rebuild the table from scratch each time (simple + deterministic).
    let _ = db.drop_table(TABLE, &[]).await;
    let reader = RecordBatchIterator::new(vec![Ok(batch)], schema);
    let data: Box<dyn RecordBatchReader + Send> = Box::new(reader);
    db.create_table(TABLE, data)
        .execute()
        .await
        .map_err(|e| format!("create_table failed: {e}"))?;

    Ok(units.len())
}

/// Nearest-vector search: embed the query and return the closest units.
pub async fn search(db_path: &str, query: &str, k: usize) -> Result<Vec<SearchHit>, String> {
    let q = query.to_string();
    let qv = tokio::task::spawn_blocking(move || embed_texts(vec![q]))
        .await
        .map_err(|e| format!("embed task failed: {e}"))??;
    let qvec = qv.into_iter().next().ok_or("no query embedding")?;

    let db = connect(db_path)
        .execute()
        .await
        .map_err(|e| format!("lancedb connect failed: {e}"))?;
    let tbl = db
        .open_table(TABLE)
        .execute()
        .await
        .map_err(|e| format!("open_table failed (index first?): {e}"))?;

    let stream = tbl
        .query()
        .nearest_to(qvec)
        .map_err(|e| format!("nearest_to failed: {e}"))?
        .limit(k)
        .execute()
        .await
        .map_err(|e| format!("query failed: {e}"))?;
    let batches = stream
        .try_collect::<Vec<_>>()
        .await
        .map_err(|e| format!("collect failed: {e}"))?;

    let col = |b: &RecordBatch, name: &str| -> Option<StringArray> {
        b.column_by_name(name)
            .and_then(|a| a.as_any().downcast_ref::<StringArray>())
            .cloned()
    };
    let mut hits = Vec::new();
    for batch in &batches {
        let ids = col(batch, "id");
        let names = col(batch, "name");
        let paths = col(batch, "path");
        let kinds = col(batch, "kind");
        let dists = batch
            .column_by_name("_distance")
            .and_then(|a| a.as_any().downcast_ref::<Float32Array>())
            .cloned();
        for i in 0..batch.num_rows() {
            hits.push(SearchHit {
                id: ids
                    .as_ref()
                    .map(|a| a.value(i).to_string())
                    .unwrap_or_default(),
                name: names
                    .as_ref()
                    .map(|a| a.value(i).to_string())
                    .unwrap_or_default(),
                path: paths
                    .as_ref()
                    .map(|a| a.value(i).to_string())
                    .unwrap_or_default(),
                kind: kinds
                    .as_ref()
                    .map(|a| a.value(i).to_string())
                    .unwrap_or_default(),
                score: dists.as_ref().map(|a| a.value(i)).unwrap_or(0.0),
            });
        }
    }
    Ok(hits)
}

#[tauri::command]
pub async fn intel_index_corpus(root: String, db_path: String) -> Result<usize, String> {
    let units = extract_lua_units(&root);
    index_units(&db_path, units).await
}

#[tauri::command]
pub async fn intel_search(
    db_path: String,
    query: String,
    k: Option<usize>,
) -> Result<Vec<SearchHit>, String> {
    search(&db_path, &query, k.unwrap_or(20)).await
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_top_level_functions_as_units() {
        // Write a tiny Lua file to a temp dir and confirm each function becomes a unit.
        let dir = std::env::temp_dir().join(format!("intel_test_{}", std::process::id()));
        let _ = fs::create_dir_all(&dir);
        let file = dir.join("m.lua");
        fs::write(
            &file,
            "inherit(\"MrxTaskContract\")\nfunction Activated(self)\n  Ui.Show(\"hi\")\nend\nfunction Cleanup(self) end\n",
        )
        .unwrap();

        let units = extract_lua_units(dir.to_str().unwrap());
        let names: Vec<&str> = units.iter().map(|u| u.name.as_str()).collect();
        assert!(names.contains(&"Activated"), "got {names:?}");
        assert!(names.contains(&"Cleanup"), "got {names:?}");
        for u in &units {
            assert_eq!(u.kind, "function");
            assert_eq!(u.lang, "lua");
            assert!(u.id.ends_with(&format!("#{}", u.name)));
        }
        let _ = fs::remove_dir_all(&dir);
    }

    // End-to-end index + search. Ignored by default: it downloads the embedding
    // model and needs network. Run manually with `cargo test -- --ignored`.
    #[tokio::test]
    #[ignore]
    async fn index_and_search_round_trip() {
        let db = std::env::temp_dir()
            .join(format!("intel_lance_{}", std::process::id()))
            .to_string_lossy()
            .to_string();
        let units = vec![
            Unit {
                id: "a".into(),
                name: "BlowUpBridge".into(),
                kind: "function".into(),
                path: "/x/a.lua".into(),
                lang: "lua".into(),
                text: "detonate the C4 on the bridge to destroy it".into(),
            },
            Unit {
                id: "b".into(),
                name: "GreetPlayer".into(),
                kind: "function".into(),
                path: "/x/b.lua".into(),
                lang: "lua".into(),
                text: "show a friendly hello message on screen".into(),
            },
        ];
        let n = index_units(&db, units).await.unwrap();
        assert_eq!(n, 2);
        let hits = search(&db, "demolish a bridge with explosives", 2)
            .await
            .unwrap();
        assert!(!hits.is_empty());
        assert_eq!(hits[0].id, "a", "closest hit should be the bridge unit");
        let _ = std::fs::remove_dir_all(&db);
    }
}
