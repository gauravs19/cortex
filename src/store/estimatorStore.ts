import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Estimate, RoleId, RiskBand, EstimateStream, StreamConfig } from '../types'
import { ROLES, DEFAULT_ROLES, CONTINGENCY_BY_BAND } from '../data/roles'
import { generateStreams, getActiveRolesFromStreams, DEFAULT_CONFIG, setBlankMode } from '../data/streamConfigurator'
import { useSettingsStore } from './settingsStore'
import { DEFAULT_WORK_ITEM_BANK, getWorkItemById, computeLineItemEfforts } from '../data/workItemBank'

function generateId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

function getSettingsRateCard(): Partial<Record<RoleId, number>> {
  const { settings } = useSettingsStore.getState()
  if (settings.useBlendedRate) {
    return Object.fromEntries(
      (Object.keys(ROLES) as RoleId[]).map(r => [r, settings.blendedRate])
    ) as Record<RoleId, number>
  }
  return { ...(settings.rateCard as Record<RoleId, number>) }
}

function createEstimate(name = '', workType = ''): Estimate {
  const now = new Date().toISOString()
  const { settings } = useSettingsStore.getState()
  const cfg = DEFAULT_CONFIG
  // Generate stream structure only — no pre-filled effort (blank mode)
  setBlankMode(true)
  const streams = generateStreams(cfg, workType)
  setBlankMode(false)
  const roles = getActiveRolesFromStreams(streams) as RoleId[]
  return {
    id: generateId(),
    name, clientName: '', workType,
    riskBand: 'unknown',
    estimationMode: 'detailed',
    wizardCompleted: false,       // triggers wizard on first open
    streamConfig: cfg,
    streams,
    activeRoles: roles.length ? roles : DEFAULT_ROLES,
    rateCard: getSettingsRateCard(),
    currency: settings.currency,
    targetMarginPct: settings.defaultMarginPct,
    contingencyPct: CONTINGENCY_BY_BAND['unknown'],
    contingencyLocked: false,
    sprintWeeks: settings.defaultSprintWeeks,
    workingDaysPerWeek: settings.defaultWorkingDaysPerWeek,
    overheadPct: settings.defaultOverheadPct,
    projectMonths: settings.defaultProjectMonths,
    lineItems: [],
    targetBudget: 0,
    targetEffort: 0,
    assumptions: [],
    notes: '',
    createdAt: now,
    updatedAt: now,
  }
}

