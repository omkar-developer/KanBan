import { useState, useEffect } from "react"
import { useKanbanStore } from "../../state/kanbanStore"
import type { Comment } from "../../models/Comment"

interface Props {
  taskId: string
}

export default function CommentSection({ taskId }: Props) {
  const getComments   = useKanbanStore(s => s.getComments)
  const createComment = useKanbanStore(s => s.createComment)
  const deleteComment = useKanbanStore(s => s.deleteComment)

  const [comments,   setComments]   = useState<Comment[]>([])
  const [text,       setText]       = useState("")
  const [loading,    setLoading]    = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    getComments(taskId).then(c => { setComments(c); setLoading(false) })
  }, [taskId, getComments])

  const submit = async () => {
    const trimmed = text.trim()
    if (!trimmed) return
    const comment: Comment = {
      id: crypto.randomUUID(),
      taskId,
      text: trimmed,
      createdAt: Date.now(),
    }
    const id = await createComment(comment)
    setComments(prev => [...prev, { ...comment, id }])
    setText("")
  }

  const handleDelete = async (id: string) => {
    await deleteComment(id)
    setComments(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  const fmt = (ts: number) =>
    new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })

  return (
    <div className="font-body">
      <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-widest mb-4">
        Comments
        {comments.length > 0 && (
          <span className="ml-1 text-text-primary font-normal normal-case tracking-normal">({comments.length})</span>
        )}
      </p>

      {loading ? (
        <p className="text-xs text-text-primary mb-4">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-text-primary mb-4">No comments yet.</p>
      ) : (
        <div className="flex flex-col gap-3 mb-4">
          {comments.map(c => (
            <div key={c.id} className="group flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-[--border] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] text-text-muted">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-text-secondary mb-1">{fmt(c.createdAt)}</p>
                <p className="text-xs text-text-primary leading-relaxed break-words">{c.text}</p>
              </div>
              {deletingId === c.id ? (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleDelete(c.id)}
                    className="text-[10px] text-rose-400 hover:text-rose-300 px-1.5 py-0.5 rounded bg-rose-500/10 transition">
                    Del
                  </button>
                  <button onClick={() => setDeletingId(null)}
                    className="text-[10px] text-zinc-600 hover:text-zinc-400 px-1 transition">✕</button>
                </div>
              ) : (
                <button onClick={() => setDeletingId(c.id)}
                  className="opacity-0 group-hover:opacity-100 transition text-text-muted hover:text-accent flex-shrink-0 mt-1">
                  <svg className="w-3 h-3" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.75 7.5h6.5L11 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 items-end">
        <textarea
          value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder="Add a comment… (Enter to send)"
          rows={2}
          className="flex-1 bg-[--bg-input] border border-[--border-input] rounded-xl px-3 py-2 text-xs text-text-primary placeholder-text-muted outline-none focus:border-[--border-focus] focus:ring-1 focus:ring-accent-muted caret-text-secondary resize-none transition"
        />
        <button onClick={submit} disabled={!text.trim()}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-[--bg-card] text-text-primary border border-[--border] hover:bg-[--accent-muted] hover:text-accent disabled:opacity-25 disabled:pointer-events-none transition">
          Send
        </button>
      </div>
    </div>
  )
}