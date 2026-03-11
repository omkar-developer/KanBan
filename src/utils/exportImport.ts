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
 * If either is present we're inside a Tauri webview.
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

  if (!filePath) return // user cancelled
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