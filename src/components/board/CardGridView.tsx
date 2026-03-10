import { useMemo } from "react"
import type { Task } from "../../models/Task"
import { useKanbanStore } from "../../state/kanbanStore"
import TagFilterUI from "../ui/TagFilterUI"
import { tagColorClasses } from "../../utils/tagColors"

function getTypeIcon(type?: string): string {
  switch (type) {
    case 'note': return '📝'
    case 'bug': return '🐛'
    case 'feature': return '✨'
    case 'checklist': return '☑️'
    default: return '📋'
  }
}

function Badge({ priority }: { priority?: string }) {
  const colors: Record<string, string> = {
    critical: "#ef4444",
    high: "#f97316", 
    medium: "#eab308",
    low: "#22c55e"
  }
  const bgColors: Record<string, string> = {
    critical: "rgba(239,68,68,0.1)",
    high: "rgba(249,115,22,0.1)",
    medium: "rgba(234,179,8,0.1)",
    low: "rgba(34,197,94,0.1)"
  }
  
  return (
    <span 
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ 
        backgroundColor: bgColors[priority || 'low'],
        color: colors[priority || 'low']
      }}
    >
      {priority}
    </span>
  )
}

export default function CardGridView() {
  const tasks         = useKanbanStore(s => s.tasks)
  const columns       = useKanbanStore(s => s.columns)
  const activeTags    = useKanbanStore(s => s.activeTags)
  const searchQuery   = useKanbanStore(s => s.searchQuery)
  const setActiveTags = useKanbanStore(s => s.setActiveTags)
  const toggleTag     = useKanbanStore(s => s.toggleTag)
  const showArchived  = useKanbanStore(s => s.showArchived)

  const getColumnName = (columnId: string): string => {
    const column = columns.find(c => c.id === columnId)
    return column?.name || "Unknown"
  }

  // Helper to check if task is archived
  const isArchived = (task: Task): boolean => {
    return (task.data?.archived as boolean) === true
  }

  // Filter tasks based on active tags, search query, and archive status
  const filteredTasks = useMemo(() => {
    const result = tasks.filter(task => {
      // Archive filter
      if (!showArchived && isArchived(task)) return false
      
      // Tag filter
      if (activeTags.length > 0) {
        if (!task.tags?.some(tag => activeTags.includes(tag))) return false
      }
      
      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        if (!(
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query)) ||
          task.tags?.some(tag => tag.toLowerCase().includes(query))
        )) return false
      }
      
      return true
    })
    
    return result.sort((a, b) => a.createdAt - b.createdAt)
  }, [tasks, activeTags, searchQuery, showArchived])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <TagFilterUI 
          allTags={[...new Set(tasks.flatMap(t => t.tags || []))].filter(Boolean)}
          activeTags={activeTags} 
          onToggleTag={toggleTag} 
          onClearTags={() => setActiveTags([])}
          taskCount={filteredTasks.length}
          totalCount={tasks.filter(t => !showArchived || isArchived(t)).length}
        />
      </div>

      {/* Tasks Grid */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--text-muted)" }}>
          No tasks found
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTasks.map(task => (
            <div 
              key={task.id}
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                opacity: isArchived(task) ? 0.5 : 1
              }}
            >
              {/* Header with type and priority */}
              <div className="flex items-start justify-between mb-3">
                <span className="text-xl">{getTypeIcon(task.type)}</span>
                {task.priority && <Badge priority={task.priority} />}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold mb-2 line-clamp-2" style={{ color: "var(--text-primary)" }}>
                {task.title}
              </h3>

              {/* Description preview */}
              {task.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {task.description}
                </p>
              )}

              {/* Tags */}
              {task.tags && task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {task.tags.map(tag => {
                    const c = tagColorClasses(tag)
                    return (
                      <span key={tag} className={`text-[10px] px-1.5 py-0.5 rounded-md border ${c.bg} ${c.border} ${c.text}`}>#{tag}</span>
                    )
                  })}
                </div>
              )}

              {/* Footer info */}
              <div className="text-xs space-y-1" style={{ color: "var(--text-muted)" }}>
                <div className="flex items-center gap-1.5">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>{getColumnName(task.columnId)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}