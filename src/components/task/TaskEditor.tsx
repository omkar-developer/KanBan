import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from "react"
import type { Task, TaskPriority, TaskType } from "../../models/Task"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { createPortal } from "react-dom"
import { tagColorClasses } from "../../utils/tagColors"

// ── Public handle for parent (TaskModal auto-save) ────────────────────────────
export interface TaskEditorHandle {
  isDirty: () => boolean
  getValues: () => Partial<Task>
}

// ── Attachment types ──────────────────────────────────────────────────────────
interface AttachmentMeta { id: string; name: string; mime: string; data: string; size: number }
function parseAttachment(raw: string): AttachmentMeta | null { try { return JSON.parse(raw) } catch { return null } }
function formatBytes(b: number) { return b < 1024 ? `${b} B` : b < 1048576 ? `${(b/1024).toFixed(1)} KB` : `${(b/1048576).toFixed(1)} MB` }

// ── Constants ─────────────────────────────────────────────────────────────────
const priorityOptions: { value: TaskPriority; label: string; dot: string; bg: string; border: string; text: string }[] = [
  { value: "low",      label: "Low",      dot: "bg-zinc-500",  bg: "bg-zinc-800",     border: "border-zinc-700",     text: "text-zinc-300" },
  { value: "medium",   label: "Medium",   dot: "bg-sky-400",   bg: "bg-sky-500/10",   border: "border-sky-500/30",   text: "text-sky-400"  },
  { value: "high",     label: "High",     dot: "bg-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400" },
  { value: "critical", label: "Critical", dot: "bg-rose-400",  bg: "bg-rose-500/10",  border: "border-rose-500/30",  text: "text-rose-400"  },
]
const typeOptions: { value: TaskType; label: string; icon: string }[] = [
  { value: "task",      label: "Task",      icon: "◇" },
  { value: "feature",   label: "Feature",   icon: "✦" },
  { value: "bug",       label: "Bug",       icon: "⚠" },
  { value: "note",      label: "Note",      icon: "📝" },
  { value: "checklist", label: "Checklist", icon: "☑" },
]

// Predefined tag suggestions for quick selection
const predefinedTags = ["api", "ui", "backend", "frontend", "bug", "feature", "documentation", "security", "performance"] as const
const inputClass = "w-full bg-white/[0.04] border border-white/[0.09] rounded-xl px-3.5 py-2.5 placeholder-white/30 outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10 transition-all leading-relaxed [color-scheme:dark]"
const L = "text-[11px] font-semibold uppercase tracking-widest mb-1.5 block"

// ── Markdown toolbar buttons ──────────────────────────────────────────────────
const toolbarItems = [
  { label: "- [ ]", title: "Checkbox",       insert: "- [ ] ",        wrap: false },
  { label: "- ",    title: "Bullet list",    insert: "- ",            wrap: false },
  { label: "1. ",   title: "Numbered list",  insert: "1. ",           wrap: false },
  { label: "**B**", title: "Bold",           insert: "****",          wrap: true,  cursor: 2 },
  { label: "*I*",   title: "Italic",         insert: "**",            wrap: true,  cursor: 1 },
  { label: "`c`",   title: "Inline code",    insert: "``",            wrap: true,  cursor: 1 },
  { label: "> ",    title: "Blockquote",     insert: "> ",            wrap: false },
]

// ── Utility for inline styles with theme variables ────────────────────────────
const themeVars = {
  textSecondary: { color: "var(--text-secondary)" },
  textMuted: { color: "var(--text-muted)" },
}

