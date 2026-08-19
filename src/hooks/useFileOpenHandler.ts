import { useEffect, useCallback } from "react"
import { useUIStore } from "../state/uiStore"

export function useFileOpenHandler() {
  const fileToOpen = useUIStore(s => s.openFileDialog)
  const setOpenFileDialog = useUIStore(s => s.setOpenFileDialog)
  const closeDialog = useUIStore(s => s.closeFileDialog)

  const handleFile = useCallback((filePath: string) => {
    setOpenFileDialog(filePath)
  }, [setOpenFileDialog])

  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail
      const filePath = Array.isArray(data) ? data[0] : data
      if (filePath) handleFile(filePath)
    }
    window.addEventListener("file-open", handler as EventListener)
    return () => window.removeEventListener("file-open", handler as EventListener)
  }, [handleFile])

  return { fileToOpen, closeDialog }
}
