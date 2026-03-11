/**
 * useAutoBackup — Tauri desktop auto-backup system.
 *
 * ON CLOSE:   Copies taskflow.db → taskflow.db.bak (instant OS file copy)
 * ON STARTUP: If DB file is missing or corrupt, auto-restores from .bak
 *
 * Usage:
 *   1. Call initWithAutoRestore() in main.tsx before rendering
 *   2. Call useAutoBackup() once inside your root component
 */

import { useEffect } from "react"
import { isTauri } from "../utils/exportImport"

const DB_FILENAME  = "taskflow.db"
const BAK_FILENAME = "taskflow.db.bak"

async function getDataDir(): Promise<string> {
  const { appLocalDataDir } = await import("@tauri-apps/api/path")
  return await appLocalDataDir()
}

async function copyDbToBackup(): Promise<void> {
  try {
    const { copyFile, mkdir } = await import("@tauri-apps/plugin-fs")
    const dir = await getDataDir()
    await mkdir(dir, { recursive: true }).catch(() => {})
    await copyFile(`${dir}${DB_FILENAME}`, `${dir}${BAK_FILENAME}`)
    console.log("[AutoBackup] DB backed up successfully")
  } catch (err) {
    console.warn("[AutoBackup] Backup skipped:", err)
  }
}

async function restoreFromBackup(dir: string): Promise<boolean> {
  try {
    const { copyFile, exists } = await import("@tauri-apps/plugin-fs")
    const bak = `${dir}${BAK_FILENAME}`

    if (!(await exists(bak))) {
      console.warn("[AutoBackup] No backup file found")
      return false
    }

    await copyFile(bak, `${dir}${DB_FILENAME}`)
    console.log("[AutoBackup] Restored from backup successfully")
    return true
  } catch (err) {
    console.error("[AutoBackup] Restore failed:", err)
    return false
  }
}

/**
 * Call ONCE in main.tsx before ReactDOM.render.
 *
 * Logic:
 *  1. If DB file doesn't exist but .bak does → restore before SQLite creates a blank DB
 *  2. If DB file exists but fails to open (corrupt) → restore from .bak
 *  3. If DB opens fine → nothing to do
 *
 * Returns 'ok' | 'restored' | 'no-backup'
 */
export async function initWithAutoRestore(): Promise<"ok" | "restored" | "no-backup"> {
  if (!isTauri()) return "ok"

  const { exists } = await import("@tauri-apps/plugin-fs")
  const dir = await getDataDir()
  const dbPath = `${dir}${DB_FILENAME}`

  // ── Case 1: DB file is missing entirely ───────────────────────────────────
  if (!(await exists(dbPath))) {
    console.warn("[AutoBackup] DB file missing, checking for backup...")
    const restored = await restoreFromBackup(dir)
    return restored ? "restored" : "no-backup"
  }

  // ── Case 2: DB file exists, check if it opens cleanly ────────────────────
  try {
    const Database = (await import("@tauri-apps/plugin-sql")).default
    const db = await Database.load(`sqlite:${DB_FILENAME}`)
    // Run a quick sanity query — catches corrupt files that open but are broken
    await db.select("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1")
    return "ok"
  } catch {
    console.warn("[AutoBackup] DB corrupt or unreadable, attempting restore...")
  }

  // ── Case 3: DB is corrupt — delete it and restore from backup ────────────
  try {
    const { remove } = await import("@tauri-apps/plugin-fs")
    await remove(dbPath).catch(() => {}) // remove corrupt file so SQLite doesn't reuse it
  } catch { /* ignore */ }

  const restored = await restoreFromBackup(dir)
  return restored ? "restored" : "no-backup"
}

/**
 * Register on-close backup. Call once in your root component.
 */
export function useAutoBackup() {
  useEffect(() => {
    if (!isTauri()) return

    let unlisten: (() => void) | undefined

    async function register() {
      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window")
        const win = getCurrentWindow()

        unlisten = await win.onCloseRequested(async (event) => {
          event.preventDefault()
          await copyDbToBackup()
          await win.destroy()
        })
      } catch (err) {
        console.error("[AutoBackup] Failed to register:", err)
      }
    }

    register()
    return () => { unlisten?.() }
  }, [])
}