// ── Smart Enter: auto-continue lists ─────────────────────────────────────────
function handleSmartEnter(
  value: string,
  selStart: number,
): { newValue: string; newCursor: number } | null {
  const lines  = value.slice(0, selStart).split("\n")
  const line   = lines[lines.length - 1]
  const cbMatch = line.match(/^(\s*- \[[ x]\] )(.*)$/)
  const ulMatch = line.match(/^(\s*[-*+] )(.*)$/)
  const olMatch = line.match(/^(\s*(\d+)\. )(.*)$/)

  if (cbMatch) {
    if (!cbMatch[2]) {
      // Empty checkbox item → remove it and stop list
      const before = value.slice(0, selStart - line.length)
      const after  = value.slice(selStart)
      return { newValue: before + after, newCursor: before.length }
    }
    const prefix = cbMatch[1].replace(/\[x\]/i, "[ ]") // always unchecked
    const newValue = value.slice(0, selStart) + "\n" + prefix + value.slice(selStart)
    return { newValue, newCursor: selStart + 1 + prefix.length }
  }
  if (ulMatch) {
    if (!ulMatch[2]) {
      const before = value.slice(0, selStart - line.length)
      const after  = value.slice(selStart)
      return { newValue: before + after, newCursor: before.length }
    }
    const newValue = value.slice(0, selStart) + "\n" + ulMatch[1] + value.slice(selStart)
    return { newValue, newCursor: selStart + 1 + ulMatch[1].length }
  }
  if (olMatch) {
    if (!olMatch[3]) {
      const before = value.slice(0, selStart - line.length)
      const after  = value.slice(selStart)
      return { newValue: before + after, newCursor: before.length }
    }
    const next   = parseInt(olMatch[2]) + 1
    const prefix = olMatch[1].replace(/\d+/, String(next))
    const newValue = value.slice(0, selStart) + "\n" + prefix + value.slice(selStart)
    return { newValue, newCursor: selStart + 1 + prefix.length }
  }
  return null
}

// ── Component ─────────────────────────────────────────────────────────────────
interface Props { task: Task; onSave: (updates: Partial<Task>) => Promise<void>; onCancel: () => void }

