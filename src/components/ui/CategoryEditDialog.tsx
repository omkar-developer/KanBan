import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'

interface CategoryEditDialogProps {
  isOpen: boolean
  onClose: () => void
  onRename: (oldName: string, newName: string) => void
  onDelete: (name: string) => void
  categoryName: string
}

export default function CategoryEditDialog({
  isOpen,
  onClose,
  onRename,
  onDelete,
  categoryName,
}: CategoryEditDialogProps) {
  const [newName, setNewName] = useState(categoryName)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setNewName(categoryName)
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen, categoryName])

  const handleRename = () => {
    if (!newName.trim()) return
    onRename(categoryName, newName.trim())
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newName.trim()) {
      handleRename()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Category">
      <div className="space-y-4">
        <div>
          <label className="block text-sm mb-2 font-medium" style={{ color: "var(--text-muted)" }}>Category Name</label>
          <input
            ref={inputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter category name..."
            className="w-full rounded-lg px-4 py-3 outline-none transition-all border"
            style={{ 
              backgroundColor: "var(--bg-input)", 
              color: "var(--text-primary)",
              borderColor: "var(--border)"
            }}
            autoFocus
          />
        </div>
      </div>

      <div className="flex gap-2 mt-6">
        <button
          onClick={handleRename}
          disabled={!newName.trim() || newName === categoryName}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
          style={{
            backgroundColor: (!newName.trim() || newName === categoryName) ? "var(--bg-input)" : "var(--accent)",
            color: (!newName.trim() || newName === categoryName) ? "var(--text-muted)" : "#fff"
          }}
        >
          Rename
        </button>
        <button
          onClick={() => {
            onDelete(categoryName)
            onClose()
          }}
          className="px-4 py-3 rounded-lg font-semibold transition-all"
          style={{ backgroundColor: "rgba(239, 68, 68, 0.2)", color: "#f87171" }}
        >
          Delete
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
          style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }}
        >
          Cancel
        </button>
      </div>
    </Modal>
  )
}
