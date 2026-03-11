import { useState, useRef, useEffect } from "react"
import SettingsPanel from "../ui/SettingsPanel"
import FilterPanel from "../ui/FilterPanel"
import DropdownMenu from "../ui/DropdownMenu"
import ConfirmDialog from "../ui/ConfirmDialog"
import { useKanbanStore } from "../../state/kanbanStore"
import {
  downloadBoardJSON,
  readFileAsText,
  parseExportJSON,
  createFileINPUT,
  downloadDatabaseBackup,
  parseDatabaseBackup,
  openFileInTauri,
  isTauri,
  type DatabaseBackup,
} from "../../utils/exportImport"
import { store } from "../../storage/storage"
import { db } from "../../storage/db"
import type { Column } from "../../models/Column"
import type { Task } from "../../models/Task"
import type { Board } from "../../models/Board"
import type { Comment } from "../../models/Comment"

interface TopBarProps {
  boardName?: string
  boardId?: string
  onSettingsClick?: () => void
}

// ── Tiny icon helpers ─────────────────────────────────────────────────────────
function IconBoard() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
      <rect x="2" y="2" width="4" height="12" rx="1" strokeWidth={1.5} />
      <rect x="8" y="2" width="4" height="8"  rx="1" strokeWidth={1.5} />
      <rect x="8" y="12" width="4" height="2" rx="1" strokeWidth={1.5} />
    </svg>
  )
}
function IconList() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4h10M3 8h10M3 12h10" />
    </svg>
  )
}
function IconGrid() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
      <rect x="2"  y="2"  width="5" height="5" rx="1" strokeWidth={1.5} />
      <rect x="9"  y="2"  width="5" height="5" rx="1" strokeWidth={1.5} />
      <rect x="2"  y="9"  width="5" height="5" rx="1" strokeWidth={1.5} />
      <rect x="9"  y="9"  width="5" height="5" rx="1" strokeWidth={1.5} />
    </svg>
  )
}
function IconSearch() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
      <circle cx="7" cy="7" r="4.5" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeWidth={1.5} d="M10.5 10.5l3 3" />
    </svg>
  )
}
function IconArchive() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M2 5h12M3.5 5l.75 8h7.5L12.5 5M6 8.5h4" />
    </svg>
  )
}
function IconFilter() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M2 4h12M4.5 8h7M7 12h2" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="2.5" strokeWidth={1.5} />
      <path strokeLinecap="round" strokeWidth={1.5}
        d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1" />
    </svg>
  )
}
function IconDots() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
      <circle cx="8" cy="3.5" r="1.5" />
      <circle cx="8" cy="8"   r="1.5" />
      <circle cx="8" cy="12.5" r="1.5" />
    </svg>
  )
}
function IconClose() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 10 10">
      <path strokeLinecap="round" strokeWidth={2} d="M1 1l8 8M9 1L1 9" />
    </svg>
  )
}

// ── View mode config ──────────────────────────────────────────────────────────
const VIEW_MODES = [
  { key: "board" as const, label: "Board",  Icon: IconBoard },
  { key: "list"  as const, label: "List",   Icon: IconList  },
  { key: "grid"  as const, label: "Grid",   Icon: IconGrid  },
]

// ── Separator ─────────────────────────────────────────────────────────────────
function Sep() {
  return (
    <div style={{ width: 1, height: 20, backgroundColor: "var(--border)", flexShrink: 0 }} />
  )
}

