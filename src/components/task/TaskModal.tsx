import { useRef } from 'react'
import type { Task } from "../../models/Task"
import TaskEditor, { type TaskEditorHandle } from "./TaskEditor"
import CommentSection from "./CommentSection"
import ConfirmDialog from "../ui/ConfirmDialog"
import { useState } from 'react'

interface TaskModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (taskId: string, updates: Partial<Task>) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
  isCreating?: boolean   // true = new task, hide comments + delete
}

export default function TaskModal({ task, isOpen, onClose, onSave, onDelete, isCreating }: TaskModalProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const editorRef = useRef<TaskEditorHandle>(null)

  if (!isOpen || !task) return null

  // Auto-save: when closing, if dirty, save silently instead of discarding
  const handleClose = async () => {
    if (editorRef.current?.isDirty()) {
      const updates = editorRef.current.getValues()
      if (updates.title?.trim() && task.id) {
        await onSave(task.id, updates)
      }
    }
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/[0.09] shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: "var(--bg-modal, #161616)" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] flex-shrink-0">
          <span
            className="text-xs font-semibold text-zinc-600 uppercase tracking-widest"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {isCreating ? "New Task" : "Edit Task"}
          </span>
          <div className="flex items-center gap-1">
            {!isCreating && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-700 hover:text-rose-400 hover:bg-rose-500/10 transition"
                title="Delete task"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M2 4h10M5 4V2.5h4V4M5.5 6.5v4M8.5 6.5v4M3 4l.75 7.5h6.5L11 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.06] transition"
              title="Close (auto-saves)"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M2 2l10 10M12 2L2 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.08)_transparent]">
          <div className="px-5 py-5">
            <TaskEditor
              ref={editorRef}
              task={task}
              onSave={async (updates) => {
                if (task.id) {
                  await onSave(task.id, updates)
                  onClose()
                }
              }}
              onCancel={handleClose}
            />
          </div>

          {/* Comments — only for existing tasks */}
          {!isCreating && task.id && (
            <div className="border-t border-white/[0.06] px-5 py-5">
              <CommentSection taskId={task.id} />
            </div>
          )}
        </div>
      </div>

      {!isCreating && (
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={async () => {
            await onDelete(task.id!)
            onClose()
          }}
          title="Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      )}
    </div>
  )
}