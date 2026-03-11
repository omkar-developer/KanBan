import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'

interface CreateNoteDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (title: string, category: string) => Promise<void>
  title?: string
  defaultCategory?: string
  existingCategories?: string[]
}

export default function CreateNoteDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Create New Note',
  defaultCategory = '',
  existingCategories = [],
}: CreateNoteDialogProps) {
  const [noteTitle, setNoteTitle] = useState('')
  const [category, setCategory] = useState(defaultCategory)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setNoteTitle('')
      setCategory(defaultCategory)
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 50)
    }
  }, [isOpen, defaultCategory])

  const handleSubmit = async () => {
    if (!noteTitle.trim()) return

    setIsSubmitting(true)
    try {
      await onConfirm(noteTitle.trim(), category.trim() || 'Uncategorized')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSubmitting) {
      handleSubmit()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        {/* Note Title */}
        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Note Title</label>
          <input
            ref={titleInputRef}
            type="text"
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter note title..."
            className="w-full rounded-lg px-4 py-3 outline-none transition-all border"
            style={{ 
              backgroundColor: "var(--bg-input)", 
              color: "var(--text-primary)",
              borderColor: "var(--border)"
            }}
            autoFocus
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Category</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter category or select existing..."
            className="w-full rounded-lg px-4 py-3 outline-none transition-all border mb-2"
            style={{ 
              backgroundColor: "var(--bg-input)", 
              color: "var(--text-primary)",
              borderColor: "var(--border)"
            }}
            list="category-options"
          />
          <datalist id="category-options">
            {existingCategories.map((cat) => (
              <option key={cat} value={cat} />
            ))}
          </datalist>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Type a new category name or select from existing ones
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={handleSubmit}
          disabled={!noteTitle.trim() || isSubmitting}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
          style={{
            backgroundColor: (!noteTitle.trim() || isSubmitting) ? "var(--bg-input)" : "var(--accent)",
            color: (!noteTitle.trim() || isSubmitting) ? "var(--text-muted)" : "#fff",
            transform: "scale(1)",
          }}
          onMouseEnter={(e) => {
            if (noteTitle.trim() && !isSubmitting) {
              e.currentTarget.style.backgroundColor = "var(--accent-muted)"
            }
          }}
          onMouseLeave={(e) => {
            if (noteTitle.trim() && !isSubmitting) {
              e.currentTarget.style.backgroundColor = "var(--accent)"
              e.currentTarget.style.transform = "scale(1)"
            }
          }}
          onMouseDown={(e) => {
            if (noteTitle.trim() && !isSubmitting) {
              e.currentTarget.style.transform = "scale(0.98)"
            }
          }}
          onMouseUp={(e) => {
            if (noteTitle.trim() && !isSubmitting) {
              e.currentTarget.style.transform = "scale(1)"
            }
          }}
        >
          {isSubmitting ? 'Creating...' : 'Create Note'}
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
          style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)", transform: "scale(1)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-column-solid)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-input)"
            e.currentTarget.style.transform = "scale(1)"
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.98)"
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)"
          }}
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