export interface EstimatorStore {
  estimates: Estimate[]
  activeId: string | null
  createEstimate: (name?: string, workType?: string) => string
  deleteEstimate: (id: string) => void
  getActive: () => Estimate | undefined
  updateField: <K extends keyof Estimate>(key: K, value: Estimate[K]) => void
  setRiskBand: (band: RiskBand) => void
  setWorkType: (workType: string, resetStreams?: boolean) => void
  setStreams: (streams: EstimateStream[], config: StreamConfig, roles: string[]) => void
  setEffort: (streamId: string, role: RoleId, days: number) => void
  setStreamMonthlyRate: (streamId: string, rate: number) => void
  addStream: (name: string) => void
  removeStream: (streamId: string) => void
  renameStream: (streamId: string, name: string) => void
  toggleRole: (role: RoleId) => void
  // Line items
  addLineItem: (item: import('../types').EstimateLineItem) => void
  updateLineItem: (id: string, patch: Partial<import('../types').EstimateLineItem>) => void
  removeLineItem: (id: string) => void
  syncLineItemsToStreams: () => void
  // Assumptions (#6)
  addAssumption: (text: string, impact: import('../types').Assumption['impact']) => void
  removeAssumption: (id: string) => void
  // Fork (#7)
  forkEstimate: () => string
  // Resource plan (#1)
  setResourcePlan: (plan: import('../types').ResourcePlan) => void
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
        set(s => ({ estimates: s.estimates.filter(e => e.id !== id), activeId: s.activeId === id ? null : s.activeId }))
      },

      getActive: () => {
        const { estimates, activeId } = get()
        return estimates.find(e => e.id === activeId)
      },

      updateField: (key, value) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({ estimates: s.estimates.map(e => e.id === activeId ? { ...e, [key]: value, updatedAt: new Date().toISOString() } : e) }))
      },

      setRiskBand: (band) => {
        const { activeId, estimates } = get()
        if (!activeId) return
        const est = estimates.find(e => e.id === activeId)
        if (!est) return
        const contingencyPct = est.contingencyLocked ? est.contingencyPct : (CONTINGENCY_BY_BAND[band] ?? 20)
        set(s => ({ estimates: s.estimates.map(e => e.id === activeId ? { ...e, riskBand: band, contingencyPct, updatedAt: new Date().toISOString() } : e) }))
      },

      setWorkType: (workType, resetStreams = false) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e => {
            if (e.id !== activeId) return e
            const streams = resetStreams ? generateStreams(e.streamConfig ?? DEFAULT_CONFIG, workType) : e.streams
            const roles = resetStreams ? getActiveRolesFromStreams(streams) as RoleId[] : e.activeRoles
            return { ...e, workType, streams, activeRoles: roles, updatedAt: new Date().toISOString() }
          }),
        }))
      },

      setStreams: (streams, config, roles) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, streams, streamConfig: config, activeRoles: roles as RoleId[], updatedAt: new Date().toISOString() }
              : e
          ),
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
                st.id === streamId ? { ...st, efforts: { ...st.efforts, [role]: days <= 0 ? undefined : days } } : st
              ),
              updatedAt: new Date().toISOString(),
            }
          }),
        }))
      },

      setStreamMonthlyRate: (streamId, rate) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, streams: e.streams.map(st => st.id === streamId ? { ...st, monthlyRate: rate } : st), updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      addStream: (name) => {
        const { activeId } = get()
        if (!activeId) return
        const newStream: EstimateStream = { id: generateId(), name, category: 'backend', costType: 'capex', efforts: {} }
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId ? { ...e, streams: [...e.streams, newStream], updatedAt: new Date().toISOString() } : e
          ),
        }))
      },

      removeStream: (streamId) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId ? { ...e, streams: e.streams.filter(st => st.id !== streamId), updatedAt: new Date().toISOString() } : e
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
        set(s => ({ estimates: s.estimates.map(e => e.id === activeId ? { ...e, activeRoles, updatedAt: new Date().toISOString() } : e) }))
      },

      setRate: (role, rate) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId ? { ...e, rateCard: { ...e.rateCard, [role]: rate }, updatedAt: new Date().toISOString() } : e
          ),
        }))
      },

      setContingency: (pct, locked) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId ? { ...e, contingencyPct: pct, contingencyLocked: locked, updatedAt: new Date().toISOString() } : e
          ),
        }))
      },

      importFromJson: (data) => {
        const est: Estimate = {
          ...createEstimate(data.name, data.workType),
          ...data,
          id: generateId(),
          lineItems: data.lineItems ?? [],
          estimationMode: data.estimationMode ?? 'detailed',
          wizardCompleted: data.wizardCompleted ?? true, // imported = treat as complete
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        set(s => ({ estimates: [...s.estimates, est], activeId: est.id }))
        return est.id
      },

      addLineItem: (item) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, lineItems: [...(e.lineItems ?? []), item], updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      updateLineItem: (id, patch) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, lineItems: (e.lineItems ?? []).map(li => li.id === id ? { ...li, ...patch } : li), updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      removeLineItem: (id) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, lineItems: (e.lineItems ?? []).filter(li => li.id !== id), updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      syncLineItemsToStreams: () => {
        const { activeId, estimates } = get()
        if (!activeId) return
        const est = estimates.find(e => e.id === activeId)
        if (!est || !est.lineItems?.length) return

        const bank = [
          ...DEFAULT_WORK_ITEM_BANK,
          ...(useSettingsStore.getState().settings.customBank ?? []),
        ]

        // Aggregate efforts per stream from line items
        const streamEfforts: Record<string, Record<string, number>> = {}
        for (const li of est.lineItems) {
          const def = getWorkItemById(li.definitionId, bank)
          if (!def) continue
          const efforts = computeLineItemEfforts(def, li.sizeCode, li.quantity)
          const target = li.streamId ?? 'unassigned'
          if (!streamEfforts[target]) streamEfforts[target] = {}
          for (const [role, days] of Object.entries(efforts)) {
            streamEfforts[target][role] = (streamEfforts[target][role] ?? 0) + (days as number)
          }
        }

        // Apply to existing streams
        set(s => ({
          estimates: s.estimates.map(e => {
            if (e.id !== activeId) return e
            const streams = e.streams.map(st => {
              const agg = streamEfforts[st.id]
              if (!agg) return st
              const merged: Record<string, number> = { ...st.efforts as Record<string, number> }
              for (const [role, days] of Object.entries(agg)) {
                merged[role] = Math.round(((merged[role] ?? 0) + days) * 10) / 10
              }
              return { ...st, efforts: merged as import('../types').EstimateStream['efforts'] }
            })
            return { ...e, streams, updatedAt: new Date().toISOString() }
          }),
        }))
      },

      addAssumption: (text, impact) => {
        const { activeId } = get()
        if (!activeId) return
        const id = `A-${Date.now()}`
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, assumptions: [...(e.assumptions ?? []), { id, text, impact }], updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      removeAssumption: (id) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, assumptions: (e.assumptions ?? []).filter(a => a.id !== id), updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      forkEstimate: () => {
        const { activeId, estimates } = get()
        const src = estimates.find(e => e.id === activeId)
        if (!src) return ''
        const copy = { ...src, id: generateId(), name: `${src.name} (copy)`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        set(s => ({ estimates: [...s.estimates, copy], activeId: copy.id }))
        return copy.id
      },

      setResourcePlan: (plan) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId ? { ...e, resourcePlan: plan, updatedAt: new Date().toISOString() } : e
          ),
        }))
      },
    }),
    {
      name: 'cortex-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ estimates: s.estimates, activeId: s.activeId }),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        // Migrate: estimates without estimationMode default to 'quick' (they have filled streams)
        state.estimates = state.estimates.map(e => ({
          ...e,
          estimationMode: e.estimationMode ?? 'quick',
          wizardCompleted: e.wizardCompleted ?? true,
          lineItems: e.lineItems ?? [],
          assumptions: e.assumptions ?? [],
          notes: e.notes ?? '',
        }))
      },
    }
  )
)

