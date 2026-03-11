import { useMemo, useState, useCallback, useEffect, useRef, type JSX } from "react"
import MarkdownPreview from "../ui/MarkdownPreview"
import { useKanbanStore } from "../../state/kanbanStore"
import { tagColorClasses } from "../../utils/tagColors"
import ExplorerTree from "../ui/ExplorerTree"
import TextInputDialog from "../ui/TextInputDialog"
import ConfirmDialog from "../ui/ConfirmDialog"
import CreateNoteDialog from "../ui/CreateNoteDialog"
import CategoryEditDialog from "../ui/CategoryEditDialog"
import BacklinksSection from "../notes/BacklinksSection"
import type { Task } from "../../models/Task"

// ─────────────────────────────────────────────────────────────────────────────
// Constants & helpers
// ─────────────────────────────────────────────────────────────────────────────

const AUTOSAVE_DELAY = 1200 // ms

const PREDEFINED_TAGS = ["api", "ui", "backend", "frontend", "bug", "feature", "documentation", "security", "performance"]

// Toolbar button definitions
const TOOLBAR: Array<{
  label: string; title: string
  action: (ta: HTMLTextAreaElement, val: string) => { value: string; cursor: number } | null
  wrap?: boolean
}> = [
  {
    label: "**B**", title: "Bold",
    action: (ta, val) => wrapSelection(ta, val, "**", "**", "bold text"),
  },
  {
    label: "*I*", title: "Italic",
    action: (ta, val) => wrapSelection(ta, val, "*", "*", "italic text"),
  },
  {
    label: "~~S~~", title: "Strikethrough",
    action: (ta, val) => wrapSelection(ta, val, "~~", "~~", "strikethrough"),
  },
  {
    label: "`c`", title: "Inline code",
    action: (ta, val) => wrapSelection(ta, val, "`", "`", "code"),
  },
  {
    label: "```", title: "Code block",
    action: (ta, val) => insertBlock(ta, val, "```\n", "\n```", "code here"),
  },
  { label: "—", title: "sep", action: () => null },
  {
    label: "H1", title: "Heading 1",
    action: (ta, val) => insertLinePrefix(ta, val, "# "),
  },
  {
    label: "H2", title: "Heading 2",
    action: (ta, val) => insertLinePrefix(ta, val, "## "),
  },
  {
    label: "H3", title: "Heading 3",
    action: (ta, val) => insertLinePrefix(ta, val, "### "),
  },
  { label: "—", title: "sep", action: () => null },
  {
    label: "—", title: "Horizontal rule",
    action: (ta, val) => insertAtCursor(ta, val, "\n\n---\n\n"),
  },
  {
    label: "• List", title: "Bullet list",
    action: (ta, val) => insertLinePrefix(ta, val, "- "),
  },
  {
    label: "1. List", title: "Numbered list",
    action: (ta, val) => insertLinePrefix(ta, val, "1. "),
  },
  {
    label: "☑ Task", title: "Task list item",
    action: (ta, val) => insertLinePrefix(ta, val, "- [ ] "),
  },
  { label: "—", title: "sep", action: () => null },
  {
    label: "> Quote", title: "Blockquote",
    action: (ta, val) => insertLinePrefix(ta, val, "> "),
  },
  {
    label: "🔗 Link", title: "Insert link",
    action: (ta, val) => {
      const sel = val.slice(ta.selectionStart, ta.selectionEnd) || "link text"
      const ins = `[${sel}](url)`
      const newVal = val.slice(0, ta.selectionStart) + ins + val.slice(ta.selectionEnd)
      return { value: newVal, cursor: ta.selectionStart + ins.length }
    },
  },
  {
    label: "[[Wiki]]", title: "Wiki link to another note",
    action: (ta, val) => {
      const sel = val.slice(ta.selectionStart, ta.selectionEnd) || "Note Title"
      const ins = `[[${sel}]]`
      const newVal = val.slice(0, ta.selectionStart) + ins + val.slice(ta.selectionEnd)
      return { value: newVal, cursor: ta.selectionStart + ins.length }
    },
  },
  {
    label: "📋 Table", title: "Insert table",
    action: (ta, val) => insertAtCursor(ta, val,
      "\n| Column 1 | Column 2 | Column 3 |\n|----------|----------|----------|\n| Cell 1   | Cell 2   | Cell 3   |\n"
    ),
  },
]

function wrapSelection(
  ta: HTMLTextAreaElement, val: string,
  before: string, after: string, placeholder: string
): { value: string; cursor: number } {
  const start = ta.selectionStart
  const end   = ta.selectionEnd
  const sel   = val.slice(start, end) || placeholder
  const newVal = val.slice(0, start) + before + sel + after + val.slice(end)
  return { value: newVal, cursor: start + before.length + sel.length + after.length }
}

function insertBlock(
  ta: HTMLTextAreaElement, val: string,
  before: string, after: string, placeholder: string
): { value: string; cursor: number } {
  const start = ta.selectionStart
  const sel   = val.slice(start, ta.selectionEnd) || placeholder
  const newVal = val.slice(0, start) + before + sel + after + val.slice(ta.selectionEnd)
  return { value: newVal, cursor: start + before.length + sel.length + after.length }
}

function insertLinePrefix(
  ta: HTMLTextAreaElement, val: string, prefix: string
): { value: string; cursor: number } {
  const start     = ta.selectionStart
  const lineStart = val.lastIndexOf("\n", start - 1) + 1
  const newVal    = val.slice(0, lineStart) + prefix + val.slice(lineStart)
  return { value: newVal, cursor: start + prefix.length }
}

function insertAtCursor(
  ta: HTMLTextAreaElement, val: string, text: string
): { value: string; cursor: number } {
  const pos    = ta.selectionStart
  const newVal = val.slice(0, pos) + text + val.slice(pos)
  return { value: newVal, cursor: pos + text.length }
}

