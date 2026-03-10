import { useState, useRef, useEffect } from 'react'
import Modal from './Modal'

interface TextInputDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: string) => Promise<void> | void
  title?: string
  label?: string
  placeholder?: string
  defaultValue?: string
  required?: boolean
}

export default function TextInputDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Enter Value',
  label = 'Value',
  placeholder = '',
  defaultValue = '',
  required = false,
}: TextInputDialogProps) {
  const [value, setValue] = useState(defaultValue)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue)
      // Small delay to ensure modal is rendered before focusing
      setTimeout(() => {
        inputRef.current?.focus()
      }, 50)
    }
  }, [isOpen, defaultValue])

  const handleSubmit = async () => {
    if (required && !value.trim()) {
      return
    }

    setIsSubmitting(true)
    try {
      await onConfirm(value.trim())
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
      <div className="mb-6">
        <label className="block text-zinc-500 text-sm mb-2" style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-white/[0.04] border border-white/[0.09] rounded-lg px-4 py-3 text-zinc-200 placeholder-zinc-600 outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10 transition-all"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white px-4 py-3 rounded-lg font-semibold transition-all"
      >
        {isSubmitting ? '...' : 'Confirm'}
      </button>
    </Modal>
  )
}