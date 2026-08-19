import { useEffect } from "react"
import { useSettingsStore } from "../state/settingsStore"
import { useUIStore } from "../state/uiStore"

/**
 * Global keyboard shortcuts, gated by Settings → Features → Keyboard shortcuts.
 *
 *  - ⌘/Ctrl+K → open command palette
 *  - ⌘/Ctrl+F → focus the topbar search
 *  - ⌘/Ctrl+N → new board (create modal)
 *  - ?          → toggle shortcuts help
 *
 * Search focus is requested via a window CustomEvent because the search input
 * lives inside Topbar; it subscribes to "kanban:focus-search".
 */
export function useGlobalShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const enabled = useSettingsStore.getState().settings.features.keyboardShortcuts
      if (!enabled) return

      const mod = e.metaKey || e.ctrlKey

      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault()
        useUIStore.getState().toggleCommandPalette()
        return
      }

      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault()
        window.dispatchEvent(new CustomEvent("kanban:focus-search"))
        return
      }

      if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault()
        useUIStore.getState().openCreateBoard()
        return
      }
    }

    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])
}