const TaskEditor = forwardRef<TaskEditorHandle, Props>(function TaskEditor({ task, onSave, onCancel }, ref) {
  const [title,       setTitle]       = useState(task.title)
  const [desc,        setDesc]        = useState(task.description || "")
  const [priority,    setPriority]    = useState<TaskPriority>(task.priority || "low")
  const [type,        setType]        = useState<TaskType>(task.type || "task")
  const [tags,        setTags]        = useState<string[]>(task.tags || [])
  const [tagInput,    setTagInput]    = useState("")
  const [dueDate,     setDueDate]     = useState<string>(() =>
    task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : ""
  )
  const [attachments, setAttachments] = useState<string[]>(task.attachments ?? [])
  const [previewDesc, setPreviewDesc] = useState(false)
  const [lightbox,    setLightbox]    = useState<AttachmentMeta | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  const fileRef    = useRef<HTMLInputElement>(null)
  const descRef    = useRef<HTMLTextAreaElement>(null)

  // ── Inline styles with theme variables ──────────────────────────────────────
  const getStyles = () => ({
    label: themeVars.textSecondary,
    input: { backgroundColor: "var(--bg-input)" },
    toolbarBtn: { color: "var(--text-muted)", backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" },
    buttonDisabled: { opacity: 0.25, pointerEvents: "none" as const },
  })

  const getValues = useCallback((): Partial<Task> => ({
    title:       title.trim(),
    description: desc.trim() || undefined,
    priority, type,
    tags:        tags.length > 0 ? tags : undefined,
    dueDate:     dueDate ? new Date(dueDate).getTime() : undefined,
    attachments: attachments.length > 0 ? attachments : undefined,
  }), [title, desc, priority, type, tags, dueDate, attachments])

  const isDirty = useCallback(() =>
    title.trim()    !== (task.title ?? "") ||
    desc.trim()     !== (task.description ?? "") ||
    priority        !== (task.priority ?? "low") ||
    type            !== (task.type ?? "task") ||
    dueDate         !== (task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "") ||
    JSON.stringify(tags)        !== JSON.stringify(task.tags ?? []) ||
    JSON.stringify(attachments) !== JSON.stringify(task.attachments ?? [])
  , [title, desc, priority, type, dueDate, tags, attachments, task])

  // Expose handle for TaskModal auto-save
  useImperativeHandle(ref, () => ({ isDirty, getValues }), [isDirty, getValues])

  const handleSave = async () => {
    if (!title.trim()) return
    await onSave(getValues())
  }

  const handleCancel = () => {
    if (isDirty()) { setConfirmDiscard(true) } else { onCancel() }
  }

  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "-")
    if (t && !tags.includes(t)) setTags(p => [...p, t])
    setTagInput("")
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files ?? []).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        const data = ev.target?.result as string
        setAttachments(prev => [...prev, JSON.stringify({ id: crypto.randomUUID(), name: file.name, mime: file.type, data, size: file.size })])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }

  // ── Toolbar action ──────────────────────────────────────────────────────────
  const applyToolbar = (item: typeof toolbarItems[0]) => {
    const el = descRef.current
    if (!el) return
    const start = el.selectionStart ?? 0
    const end   = el.selectionEnd   ?? 0
    const sel   = desc.slice(start, end)

    let newDesc: string
    let cursor: number

    if (item.wrap && sel) {
      const half = item.insert.length / 2
      newDesc = desc.slice(0, start) + item.insert.slice(0, half) + sel + item.insert.slice(half) + desc.slice(end)
      cursor  = start + half + sel.length + half
    } else if (item.wrap) {
      newDesc = desc.slice(0, start) + item.insert + desc.slice(end)
      cursor  = start + (item.cursor ?? Math.floor(item.insert.length / 2))
    } else {
      // Check if cursor is at start of line; if not, insert newline first
      const lineStart = desc.lastIndexOf("\n", start - 1) + 1
      const prefix    = lineStart === start || desc.slice(lineStart, start).trim() === "" ? "" : "\n"
      newDesc = desc.slice(0, start) + prefix + item.insert + desc.slice(end)
      cursor  = start + prefix.length + item.insert.length
    }

    setDesc(newDesc)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(cursor, cursor)
    })
  }

  // ── Smart Enter handler ─────────────────────────────────────────────────────
  const handleDescKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      const el    = e.currentTarget
      const result = handleSmartEnter(desc, el.selectionStart)
      if (result) {
        e.preventDefault()
        setDesc(result.newValue)
        requestAnimationFrame(() => el.setSelectionRange(result.newCursor, result.newCursor))
        return
      }
      // No list context → save
      e.preventDefault()
      handleSave()
    }
    if (e.key === "Escape") onCancel()
  }

  return (
    <div className="flex flex-col gap-5" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Type */}
      <div>
        <div style={{ marginBottom: 8 }}>
          <span style={getStyles().label}>Type</span>
          <div className="flex gap-1.5 flex-wrap">
            {typeOptions.map(opt => (
              <button key={opt.value} onClick={() => setType(opt.value)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition
                  ${type === opt.value ? "bg-white/[0.08] border-white/[0.15]" : "bg-transparent border-white/[0.06] hover:text-zinc-400 hover:bg-white/[0.04]"}`}>
                <span className="text-[13px] leading-none">{opt.icon}</span>{opt.label}
              </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <span style={getStyles().label}>Title</span>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleSave() } }}
          placeholder="Task title…" style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }} className={inputClass} />
      </div>

      {/* Description */}
      <div style={{ marginBottom: 16 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <span style={{ ...getStyles().label, marginBottom: 0 }}>Description</span>
          {desc && (
            <button onClick={() => setPreviewDesc(v => !v)}
              className="text-[10px] hover:opacity-75 transition flex items-center gap-1"
              style={{ color: "var(--text-muted)" }}>
              {previewDesc ? "✏ Edit" : "👁 Preview"}
            </button>
          )}
        </div>

        {/* Markdown toolbar */}
        {!previewDesc && (
          <div className="flex gap-1 mb-1.5 flex-wrap">
            {toolbarItems.map(item => (
              <button key={item.label}
                onMouseDown={e => { e.preventDefault(); applyToolbar(item) }}
                title={item.title}
                className="px-2 py-0.5 rounded-md text-[10px] font-mono hover:brightness-125 transition"
                style={{ color: "var(--text-muted)", backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.07)" }}>
                {item.label}
              </button>
            ))}
          </div>
        )}

        {previewDesc ? (
          <div className="min-h-[100px] bg-white/[0.02] border border-white/[0.07] rounded-xl px-3.5 py-2.5
            prose prose-invert prose-sm max-w-none [color-scheme:dark]">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{desc || "*Nothing yet…*"}</ReactMarkdown>
          </div>
        ) : (
          <textarea ref={descRef}
            value={desc} onChange={e => setDesc(e.target.value)} rows={4}
            onKeyDown={handleDescKeyDown}
            placeholder="Add details… (Shift+Enter for new line, Enter to save, lists auto-continue)"
            style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }}
            className={`${inputClass} resize-none`} />
        )}
        <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 4, paddingLeft: 2 }}>
          Lists auto-continue on Enter · Shift+Enter new line · toolbar above for quick formatting
        </p>
      </div>

      {/* Priority */}
      <div style={{ marginBottom: 16 }}>
        <span style={getStyles().label}>Priority</span>
        <div className="flex gap-1.5">
          {priorityOptions.map(opt => (
            <button key={opt.value} onClick={() => setPriority(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold border transition
                ${priority === opt.value ? `${opt.bg} ${opt.border} ${opt.text}` : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06] hover:text-zinc-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${priority === opt.value ? opt.dot : "bg-zinc-700"}`} />
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div style={{ marginBottom: 16 }}>
        <span style={getStyles().label}>Tags</span>
        {tags.length > 0 && (
          <div className="flex gap-1.5 flex-wrap mb-2">
            {tags.map(tag => {
              const c = tagColorClasses(tag)
              return (
                <span key={tag} className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border ${c.bg} ${c.border} ${c.text}`}>
                  #{tag}
                  <button onClick={() => setTags(p => p.filter(t => t !== tag))} className="opacity-60 hover:opacity-100 transition ml-0.5">✕</button>
                </span>
              )
            })}
          </div>
        )}
        
        {/* Predefined tags for quick selection */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          {predefinedTags.map(tag => {
            const isSelected = tags.includes(tag)
            const c = tagColorClasses(tag)
            return (
              <button
                key={tag}
                onClick={() => {
                  if (isSelected) {
                    setTags(p => p.filter(t => t !== tag))
                  } else {
                    setTags(p => [...p, tag])
                  }
                }}
                className={`text-[11px] px-2 py-0.5 rounded-md border transition flex items-center gap-1 ${
                  isSelected ? `${c.bg} ${c.border} ${c.text}` : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.04] text-zinc-400"
                }`}
              >
                #{tag}
              </button>
            )
          })}
        </div>
        
        <div className="flex gap-2">
          <input value={tagInput} onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag() } }}
            placeholder="Add custom tag… (Enter or comma)" style={{ color: "var(--text-primary)" }} className={`${inputClass} py-2 text-xs flex-1`} />
          <button onClick={addTag} disabled={!tagInput.trim()}
            style={{ color: tagInput.trim() ? "var(--text-secondary)" : "var(--text-muted)" }}
            className="px-3 py-2 rounded-xl text-xs font-semibold hover:brightness-125 transition disabled:pointer-events-none">
            Add
          </button>
        </div>
      </div>

      {/* Due date */}
      <div style={{ marginBottom: 16 }}>
        <span style={getStyles().label}>
          Due Date{" "}<span style={{ color: "var(--text-muted)", fontWeight: 400, letterSpacing: 0 }}> (optional)</span>
        </span>
        <div className="relative">
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }} className={inputClass} />
          {dueDate && (
            <button onClick={() => setDueDate("")} className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition">
              <svg style={{ color: "var(--text-muted)" }} className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" /></svg>
            </button>
          )}
        </div>
      </div>

      {/* Attachments */}
      <div style={{ marginBottom: 16 }}>
        <span style={getStyles().label}>Attachments</span>
        <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />
        {attachments.length > 0 && (
          <div className="flex flex-col gap-2 mb-2">
            {attachments.map((raw, i) => {
              const att = parseAttachment(raw)
              if (!att) return null
              const isImg = att.mime.startsWith("image/")
              return (
                <div key={att.id} className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2 group">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/[0.05] border border-white/[0.07] flex-shrink-0 flex items-center justify-center cursor-pointer"
                    onClick={() => isImg && setLightbox(att)}>
                    {isImg
                      ? <img src={att.data} alt={att.name} className="w-full h-full object-cover" />
                      : <svg style={{ color: "var(--text-muted)" }} className="w-4 h-4" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="1" width="10" height="12" rx="1.5"/><path d="M4.5 5h5M4.5 7.5h5M4.5 10h3" strokeLinecap="round"/></svg>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ color: "var(--text-secondary)" }} className="text-xs truncate">{att.name}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 10 }}>{formatBytes(att.size)}</p>
                  </div>
                  <a href={att.data} download={att.name} className="opacity-60 hover:opacity-100 transition p-1 rounded-lg hover:bg-white/[0.06]" title="Download">
                    <svg style={{ color: "var(--text-muted)" }} className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 2v7M4.5 6.5L7 9l2.5-2.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 11h10" strokeLinecap="round"/></svg>
                  </a>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                    className="opacity-50 hover:opacity-100 hover:bg-rose-500/10 transition p-1 rounded-lg" title="Remove">
                    <svg style={{ color: "var(--text-muted)" }} className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/></svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
        <button onClick={() => fileRef.current?.click()}
          className="w-full py-2.5 rounded-xl text-[11px] font-medium border border-dashed border-white/[0.08] hover:border-white/[0.15] transition flex items-center justify-center gap-2"
          style={{ color: "var(--text-muted)" }}>
          <svg className="w-4 h-4" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M7 9V2M4 5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 11h10" strokeLinecap="round"/></svg>
          Upload files or images
        </button>
      </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={handleSave} disabled={!title.trim()}
          className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-white/[0.08] border border-white/[0.1] hover:bg-white/[0.13] disabled:opacity-30 disabled:pointer-events-none transition-all"
          style={{ color: "var(--text-secondary)" }}>
          Save
        </button>
        <button onClick={handleCancel}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-white/[0.06] hover:bg-white/[0.04]"
          style={{ color: "var(--text-secondary)" }}>
          Cancel
        </button>
      </div>

      {/* Discard confirmation — only shows if Cancel clicked with dirty state */}
      {confirmDiscard && (
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 flex flex-col gap-2.5">
          <p style={{ color: "var(--amber-400)", fontSize: 13 }}>You have unsaved changes. Discard them?</p>
          <div className="flex gap-2">
            <button onClick={onCancel}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 transition"
              style={{ color: "var(--rose-400)" }}>
              Discard
            </button>
            <button onClick={() => setConfirmDiscard(false)}
              className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition"
              style={{ color: "var(--text-secondary)" }}>
              Keep editing
            </button>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {lightbox && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90" onClick={() => setLightbox(null)}>
          <img src={lightbox.data} alt={lightbox.name} className="max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
            <svg style={{ color: "white" }} className="w-4 h-4" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M2 2l10 10M12 2L2 12" strokeLinecap="round"/></svg>
          </button>
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs" style={{ color: "var(--text-secondary)" }}>{lightbox.name}</p>
        </div>,
        document.body
      )}
    </div>
  )
})

export default TaskEditor