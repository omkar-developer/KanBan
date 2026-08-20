import { forwardRef, useImperativeHandle, useRef, useCallback } from "react"
import type { ClipboardEvent } from "react"
import MDEditor from "@uiw/react-md-editor"
import "@uiw/react-md-editor/markdown-editor.css"
import "./ThemedMDEditor.css"

export interface ThemedMDEditorHandle {
  focus: () => void
  insertText: (text: string) => void
}

interface ThemedMDEditorProps {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  height?: number | string
  minHeight?: number
  preview?: "edit" | "preview" | "live"
  hideToolbar?: boolean
  visibleDragbar?: boolean
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

// Save a pasted image into the app config dir (next to taskflow.db) and return
// the markdown to embed. Falls back to an inline data URL in plain-browser dev.
async function savePastedImage(file: File): Promise<string> {
  const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg").toLowerCase()
  const name = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  try {
    const fs = await import("@tauri-apps/plugin-fs")
    const { BaseDirectory } = await import("@tauri-apps/api/path")
    await fs.mkdir("images", { baseDir: BaseDirectory.AppConfig, recursive: true })
    await fs.writeFile(`images/${name}`, bytes, { baseDir: BaseDirectory.AppConfig })
    return `![pasted image](local:images/${name})`
  } catch {
    const dataUrl = await fileToDataUrl(file)
    return `![pasted image](${dataUrl})`
  }
}

const ThemedMDEditor = forwardRef<ThemedMDEditorHandle, ThemedMDEditorProps>(
  function ThemedMDEditor(
    {
      value,
      onChange,
      placeholder = "Start writing…",
      height = "100%",
      minHeight = 200,
      preview = "edit",
      hideToolbar = false,
      visibleDragbar = false,
    },
    ref
  ) {
    const editorRef = useRef<HTMLDivElement>(null)

    const focus = useCallback(() => {
      const textarea = editorRef.current?.querySelector("textarea")
      textarea?.focus()
    }, [])

    const insertText = useCallback(
      (text: string) => {
        onChange(value + text)
        requestAnimationFrame(() => focus())
      },
      [value, onChange, focus]
    )

    const handlePaste = useCallback(
      async (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const items = e.clipboardData?.items
        if (!items) return
        let imageItem: DataTransferItem | null = null
        for (const item of items) {
          if (item.kind === "file" && item.type.startsWith("image/")) {
            imageItem = item
            break
          }
        }
        if (!imageItem) return
        e.preventDefault()
        const file = imageItem.getAsFile()
        if (!file) return
        const md = await savePastedImage(file)
        const ta = e.currentTarget
        const start = ta.selectionStart ?? value.length
        const end = ta.selectionEnd ?? value.length
        onChange(value.slice(0, start) + md + value.slice(end))
        requestAnimationFrame(() => {
          const pos = start + md.length
          ta.focus()
          ta.setSelectionRange(pos, pos)
        })
      },
      [value, onChange]
    )

    useImperativeHandle(ref, () => ({ focus, insertText }), [focus, insertText])

    return (
      <div ref={editorRef} className="themed-md-editor" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || "")}
          textareaProps={{
            placeholder,
            onPaste: handlePaste,
          }}
          height="100%"
          minHeight={minHeight}
          preview={preview}
          hideToolbar={hideToolbar}
          visibleDragbar={visibleDragbar}
          highlightEnable={false}
        />
      </div>
    )
  }
)

export default ThemedMDEditor