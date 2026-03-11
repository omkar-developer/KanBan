/**
 * useAutoBackup — Tauri desktop auto-backup system.
 *
 * Uses BaseDirectory.AppLocalData so all fs calls stay within the
 * app's sandboxed directory — no absolute path construction needed.
 *
 * ON CLOSE:   Copies taskflow.db → taskflow.db.bak
 * ON STARTUP: If DB missing or corrupt, restores from .bak
 */

import { useEffect } from "react"
import { isTauri } from "../utils/exportImport"

const DB_FILE  = "taskflow.db"
const BAK_FILE = "taskflow.db.bak"

async function getBaseDir() {
  const { BaseDirectory } = await import("@tauri-apps/plugin-fs")
  return BaseDirectory.AppLocalData
}

async function copyDbToBackup(): Promise<void> {
  try {
    const { copyFile, BaseDirectory } = await import("@tauri-apps/plugin-fs")
    const base = BaseDirectory.AppLocalData
    await copyFile(DB_FILE, BAK_FILE, { fromPathBaseDir: base, toPathBaseDir: base })
    console.log("[AutoBackup] DB backed up successfully")
  } catch (err) {
    console.warn("[AutoBackup] Backup skipped:", err)
  }
}

async function restoreFromBackup(): Promise<boolean> {
  try {
    const { copyFile, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs")
    const base = BaseDirectory.AppLocalData

    const bakExists = await exists(BAK_FILE, { baseDir: base })
    if (!bakExists) {
      console.warn("[AutoBackup] No backup file found")
      return false
    }

    await copyFile(BAK_FILE, DB_FILE, { fromPathBaseDir: base, toPathBaseDir: base })
    console.log("[AutoBackup] Restored from backup successfully")
    return true
  } catch (err) {
    console.error("[AutoBackup] Restore failed:", err)
    return false
  }
}

/**
 * Call ONCE in main.tsx before ReactDOM.render.
 * Returns 'ok' | 'restored' | 'no-backup'
 */
export async function initWithAutoRestore(): Promise<"ok" | "restored" | "no-backup"> {
  if (!isTauri()) return "ok"

  const { exists, remove, BaseDirectory } = await import("@tauri-apps/plugin-fs")
  const base = BaseDirectory.AppLocalData

  // ── Case 1: DB file missing ───────────────────────────────────────────────
  const dbExists = await exists(DB_FILE, { baseDir: base })
  if (!dbExists) {
    console.warn("[AutoBackup] DB missing, checking for backup...")
    const restored = await restoreFromBackup()
    return restored ? "restored" : "no-backup"
  }

  // ── Case 2: DB exists, verify it's healthy ────────────────────────────────
  try {
    const Database = (await import("@tauri-apps/plugin-sql")).default
    const db = await Database.load(`sqlite:${DB_FILE}`)
    await db.select("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1")
    return "ok"
  } catch {
    console.warn("[AutoBackup] DB corrupt, attempting restore...")
  }

  // ── Case 3: Corrupt — remove and restore ─────────────────────────────────
  await remove(DB_FILE, { baseDir: base }).catch(() => {})
  const restored = await restoreFromBackup()
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