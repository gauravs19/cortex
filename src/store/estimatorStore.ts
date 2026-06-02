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

// Default cost rate = ~55% of bill rate (standard consulting model)
function getSettingsCostRateCard(): Partial<Record<RoleId, number>> {
  const { settings } = useSettingsStore.getState()
  return Object.fromEntries(
    (Object.keys(ROLES) as RoleId[]).map(r => [r, Math.round((settings.rateCard[r] ?? ROLES[r].defaultRate) * 0.55)])
  ) as Record<RoleId, number>
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
    costRateCard: getSettingsCostRateCard(),
    currency: settings.currency,
    targetMarginPct: settings.defaultMarginPct,
    contingencyPct: (useSettingsStore.getState().settings.contingencyByBand?.unknown ?? CONTINGENCY_BY_BAND['unknown']),
    contingencyLocked: false,
    sprintWeeks: settings.defaultSprintWeeks,
    workingDaysPerWeek: settings.defaultWorkingDaysPerWeek,
    overheadPct: settings.defaultOverheadPct,
    projectMonths: settings.defaultProjectMonths,
    salesCommissionPct: 5,
    gaOverheadPct: 8,
    lineItems: [],
    features: [],
    targetBudget: 0,
    targetEffort: 0,
    assumptions: [],
    pnlAdjustments: [],
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
  // Features
  addFeature: (name: string) => string
  renameFeature: (id: string, name: string) => void
  removeFeature: (id: string) => void
  toggleFeatureCollapsed: (id: string) => void
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
  // P&L adjustments
  addPnlAdjustment: (label: string, amount: number, appliesAt: import('../types').PnlAdjustment['appliesAt']) => void
  updatePnlAdjustment: (id: string, patch: Partial<import('../types').PnlAdjustment>) => void
  removePnlAdjustment: (id: string) => void
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
        const bandTable = useSettingsStore.getState().settings.contingencyByBand ?? CONTINGENCY_BY_BAND
        const contingencyPct = est.contingencyLocked ? est.contingencyPct : (bandTable[band] ?? 20)
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
          features: data.features ?? [],
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

      addFeature: (name) => {
        const { activeId } = get()
        if (!activeId) return ''
        const id = generateId()
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, features: [...(e.features ?? []), { id, name }], updatedAt: new Date().toISOString() }
              : e
          ),
        }))
        return id
      },

      renameFeature: (id, name) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, features: (e.features ?? []).map(f => f.id === id ? { ...f, name } : f), updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      removeFeature: (id) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? {
                  ...e,
                  features: (e.features ?? []).filter(f => f.id !== id),
                  // unassign items from removed feature
                  lineItems: (e.lineItems ?? []).map(li => li.featureId === id ? { ...li, featureId: undefined } : li),
                  updatedAt: new Date().toISOString(),
                }
              : e
          ),
        }))
      },

      toggleFeatureCollapsed: (id) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, features: (e.features ?? []).map(f => f.id === id ? { ...f, collapsed: !f.collapsed } : f), updatedAt: new Date().toISOString() }
              : e
          ),
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

      addPnlAdjustment: (label, amount, appliesAt) => {
        const { activeId } = get()
        if (!activeId) return
        const id = generateId()
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, pnlAdjustments: [...(e.pnlAdjustments ?? []), { id, label, amount, appliesAt }], updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      updatePnlAdjustment: (id, patch) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, pnlAdjustments: (e.pnlAdjustments ?? []).map(a => a.id === id ? { ...a, ...patch } : a), updatedAt: new Date().toISOString() }
              : e
          ),
        }))
      },

      removePnlAdjustment: (id) => {
        const { activeId } = get()
        if (!activeId) return
        set(s => ({
          estimates: s.estimates.map(e =>
            e.id === activeId
              ? { ...e, pnlAdjustments: (e.pnlAdjustments ?? []).filter(a => a.id !== id), updatedAt: new Date().toISOString() }
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
          features: e.features ?? [],
          assumptions: e.assumptions ?? [],
          pnlAdjustments: e.pnlAdjustments ?? [],
          notes: e.notes ?? '',
          costRateCard: e.costRateCard ?? getSettingsCostRateCard(),
          salesCommissionPct: e.salesCommissionPct ?? 5,
          gaOverheadPct: e.gaOverheadPct ?? 8,
        }))
      },
    }
  )
)

// ── Derived helpers ──────────────────────────────────────────

