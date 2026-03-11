import type { Board } from "../models/Board"
import type { Column } from "../models/Column"
import type { Task } from "../models/Task"
import type { Comment } from "../models/Comment"

export interface BoardExport {
  board: Board
  columns: Column[]
  tasks: Task[]
  comments?: Comment[]
  exportDate: string
  version: string
}

export interface DatabaseBackup {
  boards: Board[]
  columns: Column[]
  tasks: Task[]
  comments: Comment[]
  backupDate: string
  version: string
}

/**
 * Tauri v2 detection — checks both the v1 (__TAURI__) and v2 (__TAURI_INTERNALS__) globals.
 */
export function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI__" in window || "__TAURI_INTERNALS__" in window)
  )
}

export function exportBoardAsJSON(board: Board, columns: Column[], tasks: Task[]): string {
  const exportData: BoardExport = {
    board,
    columns: [...columns].sort((a, b) => a.order - b.order),
    tasks: [...tasks].sort((a, b) => a.order - b.order),
    exportDate: new Date().toISOString(),
    version: "1.0",
  }
  return JSON.stringify(exportData, null, 2)
}

export async function downloadBoardJSON(board: Board, columns: Column[], tasks: Task[]): Promise<void> {
  const json = exportBoardAsJSON(board, columns, tasks)
  const filename = `${board.name.replace(/\s+/g, "-")}-${Date.now()}.json`
  if (isTauri()) {
    await tauriSaveFile(json, filename)
  } else {
    fallbackDownload(json, filename)
  }
}

async function tauriSaveFile(json: string, defaultFilename: string): Promise<void> {
  const { save } = await import("@tauri-apps/plugin-dialog")
  const { writeTextFile } = await import("@tauri-apps/plugin-fs")
  const filePath = await save({
    defaultPath: defaultFilename,
    filters: [{ name: "JSON", extensions: ["json"] }],
    title: "Save File",
  })
  if (!filePath) return
  await writeTextFile(filePath, json)
}

