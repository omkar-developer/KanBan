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
      <p className="text-zinc-300 mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          ref={buttonRef}
          onClick={handleConfirm}
          disabled={isConfirming}
          className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
        >
          {isConfirming ? '...' : confirmText}
        </button>
        {cancelText && (
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 rounded-lg font-semibold transition-all"
          >
            {cancelText}
          </button>
        )}
      </div>
    </Modal>
  )
}