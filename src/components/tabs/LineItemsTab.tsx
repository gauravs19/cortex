import { useState } from 'react'
import { Plus, Trash2, ArrowDownToLine, Info, AlertTriangle } from 'lucide-react'
import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { DEFAULT_WORK_ITEM_BANK, getWorkItemById, computeLineItemEfforts, SIZE_COLORS, CATEGORY_BANK_ORDER } from '../../data/workItemBank'
// SIZE_ORDER used in bank data only
import { ROLES, CATEGORY_LABELS } from '../../data/roles'
import type { EstimateLineItem, SizeCode, WorkItemDefinition } from '../../types'

function generateId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function LineItemsTab() {
  const { getActive, addLineItem, updateLineItem, removeLineItem, syncLineItemsToStreams, updateField, addAssumption, removeAssumption } = useEstimatorStore()
  const { settings, addRecentWorkItem } = useSettingsStore()
  const est = getActive()

  const [showPicker, setShowPicker] = useState(false)
  const [filterCat, setFilterCat] = useState<string>('all')
  const [search, setSearch] = useState('')

  if (!est) return null

  const bank: WorkItemDefinition[] = [
    ...DEFAULT_WORK_ITEM_BANK,
    ...(settings.customBank ?? []),
  ]

  const totals = calcTotals(est)
  const sym = totals.sym
  const mult = totals.mult

  const lineItems = est.lineItems ?? []

  // Compute effort totals from line items
  const liEffortByRole: Record<string, number> = {}
  let liTotalDays = 0
  for (const li of lineItems) {
    const def = getWorkItemById(li.definitionId, bank)
    if (!def) continue
    const efforts = computeLineItemEfforts(def, li.sizeCode, li.quantity)
    for (const [role, days] of Object.entries(efforts)) {
      liEffortByRole[role] = (liEffortByRole[role] ?? 0) + (days as number)
      liTotalDays += days as number
    }
  }

  // Direct cost from line items
  let liDirectCost = 0
  for (const [role, days] of Object.entries(liEffortByRole)) {
    const rate = ((est.rateCard[role as keyof typeof est.rateCard] ?? ROLES[role as keyof typeof ROLES]?.defaultRate ?? 600) * mult)
    liDirectCost += days * rate
  }

  // Group line items by stream
  const grouped: Record<string, EstimateLineItem[]> = {}
  const unassigned: EstimateLineItem[] = []
  for (const li of lineItems) {
    if (li.streamId) {
      if (!grouped[li.streamId]) grouped[li.streamId] = []
      grouped[li.streamId].push(li)
    } else {
      unassigned.push(li)
    }
  }

  return (
    <div className="space-y-5">

      {/* Top-down constraint */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Estimate anchor</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Target budget (client-given)</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">{sym}</span>
              <input
                type="number" min={0}
                value={Math.round((est.targetBudget ?? 0) * mult) || ''}
                placeholder="e.g. 500,000"
                onChange={e => updateField('targetBudget', Math.round(Number(e.target.value) / mult))}
                className="flex-1 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
            </div>
            {(est.targetBudget ?? 0) > 0 && (
              <div className="text-xs text-indigo-600 mt-1.5 font-medium">
                ≈ {Math.round((est.targetBudget! * mult) / (settings.blendedRate * mult || 600))} days at blended rate
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Target effort (pre-agreed)</label>
            <div className="flex items-center gap-2">
              <input
                type="number" min={0}
                value={est.targetEffort || ''}
                placeholder="e.g. 200"
                onChange={e => updateField('targetEffort', Number(e.target.value))}
                className="flex-1 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
              <span className="text-sm text-slate-400">days</span>
            </div>
            {(est.targetEffort ?? 0) > 0 && (
              <div className="text-xs text-indigo-600 mt-1.5 font-medium">
                ≈ {sym}{Math.round((est.targetEffort! * (settings.blendedRate ?? 600) * mult) / 1000)}k at blended rate
              </div>
            )}
          </div>
        </div>
        {(est.targetBudget ?? 0) > 0 && liTotalDays > 0 && (
          <div className={`mt-3 text-xs font-semibold px-3 py-2 rounded-lg ${
            liDirectCost > est.targetBudget! * mult
              ? 'bg-red-50 text-red-700'
              : 'bg-green-50 text-green-700'
          }`}>
            {liDirectCost > est.targetBudget! * mult
              ? `⚠ Line items total (${sym}${Math.round(liDirectCost / 1000)}k direct cost) exceeds target budget — review scope`
              : `✓ Within budget — ${sym}${Math.round((est.targetBudget! * mult - liDirectCost) / 1000)}k remaining`
            }
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus size={13} /> Add line item
          </button>
          {lineItems.length > 0 && (
            <button
              onClick={() => { if (confirm('Push computed line item totals into the stream matrix? This adds to (not replaces) existing stream efforts.')) syncLineItemsToStreams() }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-900 transition-colors"
            >
              <ArrowDownToLine size={13} /> Sync to stream matrix
            </button>
          )}
        </div>
        <div className="text-xs text-slate-400">{lineItems.length} items · {Math.round(liTotalDays * 10) / 10}d · {sym}{Math.round(liDirectCost / 1000)}k direct</div>
      </div>

      {/* Line item picker */}
      {showPicker && (
        <LineItemPicker
          bank={bank}
          streams={est.streams}
          onAdd={(item) => { addLineItem(item); addRecentWorkItem(item.definitionId); setShowPicker(false) }}
          recentIds={settings.recentWorkItemIds ?? []}
          onClose={() => setShowPicker(false)}
          filterCat={filterCat}
          setFilterCat={setFilterCat}
          search={search}
          setSearch={setSearch}
        />
      )}

      {/* Line items list */}
      {lineItems.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-10 text-center">
          <div className="text-slate-400 text-sm font-medium mb-1">No line items yet</div>
          <div className="text-xs text-slate-400">Pick from the standards bank to build a detailed estimate bottom-up</div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Grouped by stream */}
          {Object.entries(grouped).map(([streamId, items]) => {
            const stream = est.streams.find(s => s.id === streamId)
            return (
              <LineItemGroup
                key={streamId}
                label={stream?.name ?? streamId}
                items={items}
                bank={bank}
                streams={est.streams}
                rateCard={est.rateCard}
                mult={mult}
                sym={sym}
                onUpdate={updateLineItem}
                onRemove={removeLineItem}
              />
            )
          })}
          {unassigned.length > 0 && (
            <LineItemGroup
              label="Unassigned"
              items={unassigned}
              bank={bank}
              streams={est.streams}
              rateCard={est.rateCard}
              mult={mult}
              sym={sym}
              onUpdate={updateLineItem}
              onRemove={removeLineItem}
            />
          )}
        </div>
      )}

      {/* Summary by role */}
      {lineItems.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Effort summary from line items</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(liEffortByRole).map(([role, days]) => (
              <div key={role} className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-center">
                <div className="text-xs font-black text-indigo-600">{Math.round(days * 10) / 10}d</div>
                <div className="text-xs text-slate-500 mt-0.5">{role}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="text-sm font-bold text-slate-700">Total: {Math.round(liTotalDays * 10) / 10} days</div>
            <div className="text-sm font-bold text-indigo-700">{sym}{Math.round(liDirectCost).toLocaleString()} direct cost</div>
          </div>
        </div>
      )}

      {/* #6 Assumptions log */}
      <AssumptionsPanel
        assumptions={est.assumptions ?? []}
        onAdd={addAssumption}
        onRemove={removeAssumption}
      />

      {/* #12 Estimate notes */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Estimate notes</div>
        <textarea
          value={est.notes ?? ''}
          onChange={e => updateField('notes', e.target.value)}
          placeholder="Any context, caveats, or notes for this estimate…"
          rows={3}
          className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-300 resize-none"
        />
      </div>
    </div>
  )
}

// ── Assumptions panel (#6) ────────────────────────────────────

const IMPACT_COLORS: Record<string, string> = {
  low:    'bg-green-100 text-green-700',
  medium: 'bg-amber-100 text-amber-700',
  high:   'bg-red-100 text-red-700',
}

function AssumptionsPanel({ assumptions, onAdd, onRemove }: {
  assumptions: import('../../types').Assumption[]
  onAdd: (text: string, impact: import('../../types').Assumption['impact']) => void
  onRemove: (id: string) => void
}) {
  const [text, setText] = useState('')
  const [impact, setImpact] = useState<'low' | 'medium' | 'high'>('medium')

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={14} className="text-amber-500" />
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assumptions</div>
        <span className="text-xs text-slate-400">({assumptions.length})</span>
      </div>
      {assumptions.length > 0 && (
        <div className="space-y-2 mb-3">
          {assumptions.map(a => (
            <div key={a.id} className="flex items-start gap-3 bg-slate-50 rounded-lg px-3 py-2.5">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${IMPACT_COLORS[a.impact]}`}>{a.impact}</span>
              <span className="text-xs text-slate-700 flex-1 leading-relaxed">{a.text}</span>
              <button onClick={() => onRemove(a.id)} className="text-slate-300 hover:text-red-400 transition-colors shrink-0"><Trash2 size={11} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onAdd(text.trim(), impact); setText('') } }}
          placeholder="e.g. Client provides test data by week 3…"
          className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-300"
        />
        <select value={impact} onChange={e => setImpact(e.target.value as typeof impact)}
          className="text-xs border border-slate-200 rounded-lg px-2 focus:outline-none">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <button
          onClick={() => { if (text.trim()) { onAdd(text.trim(), impact); setText('') } }}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors"
        >
          <Plus size={12} /> Add
        </button>
      </div>
    </div>
  )
}

// ── Line Item Group ────────────────────────────────────────────

function LineItemGroup({ label, items, bank, streams, rateCard, mult, sym, onUpdate, onRemove }: {
  label: string
  items: EstimateLineItem[]
  bank: WorkItemDefinition[]
  streams: ReturnType<typeof useEstimatorStore.getState>['estimates'][0]['streams']
  rateCard: Record<string, number>
  mult: number
  sym: string
  onUpdate: (id: string, patch: Partial<EstimateLineItem>) => void
  onRemove: (id: string) => void
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 text-xs font-bold text-slate-600 uppercase tracking-wider">
        {label}
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            <th className="text-left px-4 py-2 text-xs font-semibold text-slate-400">Item</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400">Type</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400">Size</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400">Qty</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400">Roles</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400">Days</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400">Cost</th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-slate-400">Stream</th>
            <th className="w-8" />
          </tr>
        </thead>
        <tbody>
          {items.map(li => {
            const def = getWorkItemById(li.definitionId, bank)
            if (!def) return null
            const efforts = computeLineItemEfforts(def, li.sizeCode, li.quantity)
            const days = Object.values(efforts).reduce((a, b) => a + (b ?? 0), 0)
            const cost = Object.entries(efforts).reduce((sum, [role, d]) => {
              return sum + (d ?? 0) * (rateCard[role] ?? ROLES[role as keyof typeof ROLES]?.defaultRate ?? 600) * mult
            }, 0)
            const sizeObj = def.sizes.find(s => s.code === li.sizeCode)
            return (
              <tr key={li.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                <td className="px-4 py-2">
                  <input
                    value={li.label}
                    onChange={e => onUpdate(li.id, { label: e.target.value })}
                    className="text-xs font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 focus:outline-none w-full"
                  />
                  {sizeObj && <div className="text-xs text-slate-400 mt-0.5">{sizeObj.description}</div>}
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-xs text-slate-500">{def.name}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="flex gap-0.5 justify-center">
                    {def.sizes.map(sz => (
                      <button
                        key={sz.code}
                        onClick={() => onUpdate(li.id, { sizeCode: sz.code })}
                        className={`px-1.5 py-0.5 rounded text-xs font-bold transition-colors ${
                          li.sizeCode === sz.code
                            ? SIZE_COLORS[sz.code]
                            : 'text-slate-300 hover:text-slate-500'
                        }`}
                        title={sz.description}
                      >
                        {sz.code}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="number" min={1} max={100}
                    value={li.quantity}
                    onChange={e => onUpdate(li.id, { quantity: Math.max(1, Number(e.target.value)) })}
                    className="w-12 text-center text-xs font-semibold text-slate-700 border border-slate-200 rounded py-1 focus:outline-none focus:border-indigo-400"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <div className="text-xs text-slate-500">
                    {Object.entries(efforts).map(([r, d]) => `${r}:${Math.round((d ?? 0) * 10) / 10}`).join(' ')}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-xs font-bold text-slate-700">{Math.round(days * 10) / 10}d</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-xs font-semibold text-indigo-700">{sym}{Math.round(cost / 1000)}k</span>
                </td>
                <td className="px-2 py-2 text-center">
                  <select
                    value={li.streamId ?? ''}
                    onChange={e => onUpdate(li.id, { streamId: e.target.value || undefined })}
                    className="text-xs text-slate-500 border border-slate-200 rounded px-1 py-1 focus:outline-none max-w-28"
                  >
                    <option value="">—</option>
                    {streams.filter(s => s.costType === 'capex').map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </td>
                <td className="pr-2 py-2 text-center">
                  <button onClick={() => onRemove(li.id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Line Item Picker ───────────────────────────────────────────

function LineItemPicker({ bank, streams, onAdd, onClose, filterCat, setFilterCat, search, setSearch, recentIds }: {
  bank: WorkItemDefinition[]
  streams: ReturnType<typeof useEstimatorStore.getState>['estimates'][0]['streams']
  onAdd: (item: EstimateLineItem) => void
  onClose: () => void
  filterCat: string
  setFilterCat: (c: string) => void
  search: string
  setSearch: (s: string) => void
  recentIds: string[]
}) {
  const [selected, setSelected] = useState<WorkItemDefinition | null>(null)
  const [selectedSize, setSelectedSize] = useState<SizeCode>('M')
  const [label, setLabel] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [streamId, setStreamId] = useState('')

  const categories = [...new Set(bank.map(d => d.category))]
    .sort((a, b) => CATEGORY_BANK_ORDER.indexOf(a) - CATEGORY_BANK_ORDER.indexOf(b))

  const recentDefs = recentIds.map(id => bank.find(d => d.id === id)).filter(Boolean) as WorkItemDefinition[]
  const filtered = bank.filter(d => {
    if (filterCat !== 'all' && d.category !== filterCat) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const handleAdd = () => {
    if (!selected) return
    onAdd({
      id: generateId(),
      label: label || selected.name,
      definitionId: selected.id,
      sizeCode: selectedSize,
      streamId: streamId || undefined,
      quantity,
    })
    setLabel('')
    setQuantity(1)
    setSelected(null)
  }

  const selectedSizeDef = selected?.sizes.find(s => s.code === selectedSize)
  const previewEfforts = selected ? computeLineItemEfforts(selected, selectedSize, quantity) : {}
  const previewDays = Object.values(previewEfforts).reduce((a, b) => a + (b ?? 0), 0)

  return (
    <div className="bg-white border-2 border-indigo-200 rounded-xl overflow-hidden shadow-lg">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-indigo-50">
        <div className="text-sm font-bold text-indigo-900">Add from standards bank</div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
      </div>

      <div className="grid grid-cols-5 min-h-64">
        {/* Category list */}
        <div className="col-span-1 border-r border-slate-100 p-2 space-y-1">
          <button
            onClick={() => setFilterCat('all')}
            className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterCat === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            All types
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`w-full text-left px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filterCat === cat ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {CATEGORY_LABELS[cat] ?? cat}
            </button>
          ))}
        </div>

        {/* Work item list */}
        <div className="col-span-2 border-r border-slate-100 overflow-y-auto max-h-80">
          <div className="p-2">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-300 mb-2"
            />
          </div>
          {recentDefs.length > 0 && !search && filterCat === 'all' && (
            <>
              <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 bg-slate-50 uppercase tracking-wider">Recently used</div>
              {recentDefs.map(def => (
                <button key={`r-${def.id}`}
                  onClick={() => { setSelected(def); setSelectedSize(def.sizes[Math.floor(def.sizes.length / 2)].code as SizeCode) }}
                  className={`w-full text-left px-4 py-2 border-b border-slate-100 transition-colors ${selected?.id === def.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-slate-50'}`}>
                  <div className="text-xs font-semibold text-indigo-700">{def.name}</div>
                </button>
              ))}
              <div className="px-4 py-1.5 text-xs font-semibold text-slate-400 bg-slate-50 uppercase tracking-wider">All</div>
            </>
          )}
          {filtered.map(def => (
            <button
              key={def.id}
              onClick={() => { setSelected(def); setSelectedSize(def.sizes[Math.floor(def.sizes.length / 2)].code as SizeCode) }}
              className={`w-full text-left px-4 py-2.5 border-b border-slate-100 transition-colors ${selected?.id === def.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-slate-50'}`}
            >
              <div className="text-xs font-semibold text-slate-800">{def.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">{def.description.slice(0, 50)}…</div>
            </button>
          ))}
        </div>

        {/* Size + configure panel */}
        <div className="col-span-2 p-4 space-y-4">
          {!selected ? (
            <div className="flex items-center justify-center h-full text-slate-300 text-sm">Select a work item type →</div>
          ) : (
            <>
              <div>
                <div className="text-xs font-bold text-slate-800 mb-1">{selected.name}</div>
                <div className="text-xs text-slate-500">{selected.description}</div>
              </div>

              {/* Size buttons */}
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Size</div>
                <div className="flex flex-wrap gap-2">
                  {selected.sizes.map(sz => (
                    <button
                      key={sz.code}
                      onClick={() => setSelectedSize(sz.code as SizeCode)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                        selectedSize === sz.code
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                      title={sz.description}
                    >
                      {sz.code} — {sz.label}
                    </button>
                  ))}
                </div>
                {selectedSizeDef && (
                  <div className="text-xs text-slate-400 mt-1.5 flex items-start gap-1">
                    <Info size={10} className="mt-0.5 shrink-0" />
                    {selectedSizeDef.description}
                  </div>
                )}
              </div>

              {/* Preview effort */}
              {previewDays > 0 && (
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-xs text-slate-500 mb-1">Effort preview (qty: {quantity})</div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(previewEfforts).map(([role, days]) => (
                      <span key={role} className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">
                        {role}: {Math.round((days ?? 0) * 10) / 10}d
                      </span>
                    ))}
                  </div>
                  <div className="text-xs font-bold text-indigo-700 mt-1.5">Total: {Math.round(previewDays * 10) / 10} days</div>
                </div>
              )}

              {/* Item name, qty, stream */}
              <div className="space-y-2">
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder={`e.g. "User login endpoint", "Products list API"…`}
                  className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-300"
                />
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">Qty</span>
                    <input type="number" min={1} value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value)))}
                      className="w-14 text-center text-xs border border-slate-200 rounded-lg py-1.5 focus:outline-none focus:border-indigo-400" />
                  </div>
                  <select
                    value={streamId}
                    onChange={e => setStreamId(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                  >
                    <option value="">No stream assigned</option>
                    {streams.filter(s => s.costType === 'capex').map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                onClick={handleAdd}
                className="w-full py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Add {quantity > 1 ? `${quantity}×` : ''} {selected.name} ({selectedSize})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
