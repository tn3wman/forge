use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspPosition {
    pub line: u32,
    pub character: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRange {
    pub start: LspPosition,
    pub end: LspPosition,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspDiagnostic {
    pub uri: String,
    pub range: LspRange,
    pub severity: u8,
    pub message: String,
    pub source: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspCompletionItem {
    pub label: String,
    pub kind: Option<u32>,
    pub detail: Option<String>,
    pub insert_text: Option<String>,
    pub sort_text: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspHoverResult {
    pub contents: String,
    pub range: Option<LspRange>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspLocation {
    pub uri: String,
    pub range: LspRange,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspSymbol {
    pub name: String,
    pub kind: u32,
    pub location: LspLocation,
    pub container_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspDiagnosticsEvent {
    pub bay_id: String,
    pub language_id: String,
    pub uri: String,
    pub diagnostics: Vec<LspDiagnostic>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_position_serde_roundtrip() {
        let pos = LspPosition { line: 10, character: 5 };
        let json = serde_json::to_string(&pos).unwrap();
        assert!(json.contains("\"line\""));
        assert!(json.contains("\"character\""));
        let back: LspPosition = serde_json::from_str(&json).unwrap();
        assert_eq!(back.line, 10);
        assert_eq!(back.character, 5);
    }

    #[test]
    fn test_range_serde_roundtrip() {
        let range = LspRange {
            start: LspPosition { line: 1, character: 0 },
            end: LspPosition { line: 1, character: 10 },
        };
        let json = serde_json::to_string(&range).unwrap();
        let back: LspRange = serde_json::from_str(&json).unwrap();
        assert_eq!(back.start.line, 1);
        assert_eq!(back.end.character, 10);
    }

    #[test]
    fn test_diagnostic_serde_roundtrip() {
        let diag = LspDiagnostic {
            uri: "file:///test.rs".to_string(),
            range: LspRange {
                start: LspPosition { line: 0, character: 0 },
                end: LspPosition { line: 0, character: 5 },
            },
            severity: 1,
            message: "error here".to_string(),
            source: Some("rustc".to_string()),
        };
        let json = serde_json::to_string(&diag).unwrap();
        let back: LspDiagnostic = serde_json::from_str(&json).unwrap();
        assert_eq!(back.uri, "file:///test.rs");
        assert_eq!(back.severity, 1);
        assert_eq!(back.source.unwrap(), "rustc");
    }

    #[test]
    fn test_completion_item_serde_roundtrip() {
        let item = LspCompletionItem {
            label: "println!".to_string(),
            kind: Some(3),
            detail: Some("macro".to_string()),
            insert_text: Some("println!($1)".to_string()),
            sort_text: None,
        };
        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("\"insertText\""));
        assert!(json.contains("\"sortText\""));
        let back: LspCompletionItem = serde_json::from_str(&json).unwrap();
        assert_eq!(back.label, "println!");
        assert!(back.sort_text.is_none());
    }

    #[test]
    fn test_hover_result_serde_roundtrip() {
        let hover = LspHoverResult {
            contents: "fn main()".to_string(),
            range: None,
        };
        let json = serde_json::to_string(&hover).unwrap();
        let back: LspHoverResult = serde_json::from_str(&json).unwrap();
        assert_eq!(back.contents, "fn main()");
        assert!(back.range.is_none());
    }

    #[test]
    fn test_location_serde_roundtrip() {
        let loc = LspLocation {
            uri: "file:///src/main.rs".to_string(),
            range: LspRange {
                start: LspPosition { line: 5, character: 0 },
                end: LspPosition { line: 5, character: 4 },
            },
        };
        let json = serde_json::to_string(&loc).unwrap();
        let back: LspLocation = serde_json::from_str(&json).unwrap();
        assert_eq!(back.uri, "file:///src/main.rs");
    }

    #[test]
    fn test_symbol_serde_roundtrip() {
        let sym = LspSymbol {
            name: "main".to_string(),
            kind: 12,
            location: LspLocation {
                uri: "file:///src/main.rs".to_string(),
                range: LspRange {
                    start: LspPosition { line: 0, character: 0 },
                    end: LspPosition { line: 10, character: 1 },
                },
            },
            container_name: None,
        };
        let json = serde_json::to_string(&sym).unwrap();
        assert!(json.contains("\"containerName\""));
        let back: LspSymbol = serde_json::from_str(&json).unwrap();
        assert_eq!(back.name, "main");
        assert_eq!(back.kind, 12);
    }

    #[test]
    fn test_diagnostics_event_serde_roundtrip() {
        let event = LspDiagnosticsEvent {
            bay_id: "bay-1".to_string(),
            language_id: "rust".to_string(),
            uri: "file:///test.rs".to_string(),
            diagnostics: vec![],
        };
        let json = serde_json::to_string(&event).unwrap();
        assert!(json.contains("\"bayId\""));
        assert!(json.contains("\"languageId\""));
        let back: LspDiagnosticsEvent = serde_json::from_str(&json).unwrap();
        assert_eq!(back.bay_id, "bay-1");
    }
}
