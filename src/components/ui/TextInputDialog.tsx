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
        <label className="block text-sm mb-2" style={{ fontFamily: "var(--font-body, system-ui, sans-serif)", color: "var(--text-muted)" }}>{label}</label>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg px-4 py-3 outline-none transition-all border"
          style={{
            backgroundColor: "var(--bg-input)",
            borderColor: "var(--border)",
            color: "var(--text-primary)",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "var(--border-focus)"
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "var(--border)"
          }}
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || isSubmitting}
        className="w-full px-4 py-3 rounded-lg font-semibold transition-all"
        style={{
          backgroundColor: !value.trim() || isSubmitting ? "var(--bg-input)" : "var(--accent)",
          color: !value.trim() || isSubmitting ? "var(--text-muted)" : "#fff",
          transform: "scale(1)",
        }}
        onMouseEnter={(e) => {
          if (value.trim() && !isSubmitting) {
            e.currentTarget.style.backgroundColor = "var(--accent-muted)"
          }
        }}
        onMouseLeave={(e) => {
          if (value.trim() && !isSubmitting) {
            e.currentTarget.style.backgroundColor = "var(--accent)"
            e.currentTarget.style.transform = "scale(1)"
          }
        }}
        onMouseDown={(e) => {
          if (value.trim() && !isSubmitting) {
            e.currentTarget.style.transform = "scale(0.98)"
          }
        }}
        onMouseUp={(e) => {
          if (value.trim() && !isSubmitting) {
            e.currentTarget.style.transform = "scale(1)"
          }
        }}
      >
        {isSubmitting ? '...' : 'Confirm'}
      </button>
    </Modal>
  )
}