// Smart Enter: auto-continue lists / task items
function smartEnter(value: string, selStart: number): { newValue: string; newCursor: number } | null {
  const lines  = value.slice(0, selStart).split("\n")
  const line   = lines[lines.length - 1]
  const cbMatch = line.match(/^(\s*- \[[ x]\] )(.*)$/)
  const ulMatch = line.match(/^(\s*[-*+] )(.*)$/)
  const olMatch = line.match(/^(\s*(\d+)\. )(.*)$/)
  if (cbMatch) {
    if (!cbMatch[2]) {
      const before = value.slice(0, selStart - line.length)
      return { newValue: before + value.slice(selStart), newCursor: before.length }
    }
    const prefix   = cbMatch[1].replace(/\[x\]/i, "[ ]")
    const newValue = value.slice(0, selStart) + "\n" + prefix + value.slice(selStart)
    return { newValue, newCursor: selStart + 1 + prefix.length }
  }
  if (ulMatch) {
    if (!ulMatch[2]) {
      const before = value.slice(0, selStart - line.length)
      return { newValue: before + value.slice(selStart), newCursor: before.length }
    }
    const newValue = value.slice(0, selStart) + "\n" + ulMatch[1] + value.slice(selStart)
    return { newValue, newCursor: selStart + 1 + ulMatch[1].length }
  }
  if (olMatch) {
    if (!olMatch[3]) {
      const before = value.slice(0, selStart - line.length)
      return { newValue: before + value.slice(selStart), newCursor: before.length }
    }
    const next     = parseInt(olMatch[2]) + 1
    const prefix   = olMatch[1].replace(/\d+/, String(next))
    const newValue = value.slice(0, selStart) + "\n" + prefix + value.slice(selStart)
    return { newValue, newCursor: selStart + 1 + prefix.length }
  }
  return null
}

// Word count helper
function wordCount(text: string) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0
  const chars = text.length
  const lines = text.split("\n").length
  return { words, chars, lines }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main NotesView
// ─────────────────────────────────────────────────────────────────────────────

