import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Estimate, RoleId, RiskBand, EstimateStream } from '../types'
import { ROLES, DEFAULT_ROLES, CONTINGENCY_BY_BAND } from '../data/roles'
import { getDefaultStreams } from '../data/streamDefaults'

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

function defaultRateCard(): Partial<Record<RoleId, number>> {
  return Object.fromEntries(
    (Object.keys(ROLES) as RoleId[]).map(r => [r, ROLES[r].defaultRate])
  ) as Record<RoleId, number>
}

function createEstimate(name = '', workType = ''): Estimate {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name,
    clientName: '',
    workType,
    riskBand: 'unknown',
    streams: getDefaultStreams(workType),
    activeRoles: DEFAULT_ROLES,
    rateCard: defaultRateCard(),
    currency: 'GBP',
    targetMarginPct: 25,
    contingencyPct: CONTINGENCY_BY_BAND['unknown'],
    contingencyLocked: false,
    sprintWeeks: 2,
    workingDaysPerWeek: 5,
    overheadPct: 10,
    createdAt: now,
    updatedAt: now,
  }
}

export interface EstimatorStore {
  estimates: Estimate[]
  activeId: string | null

  // Lifecycle
  createEstimate: (name?: string, workType?: string) => string
  deleteEstimate: (id: string) => void
  getActive: () => Estimate | undefined

  // Updates
  updateField: <K extends keyof Estimate>(key: K, value: Estimate[K]) => void
  setRiskBand: (band: RiskBand) => void
  setWorkType: (workType: string, resetStreams?: boolean) => void
  setEffort: (streamId: string, role: RoleId, days: number) => void
  addStream: (name: string) => void
  removeStream: (streamId: string) => void
  renameStream: (streamId: string, name: string) => void
  toggleRole: (role: RoleId) => void
  setRate: (role: RoleId, rate: number) => void
  setContingency: (pct: number, locked: boolean) => void
  importFromJson: (data: Partial<Estimate>) => string
}

export const useEstimatorStore = create<EstimatorStore>()(
  persist(
    (set, get) => ({
      estimates: [],
      activeId: null,

      createEstimate: (name = 'New estimate', workType = '') => {
        const est = createEstimate(name, workType)
        set(s => ({ estimates: [...s.estimates, est], activeId: est.id }))
        return est.id
      },

      deleteEstimate: (id) => {
        set(s => ({
          estimates: s.estimates.filter(e => e.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        }))
      },

      getActive: () => {
        const { estimates, activeId } = get()
        return estimates.find(e => e.id === activeId)
      },

      updateField: (key, value) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId ? { ...e, [key]: value, updatedAt: new Date().toISOString() } : e
          ),
        }))
      },

      setRiskBand: (band) => {
        const { activeId, estimates } = get()
        if (!activeId) return
        const est = estimates.find(e => e.id === activeId)
        if (!est) return
        const contingencyPct = est.contingencyLocked ? est.contingencyPct : CONTINGENCY_BY_BAND[band] ?? 20
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId ? { ...e, riskBand: band, contingencyPct, updatedAt: new Date().toISOString() } : e
          ),
        }))
      },

      setWorkType: (workType, resetStreams = false) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e => {
            if (e.id !== activeId) return e
            const streams = resetStreams ? getDefaultStreams(workType) : e.streams
            const roles = resetStreams
              ? [...new Set([...DEFAULT_ROLES, ...streams.flatMap(st => Object.keys(st.efforts) as RoleId[])])]
              : e.activeRoles
            return { ...e, workType, streams, activeRoles: roles, updatedAt: new Date().toISOString() }
          }),
        }))
      },

      setEffort: (streamId, role, days) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e => {
            if (e.id !== activeId) return e
            return {
              ...e,
              streams: e.streams.map(st =>
                st.id === streamId
                  ? { ...st, efforts: { ...st.efforts, [role]: days <= 0 ? undefined : days } }
                  : st
              ),
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
      },

      addStream: (name) => {
        const { activeId } = get()
        if (!activeId) return
        const newStream: EstimateStream = { id: generateId(), name, efforts: {} }
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, streams: [...e.streams, newStream], updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      removeStream: (streamId) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, streams: e.streams.filter(st => st.id !== streamId), updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      renameStream: (streamId, name) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, streams: e.streams.map(st => st.id === streamId ? { ...st, name } : st), updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      toggleRole: (role) => {
        const { activeId, estimates } = get()
        if (!activeId) return
        const est = estimates.find(e => e.id === activeId)
        if (!est) return
        const activeRoles = est.activeRoles.includes(role)
          ? est.activeRoles.filter(r => r !== role)
          : [...est.activeRoles, role]
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId ? { ...e, activeRoles, updatedAt: new Date().toISOString() } : e
          ),
        }))
      },

      setRate: (role, rate) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, rateCard: { ...e.rateCard, [role]: rate }, updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      setContingency: (pct, locked) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, contingencyPct: pct, contingencyLocked: locked, updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      importFromJson: (data) => {
        const est: Estimate = {
          ...createEstimate(data.name, data.workType),
          ...data,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set(s => ({ estimates: [...s.estimates, est], activeId: est.id }))
        return est.id
      },
    }),
    {
      name: 'cortex-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ estimates: s.estimates, activeId: s.activeId }),
    }
  )
)

// ── Derived helpers ──────────────────────────────────────────

export function calcTotals(est: Estimate) {
  const sym = est.currency === 'GBP' ? '£' : est.currency === 'USD' ? '$' : est.currency === 'EUR' ? '€' : '₹'
  const mult = est.currency === 'GBP' ? 1 : est.currency === 'USD' ? 1.27 : est.currency === 'EUR' ? 1.17 : 105

  // Base effort per role
  const effortByRole: Partial<Record<RoleId, number>> = {}
  for (const stream of est.streams) {
    for (const [role, days] of Object.entries(stream.efforts) as [RoleId, number][]) {
      effortByRole[role] = (effortByRole[role] ?? 0) + days
    }
  }

  const baseDays = Object.values(effortByRole).reduce((a, b) => a + (b ?? 0), 0)
  const contingencyDays = Math.round(baseDays * est.contingencyPct / 100)
  const totalDays = baseDays + contingencyDays

  // Cost
  let baseCost = 0
  for (const [role, days] of Object.entries(effortByRole) as [RoleId, number][]) {
    const rate = (est.rateCard[role] ?? ROLES[role]?.defaultRate ?? 0) * mult
    baseCost += days * rate
  }
  const contingencyCost = baseCost * est.contingencyPct / 100
  const totalCost = baseCost + contingencyCost
  const overhead = totalCost * est.overheadPct / 100
  const costWithOverhead = totalCost + overhead
  const sellPrice = costWithOverhead / (1 - est.targetMarginPct / 100)
  const margin = sellPrice - costWithOverhead
  const impliedMarginPct = sellPrice > 0 ? (margin / sellPrice) * 100 : 0

  // Duration
  const activeHeadcount = est.activeRoles.filter(r => (effortByRole[r] ?? 0) > 0).length || 1
  const calendarDays = Math.ceil(totalDays / activeHeadcount)
  const calendarWeeks = Math.ceil(calendarDays / est.workingDaysPerWeek)
  const sprints = Math.ceil(calendarWeeks / est.sprintWeeks)

  return {
    effortByRole,
    baseDays,
    contingencyDays,
    totalDays,
    baseCost,
    contingencyCost,
    totalCost,
    overhead,
    costWithOverhead,
    sellPrice,
    margin,
    impliedMarginPct,
    calendarWeeks,
    sprints,
    sym,
    mult,
  }
}
