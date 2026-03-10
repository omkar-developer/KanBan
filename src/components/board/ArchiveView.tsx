import { useEffect, useMemo } from "react"
import type { Task } from "../../models/Task"
import { useKanbanStore } from "../../state/kanbanStore"
import TagFilterUI from "../ui/TagFilterUI"

// ── Icons ───────────────────────────────────────────────────────────────────────
function ArchiveIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function RestoreIcon() {
  return (
    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.003 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  )
}

function DeleteIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function InfoRow({ iconPath, text }: { iconPath: string; text: string }) {
  return (
    <div className="flex items-center" style={{ color: "var(--text-secondary)" }}>
      <svg className="w-4 h-4 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
      </svg>
      <span>{text}</span>
    </div>
  )
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

function getTypeIcon(type?: string): string {
  switch (type) {
    case 'note': return '📝'
    case 'bug': return '🐛'
    case 'feature': return '✨'
    case 'checklist': return '☑️'
    default: return '📋'
  }
}

export default function ArchiveView() {
  const tasks         = useKanbanStore(s => s.tasks)
  const columns       = useKanbanStore(s => s.columns)
  const activeTags    = useKanbanStore(s => s.activeTags)
  const searchQuery   = useKanbanStore(s => s.searchQuery)
  const setActiveTags = useKanbanStore(s => s.setActiveTags)
  const toggleTag     = useKanbanStore(s => s.toggleTag)
  
  const getColumnName = (columnId: string): string => {
    const column = columns.find(c => c.id === columnId)
    return column?.name || "Unknown"
  }
  
  // ArchiveView only shows archived tasks
  const isArchived = (task: Task): boolean => {
    return (task.data?.archived as boolean) === true
  }

  const archivedTasks = useMemo(() => {
    const result = tasks.filter(task => {
      if (!isArchived(task)) return false
      if (activeTags.length > 0 && !task.tags?.some(tag => activeTags.includes(tag))) return false
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
    
    return result.sort((a, b) => {
      const aTime = b.updatedAt?.valueOf() || b.createdAt
      const bTime = a.updatedAt?.valueOf() || a.createdAt
      return bTime - aTime
    })
  }, [tasks, activeTags, searchQuery])

  const handleUnarchive = async (taskId: string) => {
    // Get the column this task was originally in
    const task = tasks.find(t => t.id === taskId)
    if (!task || !task.columnId) return
    
    await useKanbanStore.getState().unarchiveTask(taskId, task.columnId)
  }

  const handleDelete = async (taskId: string) => {
    await useKanbanStore.getState().deleteTask(taskId)
  }

  // Disable showArchived toggle in archive view since we only show archived
  useEffect(() => {
    useKanbanStore.getState().setShowArchived(false)
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-lg p-4" style={{ 
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)"
      }}>
        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
          <ArchiveIcon />
          Archived Tasks
        </h2>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          These tasks have been archived. You can unarchive them to restore or delete them permanently.
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <TagFilterUI 
          allTags={[...new Set(archivedTasks.flatMap(t => t.tags || []))].filter(Boolean)}
          activeTags={activeTags} 
          onToggleTag={toggleTag} 
          onClearTags={() => setActiveTags([])}
          taskCount={archivedTasks.length}
          totalCount={archivedTasks.length}
        />
      </div>

      {/* Archived Tasks Grid */}
      {archivedTasks.length === 0 ? (
        <div className="text-center py-12 rounded-lg" style={{ 
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)"
        }}>
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: "var(--text-muted)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <p className="text-lg font-medium" style={{ color: "var(--text-primary)" }}>No archived tasks</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>Archived tasks will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {archivedTasks.map(task => (
            <div 
              key={task.id} 
              style={{
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <span className="text-xl">{getTypeIcon(task.type)}</span>
                {task.priority && <Badge priority={task.priority} />}
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{task.title}</h3>

              {/* Description */}
              {task.description && (
                <p className="text-sm mb-3 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {task.description}
                </p>
              )}

              {/* Meta info */}
              <div className="space-y-2 text-sm mb-4">
                {/* Column */}
                <InfoRow iconPath="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" text={getColumnName(task.columnId)} />

                {/* Archived At */}
                <InfoRow 
                  iconPath="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                  text={`Archived ${task.updatedAt ? new Date(task.updatedAt).toLocaleDateString() : 'Unknown'}`}
                />

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map(tag => (
                      <span 
                        key={tag} 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style={{ 
                          backgroundColor: "var(--bg-input)",
                          color: "var(--text-secondary)"
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleUnarchive(task.id)}
                  className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:brightness-110"
                  style={{ 
                    backgroundColor: "var(--accent-muted)",
                    color: "var(--accent)"
                  }}
                >
                  <RestoreIcon />
                  Unarchive
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-md transition-colors hover:bg-rose-500/30 hover:border-rose-500/50"
                  style={{ 
                    backgroundColor: "transparent",
                    color: "var(--text-critical, #ef4444)",
                    border: "1px solid var(--border, rgba(255,255,255,0.06))"
                  }}
                  title="Delete task"
                >
                  <DeleteIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}