// ── Derived helpers ──────────────────────────────────────────

export function calcTotals(est: Estimate) {
  const sym = est.currency === 'GBP' ? '£' : est.currency === 'USD' ? '$' : est.currency === 'EUR' ? '€' : '₹'
  const mult = est.currency === 'GBP' ? 1 : est.currency === 'USD' ? 1.27 : est.currency === 'EUR' ? 1.17 : 105

  const opexStreams = est.streams.filter(s => s.costType === 'opex')

  // Mode-aware effort source
  const effortByRole: Partial<Record<RoleId, number>> = {}

  if (est.estimationMode === 'detailed' && (est.lineItems?.length ?? 0) > 0) {
    // Detailed mode: sum from line items
    const bank = [...DEFAULT_WORK_ITEM_BANK, ...(useSettingsStore.getState().settings.customBank ?? [])]
    for (const li of est.lineItems ?? []) {
      const def = getWorkItemById(li.definitionId, bank)
      if (!def) continue
      const efforts = computeLineItemEfforts(def, li.sizeCode, li.quantity)
      for (const [role, days] of Object.entries(efforts) as [RoleId, number][]) {
        effortByRole[role] = (effortByRole[role] ?? 0) + days
      }
    }
  } else {
    // Quick mode: sum from stream matrix
    for (const stream of est.streams.filter(s => s.costType !== 'opex')) {
      for (const [role, days] of Object.entries(stream.efforts) as [RoleId, number][]) {
        effortByRole[role] = (effortByRole[role] ?? 0) + days
      }
    }
  }

  const baseDays = Object.values(effortByRole).reduce((a, b) => a + (b ?? 0), 0)
  const contingencyDays = Math.round(baseDays * est.contingencyPct / 100)
  const totalDays = baseDays + contingencyDays

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

  const opexMonthly = opexStreams.reduce((sum, s) => sum + ((s.monthlyRate ?? 0) * mult), 0)
  const opexAnnual = opexMonthly * 12
  const opexProjectTotal = opexMonthly * (est.projectMonths ?? 6)

  const activeHeadcount = est.activeRoles.filter(r => (effortByRole[r] ?? 0) > 0).length || 1
  const calendarDays = Math.ceil(totalDays / activeHeadcount)
  const calendarWeeks = Math.ceil(calendarDays / est.workingDaysPerWeek)
  const sprints = Math.ceil(calendarWeeks / est.sprintWeeks)

  return {
    effortByRole,
    baseDays, contingencyDays, totalDays,
    baseCost, contingencyCost, totalCost,
    overhead, costWithOverhead, sellPrice, margin, impliedMarginPct,
    opexMonthly, opexAnnual, opexProjectTotal,
    calendarWeeks, sprints, sym, mult,
  }
}
