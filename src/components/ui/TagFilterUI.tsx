import { tagColorClasses } from "../../utils/tagColors"

interface TagFilterUIProps {
  allTags: string[]
  activeTags: string[]
  onToggleTag: (tag: string) => void
  onClearTags: () => void
  taskCount: number
  totalCount: number
}

export default function TagFilterUI({
  allTags,
  activeTags,
  onToggleTag,
  onClearTags,
  taskCount,
  totalCount,
}: TagFilterUIProps) {
  if (allTags.length === 0 && activeTags.length === 0) return null

  const hasActiveFilters = activeTags.length > 0

  return (
    <div
      className="px-8 py-4 border-b flex items-center gap-3 flex-wrap"
      style={{
        borderBottom: `1px solid var(--border)`,
        backgroundColor: 'var(--bg-app)',
      }}
    >
      {/* Filter label */}
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Filter by tags:</span>
      </div>

      {/* Active filter chips */}
      {activeTags.map(tag => {
        const c = tagColorClasses(tag)
        return (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition hover:opacity-80 ${c.bg} ${c.border} ${c.text}`}
            style={{
              borderColor: "var(--accent)",
              backgroundColor: "var(--accent-muted)",
            }}
          >
            #{tag}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )
      })}

      {/* Available tags (not active) */}
      {allTags
        .filter(tag => !activeTags.includes(tag))
        .slice(0, 10) // Limit displayed to avoid clutter
        .map(tag => {
          const c = tagColorClasses(tag)
          return (
            <button
              key={tag}
              onClick={() => onToggleTag(tag)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md border transition hover:opacity-80 ${c.bg} ${c.border} ${c.text}`}
              style={{
                borderColor: "var(--border)",
                backgroundColor: "transparent",
              }}
            >
              #{tag}
            </button>
          )
        })}

      {/* More tags indicator */}
      {allTags.length - activeTags.length > 10 && (
        <span className="text-xs px-2" style={{ color: "var(--text-muted)" }}>+{allTags.length - activeTags.length - 10} more</span>
      )}

      {/* Clear filters button */}
      {hasActiveFilters && (
        <button
          onClick={onClearTags}
          className="ml-auto flex items-center gap-1.5 text-xs px-3 py-1 rounded-md transition"
          style={{
            backgroundColor: "var(--bg-input)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-column-solid)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "var(--bg-input)"
          }}
        >
          Clear filters
          <span style={{ color: "var(--border)" }}>•</span>
          <span style={{ color: "var(--text-muted)" }}>{taskCount}/{totalCount} tasks</span>
        </button>
      )}

      {/* Task count when filtering */}
      {!hasActiveFilters && totalCount > 0 && (
        <div className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
          {totalCount} task{totalCount !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}