// ── Icon button with hover ────────────────────────────────────────────────────
function IconBtn({
  onClick, title, active = false, children, danger = false
}: {
  onClick: () => void
  title: string
  active?: boolean
  children: React.ReactNode
  danger?: boolean
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        border: "none",
        cursor: "pointer",
        transition: "background-color 0.15s, color 0.15s",
        backgroundColor: active
          ? "var(--accent, #3b82f6)"
          : hov
            ? danger ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.07)"
            : "transparent",
        color: active
          ? "#fff"
          : hov
            ? danger ? "#ef4444" : "var(--text-primary, #f0f0f0)"
            : "var(--text-secondary, #a8a8b0)",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

export default function TopBar({ boardName = "Kanban", boardId, onSettingsClick }: TopBarProps) {
  const [settingsOpen,        setSettingsOpen]        = useState(false)
  const [filterOpen,          setFilterOpen]          = useState(false)
  const [searchExpanded,      setSearchExpanded]      = useState(false)
  const [searchInput,         setSearchInput]         = useState("")
  const [importExportMenuOpen, setImportExportMenuOpen] = useState(false)
  const [showRestoreDialog,   setShowRestoreDialog]   = useState(false)
  const [pendingBackupData,   setPendingBackupData]   = useState<DatabaseBackup | null>(null)

  const boards       = useKanbanStore(s => s.boards)
  const columns      = useKanbanStore(s => s.columns)
  const tasks        = useKanbanStore(s => s.tasks)
  const viewMode     = useKanbanStore(s => s.viewMode)
  const showArchived = useKanbanStore(s => s.showArchived)
  const activeTags   = useKanbanStore(s => s.activeTags)

  const setViewMode     = useKanbanStore(s => s.setViewMode)
  const setShowArchived = useKanbanStore(s => s.setShowArchived)
  const setSearchQuery  = useKanbanStore(s => s.setSearchQuery)
  const setActiveTags   = useKanbanStore(s => s.setActiveTags)
  const toggleTag       = useKanbanStore(s => s.toggleTag)
  const loadBoards      = useKanbanStore(s => s.loadBoards)
  const loadBoard       = useKanbanStore(s => s.loadBoard)

  const currentBoard  = boards.find(b => b.id === boardId)
  const isNotesBoard  = currentBoard?.type === "notes"
  const allTags       = [...new Set(tasks.flatMap(t => t.tags || []))].filter(Boolean)
  const importExportMenuRef = useRef<HTMLButtonElement>(null)
  const searchInputRef      = useRef<HTMLInputElement>(null)

  // Expand search on Cmd/Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchExpanded(true)
        setTimeout(() => searchInputRef.current?.focus(), 50)
      }
      if (e.key === "Escape" && searchExpanded) {
        setSearchExpanded(false)
        setSearchInput("")
        setSearchQuery("")
      }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [searchExpanded, setSearchQuery])

  const handleSearchChange = (val: string) => {
    setSearchInput(val)
    setSearchQuery(val) // live search — no Enter needed
  }

  const clearSearch = () => {
    setSearchInput("")
    setSearchQuery("")
    setSearchExpanded(false)
  }

  const handleSettingsClick = onSettingsClick
    ? () => { onSettingsClick(); setSettingsOpen(true) }
    : () => setSettingsOpen(true)

  const handleExport = async () => {
    if (!currentBoard) return
    await downloadBoardJSON(currentBoard, columns, tasks)
    // Show browser notification if not Tauri (Tauri shows its own dialog)
    if (!isTauri()) {
      alert(`Board "${currentBoard.name}" exported successfully!\n\nCheck your Downloads folder.`)
    }
  }

  const handleBackup = async () => {
    // Get all data from IndexedDB
    const allBoards = await db.boards.toArray()
    const allColumns = await db.columns.toArray()
    const allTasks = await db.tasks.toArray()
    const allComments = await db.comments.toArray()

    await downloadDatabaseBackup(allBoards, allColumns, allTasks, allComments)
    
    // Show browser notification if not Tauri (Tauri shows its own dialog)
    if (!isTauri()) {
      alert(`Database backup exported successfully!\n\nCheck your Downloads folder.`)
    }
  }

  const handleRestore = async () => {
    if (isTauri()) {
      // Use Tauri's open dialog
      try {
        const content = await openFileInTauri()
        if (!content) return
        
        const backup = parseDatabaseBackup(content)
        if (!backup) {
          alert("Invalid backup file format")
          return
        }
        setPendingBackupData(backup)
        setShowRestoreDialog(true)
      } catch (err) {
        console.error("Restore failed:", err)
        alert("Failed to read backup file")
      }
    } else {
      // Use browser file input
      const input = createFileINPUT()
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        try {
          const content = await readFileAsText(file)
          const backup = parseDatabaseBackup(content)
          if (!backup) {
            alert("Invalid backup file format")
            return
          }
          setPendingBackupData(backup)
          setShowRestoreDialog(true)
        } catch (err) {
          console.error("Restore failed:", err)
          alert("Failed to read backup file")
        }
      }
      input.click()
    }
  }

  const confirmRestore = async () => {
    if (!pendingBackupData) return
    try {
      // Clear existing data
      await db.transaction("rw", db.boards, db.columns, db.tasks, db.comments, async () => {
        await db.boards.clear()
        await db.columns.clear()
        await db.tasks.clear()
        await db.comments.clear()

        // Restore boards
        for (const board of pendingBackupData.boards) {
          await db.boards.add(board)
        }
        // Restore columns
        for (const col of pendingBackupData.columns) {
          await db.columns.add(col)
        }
        // Restore tasks
        for (const task of pendingBackupData.tasks) {
          await db.tasks.add(task)
        }
        // Restore comments
        for (const comment of pendingBackupData.comments || []) {
          await db.comments.add(comment)
        }
      })

      // Reload the app data
      await loadBoards()
      setShowRestoreDialog(false)
      setPendingBackupData(null)
      
      // Show success notification
      if (isTauri()) {
        try {
          const { message } = await import('@tauri-apps/plugin-dialog')
          await message('Database restored successfully!')
        } catch {
          alert("Database restored successfully!")
        }
      } else {
        alert("Database restored successfully! The app will now reflect the restored data.")
      }
    } catch (err) {
      console.error("Restore failed:", err)
      alert("Failed to restore database")
    }
  }

  const handleImport = async () => {
    if (isTauri()) {
      // Use Tauri's open dialog
      try {
        const content = await openFileInTauri()
        if (!content) return
        
        const exported = parseExportJSON(content)
        if (!exported) {
          alert("Invalid file format")
          return
        }
        const newBoardId = `board_${Date.now()}`
        await store.createBoard({ ...exported.board, id: newBoardId })
        const columnIds: Record<string, string> = {}
        for (const col of exported.columns) {
          const newColId = `col_${Date.now()}_${Math.random()}`
          columnIds[col.id] = newColId
          await store.createColumn({ ...col, id: newColId, boardId: newBoardId } as Column)
        }
        for (const task of exported.tasks) {
          const newColId = columnIds[task.columnId]
          if (newColId) await store.createTask({ ...task, id: `task_${Date.now()}_${Math.random()}`, columnId: newColId } as Task)
        }
        alert(`Board "${exported.board.name}" imported successfully!`)
      } catch (err) {
        console.error("Import failed:", err)
        alert("Failed to import board")
      }
    } else {
      // Use browser file input
      const input = createFileINPUT()
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0]
        if (!file) return
        try {
          const content = await readFileAsText(file)
          const exported = parseExportJSON(content)
          if (!exported) { alert("Invalid file format"); return }
          const newBoardId = `board_${Date.now()}`
          await store.createBoard({ ...exported.board, id: newBoardId })
          const columnIds: Record<string, string> = {}
          for (const col of exported.columns) {
            const newColId = `col_${Date.now()}_${Math.random()}`
            columnIds[col.id] = newColId
            await store.createColumn({ ...col, id: newColId, boardId: newBoardId } as Column)
          }
          for (const task of exported.tasks) {
            const newColId = columnIds[task.columnId]
            if (newColId) await store.createTask({ ...task, id: `task_${Date.now()}_${Math.random()}`, columnId: newColId } as Task)
          }
          alert(`Board "${exported.board.name}" imported successfully!`)
        } catch (err) {
          console.error("Import failed:", err)
          alert("Failed to import board")
        }
      }
      input.click()
    }
  }

  // Stats for the board name area
  const totalTasks    = tasks.filter(t => !(t.data?.archived as boolean)).length
  const archivedCount = tasks.filter(t => (t.data?.archived as boolean)).length

  return (
    <>
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          gap: 4,
          paddingLeft: 16,
          paddingRight: 12,
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-app)",
          fontFamily: "'DM Sans', sans-serif",
          flexShrink: 0,
          zIndex: 40,
          position: "relative",
        }}
      >
        {/* ── Board name + task count ─────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
          <h1
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--text-primary)",
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
          >
            {boardName}
          </h1>
          {!isNotesBoard && (
            <span
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                fontWeight: 500,
              }}
            >
              {totalTasks} task{totalTasks !== 1 ? "s" : ""}
              {archivedCount > 0 && ` · ${archivedCount} archived`}
            </span>
          )}
        </div>

        <Sep />

        {/* ── View mode switcher ──────────────────────────────────────── */}
        {!isNotesBoard && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "var(--bg-popover)",
              borderRadius: 8,
              padding: 3,
              border: "1px solid var(--border)",
              gap: 1,
              flexShrink: 0,
            }}
          >
            {VIEW_MODES.map(({ key, label, Icon }) => {
              const active = viewMode === key
              return (
                <ViewModeBtn key={key} active={active} label={label} onClick={() => setViewMode(key)}>
                  <Icon />
                </ViewModeBtn>
              )
            })}
          </div>
        )}

        {/* ── Show archived toggle (list + grid only) ─────────────────── */}
        {!isNotesBoard && (viewMode === "list" || viewMode === "grid") && (
          <>
            <Sep />
            <ArchivedToggle active={showArchived} count={archivedCount} onClick={() => setShowArchived(!showArchived)} />
          </>
        )}

        {/* ── Filter button ───────────────────────────────────────────── */}
        {!isNotesBoard && (
          <>
            <Sep />
            <FilterBtn active={activeTags.length > 0} count={activeTags.length} onClick={() => setFilterOpen(!filterOpen)} />
          </>
        )}

        {/* ── Spacer ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1 }} />

        {/* ── Search ─────────────────────────────────────────────────── */}
        <SearchBar
          ref={searchInputRef}
          expanded={searchExpanded}
          value={searchInput}
          onChange={handleSearchChange}
          onExpand={() => { setSearchExpanded(true); setTimeout(() => searchInputRef.current?.focus(), 50) }}
          onClear={clearSearch}
        />

        <Sep />

        {/* ── Settings ───────────────────────────────────────────────── */}
        <IconBtn onClick={handleSettingsClick} title="Settings">
          <IconSettings />
        </IconBtn>

        {/* ── Import / Export ────────────────────────────────────────── */}
        <button
          ref={importExportMenuRef}
          onClick={() => setImportExportMenuOpen(v => !v)}
          title="Import / Export"
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.color = "var(--text-primary)" }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = importExportMenuOpen ? "rgba(255,255,255,0.07)" : "transparent"; e.currentTarget.style.color = "var(--text-secondary)" }}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
            transition: "background-color 0.15s, color 0.15s",
            backgroundColor: importExportMenuOpen ? "rgba(255,255,255,0.07)" : "transparent",
            color: "var(--text-secondary)",
            flexShrink: 0,
          }}
        >
          <IconDots />
        </button>

        {importExportMenuOpen && (
          <DropdownMenu
            items={[
              { label: "Export Board", onClick: handleExport },
              { label: "Import Board", onClick: handleImport },
              { separator: true } as const,
              { label: "Backup Database", onClick: handleBackup },
              { label: "Restore Database", onClick: handleRestore },
            ]}
            onClose={() => setImportExportMenuOpen(false)}
            anchorRef={importExportMenuRef as React.RefObject<HTMLElement>}
            align="right"
          />
        )}

        {/* Restore Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showRestoreDialog}
          onClose={() => { setShowRestoreDialog(false); setPendingBackupData(null) }}
          onConfirm={confirmRestore}
          title="Restore Database"
          message="Warning: This will replace all current data with the backup. This action cannot be undone. Continue?"
          confirmText="Restore"
          cancelText="Cancel"
          variant="danger"
        />
      </div>

      {/* ── Panels ───────────────────────────────────────────────────── */}
      <FilterPanel
        isOpen={filterOpen}
        allTags={allTags}
        activeTags={activeTags}
        onToggleTag={toggleTag}
        onClearTags={() => setActiveTags([])}
        onClose={() => setFilterOpen(false)}
      />
      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ViewModeBtn({ active, label, onClick, children }: {
  active: boolean; label: string; onClick: () => void; children: React.ReactNode
}) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 5,
        padding: "4px 8px", borderRadius: 5, border: "none", cursor: "pointer",
        transition: "background-color 0.12s, color 0.12s",
        backgroundColor: active
          ? "var(--accent, #3b82f6)"
          : hov ? "rgba(255,255,255,0.06)" : "transparent",
        color: active ? "#fff" : hov ? "var(--text-primary)" : "var(--text-secondary)",
        fontSize: 12,
        fontWeight: active ? 600 : 500,
        fontFamily: "'DM Sans', sans-serif",
        whiteSpace: "nowrap",
      }}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}

