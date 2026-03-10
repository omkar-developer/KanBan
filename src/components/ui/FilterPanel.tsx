import { useState } from "react"
import { tagColorClasses } from "../../utils/tagColors"

interface FilterPanelProps {
  isOpen: boolean
  allTags: string[]
  activeTags: string[]
  onToggleTag: (tag: string) => void
  onClearTags: () => void
  onClose: () => void
}

export default function FilterPanel({
  isOpen,
  allTags,
  activeTags,
  onToggleTag,
  onClearTags,
  onClose,
}: FilterPanelProps) {
  const [search, setSearch] = useState("")
  
  const filteredTags = allTags.filter(tag =>
    tag.toLowerCase().includes(search.toLowerCase())
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop */}
      <div 
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="absolute top-16 right-8 w-80 rounded-lg shadow-lg border max-h-[60vh] overflow-hidden flex flex-col"
        style={{
          backgroundColor: "var(--bg-modal)",
          borderColor: "var(--border)",
        }}
      >
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Filter by Tags
            </h3>
            <button
              onClick={onClose}
              className="p-1 hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-secondary)" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search in tags */}
          <input
            type="text"
            placeholder="Search tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded border transition-colors outline-none"
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

        {/* Tags list */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {filteredTags.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {allTags.length === 0 ? "No tags yet" : "No matching tags"}
            </p>
          ) : (
            filteredTags.map(tag => {
              const c = tagColorClasses(tag)
              const isActive = activeTags.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => onToggleTag(tag)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded transition-all ${
                    isActive ? "opacity-100" : "opacity-75 hover:opacity-100"
                  } ${c.bg} ${c.border} border`}
                >
                  <div
                    className="w-4 h-4 rounded border flex items-center justify-center transition-all"
                    style={{
                      borderColor: isActive ? "var(--accent)" : "var(--border)",
                      backgroundColor: isActive ? "var(--accent)" : "transparent",
                    }}
                  >
                    {isActive && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20.285 2.285L9.567 13.003L3.693 7.129a1 1 0 00-1.414 1.414l7.071 7.071a1 1 0 001.414 0l11.313-11.313a1 1 0 00-1.414-1.414z" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${c.text}`}>#{tag}</span>
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        {activeTags.length > 0 && (
          <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={onClearTags}
              className="w-full px-3 py-2 text-sm font-medium rounded transition-colors"
              style={{
                backgroundColor: "var(--bg-popover)",
                color: "var(--text-primary)",
                border: `1px solid var(--border)`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border-hover)"
                e.currentTarget.style.backgroundColor = "var(--bg-card)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)"
                e.currentTarget.style.backgroundColor = "var(--bg-popover)"
              }}
            >
              Clear Filters ({activeTags.length})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
