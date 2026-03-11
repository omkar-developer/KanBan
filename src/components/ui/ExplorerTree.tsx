import { useState, type JSX } from "react"

interface Group<T> {
  key: string
  label: string
  items: T[]
}

interface ExplorerTreeProps<T> {
  items: T[]
  groupKey: keyof T | ((item: T) => string)
  renderItem: (item: T) => JSX.Element
  onCreate?: (groupKey: string) => void
  onItemSelect?: (item: T) => void
  renderGroupHeader?: (groupLabel: string, groupItems: T[], onCreate?: (groupKey: string) => void) => JSX.Element
}

/**
 * Reusable explorer/tree component with collapsible groups.
 * Displays items grouped by a single level, with expand/collapse functionality.
 * Each group can have an optional "Add" button.
 */
export default function ExplorerTree<T extends { id: string }>({
  items,
  groupKey,
  renderItem,
  onCreate,
  onItemSelect,
  renderGroupHeader,
}: ExplorerTreeProps<T>) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({})

  // Group items by the specified key
  const groupedItems: Record<string, T[]> = items.reduce((acc, item) => {
    const groupValue = typeof groupKey === "function" ? groupKey(item) : (item[groupKey] as string)
    const group = groupValue || "Uncategorized"
    
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push(item)
    
    return acc
  }, {} as Record<string, T[]>)

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupLabel]: !prev[groupLabel] }))
  }

  const handleSelectItem = (item: T) => {
    onItemSelect?.(item)
  }

  const handleCreate = (groupLabel: string) => {
    onCreate?.(groupLabel)
  }

  // Sort groups alphabetically
  const sortedGroups = Object.entries(groupedItems).sort((a, b) => a[0].localeCompare(b[0]))

  if (items.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      {sortedGroups.map(([groupLabel, groupItems]) => {
        const isExpanded = expandedGroups[groupLabel] ?? true

        return (
          <div key={groupLabel} className="space-y-1">
            {/* Group Header */}
            {renderGroupHeader ? (
              renderGroupHeader(groupLabel, groupItems, onCreate)
            ) : (
              <div className="flex items-center gap-2 py-1 px-2">
                <button
                  onClick={() => toggleGroup(groupLabel)}
                  className="w-4 h-4 flex items-center justify-center rounded transition-colors"
                  style={{ backgroundColor: "transparent" }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "var(--bg-input)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                  }}
                >
                  <svg
                    className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  {groupLabel}
                </span>

                {onCreate && (
                  <div className="flex-1" />
                )}

                {/* Add button */}
                {onCreate && (
                  <button
                    onClick={() => handleCreate(groupLabel)}
                    className="w-5 h-5 flex items-center justify-center rounded transition-colors text-xs font-bold"
                    style={{ color: 'var(--accent)', backgroundColor: "transparent" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "var(--bg-input)"
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent"
                    }}
                    title={`Add to ${groupLabel}`}
                  >
                    +
                  </button>
                )}
              </div>
            )}

            {/* Items within group */}
            {isExpanded && (
              <div className="ml-5 space-y-1 pl-3" style={{ borderLeft: "1px solid var(--border)" }}>
                {groupItems.map((item) => (
                  <div key={item.id} onClick={() => handleSelectItem(item)} className="cursor-pointer">
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}