function ArchivedToggle({ active, count, onClick }: { active: boolean; count: number; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title={active ? "Hide archived tasks" : "Show archived tasks"}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
        transition: "background-color 0.15s, color 0.15s, border-color 0.15s",
        backgroundColor: active
          ? "rgba(113,113,122,0.18)"
          : hov ? "rgba(255,255,255,0.05)" : "transparent",
        color: active ? "var(--text-secondary)" : hov ? "var(--text-primary)" : "var(--text-muted)",
        fontSize: 12,
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
        outline: active ? "1px solid rgba(113,113,122,0.3)" : "none",
        flexShrink: 0,
      }}
    >
      <IconArchive />
      <span>Archived</span>
      {count > 0 && (
        <span style={{
          fontSize: 10, fontWeight: 700,
          backgroundColor: active ? "rgba(255,255,255,0.12)" : "rgba(113,113,122,0.2)",
          color: active ? "var(--text-secondary)" : "var(--text-muted)",
          borderRadius: 10, padding: "1px 5px",
          lineHeight: 1.6,
        }}>{count}</span>
      )}
    </button>
  )
}

function FilterBtn({ active, count, onClick }: { active: boolean; count: number; onClick: () => void }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onClick}
      title="Filter by tags"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
        transition: "background-color 0.15s, color 0.15s",
        backgroundColor: active
          ? "rgba(59,130,246,0.15)"
          : hov ? "rgba(255,255,255,0.05)" : "transparent",
        color: active ? "var(--accent, #60a5fa)" : hov ? "var(--text-primary)" : "var(--text-muted)",
        fontSize: 12,
        fontWeight: 500,
        fontFamily: "'DM Sans', sans-serif",
        outline: active ? "1px solid rgba(59,130,246,0.3)" : "none",
        flexShrink: 0,
      }}
    >
      <IconFilter />
      <span>Filter</span>
      {active && (
        <span style={{
          fontSize: 10, fontWeight: 700,
          backgroundColor: "rgba(59,130,246,0.2)",
          color: "var(--accent, #60a5fa)",
          borderRadius: 10, padding: "1px 5px",
          lineHeight: 1.6,
        }}>{count}</span>
      )}
    </button>
  )
}