function currencyMult(c: string) {
  const { fxRates } = useSettingsStore.getState().settings
  const rates = fxRates ?? { USD: 1.27, EUR: 1.17, INR: 105 }
  return c === 'GBP' ? 1 : c === 'USD' ? rates.USD : c === 'EUR' ? rates.EUR : rates.INR
}
function currencySym(c: string) {
  return c === 'GBP' ? '£' : c === 'USD' ? '$' : c === 'EUR' ? '€' : '₹'
}

export function calcTotals(est: Estimate) {
  const sym = currencySym(est.currency)
  const mult = currencyMult(est.currency)
  // Billing currency — applies to the sell/revenue side only
  const billCurrency = est.billingCurrency ?? est.currency
  const billSym = currencySym(billCurrency)
  const billMult = currencyMult(billCurrency)

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
  const contingencyFactor = 1 + est.contingencyPct / 100

  // ── Two-rate P&L model ────────────────────────────────────────
  // Revenue side: billing rates (what the client pays)
  let baseRevenue = 0
  for (const [role, days] of Object.entries(effortByRole) as [RoleId, number][]) {
    baseRevenue += days * (est.rateCard[role] ?? ROLES[role]?.defaultRate ?? 0) * mult
  }
  const revenue = baseRevenue * contingencyFactor

  // Cost side: cost rates (what the firm pays the team)
  const costRates = est.costRateCard ?? {}
  const { defaultCostRatePct, fallbackDayRate } = useSettingsStore.getState().settings
  const costPct = (defaultCostRatePct ?? 55) / 100
  const fallback = fallbackDayRate ?? 600
  let baseDirectCost = 0
  for (const [role, days] of Object.entries(effortByRole) as [RoleId, number][]) {
    const billBase = est.rateCard[role as RoleId] ?? ROLES[role as RoleId]?.defaultRate ?? fallback
    const costRate = (costRates[role as RoleId] ?? Math.round(billBase * costPct)) * mult
    baseDirectCost += days * costRate
  }
  const directCost = baseDirectCost * contingencyFactor

  // P&L adjustments
  const pnlAdj = est.pnlAdjustments ?? []
  const lmAdjTotal = pnlAdj.filter(a => a.appliesAt === 'lm').reduce((s, a) => s + a.amount * mult, 0)
  const gmAdjTotal = pnlAdj.filter(a => a.appliesAt === 'gm').reduce((s, a) => s + a.amount * mult, 0)

  // Labour Margin = Revenue − Direct cost ± LM adjustments
  const labourMargin = revenue - directCost + lmAdjTotal
  const lmPct = revenue > 0 ? (labourMargin / revenue) * 100 : 0

  // Gross Margin = LM − Delivery overhead ± GM adjustments
  const deliveryOverhead = revenue * est.overheadPct / 100
  const grossMargin = labourMargin - deliveryOverhead + gmAdjTotal
  const gmPct = revenue > 0 ? (grossMargin / revenue) * 100 : 0

  // EBITDA = GM − Sales commission − G&A
  const salesComm = revenue * est.salesCommissionPct / 100
  const gaOverhead = revenue * est.gaOverheadPct / 100
  const ebitda = grossMargin - salesComm - gaOverhead
  const ebitdaPct = revenue > 0 ? (ebitda / revenue) * 100 : 0

  // Legacy aliases kept for backward compat (summary bar, print export, etc.)
  const sellPrice = revenue          // billing revenue IS the sell price
  const totalCost = directCost       // actual cost to the firm
  const impliedMarginPct = lmPct     // LM% is the primary margin metric
  // keep baseCost / contingencyCost for any callers that use them
  const baseCost = baseRevenue       // kept for compat — billing base before contingency
  const contingencyCost = revenue - baseRevenue

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
    // Revenue / cost
    revenue, directCost, lmAdjTotal, gmAdjTotal,
    labourMargin, lmPct,
    deliveryOverhead, grossMargin, gmPct,
    salesComm, gaOverhead, ebitda, ebitdaPct,
    // Legacy aliases
    baseCost, contingencyCost, totalCost,
    overhead: deliveryOverhead, costWithOverhead: directCost + deliveryOverhead,
    sellPrice, margin: labourMargin, impliedMarginPct,
    opexMonthly, opexAnnual, opexProjectTotal,
    calendarWeeks, sprints, sym, mult, billSym, billMult,
  }
}
