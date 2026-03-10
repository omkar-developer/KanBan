import type { Task } from "../../models/Task"
import type { Comment as KanbanComment } from "../../models/Comment"
import { useKanbanStore } from "../../state/kanbanStore"
import { useSettingsStore } from "../../state/settingsStore"
import { useState, useRef, useEffect, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { createPortal } from "react-dom"
import TaskModal from "../task/TaskModal"
import DropdownMenu from "../ui/DropdownMenu"
import { tagColorClasses } from "../../utils/tagColors"

interface Props { task: Task }

const priorityMeta = {
  low:      { badge: "", accent: "bg-zinc-700", dot: "bg-zinc-500", show: false },
  medium:   { badge: "bg-sky-500/10 text-sky-400 border border-sky-500/25",      accent: "bg-sky-500",   dot: "bg-sky-400",   show: true },
  high:     { badge: "bg-amber-500/10 text-amber-400 border border-amber-500/25", accent: "bg-amber-500", dot: "bg-amber-400", show: true },
  critical: { badge: "bg-rose-500/10 text-rose-400 border border-rose-500/25",   accent: "bg-rose-500",  dot: "bg-rose-400",  show: true },
}
const typeMeta: Record<string, { icon: string; cardBg: string; labelColor: string }> = {
  task:      { icon: "◇", cardBg: "",                        labelColor: "text-[var(--text-muted,#666670)]"    },
  feature:   { icon: "✦", cardBg: "bg-violet-500/[0.03]",   labelColor: "[color-mix(in_srgb,var(--color-violet) 40%,transparent)]"  },
  bug:       { icon: "⚠", cardBg: "bg-rose-500/[0.04]",     labelColor: "[color-mix(in_srgb,var(--color-rose) 40%,transparent)]"    },
  note:      { icon: "📝", cardBg: "bg-amber-500/[0.03]",   labelColor: "[color-mix(in_srgb,var(--color-amber) 40%,transparent)]"   },
  checklist: { icon: "☑", cardBg: "bg-emerald-500/[0.03]",  labelColor: "[color-mix(in_srgb,var(--color-emerald) 40%,transparent)]" },
}

// ── Attachment helpers ────────────────────────────────────────────────────────
interface AttachmentMeta {
  id: string
  name: string
  mime: string
  data: string   // data URL
  size: number
}

function parseAttachment(raw: string): AttachmentMeta | null {
  try { return JSON.parse(raw) } catch { return null }
}

function isImage(mime: string) { return mime.startsWith("image/") }

function AttachmentThumb({ raw, onRemove }: { raw: string; onRemove: () => void }) {
  const [lightbox, setLightbox] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const att = parseAttachment(raw)
  if (!att) return null

  const img = isImage(att.mime)
  
  // Download file helper
  const downloadFile = () => {
    const link = document.createElement('a')
    link.href = att.data
    link.download = att.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <>
      <div 
        className="group/att relative w-12 h-12 rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.04] flex-shrink-0 cursor-pointer"
        title={att.name}
      >
        {img ? (
          <img 
            src={att.data} 
            alt={att.name} 
            className="w-full h-full object-cover"
            onDoubleClick={() => setLightbox(true)}
          />
        ) : (
          <div 
            className="w-full h-full flex flex-col items-center justify-center gap-0.5 px-1"
            onDoubleClick={() => att.mime.startsWith('text/') && setPreviewOpen(true)}
          >
            <svg className="w-4 h-4 text-[var(--text-muted,#666670)]" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              {att.mime.startsWith('text/') ? (
                // Text file icon
                <path d="M6 2h3l4 4v7H6V2z" />
              ) : (
                // Generic file icon
                <>
                  <rect x="2" y="1" width="10" height="12" rx="1.5" />
                  <path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" strokeLinecap="round" />
                </>
              )}
            </svg>
          </div>
        )}
        
        {/* Overlay actions (only show remove when hovering) */}
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          onPointerDown={e => e.stopPropagation()}
          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-[var(--text-secondary,#a8a8b0)] hover:text-white opacity-0 group-hover/att:opacity-100 transition flex items-center justify-center z-10"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round" />
          </svg>
        </button>

        {/* Download button for all files - visible on hover */}
        <button
          onClick={e => { e.stopPropagation(); downloadFile() }}
          onPointerDown={e => e.stopPropagation()}
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white/10 hover:bg-white/20 text-[var(--text-muted,#666670)] hover:text-[var(--text-primary,#f0f0f0)] opacity-0 group-hover/att:opacity-100 transition flex items-center justify-center z-10"
          title="Download"
        >
          <svg className="w-2.5 h-2.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
            <path d="M7 9V2M4 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 11h10" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Lightbox */}
      {lightbox && img && createPortal(
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90"
          onClick={() => setLightbox(false)}
        >
          <img
            src={att.data}
            alt={att.name}
            className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition"
            onClick={() => setLightbox(false)}
          >
            <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
            </svg>
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-[var(--text-muted,#666670)]">{att.name}</p>
        </div>,
        document.body
      )}

      {/* Text file preview modal */}
      {previewOpen && att.mime.startsWith('text/') && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90"
          onClick={() => setPreviewOpen(false)}>
          <div className="bg-zinc-900 border border-white/10 rounded-xl max-w-2xl w-[90vw] max-h-[80vh] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-[var(--text-primary,#f0f0f0)]">{att.name}</h3>
              <button onClick={() => setPreviewOpen(false)}
                className="text-[var(--text-muted,#666670)] hover:text-[var(--text-secondary,#a8a8b0)] transition">
                <svg className="w-5 h-5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-60px)]">
              <pre className="text-xs text-[var(--text-primary,#f0f0f0)] whitespace-pre-wrap font-mono bg-black/30 rounded-lg p-3 border border-white/05">
                {(() => {
                  try {
                    const base64 = att.data.split(',')[1]
                    return atob(base64)
                  } catch {
                    return 'Failed to decode file content'
                  }
                })()}
              </pre>
            </div>
            <div className="px-4 py-3 border-t border-white/10 flex gap-2">
              <button onClick={() => { setPreviewOpen(false); downloadFile() }}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-[var(--text-primary,#f0f0f0)] transition">
                Download
              </button>
              <button onClick={() => setPreviewOpen(false)}
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs text-[var(--text-muted,#666670)] transition">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Markdown checkbox renderer — per-render counter via ref ──────────────────
// The IIFE approach created one closure at module load, not per render.
// This wrapper component holds a counter that resets each time it mounts.
function CheckboxRenderer({
  desc,
  taskId,
  updateTask,
}: {
  desc: string
  taskId: string
  updateTask: (id: string, updates: { description: string }) => void
}) {
  const counterRef = useRef(-1)
  // Reset on each render cycle so indices are always correct
  counterRef.current = -1

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        input: ({ checked }: { checked?: boolean }) => {
          const myIndex = ++counterRef.current
          return (
            <input
              type="checkbox"
              checked={checked ?? false}
              onChange={() => {
                let count = -1
                const newDesc = desc.replace(
                  /\[( |x)\]/gi,
                  (match) => {
                    count++
                    if (count !== myIndex) return match
                    return checked ? "[ ]" : "[x]"
                  }
                )
                updateTask(taskId, { description: newDesc })
              }}
              className="mr-1 accent-sky-400 cursor-pointer"
              style={{ pointerEvents: "auto" }}
            />
          )
        },
      }}
    >
      {desc}
    </ReactMarkdown>
  )
}

// ── Checklist helpers ─────────────────────────────────────────────────────────
interface SubTask { id: string; text: string; done: boolean }

function parseSubtasks(data?: Record<string, unknown>): SubTask[] {
  try {
    const raw = data?.subtasks
    if (Array.isArray(raw)) return raw as SubTask[]
  } catch { /* */ }
  return []
}

function ChecklistProgress({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="flex items-center gap-2 py-0.5">
      <div className="flex-1 h-1 rounded-full bg-[var(--bg-input,rgba(255,255,255,0.06))] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${pct === 100 ? "bg-emerald-500" : "bg-emerald-500/60"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-[var(--text-muted,#666670)] flex-shrink-0 font-mono">{done}/{total}</span>
    </div>
  )
}

function QuickActions({
  task,
  anchorRef,
  onClose,
  onCommentAdded,
  onAttachmentAdded,
}: {
  task: Task
  anchorRef: React.RefObject<HTMLElement>
  onClose: () => void
  onCommentAdded: (comment: KanbanComment) => void
  onAttachmentAdded: (raw: string) => void
}) {
  const createComment = useKanbanStore(s => s.createComment)
  const [tab, setTab] = useState<"comment" | "attach">("comment")
  const [text, setText] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, left: Math.max(8, r.right - 260) })
    }
  }, [anchorRef])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node) &&
          anchorRef.current && !anchorRef.current.contains(e.target as Node))
        onClose()
    }
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 80)
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler) }
  }, [onClose, anchorRef])

  const submitComment = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const comment: KanbanComment = { id: crypto.randomUUID(), taskId: task.id!, text: trimmed, createdAt: Date.now() }
    await createComment(comment)
    setText("")
    onCommentAdded(comment)
    onClose()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const data = ev.target?.result as string
      const meta: AttachmentMeta = { id: crypto.randomUUID(), name: file.name, mime: file.type, data, size: file.size }
      onAttachmentAdded(JSON.stringify(meta))
      onClose()
    }
    reader.readAsDataURL(file)
  }

  return createPortal(
    <div ref={ref} className="fixed z-[99998] w-64 rounded-xl border border-white/[0.1] shadow-2xl overflow-hidden"
      style={{ background: "var(--bg-popover, #1c1c1c)", top: pos.top, left: pos.left }}
      onPointerDown={e => e.stopPropagation()}
    >
      <div className="flex border-b border-white/[0.07]">
        {(["comment","attach"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 text-[11px] font-semibold transition ${tab === t ? "text-[var(--text-primary,#f0f0f0)] bg-white/[0.05]" : "text-[var(--text-muted,#666670)] hover:text-[var(--text-secondary,#a8a8b0)]"}`}>
            {t === "comment" ? "💬 Comment" : "📎 Attach"}
          </button>
        ))}
      </div>
      {tab === "comment" ? (
        <div className="p-2.5 flex flex-col gap-2">
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment() } }}
            placeholder="Add comment… (Enter to send)"
            className="w-full bg-[var(--bg-input,rgba(255,255,255,0.06))] border border-[var(--border-input,rgba(255,255,255,0.12))] rounded-lg px-2.5 py-2 text-xs text-[var(--text-primary,#f0f0f0)] placeholder-[var(--text-muted,#666670)] outline-none focus:border-[var(--border-focus,rgba(56,189,248,0.35))] resize-none caret-zinc-300"
          />
          <button onClick={submitComment} disabled={!text.trim()}
            className="w-full py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.07] text-[var(--text-primary,#f0f0f0)] border border-[var(--border-input,rgba(255,255,255,0.12))] hover:bg-white/[0.12] disabled:opacity-30 disabled:pointer-events-none transition">
            Send
          </button>
        </div>
      ) : (
        <div className="p-2.5">
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-3 rounded-lg text-[11px] font-medium text-[var(--text-muted,#666670)] border-2 border-dashed border-[var(--border,rgba(255,255,255,0.06))] hover:border-[var(--border-hover,rgba(255,255,255,0.12))] hover:text-[var(--text-primary,#f0f0f0)] transition flex flex-col items-center gap-1.5">
            <svg className="w-5 h-5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M7 9V2M4 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 11h10" strokeLinecap="round" />
            </svg>
            Click to upload file or image
          </button>
        </div>
      )}
    </div>,
    document.body
  )
}

// ── Main TaskCard ─────────────────────────────────────────────────────────────
export default function TaskCard({ task }: Props) {
  const updateTask  = useKanbanStore(s => s.updateTask)
  const deleteTask  = useKanbanStore(s => s.deleteTask)
  const archiveTask = useKanbanStore(s => s.archiveTask)

  const [editingTitle,  setEditingTitle]  = useState(false)
  const [editingDesc,   setEditingDesc]   = useState(false)
  const [descExpanded,  setDescExpanded]  = useState(false)
  const [title,         setTitle]         = useState(task.title)
  const [desc,          setDesc]          = useState(task.description || "")
  const [modalOpen,     setModalOpen]     = useState(false)
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [quickOpen,     setQuickOpen]     = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [commentCount,  setCommentCount]  = useState(0)
  const [attachments,   setAttachments]   = useState<string[]>(task.attachments ?? [])
  const [isAttachmentsExpanded, setIsAttachmentsExpanded] = useState(false)
  const [comments,      setComments]      = useState<KanbanComment[]>([])
  const [showComments,  setShowComments]  = useState(false)

  const menuBtnRef  = useRef<HTMLButtonElement>(null)
  const quickBtnRef = useRef<HTMLButtonElement>(null)
  const getComments = useKanbanStore(s => s.getComments)

  // Load comments and count
  useEffect(() => {
    if (task.id) {
      getComments(task.id).then((c: KanbanComment[]) => {
        setCommentCount(c.length)
        setComments(c)
      })
    }
  }, [task.id, getComments])

  const saveTitle = async () => {
    setEditingTitle(false)
    const trimmed = title.trim()
    if (!trimmed) { setTitle(task.title); return }
    if (trimmed !== task.title) await updateTask(task.id!, { title: trimmed })
  }

  const saveDesc = async () => {
    setEditingDesc(false)
    if (desc !== task.description) await updateTask(task.id!, { description: desc })
  }

  const removeAttachment = async (idx: number) => {
    const next = attachments.filter((_, i) => i !== idx)
    setAttachments(next)
    await updateTask(task.id!, { attachments: next })
  }

  const addAttachment = async (raw: string) => {
    const next = [...attachments, raw]
    setAttachments(next)
    await updateTask(task.id!, { attachments: next })
  }

  const priority = task.priority || "low"
  const meta     = priorityMeta[priority]
  const typeData = typeMeta[task.type ?? "task"] ?? typeMeta.task

  const settings = useSettingsStore(s => s.settings)

  // ── Settings-driven visibility ──────────────────────────────────────────
  const showTags         = settings.ui?.showTags         ?? true
  const showPriority     = settings.ui?.showPriority     ?? true
  const showDueDate      = settings.ui?.showDueDate      ?? true
  const showCommentCount = settings.ui?.showCommentCount ?? true
  const showAttachments  = settings.ui?.showAttachments  ?? true
  const showTypeLabel    = settings.ui?.showTypeLabel    ?? true
  const showAgingStripe  = settings.ui?.showAgingStripe  ?? true

  // useState initialized once — safe to read during render, unlike useRef or Date.now()
  const [now] = useState(() => Date.now())

  const { agingColor, dueColor, dueBg } = useMemo(() => {
    const createdAgeDays = Math.floor((now - task.createdAt) / 86400000)

    let agingColor = ""
    if (showAgingStripe && settings.features.cardAging) {
      if      (createdAgeDays >= settings.thresholds.agingCriticalDays)  agingColor = "bg-rose-500"
      else if (createdAgeDays >= settings.thresholds.agingWarningDays)   agingColor = "bg-amber-500"
    }

    let dueColor = "text-zinc-600"
    let dueBg    = ""
    if (task.dueDate && settings.features.dueDateColors) {
      const diff  = task.dueDate - now
      const hours = diff / 3600000
      if (diff < 0) {
        dueColor = "text-rose-400"; dueBg = "bg-rose-500/10 border border-rose-500/25"
      } else if (hours <= settings.thresholds.dueSoonHours) {
        dueColor = "text-amber-400"; dueBg = "bg-amber-500/10 border border-amber-500/25"
      }
    }

    return { agingColor, dueColor, dueBg }
  }, [
    now, task.createdAt, task.dueDate,
    settings.features.cardAging, settings.features.dueDateColors,
    settings.thresholds.agingCriticalDays, settings.thresholds.agingWarningDays,
    settings.thresholds.dueSoonHours,
    showAgingStripe,
  ])

  // ── Description collapse ────────────────────────────────────────────────
  const maxPreview  = settings.ui?.maxCardDescriptionPreview ?? 280
  const descTooLong = (task.description?.length ?? 0) > maxPreview
  const descToShow  = descTooLong && !descExpanded
    ? task.description!.slice(0, maxPreview) + "…"
    : task.description

  // ── Type-specific derived state ─────────────────────────────────────────
  const isChecklist = task.type === "task" || task.type === "checklist"
    ? task.type === "checklist"
    : false
  const isNote      = task.type === "note"

  // Subtasks live in task.data.subtasks for checklist type
  const [subtasks,    setSubtasksState] = useState<SubTask[]>(() => parseSubtasks(task.data))
  const [newSubInput, setNewSubInput]   = useState("")

  const saveSubtasks = async (next: SubTask[]) => {
    setSubtasksState(next)
    await updateTask(task.id!, { data: { ...task.data, subtasks: next } })
  }

  const toggleSubtask = (id: string) =>
    saveSubtasks(subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s))

  const addSubtask = async () => {
    const text = newSubInput.trim()
    if (!text) return
    const next = [...subtasks, { id: crypto.randomUUID(), text, done: false }]
    setNewSubInput("")
    await saveSubtasks(next)
  }

  const removeSubtask = (id: string) =>
    saveSubtasks(subtasks.filter(s => s.id !== id))

  const doneCount = subtasks.filter(s => s.done).length

  const cardMenu = [
    { label: "Edit task",
      icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.5 2l2.5 2.5L4 12.5H1.5V10L9.5 2z" strokeLinejoin="round" strokeLinecap="round" /></svg>,
      onClick: () => setModalOpen(true) },
    { separator: true } as const,
    { label: "Priority: Medium",   icon: <span className="w-2 h-2 rounded-full bg-sky-400 block" />,   onClick: () => updateTask(task.id!, { priority: "medium" }),   disabled: priority === "medium" },
    { label: "Priority: High",     icon: <span className="w-2 h-2 rounded-full bg-amber-400 block" />, onClick: () => updateTask(task.id!, { priority: "high" }),     disabled: priority === "high" },
    { label: "Priority: Critical", icon: <span className="w-2 h-2 rounded-full bg-rose-400 block" />,  onClick: () => updateTask(task.id!, { priority: "critical" }), disabled: priority === "critical" },
    { label: "Priority: Low",      icon: <span className="w-2 h-2 rounded-full bg-zinc-500 block" />,  onClick: () => updateTask(task.id!, { priority: "low" }),      disabled: priority === "low" },
    { separator: true } as const,
    { label: "Archive task",
      icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="12" height="2.5" rx="0.5"/><path d="M2.5 5.5v6h9v-6" strokeLinecap="round"/><path d="M5 8.5h4" strokeLinecap="round"/></svg>,
      onClick: () => archiveTask(task.id!) },
    { separator: true } as const,
    { label: "Delete task",
      icon: <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.75 7.5h6.5L11 4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
      onClick: () => setConfirmDelete(true), danger: true },
  ]

  if (confirmDelete) {
    return (
      <div className="relative rounded-xl overflow-hidden bg-[#1a1010] border border-rose-500/30 px-4 py-3">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-rose-500" />
        <p className="text-xs text-zinc-300 mb-3 pl-1" style={{ fontFamily: "'DM Sans', sans-serif" }}>
          Delete <span className="text-white font-semibold">"{task.title}"</span>?
        </p>
        <div className="flex gap-2">
          <button onClick={() => deleteTask(task.id!)} className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition">Delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg bg-white/[0.04] text-[var(--text-muted,#666670)] border border-[var(--border,rgba(255,255,255,0.06))] hover:bg-white/[0.08] transition">Cancel</button>
        </div>
      </div>
    )
  }

  const hasFooter = (showPriority && meta.show && !isNote) || (showDueDate && !!task.dueDate) ||
    (showTags && !!task.tags?.length) || (showAttachments && attachments.length > 0) ||
    (showCommentCount && commentCount > 0)

  return (
    <>
      <div className={`group relative rounded-xl overflow-hidden border border-[var(--border,rgba(255,255,255,0.06))] hover:border-[var(--border-hover,rgba(255,255,255,0.12))] transition-colors duration-150 ${typeData.cardBg || "bg-[var(--bg-card,#141414)]"}`}>
        {priority !== "low" && (
          <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${meta.accent}`} />
        )}
        {agingColor && (
          <div className={`absolute right-0 top-0 bottom-0 w-[3px] ${agingColor}`} />
        )}

        <div className="pl-5 pr-3 pt-3 pb-2.5 space-y-2">

          {/* Type label */}
          {showTypeLabel && task.type && task.type !== "task" && (
            <div className="flex items-center gap-1">
              <span className={`text-[10px] ${typeData.labelColor}`}>{typeData.icon}</span>
              <span className={`text-[10px] ${typeData.labelColor} uppercase tracking-wider font-medium`}>{task.type}</span>
            </div>
          )}

          {/* Title row */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <input
                  autoFocus value={title}
                  onChange={e => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onPointerDown={e => e.stopPropagation()}
                  onKeyDown={e => {
                    e.stopPropagation()
                    if (e.key === "Enter")  { e.preventDefault(); saveTitle() }
                    if (e.key === "Escape") { setTitle(task.title); setEditingTitle(false) }
                  }}
                  className="w-full bg-[var(--bg-input,rgba(255,255,255,0.06))] outline-none border border-[var(--border-input,rgba(255,255,255,0.12))] rounded-md text-sm font-semibold text-[var(--text-primary,#f0f0f0)] px-2 py-1 focus:border-[var(--border-focus,rgba(56,189,248,0.35))] focus:ring-1 focus:ring-white/15 caret-white transition"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              ) : (
                <h3
                  onDoubleClick={() => setEditingTitle(true)}
                  className="text-sm font-semibold text-[var(--text-primary,#f0f0f0)] leading-snug line-clamp-3 select-none"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {task.title}
                </h3>
              )}
            </div>

            {/* Controls: quick-add + menu */}
            <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              onPointerDown={e => e.stopPropagation()}>
              {/* Quick add comment/attachment */}
              <button
                ref={quickBtnRef}
                onClick={e => { e.stopPropagation(); setQuickOpen(v => !v) }}
                className="text-[var(--text-muted,#666670)] hover:text-[var(--text-primary,#f0f0f0)] hover:bg-white/[0.06] rounded-md p-1.5 transition"
                title="Quick add"
              >
                <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
                  <path d="M7 2v10M2 7h10" strokeLinecap="round" />
                </svg>
              </button>
              <button
                ref={menuBtnRef}
                onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
                className="text-[var(--text-muted,#666670)] hover:text-[var(--text-primary,#f0f0f0)] hover:bg-white/[0.06] rounded-md p-1.5 transition"
                title="Options"
              >
                <svg className="w-3 h-3" viewBox="0 0 4 14" fill="currentColor">
                  <circle cx="2" cy="2"  r="1.5" />
                  <circle cx="2" cy="7"  r="1.5" />
                  <circle cx="2" cy="12" r="1.5" />
                </svg>
              </button>
              {menuOpen && (
                <DropdownMenu items={cardMenu} onClose={() => setMenuOpen(false)}
                  anchorRef={menuBtnRef as React.RefObject<HTMLElement>} align="right" />
              )}
            </div>
          </div>

          {/* Description */}
          {task.description && (
            <div
              onDoubleClick={() => !editingDesc && setEditingDesc(true)}
              onPointerDown={e => editingDesc && e.stopPropagation()}
            >
              {editingDesc ? (
                <textarea
                  autoFocus value={desc}
                  onChange={e => setDesc(e.target.value)}
                  onBlur={saveDesc}
                  onPointerDown={e => e.stopPropagation()}
                  onKeyDown={e => {
                    e.stopPropagation()
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveDesc() }
                    if (e.key === "Escape") { setDesc(task.description || ""); setEditingDesc(false) }
                  }}
                  rows={3}
                  className="w-full bg-[var(--bg-input,rgba(255,255,255,0.06))] border border-[var(--border-input,rgba(255,255,255,0.12))] rounded-md text-xs text-[var(--text-primary,#f0f0f0)] px-2 py-1.5 resize-none outline-none focus:border-[var(--border-focus,rgba(56,189,248,0.35))] focus:ring-1 focus:ring-white/15 caret-white transition leading-relaxed"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                />
              ) : (
                <div className="text-xs text-[var(--text-secondary,#a8a8b0)] leading-relaxed cursor-default prose prose-sm max-w-none
                  [&_p]:my-0.5 [&_p]:leading-relaxed
                  [&_ul]:my-1 [&_ul]:pl-4 [&_ul]:list-disc
                  [&_ol]:my-1 [&_ol]:pl-4 [&_ol]:list-decimal
                  [&_li]:my-0.5 [&_li]:text-[var(--text-secondary,#a8a8b0)]
                  [&_h1]:text-xs [&_h1]:font-semibold [&_h1]:text-[var(--text-primary,#f0f0f0)] [&_h1]:my-1
                  [&_h2]:text-xs [&_h2]:font-semibold [&_h2]:text-[var(--text-primary,#f0f0f0)] [&_h2]:my-1
                  [&_h3]:text-xs [&_h3]:font-semibold [&_h3]:text-[var(--text-primary,#f0f0f0)] [&_h3]:my-1
                  [&_strong]:text-[var(--text-primary,#f0f0f0)] [&_em]:text-[var(--text-secondary,#a8a8b0)]
                  [&_blockquote]:border-l-2 [&_blockquote]:border-[var(--border,rgba(255,255,255,0.06))] [&_blockquote]:pl-2 [&_blockquote]:text-[var(--text-secondary,#a8a8b0)] [&_blockquote]:my-1
                  [&_code]:bg-[var(--bg-column-solid,#121212)] [&_code]:text-emerald-400 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[11px]
                  [&_pre]:bg-[var(--bg-card,#141414)] [&_pre]:border [&_pre]:border-[var(--border,rgba(255,255,255,0.06))] [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:mt-1.5
                  [&_pre_code]:bg-transparent [&_pre_code]:text-emerald-400 [&_pre_code]:p-0
                  [&_input]:mr-1 [&_input]:accent-sky-400
                  hover:text-[var(--text-primary,#f0f0f0)] transition-colors"
                  onPointerDown={e => e.stopPropagation()}>
                  <CheckboxRenderer
                    desc={descToShow ?? ""}
                    taskId={task.id!}
                    updateTask={(id, upd) => updateTask(id, upd)}
                  />
                  {descTooLong && (
                    <button
                      onClick={e => { e.stopPropagation(); setDescExpanded(v => !v) }}
                      className="mt-1 text-[10px] text-[var(--text-muted,#666670)] hover:text-sky-400 transition"
                    >
                      {descExpanded ? "↑ Show less" : "↓ Show more"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Checklist type: progress bar + inline subtask manager ── */}
          {isChecklist && (
            <div className="space-y-2" onPointerDown={e => e.stopPropagation()}>
              {subtasks.length > 0 && (
                <>
                  <ChecklistProgress done={doneCount} total={subtasks.length} />
                  <div className="space-y-1">
                    {subtasks.map(s => (
                      <div key={s.id} className="flex items-center gap-2 group/sub">
                        <button
                          onClick={() => toggleSubtask(s.id)}
                          className={`w-3.5 h-3.5 rounded flex-shrink-0 border transition-all flex items-center justify-center ${
                            s.done
                              ? "bg-emerald-500 border-emerald-500"
                              : "border-white/20 hover:border-emerald-500/60"
                          }`}
                        >
                          {s.done && (
                            <svg className="w-2 h-2 text-white" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 4l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                        <span className={`text-xs flex-1 leading-tight transition-colors ${s.done ? "line-through text-[var(--text-muted,#666670)]" : "text-[var(--text-secondary,#a8a8b0)]"}`}>
                          {s.text}
                        </span>
                        <button
                          onClick={() => removeSubtask(s.id)}
                          className="opacity-0 group-hover/sub:opacity-100 text-[var(--text-muted,#666670)] hover:text-rose-400 transition p-0.5 rounded"
                        >
                          <svg className="w-2.5 h-2.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {/* Add subtask input */}
              <div className="flex items-center gap-1.5">
                <input
                  value={newSubInput}
                  onChange={e => setNewSubInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSubtask() } }}
                  placeholder="Add subtask…"
                  className="flex-1 bg-transparent text-[11px] text-[var(--text-secondary,#a8a8b0)] placeholder-[var(--text-muted,#666670)] outline-none border-b border-[var(--border,rgba(255,255,255,0.06))] focus:border-[var(--border-focus,rgba(56,189,248,0.35))] py-0.5 transition caret-zinc-400"
                  style={{ fontFamily: "inherit" }}
                />
                <button
                  onClick={addSubtask}
                  disabled={!newSubInput.trim()}
                  className="text-[var(--text-muted,#666670)] hover:text-emerald-400 disabled:pointer-events-none transition"
                >
                  <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M7 2v10M2 7h10" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Attachment and comment buttons combined */}
          {((showAttachments && attachments.length > 0) || (showCommentCount && commentCount > 0)) && (
            <div className="pt-0.5 flex items-center gap-2 flex-wrap" onPointerDown={e => e.stopPropagation()}>
              {/* Attachments badge */}
              {showAttachments && attachments.length > 0 && (
                <button
                  onClick={() => setIsAttachmentsExpanded(!isAttachmentsExpanded)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition ${
                    isAttachmentsExpanded 
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                      : 'bg-white/[0.05] text-[var(--text-muted,#666670)] hover:text-[var(--text-secondary,#a8a8b0)] border border-[var(--border,rgba(255,255,255,0.06))]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M9 2H5l-3 3v7h12V2H9z" />
                    <path d="M12 6L7 11.5L2 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {attachments.length}
                </button>
              )}

              {/* Comments badge */}
              {showCommentCount && commentCount > 0 && (
                <button
                  onClick={() => setShowComments(!showComments)}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition ${
                    showComments 
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' 
                      : 'bg-white/[0.05] text-[var(--text-muted,#666670)] hover:text-[var(--text-secondary,#a8a8b0)] border border-[var(--border,rgba(255,255,255,0.06))]'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 5H2l2 4h8l-2 4V5z" strokeLinejoin="round" />
                  </svg>
                  {commentCount}
                </button>
              )}

              {/* Expanded attachments */}
              {isAttachmentsExpanded && (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {attachments.map((raw, i) => (
                    <AttachmentThumb key={i} raw={raw} onRemove={() => removeAttachment(i)} />
                  ))}
                </div>
              )}

              {/* Expanded comments */}
              {showComments && (
                <div className="mt-1 space-y-1.5 w-full max-h-60 overflow-y-auto">
                  {comments.slice(0, 5).map((comment: KanbanComment) => (
                      <div key={comment.id} className="bg-white/[0.04] border border-[var(--border,rgba(255,255,255,0.06))] rounded-lg px-2.5 py-2">
                        <p className="text-xs text-[var(--text-secondary,#a8a8b0)] leading-relaxed whitespace-pre-wrap">{comment.text}</p>
                        <p className="text-[10px] text-[var(--text-muted,#666670)] mt-1.5">
                        {new Date(comment.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer row: tags · priority · due date */}
          {hasFooter && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {/* Tags */}
              {showTags && task.tags?.map(tag => {
                const c = tagColorClasses(tag)
                return (
                  <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-md border ${c.bg} ${c.border} ${c.text}`}>#{tag}</span>
                )
              })}

              {/* Priority badge — hidden for note type */}
              {showPriority && meta.show && !isNote && (
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md ${meta.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </span>
              )}

              {/* Due date — color reflects overdue / due soon */}
              {showDueDate && task.dueDate && (
                <span className={`text-[11px] flex items-center gap-1 ml-auto px-1.5 py-0.5 rounded-md ${dueColor} ${dueBg}`}>
                  <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="1.5" y="2.5" width="11" height="10" rx="1.5" />
                    <path d="M4.5 1v2M9.5 1v2M1.5 6h11" strokeLinecap="round" />
                  </svg>
                  {new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick add popover */}
      {quickOpen && (
        <QuickActions
          task={task}
          anchorRef={quickBtnRef as React.RefObject<HTMLElement>}
          onClose={() => setQuickOpen(false)}
          onCommentAdded={(comment) => {
            setCommentCount(c => c + 1)
            setComments(prev => [...prev, comment])
          }}
          onAttachmentAdded={addAttachment}
        />
      )}

      {/* Full edit modal — portalled so it's never trapped by stacking contexts */}
      {modalOpen && createPortal(
        <TaskModal
          task={task}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={updateTask}
          onDelete={deleteTask}
        />,
        document.body
      )}
    </>
  )
}