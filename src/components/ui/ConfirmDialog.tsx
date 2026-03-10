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
        <p className="text-zinc-300" style={{ fontFamily: "'DM Sans', sans-serif", color: "var(--text-secondary)" }}>
          {message}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleConfirm}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
            variant === 'danger'
              ? 'bg-rose-600 hover:bg-rose-700'
              : 'bg-sky-600 hover:bg-sky-700'
          }`}
          onKeyDown={handleKeyDown}
          style={{ color: "#fff" }}
          autoFocus
        >
          {confirmText}
        </button>
        <button
          onClick={onClose}
          className="flex-1 px-4 py-3 rounded-lg font-semibold transition-all"
          onKeyDown={handleKeyDown}
          style={{ backgroundColor: "var(--bg-input)", color: "var(--text-primary)" }}
        >
          {cancelText}
        </button>
      </div>
    </Modal>
  )
}
