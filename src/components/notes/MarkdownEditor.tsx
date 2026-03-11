import { useState, useRef, useCallback, type JSX } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./MarkdownEditor.css";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onWikiLinkClick?: (noteTitle: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  onExportPdf?: () => void;
}

// Toolbar button configuration matching TaskEditor styling
const toolbarItems = [
  { label: "# ", title: "Heading", insert: "# ", wrap: false },
  { label: "**B**", title: "Bold", insert: "****", wrap: true, cursor: 2 },
  { label: "*I*", title: "Italic", insert: "**", wrap: true, cursor: 1 },
  { label: "`c`", title: "Code", insert: "``", wrap: true, cursor: 1 },
  { label: "[Link]()", title: "Link", insert: "[]()", wrap: false },
  { label: "- [ ]", title: "Checkbox", insert: "- [ ] ", wrap: false },
  { label: "- ", title: "List", insert: "- ", wrap: false },
];

export default function MarkdownEditor({
  value,
  onChange,
  onWikiLinkClick,
  placeholder = "Add your note… (Shift+Enter for new line, Enter to save)",
  readOnly = false,
  onExportPdf,
}: MarkdownEditorProps) {
  const [previewMode, setPreviewMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Render wiki-style links as clickable buttons in preview
  const renderWikiLinks = useCallback((text: string) => {
    const wikiLinkRegex = /\[\[([^\]]+)\]\]/g;
    const parts = text.split(wikiLinkRegex);

    return (
      <>
        {parts.map((part, idx) => {
          if (idx % 2 === 0) {
            return <span key={idx}>{part}</span>;
          }
          return (
            <button
              key={idx}
              onClick={() => onWikiLinkClick?.(part.trim())}
              className="wiki-link"
              type="button"
            >
              [[{part}]]
            </button>
          );
        })}
      </>
    );
  }, [onWikiLinkClick]);

  // Handle toolbar button clicks
  const applyToolbar = useCallback((item: typeof toolbarItems[0]) => {
    const el = textareaRef.current;
    if (!el || readOnly) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const sel = value.slice(start, end);

    let newValue: string;
    let cursor: number;

    if (item.wrap && sel) {
      const half = item.insert.length / 2;
      newValue =
        value.slice(0, start) +
        item.insert.slice(0, half) +
        sel +
        item.insert.slice(half) +
        value.slice(end);
      cursor = start + half + sel.length + half;
    } else if (item.wrap) {
      newValue = value.slice(0, start) + item.insert + value.slice(end);
      cursor = start + (item.cursor ?? Math.floor(item.insert.length / 2));
    } else {
      // Check if cursor is at start of line
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const prefix =
        lineStart === start || value.slice(lineStart, start).trim() === ""
          ? ""
          : "\n";
      newValue =
        value.slice(0, start) + prefix + item.insert + value.slice(end);
      cursor = start + prefix.length + item.insert.length;
    }

    onChange(newValue);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  }, [value, onChange, readOnly]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!readOnly && (e.ctrlKey || e.metaKey)) {
      let handled = false;
      
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        applyToolbar(toolbarItems.find(item => item.title === 'Bold')!);
        handled = true;
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        applyToolbar(toolbarItems.find(item => item.title === 'Italic')!);
        handled = true;
      } else if (e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        applyToolbar(toolbarItems.find(item => item.title === 'Link')!);
        handled = true;
      }
      
      if (handled) return;
    }
  }, [readOnly, applyToolbar]);

  return (
    <div className="markdown-editor">
      {/* Toolbar */}
      {!readOnly && !previewMode && (
        <div className="editor-toolbar">
          {toolbarItems.map((item) => (
            <button
              key={item.label}
              onMouseDown={(e) => {
                e.preventDefault();
                applyToolbar(item);
              }}
              title={item.title}
              className="toolbar-button"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* Toggle preview/edit */}
      <div className="editor-controls">
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="preview-toggle"
          >
            {previewMode ? "✏ Edit" : "👁 Preview"}
          </button>
          {onExportPdf && previewMode && (
            <button
              onClick={onExportPdf}
              className="export-pdf-btn"
              title="Export as PDF"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export PDF
            </button>
          )}
        </div>
      </div>

      {/* Editor or Preview */}
      {previewMode ? (
        <div className="markdown-preview">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {value || "*Nothing yet…*"}
          </ReactMarkdown>
        </div>
      ) : (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="editor-textarea"
          readOnly={readOnly}
          rows={12}
        />
      )}

      <p className="editor-hint">
        Markdown supported · Use [[Note Title]] for wiki links · Ctrl+B bold, Ctrl+I italic, Ctrl+K link
      </p>
    </div>
  );
}
