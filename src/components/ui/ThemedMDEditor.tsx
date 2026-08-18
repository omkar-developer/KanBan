import { forwardRef, useImperativeHandle, useRef, useCallback } from "react"
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

    useImperativeHandle(ref, () => ({ focus, insertText }), [focus, insertText])

    return (
      <div ref={editorRef} className="themed-md-editor" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <MDEditor
          value={value}
          onChange={(val) => onChange(val || "")}
          textareaProps={{
            placeholder,
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
