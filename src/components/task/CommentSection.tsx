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
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-widest mb-4">
        Comments
        {comments.length > 0 && (
          <span className="ml-1 text-zinc-700 font-normal normal-case tracking-normal">({comments.length})</span>
        )}
      </p>

      {loading ? (
        <p className="text-xs text-zinc-700 mb-4">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="text-xs text-zinc-700 mb-4">No comments yet.</p>
      ) : (
        <div className="flex flex-col gap-3 mb-4">
          {comments.map(c => (
            <div key={c.id} className="group flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] text-zinc-500">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-600 mb-1">{fmt(c.createdAt)}</p>
                <p className="text-xs text-zinc-300 leading-relaxed break-words">{c.text}</p>
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
                  className="opacity-0 group-hover:opacity-100 transition text-zinc-700 hover:text-rose-400 flex-shrink-0 mt-1">
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
          className="flex-1 bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10 caret-zinc-300 resize-none transition"
        />
        <button onClick={submit} disabled={!text.trim()}
          className="px-3 py-2 rounded-xl text-xs font-semibold bg-white/[0.07] text-zinc-300 border border-white/[0.09] hover:bg-white/[0.12] hover:text-white disabled:opacity-25 disabled:pointer-events-none transition">
          Send
        </button>
      </div>
    </div>
  )
}