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
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect()
      const menuWidth = 192
      setPos({
        top:  rect.bottom + 6,
        left: align === "right"
          ? Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)
          : Math.max(rect.left, 8),
      })
    }
  }, [anchorRef, align])

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
      className="fixed z-[9999] min-w-[192px] rounded-xl border border-white/[0.09] shadow-2xl py-1 overflow-hidden"
      style={{ background: "#1c1c1c", top: pos.top, left: pos.left }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="my-1 h-px bg-white/[0.06] mx-2" />
        ) : (
          <button
            key={i}
            onClick={() => { if (!item.disabled) { item.onClick(); onClose() } }}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-medium text-left transition
              ${item.disabled ? "opacity-30 pointer-events-none cursor-default" : "cursor-pointer"}
              ${item.danger
                ? "text-rose-400 hover:bg-rose-500/10"
                : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
              }
            `}
            style={{ fontFamily: "'DM Sans', sans-serif" }}
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