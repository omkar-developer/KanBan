import { useState } from "react"
import { createPortal } from "react-dom"
import MarkdownPreview from "./MarkdownPreview"
import { invoke } from "@tauri-apps/api/core"
import { useKanbanStore } from "../../state/kanbanStore"
import { store } from "../../storage/storage"
import { createId } from "../../utils/id"
import type { Task } from "../../models/Task"
import type { Column } from "../../models/Column"

interface Props {
  filePath: string
  onClose: () => void
}

function extractTitle(content: string): string {
  const match = content.match(/^(?:# |## )(.+)$/m)
  if (match) return match[1].trim()
  return "Untitled"
}

function getFileName(filePath: string): string {
  return filePath.split(/[\\/]/).pop() || "Untitled"
}

function parseFrontmatter(content: string): Record<string, string> {
  const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!fm) return {}
  const result: Record<string, string> = {}
  for (const line of fm[1].split(/\r?\n/)) {
    const [key, ...rest] = line.split(":")
    if (key && rest.length) {
      result[key.trim()] = rest.join(":").trim()
    }
  }
  return result
}

export default function FilePreviewDialog({ filePath, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)

  const boards = useKanbanStore(s => s.boards)
  const columns = useKanbanStore(s => s.columns)
  const loadBoard = useKanbanStore(s => s.loadBoard)

  const fileName = getFileName(filePath)
  const title = content ? extractTitle(content) : "Loading…"
  const fm = content ? parseFrontmatter(content) : {}
  const body = content ? content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim() : ""

  const handleImport = async () => {
    if (importing || !content) return
    setImporting(true)

    try {
      const targetBoard = boards.find(b => b.type === "notes") || boards[0]
      if (!targetBoard) return

      const boardId = targetBoard.id
      const boardCols = columns.filter(c => c.boardId === boardId)

      let targetCol = boardCols.find(c => c.name === "Notes")
      if (!targetCol) {
        const colId = createId()
        await store.createColumn({
          id: colId,
          boardId,
          name: "Notes",
          order: (boardCols.length + 1) * 1000,
        })
        targetCol = { id: colId, boardId, name: "Notes", order: (boardCols.length + 1) * 1000 }
      }

      await store.createTask({
        id: createId(),
        columnId: targetCol.id,
        title,
        description: body,
        type: "note",
        data: { category: fm.category || "Imported", filePath },
        order: 1000,
        createdAt: Date.now(),
      } as Task)

      await loadBoard(boardId)
      onClose()
    } catch (err) {
      console.error("Failed to import file:", err)
      setError("Failed to import file")
    } finally {
      setImporting(false)
    }
  }

  const loadContent = async () => {
    try {
      const text = await invoke<string>("read_md_file", { path: filePath })
      setContent(text)
    } catch (err) {
      console.error("Failed to read file:", err)
      setError("Failed to read file")
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.72)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl border shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: "var(--bg-modal)", borderColor: "var(--border)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <span
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", color: "var(--text-muted)" }}
            >
              {fileName}
            </span>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif" }}>
              {title}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {content && (
              <button
                onClick={handleImport}
                disabled={importing}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  border: "none",
                  cursor: importing ? "wait" : "pointer",
                  backgroundColor: "var(--accent, #3b82f6)",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  opacity: importing ? 0.7 : 1,
                }}
              >
                {importing ? "Importing…" : "Import"}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg transition"
              style={{ color: "var(--text-muted)", backgroundColor: "transparent" }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = "var(--bg-input)" }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent" }}
              aria-label="Close"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className="overflow-y-auto flex-1 px-5 py-5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.08) transparent" }}
        >
          {error && (
            <div style={{ padding: 20, textAlign: "center" }}>
              <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>{error}</p>
              <button
                onClick={() => { setError(null); loadContent() }}
                style={{
                  marginTop: 12, padding: "6px 16px", borderRadius: 8, border: "1px solid var(--border)",
                  backgroundColor: "transparent", color: "var(--text-primary)", cursor: "pointer",
                  fontSize: 13,
                }}
              >
                Retry
              </button>
            </div>
          )}
          {!error && content && <MarkdownPreview content={content} />}
          {!error && !content && !error && (
            <div style={{ padding: 20, textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading preview…</p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
