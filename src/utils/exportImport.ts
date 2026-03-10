import type { Board } from "../models/Board"
import type { Column } from "../models/Column"
import type { Task } from "../models/Task"

export interface BoardExport {
  board: Board
  columns: Column[]
  tasks: Task[]
  exportDate: string
  version: string
}

/**
 * Export board as JSON
 */
export function exportBoardAsJSON(
  board: Board,
  columns: Column[],
  tasks: Task[]
): string {
  const exportData: BoardExport = {
    board,
    columns: columns.sort((a, b) => a.order - b.order),
    tasks: tasks.sort((a, b) => a.order - b.order),
    exportDate: new Date().toISOString(),
    version: "1.0"
  }
  
  return JSON.stringify(exportData, null, 2)
}

/**
 * Download board as JSON file
 */
export function downloadBoardJSON(
  board: Board,
  columns: Column[],
  tasks: Task[]
): void {
  const json = exportBoardAsJSON(board, columns, tasks)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${board.name.replace(/\s+/g, "-")}-${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Parse JSON export file
 */
export function parseExportJSON(jsonString: string): BoardExport | null {
  try {
    const data = JSON.parse(jsonString)
    
    // Validate required properties
    if (!data.board || !Array.isArray(data.columns) || !Array.isArray(data.tasks)) {
      return null
    }
    
    return data as BoardExport
  } catch {
    return null
  }
}

/**
 * Create a file input and trigger file selection
 */
export function createFileINPUT(): HTMLInputElement {
  const input = document.createElement("input")
  input.type = "file"
  input.accept = ".json"
  return input
}

/**
 * Read file content as text
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result
      if (typeof text === "string") {
        resolve(text)
      } else {
        reject(new Error("Failed to read file"))
      }
    }
    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}
