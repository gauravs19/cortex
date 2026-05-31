import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { RoleId, Currency } from '../types'
import { ROLES } from '../data/roles'

export interface FirmSettings {
  firmName: string
  currency: Currency
  customBank?: import('../types').WorkItemDefinition[]
  recentWorkItemIds: string[]   // #11 — recently used in bank picker
  defaultMarginPct: number
  defaultOverheadPct: number
  defaultSprintWeeks: number
  defaultWorkingDaysPerWeek: number
  defaultProjectMonths: number
  rateCard: Partial<Record<RoleId, number>>      // base GBP rates
  useBlendedRate: boolean                        // if true, apply blendedRate to all roles
  blendedRate: number                            // single GBP daily rate for all roles
  // Effort calibration multipliers (applied on top of wizard base values)
  effortScale: {
    simple: number     // 0.5 – 1.0  (default 0.7)
    medium: number     // 0.8 – 1.5  (default 1.0)
    complex: number    // 1.0 – 2.5  (default 1.5)
    infraMinimal: number  // default 0.4
    infraStandard: number // default 1.0
    infraComplex: number  // default 1.8
  }
}

const DEFAULT_RATE_CARD = Object.fromEntries(
  (Object.keys(ROLES) as RoleId[]).map(r => [r, ROLES[r].defaultRate])
) as Record<RoleId, number>

export const DEFAULT_SETTINGS: FirmSettings = {
  firmName: '',
  currency: 'USD',
  recentWorkItemIds: [],
  defaultMarginPct: 25,
  defaultOverheadPct: 10,
  defaultSprintWeeks: 2,
  defaultWorkingDaysPerWeek: 5,
  defaultProjectMonths: 6,
  rateCard: DEFAULT_RATE_CARD,
  useBlendedRate: false,
  blendedRate: 600,
  effortScale: {
    simple: 0.7,
    medium: 1.0,
    complex: 1.5,
    infraMinimal: 0.4,
    infraStandard: 1.0,
    infraComplex: 1.8,
  },
}

export interface SettingsStore {
  settings: FirmSettings
  updateSettings: (patch: Partial<FirmSettings>) => void
  setRate: (role: RoleId, gbpRate: number) => void
  setEffortScale: (key: keyof FirmSettings['effortScale'], value: number) => void
  resetRates: () => void
  resetEffortScale: () => void
  addRecentWorkItem: (id: string) => void  // #11
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,

      updateSettings: (patch) =>
        set(s => ({ settings: { ...s.settings, ...patch } })),

      setRate: (role, gbpRate) =>
        set(s => ({
          settings: {
            ...s.settings,
            rateCard: { ...s.settings.rateCard, [role]: gbpRate },
          },
        })),

      setEffortScale: (key, value) =>
        set(s => ({
          settings: {
            ...s.settings,
            effortScale: { ...s.settings.effortScale, [key]: value },
          },
        })),

      resetRates: () =>
        set(s => ({ settings: { ...s.settings, rateCard: DEFAULT_RATE_CARD } })),

      resetEffortScale: () =>
        set(s => ({
          settings: {
            ...s.settings,
            effortScale: DEFAULT_SETTINGS.effortScale,
          },
        })),

      addRecentWorkItem: (id) =>
        set(s => ({
          settings: {
            ...s.settings,
            recentWorkItemIds: [id, ...(s.settings.recentWorkItemIds ?? []).filter(x => x !== id)].slice(0, 8),
          },
        })),
    }),
    {
      name: 'cortex-settings-v1',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
