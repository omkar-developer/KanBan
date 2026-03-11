import { useEffect } from 'react'
import Modal from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleConfirm = async () => {
    await onConfirm()
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="mb-6">
        <p className="text-secondary" style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", color: "var(--text-secondary)" }}>
          {message}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
          style={{
            backgroundColor: variant === 'danger' ? "#be123c" : "var(--accent)",
            color: "#fff",
            transform: "scale(1)",
          }}
          onKeyDown={handleKeyDown}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = variant === 'danger' ? "#9f1239" : "var(--accent-muted)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = variant === 'danger' ? "#be123c" : "var(--accent)"
            e.currentTarget.style.transform = "scale(1)"
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = "scale(0.98)"
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = "scale(1)"
          }}
          autoFocus
        >
          {confirmText}
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
          onKeyDown={handleKeyDown}
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
          {cancelText}
        </button>
      </div>
    </Modal>
  )
}
