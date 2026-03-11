import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'

interface AlertDialogProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
}

export default function AlertDialog({
  isOpen,
  onClose,
  title = 'Alert',
  message,
  confirmText = 'OK',
  cancelText = 'Close',
}: AlertDialogProps) {
  const [isConfirming, setIsConfirming] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      buttonRef.current.focus()
    }
  }, [isOpen])

  const handleConfirm = async () => {
    setIsConfirming(true)
    await new Promise(resolve => setTimeout(resolve, 100))
    onClose()
    setIsConfirming(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <p style={{ color: "var(--text-primary)", marginBottom: "1.5rem" }}>{message}</p>
      <div className="flex gap-3">
        <button
          ref={buttonRef}
          onClick={handleConfirm}
          disabled={isConfirming}
          className="flex-1 px-4 py-3 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
          style={{
            backgroundColor: isConfirming ? "var(--bg-input)" : "var(--accent)",
            transform: "scale(1)",
          }}
          onMouseEnter={(e) => {
            if (!isConfirming) {
              e.currentTarget.style.backgroundColor = "var(--accent-muted)"
            }
          }}
          onMouseLeave={(e) => {
            if (!isConfirming) {
              e.currentTarget.style.backgroundColor = "var(--accent)"
              e.currentTarget.style.transform = "scale(1)"
            }
          }}
          onMouseDown={(e) => {
            if (!isConfirming) {
              e.currentTarget.style.transform = "scale(0.98)"
            }
          }}
          onMouseUp={(e) => {
            if (!isConfirming) {
              e.currentTarget.style.transform = "scale(1)"
            }
          }}
        >
          {isConfirming ? '...' : confirmText}
        </button>
        {cancelText && (
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border rounded-lg font-semibold transition-all"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              backgroundColor: "transparent",
              transform: "scale(1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-input)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent"
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
        )}
      </div>
    </Modal>
  )
}