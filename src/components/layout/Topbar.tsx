import { useState, useRef } from "react"
import SettingsPanel from "../ui/SettingsPanel"
import FilterPanel from "../ui/FilterPanel"
import DropdownMenu from "../ui/DropdownMenu"
import { useKanbanStore } from "../../state/kanbanStore"
import { downloadBoardJSON, readFileAsText, parseExportJSON, createFileINPUT } from "../../utils/exportImport"
import { store } from "../../storage/indexeddbStore"
import type { Column } from "../../models/Column"
import type { Task } from "../../models/Task"

interface TopBarProps {
  boardName?: string
  boardId?: string
  onSettingsClick?: () => void
}

export default function TopBar({ boardName = "Kanban", boardId, onSettingsClick }: TopBarProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [searchInput, setSearchInput] = useState("")
  const [searchActive, setSearchActive] = useState(false)
  const [importExportMenuOpen, setImportExportMenuOpen] = useState(false)
  
  const boards = useKanbanStore(s => s.boards)
  const columns = useKanbanStore(s => s.columns)
  const tasks = useKanbanStore(s => s.tasks)
  const viewMode = useKanbanStore(s => s.viewMode)
  const showArchived = useKanbanStore(s => s.showArchived)
  const activeTags = useKanbanStore(s => s.activeTags)
  
  const setViewMode = useKanbanStore(s => s.setViewMode)
  const setShowArchived = useKanbanStore(s => s.setShowArchived)
  const setSearchQuery = useKanbanStore(s => s.setSearchQuery)
  const setActiveTags = useKanbanStore(s => s.setActiveTags)
  const toggleTag = useKanbanStore(s => s.toggleTag)
  
  const handleSettingsClick = onSettingsClick ? () => {
    onSettingsClick()
    setSettingsOpen(true)
  } : () => setSettingsOpen(true)

  const handleSearch = () => {
    setSearchQuery(searchInput)
  }

  const currentBoard = boards.find(b => b.id === boardId)

  const handleExport = () => {
    if (!currentBoard) return
    downloadBoardJSON(currentBoard, columns, tasks)
  }

  const handleImport = () => {
    const input = createFileINPUT()
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const content = await readFileAsText(file)
        const exported = parseExportJSON(content)
        
        if (!exported) {
          alert("Invalid file format")
          return
        }

        // Create new board with imported data
        const boardId = `board_${Date.now()}`
        const importedBoard = { ...exported.board, id: boardId }
        
        // Save to database
        await store.createBoard(importedBoard)
        
        const columnIds: Record<string, string> = {}
        for (const col of exported.columns) {
          const newColId = `col_${Date.now()}_${Math.random()}`
          columnIds[col.id] = newColId
          const newCol: Column = { ...col, id: newColId, boardId }
          await store.createColumn(newCol)
        }

        for (const task of exported.tasks) {
          const newColId = columnIds[task.columnId]
          if (newColId) {
            const newTask: Task = { ...task, id: `task_${Date.now()}_${Math.random()}`, columnId: newColId }
            await store.createTask(newTask)
          }
        }

        alert(`Board "${importedBoard.name}" imported successfully!`)
      } catch (error) {
        console.error("Import failed:", error)
        alert("Failed to import board")
      }
    }
    input.click()
  }

  const allTags = [...new Set(tasks.flatMap(t => t.tags || []))].filter(Boolean)
  const importExportMenuRef = useRef<HTMLButtonElement>(null)

  return (
    <div className="border-b flex items-center px-6 py-0 gap-4" style={{ 
      borderColor: 'var(--border)',
      backgroundColor: 'var(--bg-app)',
      height: '64px'
    }}>
      {/* Board Name */}
      <h1 className="text-lg font-bold whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>
        {boardName}
      </h1>

      {/* Divider */}
      <div style={{ width: '1px', height: '32px', backgroundColor: 'var(--border)' }} />

      {/* Search Input — now on left */}
      <div className="relative flex items-center" style={{ width: '240px' }}>
        <input
          type="text"
          placeholder="Search tasks..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onFocus={() => setSearchActive(true)}
          onBlur={() => setSearchActive(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch()
            }
          }}
          className="w-full px-3 pl-9 py-2 text-sm rounded-lg transition-all outline-none"
          style={{
            backgroundColor: 'var(--bg-popover)',
            color: 'var(--text-primary)',
            borderColor: searchActive ? 'var(--border-focus)' : 'var(--border)',
            border: `1px solid ${searchActive ? 'var(--border-focus)' : 'var(--border)'}`,
          }}
        />
        <svg
          className="absolute left-3 w-4 h-4 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          style={{ color: 'var(--text-muted)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* View Mode Buttons */}
      <div className="flex items-center gap-1" style={{
        backgroundColor: 'var(--bg-popover)',
        borderRadius: '6px',
        padding: '4px',
        border: '1px solid var(--border)'
      }}>
        {/* Board View */}
        <button
          onClick={() => setViewMode('board')}
          className="p-2 rounded transition-all"
          style={{
            backgroundColor: viewMode === 'board' ? 'var(--accent)' : 'transparent',
            color: viewMode === 'board' ? '#fff' : 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'board') {
              e.currentTarget.style.backgroundColor = 'var(--bg-card)'
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'board') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
          title="Board View"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 00-2 2m2-2a2 2 0 012 2m-6 0a2 2 0 00-2-2m2 2a2 2 0 01-2-2m0-4h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2v-4a2 2 0 012-2z" />
          </svg>
        </button>

        {/* List View */}
        <button
          onClick={() => setViewMode('list')}
          className="p-2 rounded transition-all"
          style={{
            backgroundColor: viewMode === 'list' ? 'var(--accent)' : 'transparent',
            color: viewMode === 'list' ? '#fff' : 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'list') {
              e.currentTarget.style.backgroundColor = 'var(--bg-card)'
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'list') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
          title="List View"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Grid View */}
        <button
          onClick={() => setViewMode('grid')}
          className="p-2 rounded transition-all"
          style={{
            backgroundColor: viewMode === 'grid' ? 'var(--accent)' : 'transparent',
            color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'grid') {
              e.currentTarget.style.backgroundColor = 'var(--bg-card)'
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'grid') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
          title="Grid View"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
        </button>

        {/* Archive View */}
        <button
          onClick={() => setViewMode('archive')}
          className="p-2 rounded transition-all"
          style={{
            backgroundColor: viewMode === 'archive' ? 'var(--accent)' : 'transparent',
            color: viewMode === 'archive' ? '#fff' : 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (viewMode !== 'archive') {
              e.currentTarget.style.backgroundColor = 'var(--bg-card)'
            }
          }}
          onMouseLeave={(e) => {
            if (viewMode !== 'archive') {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
          title="Archive View"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>
      </div>

      {/* Show Archived Toggle */}
      <button
        onClick={() => setShowArchived(!showArchived)}
        className="px-3 py-2 text-sm font-medium rounded transition-all flex items-center gap-2"
        style={{
          backgroundColor: showArchived ? 'var(--accent)' : 'var(--bg-popover)',
          color: showArchived ? '#fff' : 'var(--text-secondary)',
          border: `1px solid ${showArchived ? 'var(--accent)' : 'var(--border)'}`,
        }}
        onMouseEnter={(e) => {
          if (!showArchived) {
            e.currentTarget.style.backgroundColor = 'var(--bg-card)'
          }
        }}
        onMouseLeave={(e) => {
          if (!showArchived) {
            e.currentTarget.style.backgroundColor = 'var(--bg-popover)'
          }
        }}
        title="Toggle archived items"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
        <span>Archived</span>
      </button>

      {/* Filter Button */}
      <button
        onClick={() => setFilterOpen(!filterOpen)}
        className="px-3 py-2 text-sm font-medium rounded transition-all flex items-center gap-2"
        style={{
          backgroundColor: activeTags.length > 0 ? 'var(--accent)' : 'var(--bg-popover)',
          color: activeTags.length > 0 ? '#fff' : 'var(--text-secondary)',
          border: `1px solid ${activeTags.length > 0 ? 'var(--accent)' : 'var(--border)'}`,
        }}
        onMouseEnter={(e) => {
          if (activeTags.length === 0) {
            e.currentTarget.style.backgroundColor = 'var(--bg-card)'
          }
        }}
        onMouseLeave={(e) => {
          if (activeTags.length === 0) {
            e.currentTarget.style.backgroundColor = 'var(--bg-popover)'
          }
        }}
        title="Filter by tags"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        {activeTags.length > 0 && <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>{activeTags.length}</span>}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings Button */}
      <button
        onClick={handleSettingsClick}
        className="p-2 rounded transition-all"
        style={{
          backgroundColor: 'transparent',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--bg-popover)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
        title="Settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Import/Export Menu Button (triple dot) */}
      <button
        ref={importExportMenuRef}
        onClick={() => setImportExportMenuOpen(!importExportMenuOpen)}
        className="p-2 rounded transition-all"
        style={{
          backgroundColor: importExportMenuOpen ? 'var(--bg-popover)' : 'transparent',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => {
          if (!importExportMenuOpen) {
            e.currentTarget.style.backgroundColor = 'var(--bg-popover)'
          }
        }}
        onMouseLeave={(e) => {
          if (!importExportMenuOpen) {
            e.currentTarget.style.backgroundColor = 'transparent'
          }
        }}
        title="Import / Export"
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {/* Dropdown Menu for Import/Export */}
      {importExportMenuOpen && (
        <DropdownMenu
          items={[
            {
              label: "Export Board",
              onClick: handleExport,
            },
            {
              label: "Import Board",
              onClick: handleImport,
            },
          ]}
          onClose={() => setImportExportMenuOpen(false)}
          anchorRef={importExportMenuRef as React.RefObject<HTMLElement>}
          align="right"
        />
      )}

      {/* Filter Panel */}
      <FilterPanel
        isOpen={filterOpen}
        allTags={allTags}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        onClearTags={() => setActiveTags([])}
        onClose={() => setFilterOpen(false)}
      />

      {/* Settings Panel */}
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}