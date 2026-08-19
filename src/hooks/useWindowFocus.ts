import { useEffect, useRef } from "react"

let lastFocusedTime = 0

/**
 * Fires `onFocus` when the app/window regains focus.
 * Uses blur+focus pair (more reliable than visibilitychange in Tauri WebView2).
 * With 2-second debounce to avoid rapid re-triggering on rapid focus switches.
 */
export function useWindowFocus(onFocus: () => void) {
  const ref = useRef(onFocus)
  ref.current = onFocus

  useEffect(() => {
    let lostFocus = false
    const handler = () => {
      if (!lostFocus) {
        lostFocus = true
        return
      }
      const now = Date.now()
      if (now - lastFocusedTime < 2000) return
      lastFocusedTime = now
      ref.current()
    }

    const onBlur = () => { lostFocus = false }
    const onFocus = () => {
      if (lostFocus) handler()
    }

    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    return () => {
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
    }
  }, [])
}
