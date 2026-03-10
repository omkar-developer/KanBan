import { useMemo } from "react"
import type { Task } from "../../models/Task"
import { useKanbanStore } from "../../state/kanbanStore"
import TagFilterUI from "../ui/TagFilterUI"

export default function ListView() {
  const tasks         = useKanbanStore(s => s.tasks)
  const columns       = useKanbanStore(s => s.columns)
  const activeTags    = useKanbanStore(s => s.activeTags)
  const searchQuery   = useKanbanStore(s => s.searchQuery)
  const setActiveTags = useKanbanStore(s => s.setActiveTags)
  const toggleTag     = useKanbanStore(s => s.toggleTag)
  const showArchived  = useKanbanStore(s => s.showArchived)

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

  const getColumnName = (columnId: string): string => {
    const column = columns.find(c => c.id === columnId)
    return column?.name || "Unknown"
  }

  const getPriorityColor = (priority?: string): string => {
    switch (priority) {
      case 'critical': return '#dc2626'
      case 'high': return '#ea580c'
      case 'medium': return '#ca8a04'
      case 'low': return '#16a34a'
      default: return '#6b7280'
    }
  }

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

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 rounded-lg" style={{ 
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          color: "var(--text-muted)"
        }}>
          No tasks found
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)"
        }}>
          <table className="min-w-full divide-y" style={{ borderColor: "var(--border)" }}>
            <thead style={{ backgroundColor: "var(--bg-column-solid)" }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Task</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Column</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Priority</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filteredTasks.map(task => (
                <tr 
                  key={task.id}
                  style={{ 
                    backgroundColor: isArchived(task) ? "rgba(255,255,255,0.02)" : "transparent",
                    opacity: isArchived(task) ? 0.6 : 1
                  }}
                  className="hover:bg-white/[0.05] transition"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{task.title}</div>
                    {task.description && (
                      <div className="text-sm truncate max-w-md" style={{ color: "var(--text-secondary)" }}>
                        {task.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: "var(--text-primary)" }}>
                    {getColumnName(task.columnId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.priority && (
                      <span 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${getPriorityColor(task.priority)}20`, color: getPriorityColor(task.priority) }}
                      >
                        {task.priority}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: "var(--text-secondary)" }}>
                    {task.type || 'task'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {task.tags && task.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {task.tags.map(tag => {
                          const colors: Record<string, string> = {
                            bug: "#ef4444", feature: "#8b5cf6", ui: "#06b6d4", 
                            doc: "#22c55e", perf: "#f59e0b",
                          }
                          const bg = colors[tag] || "#6b7280"
                          return (
                            <span 
                              key={tag} 
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                              style={{ 
                                backgroundColor: `${bg}20`,
                                color: bg,
                                border: `1px solid ${bg}40`
                              }}
                            >
                              {tag}
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}