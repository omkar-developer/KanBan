import { useEffect, useRef, useState } from "react"

export type MenuItem = 
  | {
      label: string
      icon?: React.ReactNode
      onClick: () => void
      danger?: boolean
      disabled?: boolean
      separator?: false | undefined
    }
  | {
      separator: true
      label?: undefined
      icon?: undefined
      onClick?: undefined
      danger?: undefined
      disabled?: undefined
    }

interface Props {
  items: MenuItem[]
  onClose: () => void
  anchorRef: React.RefObject<HTMLElement>
  align?: "left" | "right"
}

export default function DropdownMenu({ items, onClose, anchorRef, align = "right" }: Props) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    let mounted = true
    if (anchorRef.current) {
      const rect      = anchorRef.current.getBoundingClientRect()
      const menuWidth = 192
      // Estimate menu height (each item ~32px + separators ~9px)
      const itemCount = items.filter(i => !('separator' in i && i.separator)).length
      const sepCount  = items.filter(i => ('separator' in i && i.separator)).length
      const estHeight = itemCount * 32 + sepCount * 9 + 8

      const rawTop  = rect.bottom + 6
      const rawLeft = align === "right"
        ? Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)
        : Math.max(rect.left, 8)

      // Flip above anchor if it would overflow the bottom
      const top = rawTop + estHeight > window.innerHeight - 8
        ? Math.max(8, rect.top - estHeight - 6)
        : rawTop

      // Use requestAnimationFrame to batch the state update and avoid cascading renders
      requestAnimationFrame(() => {
        if (mounted) {
          setPos({ top, left: rawLeft })
        }
      })
    }
    return () => { mounted = false }
  }, [anchorRef, align, items])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current    && !menuRef.current.contains(e.target as Node) &&
        anchorRef.current  && !anchorRef.current.contains(e.target as Node)
      ) onClose()
    }
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose() }
    // Small delay so the click that opens the menu doesn't immediately close it
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 80)
    document.addEventListener("keydown", esc)
    return () => {
      clearTimeout(t)
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("keydown", esc)
    }
  }, [onClose, anchorRef])

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] min-w-[192px] rounded-xl shadow-2xl py-1 overflow-hidden"
      style={{
        background: "var(--bg-popover)",
        border: "1px solid var(--border)",
        top: pos.top,
        left: pos.left
      }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="my-1 h-px mx-2" style={{ backgroundColor: "var(--border)" }} />
        ) : (
          <button
            key={i}
            onClick={() => { if (!item.disabled) { item.onClick(); onClose() } }}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-left transition
              ${item.disabled ? "opacity-30 pointer-events-none cursor-default" : "cursor-pointer"}
            `}
            style={{
              fontFamily: "var(--font-body, system-ui, sans-serif)",
              color: item.danger ? "var(--accent)" : "var(--text-secondary)",
              backgroundColor: "transparent",
              transform: "scale(1)",
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.backgroundColor = item.danger
                  ? "rgba(251, 113, 133, 0.1)"
                  : "var(--bg-input)"
                e.currentTarget.style.color = item.danger
                  ? "var(--accent)"
                  : "var(--text-primary)"
              }
            }}
            onMouseLeave={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.backgroundColor = "transparent"
                e.currentTarget.style.color = item.danger
                  ? "var(--accent)"
                  : "var(--text-secondary)"
                e.currentTarget.style.transform = "scale(1)"
              }
            }}
            onMouseDown={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.transform = "scale(0.98)"
              }
            }}
            onMouseUp={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.transform = "scale(1)"
              }
            }}
          >
            {item.icon && (
              <span className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center opacity-70">
                {item.icon}
              </span>
            )}
            {item.label}
          </button>
        )
      )}
    </div>
  )
}