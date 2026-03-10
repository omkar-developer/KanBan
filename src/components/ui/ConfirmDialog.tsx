import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void> | void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
}: ConfirmDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      buttonRef.current.focus()
    }
  }, [isOpen])

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await onConfirm()
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p className="text-[var(--text-primary,#f0f0f0)] mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          ref={buttonRef}
          onClick={handleConfirm}
          disabled={isConfirming}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
            variant === 'danger'
              ? 'border border-red-700 text-red-400 hover:bg-red-950 disabled:opacity-50'
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
          }`}
        >
          {isConfirming ? '...' : confirmText}
        </button>
        <button
          onClick={onClose}
          disabled={isConfirming}
          className="flex-1 px-4 py-3 border border-[var(--border,rgba(255,255,255,0.06))] text-[var(--text-secondary,#a8a8b0)] hover:bg-white/[0.06] rounded-lg font-semibold transition-all disabled:opacity-50"
        >
          {cancelText}
        </button>
      </div>
    </Modal>
  )
}