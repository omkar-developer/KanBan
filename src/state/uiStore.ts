import { create } from "zustand"

interface UIState {
  commandPaletteOpen: boolean
  openCommandPalette: () => void
  closeCommandPalette: () => void
  toggleCommandPalette: () => void

  createBoardOpen: boolean
  openCreateBoard: () => void
  closeCreateBoard: () => void

  helpOpen: boolean
  openHelp: () => void
  closeHelp: () => void

  openFileDialog: string | null
  setOpenFileDialog: (path: string) => void
  closeFileDialog: () => void
}

export const useUIStore = create<UIState>((set) => ({
  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () => set(s => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  createBoardOpen: false,
  openCreateBoard: () => set({ createBoardOpen: true }),
  closeCreateBoard: () => set({ createBoardOpen: false }),

  helpOpen: false,
  openHelp: () => set({ helpOpen: true }),
  closeHelp: () => set({ helpOpen: false }),

  openFileDialog: null,
  setOpenFileDialog: (path: string) => set({ openFileDialog: path }),
  closeFileDialog: () => set({ openFileDialog: null }),
}))