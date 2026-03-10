import { useMemo, useState, useCallback } from "react"
import type { Task } from "../../models/Task"
import { useKanbanStore } from "../../state/kanbanStore"
import ExplorerTree from "../ui/ExplorerTree"
import MarkdownEditor from "../notes/MarkdownEditor"
import BacklinksSection from "../notes/BacklinksSection"
import TextInputDialog from "../ui/TextInputDialog"

export default function NotesView() {
  const tasks         = useKanbanStore(s => s.tasks)
  const columns       = useKanbanStore(s => s.columns)
  const activeBoard   = useKanbanStore(s => s.activeBoard)
  
  // Filter tasks: only notes (type === "note")
  const noteTasks = useMemo(() => {
    return tasks.filter(t => t.type === "note")
  }, [tasks])

  // Get all unique categories sorted alphabetically
  const categories = useMemo(() => {
    const categorySet = new Set<string>()
    
    noteTasks.forEach(task => {
      const category = task.data?.category as string
      if (category && category.trim()) {
        categorySet.add(category)
      }
    })
    
    // Add "Uncategorized" if there are notes without a category
    if (noteTasks.some(t => !t.data?.category)) {
      categorySet.add("Uncategorized")
    }
    
    return Array.from(categorySet).sort()
  }, [noteTasks])

  // Group notes by category for display
  const groupedNotes = useMemo(() => {
    if (categories.length === 0) return []
    
    return categories.map(category => ({
      key: category,
      label: category,
      items: noteTasks.filter(task => {
        const taskCategory = task.data?.category as string
        return category === "Uncategorized" 
          ? !taskCategory 
          : taskCategory === category
      }),
    }))
  }, [noteTasks, categories])

  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(undefined)
  const [noteContent, setNoteContent] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [pendingCategory, setPendingCategory] = useState<string>("")

  // Get selected note data
  const selectedNote = useMemo(() => {
    return noteTasks.find(t => t.id === selectedNoteId)
  }, [noteTasks, selectedNoteId])

  // Update content when note selection changes
  useMemo(() => {
    if (selectedNote) {
      setNoteContent(selectedNote.description || "")
    } else {
      setNoteContent("")
    }
  }, [selectedNote])

  // Handle note selection
  const handleNoteSelect = useCallback((noteId: string) => {
    setSelectedNoteId(noteId)
  }, [])

  // Handle content change
  const handleContentChange = (newContent: string) => {
    setNoteContent(newContent)
  }

  // Handle save
  const handleSaveNote = useCallback(async () => {
    if (!selectedNoteId) return
    
    try {
      setIsSaving(true)
      await useKanbanStore.getState().updateTask(selectedNoteId, {
        description: noteContent.trim() || undefined,
      })
    } finally {
      setIsSaving(false)
    }
  }, [selectedNoteId, noteContent])

  // Handle wiki link click - navigate to referenced note
  const handleWikiLinkClick = useCallback((noteTitle: string) => {
    const linkedNote = noteTasks.find(
      t => t.title.toLowerCase() === noteTitle.toLowerCase()
    )
    if (linkedNote) {
      setSelectedNoteId(linkedNote.id)
    }
  }, [noteTasks])

  // Handle delete note
  const handleDeleteNote = async () => {
    if (!selectedNoteId) return
    if (!confirm("Are you sure you want to delete this note?")) return
    
    await useKanbanStore.getState().deleteTask(selectedNoteId)
    setSelectedNoteId(undefined)
    setNoteContent("")
  }

  // Handle create new note in a category
  const handleCreateNote = (category: string) => {
    setPendingCategory(category)
    setShowCreateDialog(true)
  }

  // Confirm creating new note with title
  const handleConfirmCreateNote = async (title: string) => {
    if (!title.trim()) return
    
    const newNote: Partial<Task> = {
      type: "note",
      title: title.trim(),
      data: { category: pendingCategory },
    }
    
    // Create note in first available column
    if (columns.length > 0) {
      const firstColumnId = columns[0].id
      const createdNote = await useKanbanStore.getState().createTask(firstColumnId, title.trim(), newNote)
      setShowCreateDialog(false)
      // The newly created note should be selected automatically
    }
  }

  // Render note item for the tree
  const renderNoteItem = (task: Task) => {
    return (
      <div className={`
        px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm
        ${selectedNoteId === task.id 
          ? "bg-blue-500/20 border border-blue-500/30" 
          : "hover:bg-white/5 border border-transparent"
        }
      `}>
        <div className="font-medium text-zinc-100 truncate">
          {task.title || "Untitled Note"}
        </div>
        {task.description && (
          <div className="text-xs text-zinc-500 truncate mt-0.5">
            {task.description.substring(0, 40)}{"..."}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <div className="flex h-full overflow-hidden">
        {/* Left Panel - Notes List */}
        <div className="w-80 flex flex-col border-r border-white/10 bg-zinc-900/50">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-100">Notes</h2>
            {activeBoard?.category && (
              <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                Category: {activeBoard.category}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {groupedNotes.length === 0 ? (
              <div className="text-center text-zinc-500 py-8 space-y-3">
                <p>No notes yet.</p>
                <button 
                  onClick={() => setShowCreateDialog(true)}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors text-sm font-medium"
                >
                  Create Your First Note
                </button>
              </div>
            ) : (
              <ExplorerTree<Task>
                items={noteTasks}
                groupKey={(item: Task) => item.data?.category as string || "Uncategorized"}
                renderItem={renderNoteItem}
                onCreate={handleCreateNote}
                onItemSelect={(item) => handleNoteSelect(item.id)}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Note Editor */}
        <div className="flex-1 flex flex-col bg-zinc-950 overflow-y-auto">
          {selectedNote ? (
            <div className="flex-1 flex flex-col overflow-y-auto">
              {/* Note Header */}
              <div className="sticky top-0 border-b border-white/10 bg-zinc-950/95 backdrop-blur-sm p-4 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-semibold text-zinc-100 truncate">
                    {selectedNote.title}
                  </h1>
                  {(() => {
                    const category = selectedNote.data?.category as string | undefined;
                    return category ? (
                      <p className="text-xs text-zinc-500 mt-1">
                        Category: {category}
                      </p>
                    ) : null;
                  })()}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={handleSaveNote}
                    disabled={isSaving}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 border border-blue-500/30 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={handleDeleteNote}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Note Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <MarkdownEditor
                  value={noteContent}
                  onChange={handleContentChange}
                  onWikiLinkClick={handleWikiLinkClick}
                  placeholder="Write your notes here… Use [[Note Title]] to link to other notes"
                />

                {/* Backlinks Section */}
                {selectedNote && (
                  <BacklinksSection
                    currentNote={selectedNote}
                    allNotes={noteTasks}
                    onNoteClick={handleNoteSelect}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-zinc-500">
              <div className="text-center">
                <p className="text-lg mb-2">No note selected</p>
                <p className="text-sm">Select a note from the left panel to view or edit it</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Note Dialog */}
      <TextInputDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onConfirm={handleConfirmCreateNote}
        title="Create New Note"
        label="Note Title"
        placeholder="Enter note title..."
        required
        defaultValue=""
      />
    </>
  )
}