function fallbackDownload(json: string, filename: string) {
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function parseExportJSON(jsonString: string): BoardExport | null {
  try {
    const data = JSON.parse(jsonString)
    if (!data.board || !Array.isArray(data.columns) || !Array.isArray(data.tasks)) return null
    return data as BoardExport
  } catch {
    return null
  }
}

export function createFileINPUT(): HTMLInputElement {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".json"
  return input
}

export async function openFileInTauri(): Promise<string | null> {
  try {
    const { open } = await import("@tauri-apps/plugin-dialog")
    const { readTextFile } = await import("@tauri-apps/plugin-fs")
    const filePath = await open({
      multiple: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    })
    if (filePath && typeof filePath === "string") {
      return await readTextFile(filePath)
    }
  } catch (err) {
    console.error("Tauri file open failed:", err)
    throw err
  }
  return null
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result
      if (typeof text === "string") resolve(text)
      else reject(new Error("Failed to read file"))
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

export function exportDatabaseBackup(
  boards: Board[], columns: Column[], tasks: Task[], comments: Comment[]
): string {
  const backup: DatabaseBackup = {
    boards:   [...boards].sort((a, b) => a.createdAt - b.createdAt),
    columns:  [...columns].sort((a, b) => a.order - b.order),
    tasks:    [...tasks].sort((a, b) => a.order - b.order),
    comments: [...comments].sort((a, b) => a.createdAt - b.createdAt),
    backupDate: new Date().toISOString(),
    version: "1.0",
  }
  return JSON.stringify(backup, null, 2)
}

export async function downloadDatabaseBackup(
  boards: Board[], columns: Column[], tasks: Task[], comments: Comment[]
): Promise<void> {
  const json = exportDatabaseBackup(boards, columns, tasks, comments)
  const filename = `taskflow-backup-${new Date().toISOString().split("T")[0]}.json`
  if (isTauri()) {
    await tauriSaveFile(json, filename)
  } else {
    fallbackDownload(json, filename)
  }
}

export function parseDatabaseBackup(jsonString: string): DatabaseBackup | null {
  try {
    const data = JSON.parse(jsonString)
    if (!data.boards || !Array.isArray(data.columns) || !Array.isArray(data.tasks)) return null
    return data as DatabaseBackup
  } catch {
    return null
  }
}

// ─── MD Folder import ─────────────────────────────────────────────────────────

export interface MdImportResult {
  boardName: string
  columns: { name: string; files: { title: string; content: string }[] }[]
}

/**
 * Parse a flat list of {path, content} entries from a picked folder into the
 * column→notes structure we need.
 *
 * Rules:
 *  - Top-level .md files  → column named after the board (root column)
 *  - Sub-folder .md files → column named after the folder
 *  - Deeper nesting       → column named "FolderName — SubfolderName", etc.
 *  - Note title           → filename without .md extension
 *    (for root-level files the title is just the filename)
 */
export function parseMdEntries(
  boardName: string,
  entries: { path: string; content: string }[]
): MdImportResult {
  // Normalise all separators to forward slash and strip leading slash
  const norm = entries.map(e => ({
    parts: e.path.replace(/\\/g, "/").replace(/^\//, "").split("/"),
    content: e.content,
  }))

  // Only keep .md files
  const mdFiles = norm.filter(e => e.parts[e.parts.length - 1].endsWith(".md"))

  // Group by column: everything above the filename becomes the column name
  const columnMap = new Map<string, { title: string; content: string }[]>()

  for (const { parts, content } of mdFiles) {
    const filename = parts[parts.length - 1]
    const title = filename.replace(/\.md$/i, "")
    const folderParts = parts.slice(0, -1) // everything except filename

    // columnKey: join folder parts with " — ", or use boardName for root files
    const columnKey = folderParts.length > 0
      ? folderParts.join(" — ")
      : boardName

    if (!columnMap.has(columnKey)) columnMap.set(columnKey, [])
    columnMap.get(columnKey)!.push({ title, content })
  }

  const columns = Array.from(columnMap.entries()).map(([name, files]) => ({ name, files }))

  return { boardName, columns }
}

/**
 * Import a markdown folder in Tauri.
 * Opens a directory picker, reads all .md files recursively, returns parsed result.
 *
 * Tauri v2 readDir does NOT support { recursive } and DirEntry has no .path —
 * only .name and .isDirectory. We recurse manually, building absolute paths
 * ourselves from the parent dir + entry.name.
 */
export async function importMdFolderTauri(): Promise<MdImportResult | null> {
  const { open } = await import("@tauri-apps/plugin-dialog")
  const { readDir, readTextFile } = await import("@tauri-apps/plugin-fs")

  const selectedPath = await open({ directory: true, title: "Select Markdown Folder" })
  if (!selectedPath || typeof selectedPath !== "string") return null

  // Normalise the root to forward slashes once — all derived paths use this
  const root = selectedPath.replace(/\\/g, "/").replace(/\/$/, "")
  const boardName = root.split("/").pop() ?? "Imported Notes"

  // Recursively walk using normalised forward-slash paths throughout
  async function collectMdFiles(dirPath: string): Promise<string[]> {
    const entries = await readDir(dirPath)
    const results: string[] = []
    for (const entry of entries) {
      if (!entry.name) continue
      const fullPath = `${dirPath}/${entry.name}`   // always forward slashes
      if (entry.isDirectory) {
        results.push(...await collectMdFiles(fullPath))
      } else if (entry.name.toLowerCase().endsWith(".md")) {
        results.push(fullPath)
      }
    }
    return results
  }

  const mdPaths = await collectMdFiles(root)

  const mdEntries: { path: string; content: string }[] = []
  for (const absPath of mdPaths) {
    try {
      const content = await readTextFile(absPath)
      // Strip the root prefix — both are forward-slash normalised so this is safe
      const relative = absPath.slice(root.length).replace(/^\//, "")
      mdEntries.push({ path: relative, content })
    } catch {
      // skip unreadable files
    }
  }

  return parseMdEntries(boardName, mdEntries)
}

// ─── MD Folder export ─────────────────────────────────────────────────────────

/**
 * Export a notes board as a folder of markdown files in Tauri.
 *
 * Structure:
 *   <destination>/<boardName>/<columnName>/<noteTitle>.md
 *
 * Filenames are sanitised (slashes, colons, etc. removed).
 */
export async function exportMdFolderTauri(
  board: Board,
  columns: Column[],
  tasks: Task[]
): Promise<void> {
  const { open } = await import("@tauri-apps/plugin-dialog")
  const { writeTextFile, mkdir } = await import("@tauri-apps/plugin-fs")

  const destRoot = await open({ directory: true, title: "Choose Export Destination" })
  if (!destRoot || typeof destRoot !== "string") return

  const sanitise = (s: string) => s.replace(/[\\/:*?"<>|]/g, "-").trim()

  const boardDir = `${destRoot}/${sanitise(board.name)}`
  await mkdir(boardDir, { recursive: true })

  const sorted = [...columns].sort((a, b) => a.order - b.order)

  for (const col of sorted) {
    const colDir = `${boardDir}/${sanitise(col.name)}`
    await mkdir(colDir, { recursive: true })

    const colTasks = tasks
      .filter(t => t.columnId === col.id && !t.data?.archived)
      .sort((a, b) => a.order - b.order)

    for (const task of colTasks) {
      const filename = `${sanitise(task.title)}.md`
      const body = task.description ?? ""
      // Write a minimal frontmatter + content
      const fileContent = [
        `# ${task.title}`,
        "",
        body,
      ].join("\n")
      await writeTextFile(`${colDir}/${filename}`, fileContent)
    }
  }
}