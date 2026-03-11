import { create } from "zustand"
import { persist } from "zustand/middleware"

export const DEFAULT_SETTINGS = {
  thresholds: {
    agingWarningDays:  3,
    agingCriticalDays: 7,
    dueSoonHours:      24,
  },

  ui: {
    // Description truncation
    maxCardDescriptionPreview: 280,

    // Card element visibility — all true by default
    showTags:          true,
    showPriority:      true,
    showDueDate:       true,
    showCommentCount:  true,
    showAttachments:   true,
    showTypeLabel:     true,
    showAgingStripe:   true,
    
    // Column element visibility
    showColumnTopBorder: true,
  },

  features: {
    cardAging:         true,
    dueDateColors:     true,
    keyboardShortcuts: true,
  },
}

export type Settings = typeof DEFAULT_SETTINGS

interface SettingsStore {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reset: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      update: (patch) =>
        set((state) => ({
          settings: {
            ...state.settings,
            ...patch,
            // Deep merge nested objects so partial patches work
            thresholds: { ...state.settings.thresholds, ...(patch.thresholds ?? {}) },
            ui:         { ...state.settings.ui,         ...(patch.ui         ?? {}) },
            features:   { ...state.settings.features,   ...(patch.features   ?? {}) },
          },
        })),

      reset: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    {
      name: "kanban_settings",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<SettingsStore> | undefined
        return {
          ...currentState,
          settings: {
            ...DEFAULT_SETTINGS,
            ...(persisted?.settings ?? {}),
            thresholds: { ...DEFAULT_SETTINGS.thresholds, ...(persisted?.settings?.thresholds ?? {}) },
            ui:         { ...DEFAULT_SETTINGS.ui,         ...(persisted?.settings?.ui         ?? {}) },
            features:   { ...DEFAULT_SETTINGS.features,   ...(persisted?.settings?.features   ?? {}) },
          },
        }
      },
    }
  )
)