/**
 * Storage factory — re-export this everywhere instead of importing
 * indexeddbStore or sqliteStore directly.
 *
 * In Tauri  → sqliteStore  (SQLite via tauri-plugin-sql)
 * In browser → indexedDbStore (Dexie/IndexedDB, unchanged)
 *
 * Replace all existing imports of:
 *   import { store } from "./indexeddbStore"
 * with:
 *   import { store } from "./storage"
 */

import { isTauri } from "../utils/exportImport"
import { indexedDbStore } from "./indexeddbStore"
import type { Store } from "./store"

// Lazily resolved so the SQLite plugin is never imported in a browser context
let _store: Store | null = null

async function resolveStore(): Promise<Store> {
  if (_store) return _store
  if (isTauri()) {
    const { sqliteStore } = await import("./sqliteStore")
    _store = sqliteStore
  } else {
    _store = indexedDbStore
  }
  return _store
}

// Synchronous proxy — safe because all Store methods are async.
// Each method call goes through resolveStore() which resolves instantly
// after the first call (cached in _store).
export const store: Store = new Proxy({} as Store, {
  get(_target, method: string | symbol) {
    return async (...args: unknown[]) => {
      const s = await resolveStore()
      const fn = (s as unknown as Record<string | symbol, unknown>)[method]
      return typeof fn === 'function' ? fn(...args) : fn
    }
  },
})

// Also export db directly for code that uses db.transaction() etc.
// In Tauri this is a no-op shim — transactions are handled inside sqliteStore.
export { db } from "./db"