export default function NotesView() {
  const tasks       = useKanbanStore(s => s.tasks)
  const columns     = useKanbanStore(s => s.columns)
  const activeBoard = useKanbanStore(s => s.activeBoard)
  const searchQuery = useKanbanStore(s => s.searchQuery)
  const activeTags  = useKanbanStore(s => s.activeTags)

  const [sidebarCollapsed,       setSidebarCollapsed]       = useState(false)
  const [selectedNoteId,         setSelectedNoteId]         = useState<string | undefined>()
  const [noteContent,            setNoteContent]            = useState("")
  const [noteTags,               setNoteTags]               = useState<string[]>([])
  const [tagInput,               setTagInput]               = useState("")
  const [viewMode,               setViewMode]               = useState<"edit" | "preview" | "split">("preview")
  const [docWidthMode,           setDocWidthMode]           = useState(false)
  const [isSaving,               setIsSaving]               = useState(false)
  const [isDirty,                setIsDirty]                = useState(false)
  const [wordCountInfo,          setWordCountInfo]          = useState({ words: 0, chars: 0, lines: 0 })
  const [showCreateDialog,       setShowCreateDialog]       = useState(false)
  const [showDeleteDialog,       setShowDeleteDialog]       = useState(false)
  const [showEditTitleDialog,    setShowEditTitleDialog]    = useState(false)
  const [pendingCategory,        setPendingCategory]        = useState("")
  const [editingCategory,        setEditingCategory]        = useState<string | null>(null)
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false)
  const [deletingCategory,       setDeletingCategory]       = useState<string | null>(null)
  const [sidebarSearch,          setSidebarSearch]          = useState("")
  const [focusMode,              setFocusMode]              = useState(false)

  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const autosaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Derived data ───────────────────────────────────────────────────────────
  const allNoteTasks = useMemo(() => tasks.filter(t => t.type === "note"), [tasks])

  const noteTasks = useMemo(() => {
    let result = allNoteTasks
    const q = (searchQuery || sidebarSearch).trim().toLowerCase()
    if (q) result = result.filter(t =>
      t.title.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.tags?.some(tag => tag.toLowerCase().includes(q))
    )
    if (activeTags.length > 0) result = result.filter(t => t.tags?.some(tag => activeTags.includes(tag)))
    return result
  }, [allNoteTasks, searchQuery, sidebarSearch, activeTags])

  const categories = useMemo(() => {
    const set = new Set<string>()
    noteTasks.forEach(t => {
      const cat = t.data?.category as string
      if (cat?.trim()) set.add(cat)
    })
    if (noteTasks.some(t => !t.data?.category)) set.add("Uncategorized")
    return Array.from(set).sort()
  }, [noteTasks])

  const groupedNotes = useMemo(() =>
    categories.map(cat => ({
      key: cat, label: cat,
      items: noteTasks.filter(t => {
        const tc = t.data?.category as string
        return cat === "Uncategorized" ? !tc : tc === cat
      }),
    })),
    [noteTasks, categories]
  )

  const selectedNote = useMemo(() => noteTasks.find(t => t.id === selectedNoteId), [noteTasks, selectedNoteId])

  // ── Sync content when note changes ────────────────────────────────────────
  useEffect(() => {
    if (selectedNote) {
      setNoteContent(selectedNote.description || "")
      setNoteTags(selectedNote.tags || [])
      setIsDirty(false)
    } else {
      setNoteContent(""); setNoteTags([])
    }
  }, [selectedNote?.id]) // eslint-disable-line

  // ── Word count update ──────────────────────────────────────────────────────
  useEffect(() => { setWordCountInfo(wordCount(noteContent)) }, [noteContent])

  // ── Auto-save ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty || !selectedNoteId) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      setIsSaving(true)
      await useKanbanStore.getState().updateTask(selectedNoteId, {
        description: noteContent.trim() || undefined,
        tags: noteTags.length > 0 ? noteTags : undefined,
      })
      setIsSaving(false)
      setIsDirty(false)
    }, AUTOSAVE_DELAY)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [noteContent, noteTags, isDirty, selectedNoteId])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleContentChange = (val: string) => {
    setNoteContent(val)
    setIsDirty(true)
  }

  const handleSaveNow = useCallback(async () => {
    if (!selectedNoteId) return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    setIsSaving(true)
    await useKanbanStore.getState().updateTask(selectedNoteId, {
      description: noteContent.trim() || undefined,
      tags: noteTags.length > 0 ? noteTags : undefined,
    })
    setIsSaving(false)
    setIsDirty(false)
  }, [selectedNoteId, noteContent, noteTags])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        handleSaveNow()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault()
        setViewMode(v => v === "edit" ? "preview" : v === "preview" ? "split" : "edit")
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "d") {
        e.preventDefault()
        setDocWidthMode(v => !v)
      }
      if (e.key === "Escape" && focusMode) setFocusMode(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [focusMode, noteContent, noteTags, selectedNoteId, handleSaveNow])

  const handleExportPdf = useCallback(() => {
    if (!selectedNote) return
    try {
      const escapedMd = noteContent
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$/g, '\\$')

      const tagsHtml = noteTags.length > 0
        ? noteTags.map(t => `<span class="tag">#${t}</span>`).join('') : ''

      const metaParts = [
        selectedNote.data?.category ? `<span>📁 ${selectedNote.data.category}</span>` : '',
        `<span>🗓 ${new Date(selectedNote.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>`,
        `<span>📝 ${noteContent.trim().split(/\s+/).filter(Boolean).length} words</span>`,
      ].filter(Boolean).join(' &nbsp;·&nbsp; ')

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${selectedNote.title}</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
    *, *::before, *::after { box-sizing: border-box; }
    @page { margin: 20mm 22mm; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-bar { display: none !important; }
    }
    body { font-family: 'Inter', -apple-system, sans-serif; font-size: 15px; line-height: 1.75; color: #1a1a2e; max-width: 780px; margin: 0 auto; padding: 40px 20px 100px; background: #fff; }
    .doc-header { margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb; }
    .doc-title { font-size: 30px; font-weight: 700; line-height: 1.2; color: #0f172a; margin: 0 0 10px; letter-spacing: -0.03em; }
    .doc-meta { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
    .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 8px; }
    .tag { font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px; background: #f0f4ff; color: #3b4fc8; border: 1px solid #c7d2f7; }
    h1, h2, h3, h4, h5, h6 { font-weight: 700; line-height: 1.3; color: #0f172a; margin-top: 1.8em; margin-bottom: 0.5em; }
    h1 { font-size: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    h2 { font-size: 19px; } h3 { font-size: 16px; } h4 { font-size: 14px; color: #374151; }
    p { margin: 0 0 1em; color: #1e293b; }
    a { color: #2563eb; text-decoration: underline; }
    strong { font-weight: 700; color: #0f172a; } em { font-style: italic; color: #374151; }
    del { text-decoration: line-through; color: #9ca3af; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 0.875em; background: #f1f5f9; color: #be185d; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; }
    pre { background: #0f172a; border-radius: 8px; padding: 16px 18px; overflow-x: auto; margin: 1.2em 0; }
    pre code { background: none; border: none; padding: 0; color: #e2e8f0; font-size: 13px; line-height: 1.6; }
    blockquote { border-left: 3px solid #6366f1; background: #f8f9ff; margin: 1em 0; padding: 10px 16px; border-radius: 0 6px 6px 0; color: #475569; }
    blockquote p { margin: 0; }
    ul, ol { padding-left: 22px; margin: 0.6em 0 1em; } li { margin-bottom: 4px; color: #1e293b; }
    ul li { list-style-type: disc; } ol li { list-style-type: decimal; }
    input[type="checkbox"] { appearance: none; -webkit-appearance: none; width: 13px; height: 13px; border: 1.5px solid #9ca3af; border-radius: 3px; vertical-align: middle; margin-right: 5px; position: relative; top: -1px; background: #fff; }
    input[type="checkbox"]:checked { background: #6366f1; border-color: #6366f1; }
    .task-list-item { list-style: none; margin-left: -4px; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 14px; border: 1px solid #e2e8f0; }
    th { background: #f8fafc; font-weight: 600; color: #374151; padding: 9px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
    td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; color: #1e293b; }
    tr:last-child td { border-bottom: none; } tr:nth-child(even) td { background: #fafbfc; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.8em 0; }
    img { max-width: 100%; border-radius: 6px; border: 1px solid #e2e8f0; margin: 6px 0; }
    .print-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #0f172a; border-top: 1px solid #1e293b; padding: 10px 20px; display: flex; align-items: center; gap: 10px; z-index: 100; }
    .print-bar-label { flex: 1; font-size: 12px; color: #94a3b8; }
    .btn { border-radius: 7px; padding: 8px 16px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; border: none; }
    .btn-print { background: #6366f1; color: #fff; }
    .btn-print:hover { background: #4f46e5; }
    .btn-dismiss { background: rgba(255,255,255,0.06); color: #94a3b8; border: 1px solid rgba(255,255,255,0.1) !important; }
    .btn-dismiss:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-title">${selectedNote.title}</div>
    <div class="doc-meta">${metaParts}</div>
    ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ''}
  </div>
  <div id="content"></div>
  <div class="print-bar">
    <span class="print-bar-label">Use your browser's print dialog → "Save as PDF" to export.</span>
    <button class="btn btn-dismiss" onclick="window.parent.document.getElementById('__pdf_frame__')?.remove();window.parent.document.getElementById('__pdf_close_btn__')?.remove()">✕ Close</button>
    <button class="btn btn-print" onclick="window.print()">🖨&nbsp; Print / Save as PDF</button>
  </div>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      try {
        marked.use({ gfm: true, breaks: false })
        const raw = \`${escapedMd}\`
        const processed = raw.replace(/\\[\\[([^\\]]+)\\]\\]/g, '<span style="color:#6366f1;text-decoration:underline dotted">$1</span>')
        document.getElementById('content').innerHTML = marked.parse(processed)
        document.querySelectorAll('li').forEach(function(li) {
          if (li.querySelector('input[type="checkbox"]')) li.classList.add('task-list-item')
        })
      } catch(e) {
        document.getElementById('content').textContent = 'Render error: ' + e.message
      }
    })
  </script>
</body>
</html>`

      // Inject into a full-screen iframe on the current page — no popup blocker
      const old = document.getElementById('__pdf_frame__')
      if (old) old.remove()
      const frame = document.createElement('iframe')
      frame.id = '__pdf_frame__'
      frame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:none;z-index:99999;background:#fff;'
      document.body.appendChild(frame)
      const doc = frame.contentDocument || frame.contentWindow?.document
      if (doc) { doc.open(); doc.write(htmlContent); doc.close() }

      // Add a close button rendered outside the iframe so it always works
      const closeBtn = document.createElement('button')
      closeBtn.id = '__pdf_close_btn__'
      closeBtn.textContent = '✕ Close'
      closeBtn.style.cssText = [
        'position:fixed', 'top:14px', 'right:20px', 'z-index:100000',
        'background:rgba(15,23,42,0.95)', 'color:#e2e8f0',
        'border:1px solid rgba(255,255,255,0.15)', 'border-radius:8px',
        'padding:8px 16px', 'font-size:13px', 'font-weight:600',
        'cursor:pointer', 'font-family:inherit', 'letter-spacing:-0.01em',
        'box-shadow:0 4px 16px rgba(0,0,0,0.5)',
      ].join(';')
      closeBtn.onclick = () => {
        document.getElementById('__pdf_frame__')?.remove()
        document.getElementById('__pdf_close_btn__')?.remove()
      }
      document.body.appendChild(closeBtn)
    } catch (err) {
      console.error('Export failed:', err)
    }
  }, [selectedNote, noteContent, noteTags])

  const handleWikiLinkClick = useCallback((title: string) => {
    const found = noteTasks.find(t => t.title.toLowerCase() === title.toLowerCase())
    if (found) setSelectedNoteId(found.id)
  }, [noteTasks])

  const handleDeleteNote = async () => { setShowDeleteDialog(true) }

  const handleToggleFavourite = async () => {
    if (!selectedNoteId || !selectedNote) return
    const isFav = !!(selectedNote.data?.favourite as boolean)
    await useKanbanStore.getState().updateTask(selectedNoteId, {
      data: { ...selectedNote.data, favourite: !isFav },
    })
  }

  const confirmDeleteNote = async () => {
    if (!selectedNoteId) return
    await useKanbanStore.getState().deleteTask(selectedNoteId)
    setSelectedNoteId(undefined); setNoteContent("")
    setShowDeleteDialog(false)
  }

  const confirmEditTitle = async (newTitle: string) => {
    if (!selectedNoteId || !newTitle.trim()) return
    await useKanbanStore.getState().updateTask(selectedNoteId, { title: newTitle.trim() })
    setShowEditTitleDialog(false)
  }

  const handleCreateNote = (cat: string) => { setPendingCategory(cat); setShowCreateDialog(true) }

  const handleConfirmCreate = async (title: string, category: string) => {
    if (!title.trim() || !activeBoard) return
    // Each category maps to a column of the same name — find or create it
    const colName = category.trim() || "Notes"
    let col = columns.find(c => c.boardId === activeBoard.id && c.name === colName)
    if (!col) {
      await useKanbanStore.getState().createColumn(activeBoard.id, colName)
      col = useKanbanStore.getState().columns.find(c => c.boardId === activeBoard.id && c.name === colName)
    }
    const colId = col?.id ?? columns.find(c => c.boardId === activeBoard.id)?.id
    if (!colId) return
    await useKanbanStore.getState().createTask(colId, title.trim(), {
      type: "note", data: { category: colName },
    })
    setShowCreateDialog(false)
    const newNote = useKanbanStore.getState().tasks.find(t => t.title === title.trim() && t.type === "note")
    if (newNote) setSelectedNoteId(newNote.id)
  }

  const handleRenameCategory = async (oldCat: string, newCat: string) => {
    // Update all notes in the category
    const affected = noteTasks.filter(t =>
      ((t.data?.category as string) === oldCat) || (!t.data?.category && oldCat === "Uncategorized")
    )
    for (const t of affected) {
      await useKanbanStore.getState().updateTask(t.id, {
        data: { ...t.data, category: newCat === "Uncategorized" ? undefined : newCat }
      })
    }
    // Also rename the matching column so column name stays in sync
    if (activeBoard) {
      const col = columns.find(c => c.boardId === activeBoard.id && c.name === oldCat)
      if (col) await useKanbanStore.getState().updateColumn({ ...col, name: newCat })
    }
    setEditingCategory(null)
  }

  const handleDeleteCategory = (cat: string) => { setDeletingCategory(cat); setShowDeleteCategoryDialog(true) }

  const confirmDeleteCategory = async () => {
    if (!deletingCategory) return
    const toDelete = noteTasks.filter(t => ((t.data?.category as string) || "Uncategorized") === deletingCategory)
    for (const n of toDelete) await useKanbanStore.getState().deleteTask(n.id)
    setDeletingCategory(null); setShowDeleteCategoryDialog(false)
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-")
    if (t && !noteTags.includes(t)) { setNoteTags(p => [...p, t]); setIsDirty(true) }
    setTagInput("")
  }

  // ── Textarea key handling ──────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta  = e.currentTarget
    const val = noteContent

    if (e.key === "Tab") {
      e.preventDefault()
      const res = insertAtCursor(ta, val, "  ")
      setNoteContent(res.value)
      requestAnimationFrame(() => ta.setSelectionRange(res.cursor, res.cursor))
      setIsDirty(true)
      return
    }

    if (e.key === "Enter" && !e.shiftKey) {
      const result = smartEnter(val, ta.selectionStart)
      if (result) {
        e.preventDefault()
        setNoteContent(result.newValue)
        requestAnimationFrame(() => ta.setSelectionRange(result.newCursor, result.newCursor))
        setIsDirty(true)
        return
      }
    }
  }

  // ── Image paste / drag-and-drop ────────────────────────────────────────────
  // ── Toolbar action ─────────────────────────────────────────────────────────
  const applyToolbar = (toolbarItem: typeof TOOLBAR[0]) => {
    const ta = textareaRef.current
    if (!ta) return
    const result = toolbarItem.action(ta, noteContent)
    if (!result) return
    setNoteContent(result.value)
    setIsDirty(true)
    requestAnimationFrame(() => {
      ta.focus()
      ta.setSelectionRange(result.cursor, result.cursor)
    })
  }

  // ── Render note item for sidebar ───────────────────────────────────────────
  const renderNoteItem = (task: Task) => {
    const isSelected = selectedNoteId === task.id
    return (
      <div
        style={{
          padding: "7px 10px",
          borderRadius: 7,
          cursor: "pointer",
          backgroundColor: isSelected ? "rgba(96,165,250,0.12)" : "transparent",
          border: isSelected ? "1px solid rgba(96,165,250,0.25)" : "1px solid transparent",
          transition: "background-color 0.12s, border-color 0.12s",
        }}
        onMouseEnter={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)" }}
        onMouseLeave={e => { if (!isSelected) e.currentTarget.style.backgroundColor = "transparent" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {!!(task.data?.favourite as boolean) && (
            <span style={{ fontSize: 9, color: "#f59e0b", flexShrink: 0 }}>★</span>
          )}
          <div style={{
            fontSize: 13, fontWeight: isSelected ? 600 : 500,
            color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {task.title || "Untitled Note"}
          </div>
        </div>
        {task.description && (
          <div style={{
            fontSize: 11, color: "var(--text-muted)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            marginTop: 2,
          }}>
            {task.description.slice(0, 50)}…
          </div>
        )}
        {task.tags && task.tags.length > 0 && (
          <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
            {task.tags.slice(0, 3).map(tag => {
              const c = tagColorClasses(tag)
              return (
                <span key={tag}
                  className={`${c.bg} ${c.border} ${c.text}`}
                  style={{ fontSize: 9, padding: "1px 5px", borderRadius: 4, border: "1px solid" }}>
                  #{tag}
                </span>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div style={{
        display: "flex", height: "100%", overflow: "hidden",
        fontFamily: "'DM Sans', sans-serif",
        backgroundColor: "var(--bg-app)",
      }}>

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        {!focusMode && (
          <div style={{
            width: sidebarCollapsed ? 48 : 260,
            flexShrink: 0,
            display: "flex", flexDirection: "column",
            borderRight: "1px solid var(--border)",
            backgroundColor: "var(--bg-column-solid, rgba(255,255,255,0.01))",
            transition: "width 0.2s ease",
            overflow: "hidden",
          }}>
            {/* Sidebar header */}
            <div style={{
              padding: "10px 10px 10px 14px",
              borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 6,
              flexShrink: 0,
            }}>
              {!sidebarCollapsed && (
                <>
                  <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", flex: 1 }}>
                    Notes
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginLeft: 6 }}>
                      {noteTasks.length}
                    </span>
                  </span>
                  <SidebarIconBtn title="New note" onClick={() => { setPendingCategory(""); setShowCreateDialog(true) }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 3v10M3 8h10" />
                    </svg>
                  </SidebarIconBtn>
                </>
              )}
              <SidebarIconBtn
                title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                onClick={() => setSidebarCollapsed(v => !v)}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                    d={sidebarCollapsed ? "M6 4l4 4-4 4" : "M10 4l-4 4 4 4"} />
                </svg>
              </SidebarIconBtn>
            </div>

            {/* Sidebar search */}
            {!sidebarCollapsed && (
              <div style={{ padding: "8px 10px", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <svg style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
                    className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                    <circle cx="7" cy="7" r="4" strokeWidth={1.75} />
                    <path d="M10.5 10.5l2.5 2.5" strokeLinecap="round" strokeWidth={1.75} />
                  </svg>
                  <input
                    value={sidebarSearch}
                    onChange={e => setSidebarSearch(e.target.value)}
                    placeholder="Search notes…"
                    style={{
                      width: "100%", paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6,
                      borderRadius: 7, border: "1px solid var(--border)",
                      backgroundColor: "var(--bg-input)", color: "var(--text-primary)",
                      fontSize: 12, outline: "none",
                    }}
                  />
                </div>
              </div>
            )}

            {/* Collapsed icon strip — one avatar per note */}
            {sidebarCollapsed && noteTasks.length > 0 && (
              <div style={{ flex: 1, overflowY: "auto", padding: "6px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                {noteTasks.map(task => {
                  const isSelected = selectedNoteId === task.id
                  const letters = task.title.trim().slice(0, 2).toUpperCase() || "?"
                  return (
                    <div
                      key={task.id}
                      title={task.title}
                      onClick={() => { setSelectedNoteId(task.id); setViewMode(v => v === "edit" ? "edit" : "preview") }}
                      style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                        backgroundColor: isSelected ? "rgba(96,165,250,0.2)" : "rgba(255,255,255,0.05)",
                        border: isSelected ? "1px solid rgba(96,165,250,0.4)" : "1px solid transparent",
                        color: isSelected ? "var(--accent, #60a5fa)" : "var(--text-muted)",
                        fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
                        transition: "background-color 0.12s, border-color 0.12s, color 0.12s",
                        userSelect: "none",
                      }}
                      onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "var(--text-primary)" } }}
                      onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)"; e.currentTarget.style.color = "var(--text-muted)" } }}
                    >
                      {letters}
                    </div>
                  )
                })}
                {/* New note button at bottom of strip */}
                <div
                  title="New note"
                  onClick={() => { setPendingCategory(""); setShowCreateDialog(true) }}
                  style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0, marginTop: 4,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    border: "1px dashed rgba(255,255,255,0.12)",
                    color: "var(--text-muted)",
                    transition: "background-color 0.12s, border-color 0.12s, color 0.12s",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.1)"; e.currentTarget.style.borderColor = "rgba(96,165,250,0.3)"; e.currentTarget.style.color = "var(--accent, #60a5fa)" }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.color = "var(--text-muted)" }}
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 12 12" width={12} height={12}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 2v8M2 6h8" />
                  </svg>
                </div>
              </div>
            )}

            {/* Notes tree */}
            {!sidebarCollapsed && (
              <div style={{ flex: 1, overflowY: "auto", padding: "0 6px 12px" }}>
                {noteTasks.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 16px", color: "var(--text-muted)" }}>
                    <p style={{ fontSize: 13, marginBottom: 12 }}>No notes yet</p>
                    <button
                      onClick={() => { setPendingCategory("General"); setShowCreateDialog(true) }}
                      style={{
                        padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                        backgroundColor: "rgba(96,165,250,0.15)", color: "var(--accent, #60a5fa)",
                        border: "1px solid rgba(96,165,250,0.25)", cursor: "pointer",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.25)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.15)")}
                    >
                      Create first note
                    </button>
                  </div>
                ) : (
                  <>
                  {/* ── Favourites section ───────────────────────────── */}
                  {noteTasks.some(t => !!(t.data?.favourite as boolean)) && (() => {
                    const favNotes = noteTasks.filter(t => !!(t.data?.favourite as boolean))
                    return (
                      <FavouritesSection
                        notes={favNotes}
                        selectedNoteId={selectedNoteId}
                        onSelect={(id) => { setSelectedNoteId(id); setViewMode(v => v === "edit" ? "edit" : "preview") }}
                        renderNoteItem={renderNoteItem}
                      />
                    )
                  })()}

                  {/* ── All categories ────────────────────────────────────── */}
                  <ExplorerTree<Task>
                    items={noteTasks}
                    groupKey={(item: Task) => (item.data?.category as string) || "Uncategorized"}
                    renderItem={renderNoteItem}
                    onCreate={handleCreateNote}
                    onItemSelect={(item) => { setSelectedNoteId(item.id); setViewMode(v => v === "edit" ? "edit" : "preview") }}
                    renderGroupHeader={(groupLabel, groupItems, onCreate, isExpanded, onToggle) => (
                      <div
                        className="group"
                        style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 6px 3px" }}
                      >
                        {/* Collapse chevron */}
                        <button
                          onClick={onToggle}
                          title={isExpanded ? "Collapse" : "Expand"}
                          style={{
                            padding: 2, borderRadius: 4, border: "none", cursor: "pointer",
                            backgroundColor: "transparent", color: "var(--text-muted)",
                            display: "flex", alignItems: "center", flexShrink: 0,
                            transition: "color 0.1s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = "var(--text-primary)" }}
                          onMouseLeave={e => { e.currentTarget.style.color = "var(--text-muted)" }}
                        >
                          <svg
                            style={{ transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)" }}
                            width={10} height={10} fill="none" stroke="currentColor" viewBox="0 0 10 10"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 2l4 3-4 3" />
                          </svg>
                        </button>

                        <span
                          onClick={onToggle}
                          style={{
                            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.08em", color: "var(--text-muted)", flex: 1,
                            cursor: "pointer", userSelect: "none",
                          }}
                        >
                          {groupLabel} <span style={{ fontWeight: 500, opacity: 0.7 }}>({groupItems.length})</span>
                        </span>

                        <button
                          onClick={() => setEditingCategory(groupLabel)}
                          title="Rename category"
                          className="opacity-0 group-hover:opacity-100"
                          style={{
                            padding: 3, borderRadius: 4, border: "none", cursor: "pointer",
                            backgroundColor: "transparent", color: "var(--text-muted)",
                            transition: "background-color 0.1s, color 0.1s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--text-primary)" }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)" }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 12 12">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 1.5l2.5 2.5L3 11.5H0.5V9L8 1.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onCreate?.(groupLabel)}
                          title={`New note in ${groupLabel}`}
                          className="opacity-0 group-hover:opacity-100"
                          style={{
                            padding: 3, borderRadius: 4, border: "none", cursor: "pointer",
                            backgroundColor: "transparent", color: "var(--text-muted)",
                            transition: "background-color 0.1s, color 0.1s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.12)"; e.currentTarget.style.color = "var(--accent, #60a5fa)" }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)" }}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 12 12">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 2v8M2 6h8" />
                          </svg>
                        </button>
                      </div>
                    )}
                  />
                  </>
                )}
              </div>
            )}

            {/* Collapsed sidebar — just icons */}
            {sidebarCollapsed && (
              <div style={{ padding: "8px 6px", display: "flex", flexDirection: "column", gap: 4 }}>
                <SidebarIconBtn title="New note" onClick={() => { setSidebarCollapsed(false); setPendingCategory(""); setShowCreateDialog(true) }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 3v10M3 8h10" />
                  </svg>
                </SidebarIconBtn>
              </div>
            )}
          </div>
        )}

        {/* ── Editor area ───────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
          {selectedNote ? (
            <>
              {/* ── Note header ─────────────────────────────────────────────── */}
              <div style={{
                flexShrink: 0,
                borderBottom: "1px solid var(--border)",
                backgroundColor: "var(--bg-app)",
                padding: "10px 20px 0",
              }}>
                {/* Title row */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {focusMode && (
                    <button onClick={() => setFocusMode(false)}
                      style={{
                        padding: "4px 8px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                        backgroundColor: "transparent", border: "1px solid var(--border)",
                        color: "var(--text-muted)", cursor: "pointer",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)")}
                      onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                    >← Exit focus</button>
                  )}
                  <h1
                    onDoubleClick={() => setShowEditTitleDialog(true)}
                    title="Double-click to rename"
                    style={{
                      fontSize: 18, fontWeight: 700, color: "var(--text-primary)",
                      flex: 1, cursor: "text", userSelect: "none",
                      letterSpacing: "-0.02em",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}
                  >
                    {selectedNote.title}
                  </h1>

                  {/* Status indicators */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {isSaving ? (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Saving…</span>
                    ) : isDirty ? (
                      <span style={{ fontSize: 11, color: "#f97316" }}>Unsaved</span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#22c55e" }}>Saved</span>
                    )}

                    {/* View mode toggle */}
                    <div style={{
                      display: "flex", backgroundColor: "var(--bg-popover)",
                      borderRadius: 7, padding: 3, border: "1px solid var(--border)", gap: 1,
                    }}>
                      {(["edit", "split", "preview"] as const).map(m => (
                        <ViewToggleBtn key={m} active={viewMode === m} onClick={() => setViewMode(m)}>
                          {m === "edit" ? "Edit" : m === "split" ? "Split" : "Preview"}
                        </ViewToggleBtn>
                      ))}
                    </div>

                    {/* Export PDF */}
                    <HeaderBtn title="Export as PDF" onClick={handleExportPdf}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M7 1.5v6m0 0L4.5 5m2.5 2.5L9.5 5" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M1.5 9.5v1A2 2 0 003.5 12.5h7a2 2 0 002-2v-1" />
                      </svg>
                    </HeaderBtn>

                    {/* Doc / A4 width toggle */}
                    <HeaderBtn
                      title={docWidthMode ? "Full width" : "Doc width — A4 centered (⌘⇧D)"}
                      active={docWidthMode}
                      onClick={() => setDocWidthMode(v => !v)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                        <rect x="1" y="1" width="12" height="12" rx="1.5" strokeWidth={1.5} />
                        <path strokeLinecap="round" strokeWidth={1.5} d="M3.5 4.5h7M3.5 7h7M3.5 9.5h4.5" />
                      </svg>
                    </HeaderBtn>

                    {/* Focus mode */}
                    <HeaderBtn
                      title="Focus mode (Esc to exit)"
                      active={focusMode}
                      onClick={() => setFocusMode(v => !v)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M2 5V2h3M9 2h3v3M12 9v3H9M5 12H2V9" />
                      </svg>
                    </HeaderBtn>

                    {/* Save now */}
                    <HeaderBtn title="Save (⌘S)" onClick={handleSaveNow} disabled={!isDirty}>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M11 12H3a1 1 0 01-1-1V3a1 1 0 011-1h6l3 3v7a1 1 0 01-1 1z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M9 12V8H5v4M5 2v3h5" />
                      </svg>
                    </HeaderBtn>

                    {/* Favourite */}
                    <HeaderBtn
                      title={selectedNote.data?.favourite ? "Remove from favourites" : "Add to favourites"}
                      active={!!(selectedNote.data?.favourite)}
                      onClick={handleToggleFavourite}
                    >
                      <svg className="w-3.5 h-3.5" fill={selectedNote.data?.favourite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 14 14"
                        style={{ color: selectedNote.data?.favourite ? "#f59e0b" : undefined }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M7 1.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L7 9.6l-3.2 1.8.6-3.6L1.8 5.3l3.6-.5z" />
                      </svg>
                    </HeaderBtn>

                    {/* Delete */}
                    <HeaderBtn title="Delete note" onClick={handleDeleteNote} danger>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 14 14">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                          d="M2 2l10 10M12 2L2 12" />
                      </svg>
                    </HeaderBtn>
                  </div>
                </div>

                {/* Tags row */}
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", paddingBottom: 10 }}>
                  {noteTags.map(tag => {
                    const c = tagColorClasses(tag)
                    return (
                      <span key={tag}
                        className={`${c.bg} ${c.border} ${c.text}`}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          fontSize: 11, padding: "2px 8px", borderRadius: 5, border: "1px solid",
                          fontWeight: 500,
                        }}>
                        #{tag}
                        <button
                          onClick={() => { setNoteTags(p => p.filter(t => t !== tag)); setIsDirty(true) }}
                          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1, opacity: 0.6, color: "inherit" }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                          onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
                        >✕</button>
                      </span>
                    )
                  })}

                  {/* Quick tag pills */}
                  {PREDEFINED_TAGS.filter(t => !noteTags.includes(t)).slice(0, 5).map(tag => (
                    <button key={tag}
                      onClick={() => { setNoteTags(p => [...p, tag]); setIsDirty(true) }}
                      style={{
                        fontSize: 11, padding: "2px 7px", borderRadius: 5, cursor: "pointer",
                        backgroundColor: "transparent", color: "var(--text-muted)",
                        border: "1px dashed var(--border)", fontWeight: 500,
                        transition: "background-color 0.1s, color 0.1s, border-color 0.1s",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderStyle = "solid" }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--text-muted)"; e.currentTarget.style.borderStyle = "dashed" }}
                    >+{tag}</button>
                  ))}

                  {/* Custom tag input */}
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag() } }}
                    placeholder="Add tag…"
                    style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 5,
                      backgroundColor: "var(--bg-input)", border: "1px solid var(--border)",
                      color: "var(--text-primary)", outline: "none", width: 90,
                    }}
                  />
                </div>

                {/* Markdown toolbar */}
                {viewMode !== "preview" && (
                  <div style={{
                    display: "flex", gap: 2, flexWrap: "wrap",
                    borderTop: "1px solid var(--border)",
                    paddingTop: 6, paddingBottom: 6,
                  }}>
                    {TOOLBAR.map((item, i) => {
                      if (item.title === "sep") {
                        return <div key={i} style={{ width: 1, height: 18, backgroundColor: "var(--border)", margin: "0 2px", alignSelf: "center" }} />
                      }
                      return (
                        <ToolbarBtn key={i} title={item.title} onMouseDown={e => { e.preventDefault(); applyToolbar(item) }}>
                          {item.label}
                        </ToolbarBtn>
                      )
                    })}
                    <div style={{ flex: 1 }} />
                    <span style={{ fontSize: 10, color: "var(--text-muted)", alignSelf: "center", paddingRight: 4, whiteSpace: "nowrap" }}>
                      {wordCountInfo.words}w · {wordCountInfo.chars}c · {wordCountInfo.lines}L
                    </span>
                  </div>
                )}
              </div>

              {/* ── Editor / Preview panes ─────────────────────────────────── */}
              <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden", position: "relative" }}>

                {/* Edit pane */}
                {(viewMode === "edit" || viewMode === "split") && (
                  <div style={{
                    flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0,
                    borderRight: viewMode === "split" ? "1px solid var(--border)" : "none",
                    overflow: "hidden", position: "relative",
                  }}>
                    {docWidthMode ? (
                      // Doc-width: scrollable wrapper with centered max-width column
                      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, position: "relative" }}>
                        <div style={{ maxWidth: 760, margin: "0 auto", minHeight: "100%", display: "flex", flexDirection: "column" }}>
                          <textarea
                            ref={textareaRef}
                            value={noteContent}
                            onChange={e => handleContentChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Start writing…"
                            spellCheck
                            style={{
                              flex: 1, width: "100%",
                              resize: "none", border: "none", outline: "none",
                              backgroundColor: "transparent",
                              color: "var(--text-primary)", fontSize: 15, lineHeight: 1.8,
                              padding: "28px 8px",
                              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                              caretColor: "var(--accent, #60a5fa)",
                              minHeight: "100%",
                            }}
                          />
                        </div>
                      </div>
                    ) : (
                      <textarea
                        ref={textareaRef}
                        value={noteContent}
                        onChange={e => handleContentChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Start writing… Lists auto-continue on Enter · Tab for indent · ⌘S to save"
                        spellCheck
                        style={{
                          flex: 1,
                          width: "100%",
                          height: "100%",
                          resize: "none", border: "none", outline: "none",
                          backgroundColor: "var(--bg-app)",
                          color: "var(--text-primary)", fontSize: 14, lineHeight: 1.75,
                          padding: "20px 24px",
                          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                          caretColor: "var(--accent, #60a5fa)",
                          overflowY: "auto",
                          boxSizing: "border-box",
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Preview pane */}
                {(viewMode === "preview" || viewMode === "split") && (
                  <div style={{
                    flex: 1, overflowY: "auto", minWidth: 0,
                    padding: docWidthMode ? "0 24px" : "20px 32px",
                    backgroundColor: viewMode === "split" ? "rgba(0,0,0,0.15)" : "var(--bg-app)",
                  }}>
                    <div style={docWidthMode ? { maxWidth: 760, margin: "0 auto", padding: "28px 0" } : {}}>
                    {noteContent.trim() ? (
                      <>
                        <MarkdownPreview content={noteContent} onWikiLinkClick={handleWikiLinkClick} />
                        <BacklinksSection
                          currentNote={selectedNote}
                          allNotes={noteTasks}
                          onNoteClick={setSelectedNoteId}
                        />
                      </>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 14, fontStyle: "italic" }}>
                        Nothing to preview yet…
                      </p>
                    )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ── Empty state ─────────────────────────────────────────────── */
            <div style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
              flexDirection: "column", gap: 16,
            }}>
              <div style={{ textAlign: "center" }}>
                <svg style={{ width: 48, height: 48, color: "var(--text-muted)", margin: "0 auto 16px" }}
                  fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 4h16l8 8v28a4 4 0 01-4 4H12a4 4 0 01-4-4V8a4 4 0 014-4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M28 4v8h8M16 24h16M16 32h10" />
                </svg>
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)", marginBottom: 6 }}>
                  {noteTasks.length === 0 ? "No notes yet" : "Select a note"}
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {noteTasks.length === 0
                    ? "Create your first note to get started"
                    : "Pick a note from the sidebar to view or edit it"}
                </p>
              </div>
              {noteTasks.length === 0 && (
                <button
                  onClick={() => { setPendingCategory("General"); setShowCreateDialog(true) }}
                  style={{
                    padding: "9px 20px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                    backgroundColor: "rgba(96,165,250,0.15)", color: "var(--accent, #60a5fa)",
                    border: "1px solid rgba(96,165,250,0.3)", cursor: "pointer",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.25)")}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(96,165,250,0.15)")}
                >
                  Create first note
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ───────────────────────────────────────────────────────── */}
      <CreateNoteDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onConfirm={handleConfirmCreate}
        title="Create New Note"
        defaultCategory={pendingCategory}
        existingCategories={categories}
      />
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteNote}
        title="Delete Note"
        message="Are you sure you want to delete this note? This action cannot be undone."
        confirmText="Delete" cancelText="Cancel" variant="danger"
      />
      <TextInputDialog
        isOpen={showEditTitleDialog}
        onClose={() => setShowEditTitleDialog(false)}
        onConfirm={confirmEditTitle}
        title="Rename Note"
        label="Note Title"
        placeholder="Enter note title…"
        required
        defaultValue={selectedNote?.title || ""}
      />
      <CategoryEditDialog
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        onRename={handleRenameCategory}
        onDelete={handleDeleteCategory}
        categoryName={editingCategory || ""}
      />
      <ConfirmDialog
        isOpen={showDeleteCategoryDialog}
        onClose={() => setShowDeleteCategoryDialog(false)}
        onConfirm={confirmDeleteCategory}
        title="Delete Category"
        message={`Delete "${deletingCategory}" and all its notes? This cannot be undone.`}
        confirmText="Delete" cancelText="Cancel" variant="danger"
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Small reusable sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SidebarIconBtn({ title, onClick, children }: {
  title: string; onClick: () => void; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={title}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
        backgroundColor: hov ? "rgba(255,255,255,0.08)" : "transparent",
        color: hov ? "var(--text-primary)" : "var(--text-muted)",
        transition: "background-color 0.12s, color 0.12s", flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function HeaderBtn({ title, onClick, disabled, active, danger, children }: {
  title: string; onClick: () => void; disabled?: boolean; active?: boolean; danger?: boolean; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick} title={title} disabled={disabled}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "5px 8px", borderRadius: 7, border: "1px solid",
        cursor: disabled ? "default" : "pointer",
        transition: "background-color 0.12s, color 0.12s, border-color 0.12s, opacity 0.12s",
        opacity: disabled ? 0.35 : 1,
        backgroundColor: active
          ? "rgba(96,165,250,0.15)"
          : hov
            ? danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.07)"
            : "transparent",
        borderColor: active
          ? "rgba(96,165,250,0.3)"
          : hov
            ? danger ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.12)"
            : "var(--border)",
        color: active
          ? "var(--accent, #60a5fa)"
          : hov
            ? danger ? "#ef4444" : "var(--text-primary)"
            : "var(--text-secondary)",
      }}
    >
      {children}
    </button>
  )
}

function ViewToggleBtn({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        padding: "3px 10px", borderRadius: 5, border: "none", cursor: "pointer",
        transition: "background-color 0.1s, color 0.1s",
        backgroundColor: active ? "rgba(255,255,255,0.1)" : hov ? "rgba(255,255,255,0.05)" : "transparent",
        color: active ? "var(--text-primary)" : hov ? "var(--text-secondary)" : "var(--text-muted)",
        fontSize: 11, fontWeight: active ? 600 : 500,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {children}
    </button>
  )
}

// ─── Favourites section ──────────────────────────────────────────────────────

function FavouritesSection({ notes, selectedNoteId, onSelect, renderNoteItem }: {
  notes: import("../../models/Task").Task[]
  selectedNoteId: string | undefined
  onSelect: (id: string) => void
  renderNoteItem: (task: import("../../models/Task").Task) => JSX.Element
}) {
  const [collapsed, setCollapsed] = useState(false)
  return (
    <div style={{ marginBottom: 4 }}>
      {/* Header */}
      <div
        className="group"
        style={{ display: "flex", alignItems: "center", gap: 2, padding: "6px 6px 3px" }}
      >
        <button
          onClick={() => setCollapsed(v => !v)}
          style={{
            padding: 2, borderRadius: 4, border: "none", cursor: "pointer",
            backgroundColor: "transparent", color: "#f59e0b",
            display: "flex", alignItems: "center", flexShrink: 0,
            transition: "color 0.1s",
          }}
        >
          <svg
            style={{ transition: "transform 0.15s", transform: collapsed ? "rotate(0deg)" : "rotate(90deg)" }}
            width={10} height={10} fill="none" stroke="currentColor" viewBox="0 0 10 10"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 2l4 3-4 3" />
          </svg>
        </button>
        <span
          onClick={() => setCollapsed(v => !v)}
          style={{
            fontSize: 10, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: "0.08em", color: "#f59e0b", flex: 1,
            cursor: "pointer", userSelect: "none",
          }}
        >
          ★ Favourites <span style={{ fontWeight: 500, opacity: 0.7 }}>({notes.length})</span>
        </span>
      </div>

      {/* Items */}
      {!collapsed && (
        <div style={{ marginLeft: 20, paddingLeft: 12, borderLeft: "1px solid rgba(245,158,11,0.25)" }}>
          {notes.map(note => (
            <div key={note.id} onClick={() => onSelect(note.id)} style={{ cursor: "pointer" }}>
              {renderNoteItem(note)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ToolbarBtn({ title, onMouseDown, children }: {
  title: string; onMouseDown: (e: React.MouseEvent) => void; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      title={title}
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        padding: "2px 7px", borderRadius: 5, border: "1px solid",
        cursor: "pointer",
        transition: "background-color 0.1s, color 0.1s, border-color 0.1s",
        backgroundColor: hov ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
        borderColor: hov ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)",
        color: hov ? "var(--text-primary)" : "var(--text-muted)",
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  )
}