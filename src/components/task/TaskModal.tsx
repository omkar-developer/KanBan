import { useState } from 'react'
import type { Task } from "../../models/Task"
import TaskEditor from "./TaskEditor"
import ConfirmDialog from "../ui/ConfirmDialog"

interface TaskModalProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  onSave: (taskId: string, updates: Partial<Task>) => Promise<void>
  onDelete: (taskId: string) => Promise<void>
}

export default function TaskModal({ task, isOpen, onClose, onSave, onDelete }: TaskModalProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  if (!isOpen || !task) return null

  const handleOpenDeleteDialog = () => {
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirmed = async () => {
    await onDelete(task.id!)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-[480px] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Edit Task</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Editor */}
        <TaskEditor
          task={task}
          onSave={async (updates) => {
            if (task.id) {
              await onSave(task.id, updates)
              onClose()
            }
          }}
          onCancel={onClose}
        />

        {/* Delete Section */}
        <div className="mt-6 pt-4 border-t border-zinc-800">
          <button
            onClick={handleOpenDeleteDialog}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 border border-red-700 text-red-400 hover:bg-red-950 rounded-lg font-semibold transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Task
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          onConfirm={handleDeleteConfirmed}
          title="Delete Task"
          message="Are you sure you want to delete this task? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
        />
      </div>
    </div>
  )
}