import React, { forwardRef } from "react"

const SearchBar = forwardRef<HTMLInputElement, {
  expanded: boolean
  value: string
  onChange: (v: string) => void
  onExpand: () => void
  onClear: () => void
}>(function SearchBar({ expanded, value, onChange, onExpand, onClear }, ref) {
  const [hov, setHov] = useState(false)

  if (!expanded) {
    return (
      <button
        onClick={onExpand}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        title="Search (⌘K)"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "5px 10px", borderRadius: 8, border: "none", cursor: "pointer",
          transition: "background-color 0.15s, color 0.15s",
          backgroundColor: hov ? "rgba(255,255,255,0.05)" : "transparent",
          color: hov ? "var(--text-primary)" : "var(--text-muted)",
          fontSize: 12, fontWeight: 500,
          fontFamily: "'DM Sans', sans-serif",
          flexShrink: 0,
        }}
      >
        <IconSearch />
        <span>Search</span>
        <span style={{
          fontSize: 10, fontWeight: 600,
          backgroundColor: "rgba(255,255,255,0.06)",
          color: "var(--text-muted)",
          borderRadius: 4, padding: "1px 4px",
          border: "1px solid var(--border)",
          letterSpacing: "0.02em",
        }}>⌘K</span>
      </button>
    )
  }

  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", flexShrink: 0 }}>
      <div style={{
        position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)",
        color: "var(--text-muted)", pointerEvents: "none",
        display: "flex", alignItems: "center",
      }}>
        <IconSearch />
      </div>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search tasks…"
        autoFocus
        style={{
          width: 220,
          paddingLeft: 32,
          paddingRight: value ? 32 : 12,
          paddingTop: 6,
          paddingBottom: 6,
          borderRadius: 8,
          border: "1px solid var(--border-focus, rgba(59,130,246,0.4))",
          backgroundColor: "var(--bg-popover)",
          color: "var(--text-primary)",
          fontSize: 13,
          fontFamily: "'DM Sans', sans-serif",
          outline: "none",
          transition: "width 0.2s",
          boxShadow: "0 0 0 3px rgba(59,130,246,0.08)",
        }}
      />
      {value && (
        <button
          onClick={onClear}
          style={{
            position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 18, height: 18, borderRadius: 4, border: "none", cursor: "pointer",
            backgroundColor: "rgba(255,255,255,0.08)",
            color: "var(--text-muted)",
            transition: "background-color 0.12s, color 0.12s",
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.15)"; e.currentTarget.style.color = "var(--text-primary)" }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "var(--text-muted)" }}
        >
          <IconClose />
        </button>
      )}
    </div>
  )
})