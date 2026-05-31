import { useState } from 'react'
import { Plus, Trash2, ArrowDownToLine, AlertTriangle, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { DEFAULT_WORK_ITEM_BANK, getWorkItemById, computeLineItemEfforts, SIZE_COLORS, CATEGORY_BANK_ORDER } from '../../data/workItemBank'
import { ROLES, CATEGORY_LABELS } from '../../data/roles'
import type { EstimateLineItem, EstimateFeature, SizeCode, WorkItemDefinition } from '../../types'

function genId() { return Math.random().toString(36).slice(2, 10) }

function itemStats(li: EstimateLineItem, bank: WorkItemDefinition[], rateCard: Record<string, number>, mult: number) {
  const def = getWorkItemById(li.definitionId, bank)
  if (!def) return { days: 0, cost: 0, efforts: {} as Record<string, number> }
  const efforts = computeLineItemEfforts(def, li.sizeCode, li.quantity) as Record<string, number>
  const days = Object.values(efforts).reduce((a, b) => a + (b ?? 0), 0)
  const cost = Object.entries(efforts).reduce((sum, [r, d]) =>
    sum + (d ?? 0) * (rateCard[r] ?? (ROLES as Record<string, { defaultRate: number }>)[r]?.defaultRate ?? 600) * mult, 0)
  return { days: Math.round(days * 10) / 10, cost, efforts }
}

export default function LineItemsTab() {
  const { getActive, addLineItem, updateLineItem, removeLineItem, syncLineItemsToStreams,
    updateField, addAssumption, removeAssumption,
    addFeature, renameFeature, removeFeature, toggleFeatureCollapsed } = useEstimatorStore()
  const { settings, addRecentWorkItem } = useSettingsStore()
  const est = getActive()

  const [addingToFeatureId, setAddingToFeatureId] = useState<string | null>(null)
  const [newFeatureName, setNewFeatureName] = useState('')
  const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null)

  if (!est) return null

  const bank: WorkItemDefinition[] = [...DEFAULT_WORK_ITEM_BANK, ...(settings.customBank ?? [])]
  const totals = calcTotals(est)
  const sym = totals.sym
  const mult = totals.mult
  const rc = est.rateCard as Record<string, number>
  const fmtK = (n: number) => `${sym}${Math.round(n / 1000)}k`

  const lineItems = est.lineItems ?? []
  const features = est.features ?? []

  const byFeature = (fid: string) => lineItems.filter(li => li.featureId === fid)
  const ungrouped = lineItems.filter(li => !li.featureId)

  const featureTotals = (fid: string) => {
    let days = 0, cost = 0
    for (const li of byFeature(fid)) { const s = itemStats(li, bank, rc, mult); days += s.days; cost += s.cost }
    return { days: Math.round(days * 10) / 10, cost }
  }

  let totalDays = 0, totalCost = 0
  for (const li of lineItems) { const s = itemStats(li, bank, rc, mult); totalDays += s.days; totalCost += s.cost }

  const handleAddFeature = () => {
    if (!newFeatureName.trim()) return
    addFeature(newFeatureName.trim())
    setNewFeatureName('')
  }

  return (
    <div className="space-y-4">

      {/* Anchor */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Estimate anchor</div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Target budget</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{sym}</span>
              <input type="number" min={0} value={Math.round((est.targetBudget ?? 0) * mult) || ''}
                placeholder="e.g. 500,000" onChange={e => updateField('targetBudget', Math.round(Number(e.target.value) / mult))}
                className="flex-1 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5">Target effort</label>
            <div className="flex items-center gap-2">
              <input type="number" min={0} value={est.targetEffort || ''} placeholder="e.g. 200"
                onChange={e => updateField('targetEffort', Number(e.target.value))}
                className="flex-1 text-sm font-semibold text-slate-800 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400" />
              <span className="text-xs text-slate-400">days</span>
            </div>
          </div>
        </div>
        {(est.targetBudget ?? 0) > 0 && totalDays > 0 && (
          <div className={`mt-3 text-xs font-semibold px-3 py-2 rounded-lg ${totalCost > (est.targetBudget ?? 0) * mult ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {totalCost > (est.targetBudget ?? 0) * mult
              ? `⚠ Items (${fmtK(totalCost)}) exceed target budget`
              : `✓ Within budget — ${fmtK((est.targetBudget ?? 0) * mult - totalCost)} remaining`}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        {lineItems.length > 0 && (
          <button onClick={() => { if (confirm('Push line item totals into stream matrix?')) syncLineItemsToStreams() }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
            <ArrowDownToLine size={13} /> Sync to streams
          </button>
        )}
        <div className="ml-auto text-xs text-slate-400">
          {lineItems.length} items · {features.length} features · {Math.round(totalDays * 10) / 10}d · {fmtK(totalCost)}
        </div>
      </div>

      {/* Feature groups */}
      {features.map(feature => {
        const ft = featureTotals(feature.id)
        return (
          <FeatureCard key={feature.id} feature={feature} items={byFeature(feature.id)} bank={bank}
            rateCard={rc} mult={mult} sym={sym} streams={est.streams} ft={ft}
            isEditing={editingFeatureId === feature.id}
            isAddingItems={addingToFeatureId === feature.id}
            recentIds={settings.recentWorkItemIds ?? []}
            onToggleCollapse={() => toggleFeatureCollapsed(feature.id)}
            onRename={(name) => { renameFeature(feature.id, name); setEditingFeatureId(null) }}
            onStartEdit={() => setEditingFeatureId(feature.id)}
            onRemove={() => { if (confirm(`Remove "${feature.name}"? Items become ungrouped.`)) removeFeature(feature.id) }}
            onToggleAddItems={() => setAddingToFeatureId(addingToFeatureId === feature.id ? null : feature.id)}
            onItemAdded={(item) => { addLineItem({ ...item, featureId: feature.id }); addRecentWorkItem(item.definitionId) }}
            onPickerClose={() => setAddingToFeatureId(null)}
            onUpdateItem={updateLineItem} onRemoveItem={removeLineItem}
          />
        )
      })}

      {/* Ungrouped */}
      {(ungrouped.length > 0 || addingToFeatureId === '__ug') && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Project-level / ungrouped</span>
            <button onClick={() => setAddingToFeatureId(addingToFeatureId === '__ug' ? null : '__ug')}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors">
              <Plus size={12} /> Add item
            </button>
          </div>
          {addingToFeatureId === '__ug' && (
            <ItemPicker bank={bank} streams={est.streams} recentIds={settings.recentWorkItemIds ?? []}
              onAdd={(item) => { addLineItem(item); addRecentWorkItem(item.definitionId); setAddingToFeatureId(null) }}
              onClose={() => setAddingToFeatureId(null)} />
          )}
          {ungrouped.map(li => (
            <LineItemRow key={li.id} li={li} bank={bank} rateCard={rc} mult={mult} sym={sym}
              streams={est.streams} onUpdate={updateLineItem} onRemove={removeLineItem} />
          ))}
        </div>
      )}

      {/* Add feature row */}
      <div className="flex gap-2">
        <input value={newFeatureName} onChange={e => setNewFeatureName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAddFeature()}
          placeholder="New feature / requirement…  e.g. User Authentication, Product Catalogue"
          className="flex-1 text-sm border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:border-indigo-300" />
        <button onClick={handleAddFeature}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors shrink-0">
          <Plus size={13} /> Add feature
        </button>
        <button onClick={() => setAddingToFeatureId('__ug')}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-200 transition-colors shrink-0">
          <Plus size={13} /> Ungrouped item
        </button>
      </div>

      {/* Assumptions + notes */}
      <AssumptionsPanel assumptions={est.assumptions ?? []} onAdd={addAssumption} onRemove={removeAssumption} />
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</div>
        <textarea value={est.notes ?? ''} onChange={e => updateField('notes', e.target.value)}
          placeholder="Caveats, scope exclusions, context…" rows={2}
          className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-300 resize-none" />
      </div>
    </div>
  )
}

// ── Feature card ──────────────────────────────────────────────

function FeatureCard({ feature, items, bank, rateCard, mult, sym, streams, ft,
  isEditing, isAddingItems, recentIds,
  onToggleCollapse, onRename, onStartEdit, onRemove, onToggleAddItems, onItemAdded, onPickerClose,
  onUpdateItem, onRemoveItem,
}: {
  feature: EstimateFeature; items: EstimateLineItem[]
  bank: WorkItemDefinition[]; rateCard: Record<string, number>; mult: number; sym: string
  streams: ReturnType<typeof useEstimatorStore.getState>['estimates'][0]['streams']
  ft: { days: number; cost: number }; isEditing: boolean; isAddingItems: boolean; recentIds: string[]
  onToggleCollapse: () => void; onRename: (n: string) => void; onStartEdit: () => void
  onRemove: () => void; onToggleAddItems: () => void
  onItemAdded: (item: EstimateLineItem) => void; onPickerClose: () => void
  onUpdateItem: (id: string, p: Partial<EstimateLineItem>) => void
  onRemoveItem: (id: string) => void
}) {
  const [editName, setEditName] = useState(feature.name)
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className={`flex items-center gap-3 px-4 py-3 ${isAddingItems ? 'bg-indigo-50 border-b border-indigo-100' : 'bg-slate-50 border-b border-slate-100'}`}>
        <button onClick={onToggleCollapse} className="text-slate-400 hover:text-slate-600 shrink-0">
          {feature.collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        {isEditing ? (
          <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
            onBlur={() => onRename(editName)} onKeyDown={e => e.key === 'Enter' && onRename(editName)}
            className="flex-1 text-sm font-bold text-slate-900 border-b border-indigo-400 outline-none bg-transparent" />
        ) : (
          <span className="flex-1 text-sm font-bold text-slate-800">{feature.name}</span>
        )}
        <div className="flex items-center gap-3 shrink-0">
          {ft.days > 0 && (
            <>
              <span className="text-xs font-semibold text-slate-400">{items.length} items</span>
              <span className="text-xs font-semibold text-slate-600">{ft.days}d</span>
              <span className="text-xs font-black text-indigo-600">{sym}{Math.round(ft.cost / 1000)}k</span>
            </>
          )}
          <button onClick={onToggleAddItems}
            className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${isAddingItems ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>
            <Plus size={11} /> Add item
          </button>
          <button onClick={onStartEdit} className="p-1 text-slate-300 hover:text-slate-600 rounded"><Pencil size={11} /></button>
          <button onClick={onRemove} className="p-1 text-slate-300 hover:text-red-400 rounded"><Trash2 size={11} /></button>
        </div>
      </div>
      {isAddingItems && (
        <div className="border-b border-indigo-100">
          <ItemPicker bank={bank} streams={streams} recentIds={recentIds}
            onAdd={onItemAdded} onClose={onPickerClose} />
        </div>
      )}
      {!feature.collapsed && items.map(li => (
        <LineItemRow key={li.id} li={li} bank={bank} rateCard={rateCard} mult={mult} sym={sym}
          streams={streams} onUpdate={onUpdateItem} onRemove={onRemoveItem} />
      ))}
      {!feature.collapsed && items.length === 0 && !isAddingItems && (
        <div className="px-4 py-4 text-xs text-slate-400 text-center">
          No items yet — click "Add item" above to pick from the standards bank
        </div>
      )}
    </div>
  )
}

// ── Line item row ─────────────────────────────────────────────

function LineItemRow({ li, bank, rateCard, mult, sym, streams, onUpdate, onRemove }: {
  li: EstimateLineItem; bank: WorkItemDefinition[]
  rateCard: Record<string, number>; mult: number; sym: string
  streams: ReturnType<typeof useEstimatorStore.getState>['estimates'][0]['streams']
  onUpdate: (id: string, p: Partial<EstimateLineItem>) => void
  onRemove: (id: string) => void
}) {
  const def = getWorkItemById(li.definitionId, bank)
  if (!def) return null
  const efforts = computeLineItemEfforts(def, li.sizeCode, li.quantity) as Record<string, number>
  const days = Math.round(Object.values(efforts).reduce((a, b) => a + (b ?? 0), 0) * 10) / 10
  const cost = Object.entries(efforts).reduce((sum, [r, d]) =>
    sum + (d ?? 0) * (rateCard[r] ?? (ROLES as Record<string, { defaultRate: number }>)[r]?.defaultRate ?? 600) * mult, 0)
  const sizeObj = def.sizes.find(s => s.code === li.sizeCode)

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50/40">
      <div className="min-w-0 w-44 shrink-0">
        <input value={li.label} onChange={e => onUpdate(li.id, { label: e.target.value })}
          className="text-xs font-medium text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none w-full" />
        <div className="text-xs text-slate-400">{def.name} · {sizeObj?.label ?? li.sizeCode}</div>
      </div>
      <div className="flex gap-0.5 shrink-0">
        {def.sizes.map(sz => (
          <button key={sz.code} onClick={() => onUpdate(li.id, { sizeCode: sz.code as SizeCode })} title={sz.description}
            className={`px-1.5 py-0.5 rounded text-xs font-bold transition-colors ${li.sizeCode === sz.code ? SIZE_COLORS[sz.code] : 'text-slate-300 hover:text-slate-500'}`}>
            {sz.code}
          </button>
        ))}
      </div>
      <input type="number" min={1} value={li.quantity} onChange={e => onUpdate(li.id, { quantity: Math.max(1, Number(e.target.value)) })}
        className="w-10 text-center text-xs border border-slate-200 rounded py-1 focus:outline-none focus:border-indigo-400 shrink-0" />
      <div className="text-xs text-slate-400 flex-1 truncate hidden lg:block">
        {Object.entries(efforts).map(([r, d]) => `${r}:${Math.round((d ?? 0) * 10) / 10}`).join(' ')}
      </div>
      <span className="text-xs font-semibold text-slate-600 shrink-0">{days}d</span>
      <span className="text-xs font-black text-indigo-600 shrink-0">{sym}{Math.round(cost / 1000)}k</span>
      <select value={li.streamId ?? ''} onChange={e => onUpdate(li.id, { streamId: e.target.value || undefined })}
        className="text-xs text-slate-400 border-0 bg-transparent focus:outline-none max-w-24 shrink-0">
        <option value="">—</option>
        {streams.filter(s => s.costType === 'capex').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button onClick={() => onRemove(li.id)} className="p-1 text-slate-300 hover:text-red-400 shrink-0"><Trash2 size={11} /></button>
    </div>
  )
}

// ── Item picker ───────────────────────────────────────────────

function ItemPicker({ bank, recentIds, onAdd, onClose }: {
  bank: WorkItemDefinition[]
  streams?: ReturnType<typeof useEstimatorStore.getState>['estimates'][0]['streams']
  recentIds: string[]; onAdd: (item: EstimateLineItem) => void; onClose: () => void
}) {
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<WorkItemDefinition | null>(null)
  const [selectedSize, setSelectedSize] = useState<SizeCode>('M')
  const [label, setLabel] = useState('')
  const [qty, setQty] = useState(1)

  const categories = [...new Set(bank.map(d => d.category))]
    .sort((a, b) => CATEGORY_BANK_ORDER.indexOf(a) - CATEGORY_BANK_ORDER.indexOf(b))
  const filtered = bank.filter(d => {
    if (filterCat !== 'all' && d.category !== filterCat) return false
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })
  const recentDefs = recentIds.map(id => bank.find(d => d.id === id)).filter(Boolean) as WorkItemDefinition[]
  const previewEfforts = selected ? computeLineItemEfforts(selected, selectedSize, qty) as Record<string, number> : {}
  const previewDays = Object.values(previewEfforts).reduce((a, b) => a + (b ?? 0), 0)

  return (
    <div className="grid grid-cols-5 bg-indigo-50/30">
      <div className="col-span-1 border-r border-slate-100 p-2 space-y-0.5">
        <button onClick={() => setFilterCat('all')} className={`w-full text-left px-2 py-1.5 text-xs font-semibold rounded ${filterCat === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white'}`}>All</button>
        {categories.map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)} className={`w-full text-left px-2 py-1.5 text-xs font-semibold rounded ${filterCat === cat ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-white'}`}>
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>
      <div className="col-span-2 border-r border-slate-100 overflow-y-auto max-h-56">
        <div className="p-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
            className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white" />
        </div>
        {recentDefs.length > 0 && !search && filterCat === 'all' && (
          <>
            <div className="px-3 py-1 text-xs font-semibold text-slate-400 bg-slate-100 uppercase tracking-wider">Recent</div>
            {recentDefs.map(def => (
              <button key={`r-${def.id}`} onClick={() => { setSelected(def); setSelectedSize(def.sizes[1]?.code as SizeCode ?? 'M') }}
                className={`w-full text-left px-3 py-1.5 border-b border-slate-100 text-xs ${selected?.id === def.id ? 'bg-indigo-50 font-semibold text-indigo-700' : 'hover:bg-white text-slate-600'}`}>
                {def.name}
              </button>
            ))}
            <div className="px-3 py-1 text-xs font-semibold text-slate-400 bg-slate-100 uppercase tracking-wider">All</div>
          </>
        )}
        {filtered.map(def => (
          <button key={def.id} onClick={() => { setSelected(def); setSelectedSize(def.sizes[1]?.code as SizeCode ?? 'M') }}
            className={`w-full text-left px-3 py-2 border-b border-slate-100 ${selected?.id === def.id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : 'hover:bg-white'}`}>
            <div className="text-xs font-semibold text-slate-800">{def.name}</div>
            <div className="text-xs text-slate-400 truncate">{def.description.slice(0, 48)}</div>
          </button>
        ))}
      </div>
      <div className="col-span-2 p-3 space-y-2.5">
        {!selected ? (
          <div className="flex items-center justify-center h-28 text-slate-300 text-xs">← pick a type</div>
        ) : (
          <>
            <div>
              <div className="text-xs font-bold text-slate-700 mb-1.5">{selected.name}</div>
              <div className="flex flex-wrap gap-1.5">
                {selected.sizes.map(sz => (
                  <button key={sz.code} onClick={() => setSelectedSize(sz.code as SizeCode)} title={sz.description}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-colors ${selectedSize === sz.code ? 'bg-indigo-600 text-white border-indigo-600' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                    {sz.code} — {sz.label}
                  </button>
                ))}
              </div>
            </div>
            {previewDays > 0 && (
              <div className="bg-white rounded-lg px-3 py-2 border border-slate-200 text-xs flex flex-wrap gap-1">
                {Object.entries(previewEfforts).map(([r, d]) => (
                  <span key={r} className="bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded">
                    {r}:{Math.round((d ?? 0) * 10) / 10}d
                  </span>
                ))}
                <span className="text-indigo-700 font-black ml-1">= {Math.round(previewDays * 10) / 10}d</span>
              </div>
            )}
            <div className="flex gap-2">
              <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (optional)"
                className="flex-1 text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white" />
              <input type="number" min={1} value={qty} onChange={e => setQty(Math.max(1, Number(e.target.value)))}
                className="w-12 text-center text-xs border border-slate-200 rounded-lg py-1.5 focus:outline-none" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => { onAdd({ id: genId(), label: label || selected.name, definitionId: selected.id, sizeCode: selectedSize, quantity: qty }); setLabel(''); setQty(1) }}
                className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">
                Add {qty > 1 ? `${qty}×` : ''} {selected.name} ({selectedSize})
              </button>
              <button onClick={onClose} className="px-3 py-2 text-xs text-slate-400 border border-slate-200 rounded-lg hover:bg-slate-50">✕</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Assumptions panel ─────────────────────────────────────────

const IMPACT_COLORS: Record<string, string> = {
  low: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', high: 'bg-red-100 text-red-700',
}

function AssumptionsPanel({ assumptions, onAdd, onRemove }: {
  assumptions: import('../../types').Assumption[]
  onAdd: (text: string, impact: import('../../types').Assumption['impact']) => void
  onRemove: (id: string) => void
}) {
  const [text, setText] = useState('')
  const [impact, setImpact] = useState<'low' | 'medium' | 'high'>('medium')
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={13} className="text-amber-500" />
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assumptions ({assumptions.length})</div>
      </div>
      {assumptions.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {assumptions.map(a => (
            <div key={a.id} className="flex items-start gap-2.5 bg-slate-50 rounded-lg px-3 py-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${IMPACT_COLORS[a.impact]}`}>{a.impact}</span>
              <span className="text-xs text-slate-700 flex-1">{a.text}</span>
              <button onClick={() => onRemove(a.id)} className="text-slate-300 hover:text-red-400 shrink-0"><Trash2 size={10} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && text.trim()) { onAdd(text.trim(), impact); setText('') } }}
          placeholder="Add an assumption…"
          className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-300" />
        <select value={impact} onChange={e => setImpact(e.target.value as typeof impact)}
          className="text-xs border border-slate-200 rounded-lg px-2 focus:outline-none">
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
        </select>
        <button onClick={() => { if (text.trim()) { onAdd(text.trim(), impact); setText('') } }}
          className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors">
          <Plus size={11} /> Add
        </button>
      </div>
    </div>
  )
}
