/**
 * useAutoBackup — Tauri desktop auto-backup system.
 *
 * Uses BaseDirectory.AppData so all fs calls stay within the
 * app's sandboxed directory — no absolute path construction needed.
 *
 * ON CLOSE:   Checkpoints WAL, closes DB, copies taskflow.db → taskflow.db.bak
 *             If cloud backup enabled, also copies to user's cloud folder
 * ON STARTUP: If DB missing or corrupt, restores from .bak
 */

import { useEffect } from "react"
import { isTauri } from "../utils/exportImport"
import { useSettingsStore } from "../state/settingsStore"

const DB_FILE  = "taskflow.db"
const BAK_FILE = "taskflow.db.bak"

// ─── Settings ─────────────────────────────────────────────────────────────────

function getBackupSettings(): { cloudBackupEnabled: boolean; cloudBackupPath: string | null } {
  try {
    const stored = localStorage.getItem("kanban_settings")
    if (stored) {
      const b = JSON.parse(stored)?.state?.settings?.backups
      if (b) return {
        cloudBackupEnabled: b.cloudBackupEnabled ?? false,
        cloudBackupPath:    b.cloudBackupPath    ?? null,
      }
    }
  } catch { /* ignore */ }
  const s = useSettingsStore.getState()?.settings?.backups
  return s ?? { cloudBackupEnabled: false, cloudBackupPath: null }
}

// ─── WAL checkpoint + DB close ────────────────────────────────────────────────

/**
 * Checkpoint WAL then close the DB connection so the file is no longer locked
 * when we copyFile it. Without db.close(), Windows throws "file used by another
 * process" (os error 32) on the copy.
 */
async function checkpointAndClose(): Promise<void> {
  try {
    const Database = (await import("@tauri-apps/plugin-sql")).default
    const db = await Database.load(`sqlite:${DB_FILE}`)
    await db.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    await db.close()
    console.log("[AutoBackup] WAL checkpoint + DB close done")
  } catch (err) {
    console.warn("[AutoBackup] Checkpoint/close failed (non-fatal):", err)
  }
}

// ─── Local backup ─────────────────────────────────────────────────────────────

async function copyDbToBackup(): Promise<void> {
  try {
    const { copyFile, BaseDirectory } = await import("@tauri-apps/plugin-fs")
    const base = BaseDirectory.AppData
    await copyFile(DB_FILE, BAK_FILE, { fromPathBaseDir: base, toPathBaseDir: base })
    console.log("[AutoBackup] Local .bak written")
  } catch (err) {
    console.warn("[AutoBackup] Local backup failed:", err)
  }
}

async function restoreFromBackup(): Promise<boolean> {
  try {
    const { copyFile, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs")
    const base = BaseDirectory.AppData
    if (!await exists(BAK_FILE, { baseDir: base })) return false
    await copyFile(BAK_FILE, DB_FILE, { fromPathBaseDir: base, toPathBaseDir: base })
    return true
  } catch {
    return false
  }
}

// ─── Cloud backup ─────────────────────────────────────────────────────────────

export async function copyDbToCloudBackup(): Promise<void> {
  try {
    const backups = getBackupSettings()
    if (!backups.cloudBackupEnabled || !backups.cloudBackupPath) return

    const { copyFile, BaseDirectory } = await import("@tauri-apps/plugin-fs")
    const normalizedPath = backups.cloudBackupPath.replace(/\//g, "\\")
    const cloudDest = `${normalizedPath}\\taskflow.db`
    await copyFile(DB_FILE, cloudDest, { fromPathBaseDir: BaseDirectory.AppData })
    console.log("[CloudBackup] Written to", cloudDest)
  } catch (err) {
    console.error("[CloudBackup] Failed:", err)
  }
}

export async function restoreFromCloudBackup(): Promise<boolean> {
  try {
    const backups = getBackupSettings()
    if (!backups.cloudBackupPath) return false

    const { copyFile, exists, BaseDirectory } = await import("@tauri-apps/plugin-fs")
    const normalizedPath = backups.cloudBackupPath.replace(/\//g, "\\")
    const cloudSrc = `${normalizedPath}\\taskflow.db`
    if (!await exists(cloudSrc)) return false

    await copyFile(cloudSrc, DB_FILE, { toPathBaseDir: BaseDirectory.AppData })
    return true
  } catch {
    return false
  }
}

// ─── Startup restore ──────────────────────────────────────────────────────────

export async function initWithAutoRestore(): Promise<"ok" | "restored" | "no-backup"> {
  if (!isTauri()) return "ok"

  const { exists, remove, BaseDirectory } = await import("@tauri-apps/plugin-fs")
  const base = BaseDirectory.AppData

  const dbExists = await exists(DB_FILE, { baseDir: base })
  if (!dbExists) {
    const restored = await restoreFromBackup()
    return restored ? "restored" : "no-backup"
  }

  try {
    const Database = (await import("@tauri-apps/plugin-sql")).default
    const db = await Database.load(`sqlite:${DB_FILE}`)
    await db.select("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1")
    return "ok"
  } catch { /* fall through to restore */ }

  await remove(DB_FILE, { baseDir: base }).catch(() => {})
  const restored = await restoreFromBackup()
  return restored ? "restored" : "no-backup"
}

// ─── Close-time backup hook ───────────────────────────────────────────────────

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

          // 1. Checkpoint WAL and close DB before copying —
          //    keeps the file unlocked so copyFile won't hit os error 32
          await checkpointAndClose()

          // 2. Local .bak
          await copyDbToBackup()

          // 3. Cloud backup if configured
          const backups = getBackupSettings()
          if (backups.cloudBackupEnabled && backups.cloudBackupPath) {
            await copyDbToCloudBackup()
          }

          await win.destroy()
        })

        console.log("[AutoBackup] Close handler registered")
      } catch (err) {
        console.error("[AutoBackup] Failed to register close handler:", err)
      }
    }

    register()
    return () => { unlisten?.() }
  }, [])
}