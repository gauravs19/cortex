import { useState } from 'react'
import { Plus, X, Check } from 'lucide-react'
import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'
import { useSettingsStore } from '../../store/settingsStore'
import type { PnlAdjustment } from '../../types'

function useTrafficLight() {
  const { marginThresholds } = useSettingsStore(s => s.settings)
  const green = marginThresholds?.green ?? 30
  const amber = marginThresholds?.amber ?? 15
  return (pct: number) => ({
    text: pct >= green ? 'text-green-700' : pct >= amber ? 'text-amber-700' : 'text-red-600',
    bg:   pct >= green ? 'bg-green-50'    : pct >= amber ? 'bg-amber-50'    : 'bg-red-50',
    bar:  pct >= green ? 'bg-green-500'   : pct >= amber ? 'bg-amber-500'   : 'bg-red-400',
  })
}

function fmtPct(pct: number) {
  return `${pct >= 0 ? '' : '−'}${Math.abs(Math.round(pct))}%`
}

// ── Inline adjustment editor ───────────────────────────────────

function AdjustmentRow({
  adj, sym, mult, onUpdate, onRemove,
}: {
  adj: PnlAdjustment; sym: string; mult: number
  onUpdate: (patch: Partial<PnlAdjustment>) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ label: adj.label, amount: adj.amount })

  const save = () => {
    onUpdate({ label: draft.label.trim() || adj.label, amount: draft.amount })
    setEditing(false)
  }

  const displayed = Math.round(adj.amount * mult)

  return (
    <div className="flex items-center gap-3 px-5 py-2 border-b border-slate-100 last:border-0 group hover:bg-slate-50/60">
      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0 ml-4" />
      {editing ? (
        <>
          <input
            className="flex-1 text-xs border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:border-indigo-500"
            value={draft.label}
            onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
            autoFocus
          />
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-slate-400">{sym}</span>
            <input
              type="number"
              className="w-24 text-xs border border-indigo-300 rounded px-2 py-1 focus:outline-none text-right"
              value={Math.round(draft.amount * mult)}
              onChange={e => setDraft(d => ({ ...d, amount: Number(e.target.value) / mult }))}
            />
          </div>
          <button onClick={save} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={13} /></button>
          <button onClick={() => setEditing(false)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={13} /></button>
        </>
      ) : (
        <>
          <button onClick={() => setEditing(true)} className="flex-1 text-xs text-slate-600 text-left hover:text-indigo-600">
            {adj.label}
          </button>
          <span className={`text-xs font-semibold shrink-0 ${adj.amount >= 0 ? 'text-green-700' : 'text-red-600'}`}>
            {adj.amount >= 0 ? '+' : '−'} {sym}{Math.abs(displayed).toLocaleString()}
          </span>
          <button
            onClick={onRemove}
            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-400 rounded transition-opacity"
          >
            <X size={12} />
          </button>
        </>
      )}
    </div>
  )
}

// ── Add adjustment form ────────────────────────────────────────

function AddAdjustment({
  appliesAt, sym, mult, onAdd,
}: {
  appliesAt: 'lm' | 'gm'; sym: string; mult: number
  onAdd: (label: string, amount: number, appliesAt: 'lm' | 'gm') => void
}) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('')

  const submit = () => {
    const n = parseFloat(amount)
    if (!label.trim() || isNaN(n)) return
    onAdd(label.trim(), n / mult, appliesAt)
    setLabel(''); setAmount(''); setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-5 py-2 text-xs text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors w-full text-left border-b border-slate-100"
      >
        <Plus size={12} /> Add {appliesAt.toUpperCase()} adjustment
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 px-5 py-2 border-b border-indigo-100 bg-indigo-50/50">
      <Plus size={12} className="text-indigo-400 shrink-0" />
      <input
        autoFocus
        placeholder="Label (e.g. Travel & expenses)"
        className="flex-1 text-xs border border-indigo-200 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-400 bg-white"
        value={label}
        onChange={e => setLabel(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && submit()}
      />
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-slate-400">{sym}</span>
        <input
          type="number"
          placeholder="-25000"
          title="Positive = adds to margin. Negative = reduces margin (cost/discount)."
          className="w-28 text-xs border border-indigo-200 rounded px-2 py-1.5 focus:outline-none text-right bg-white"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
      </div>
      <span className="text-xs text-slate-400 shrink-0">+/−</span>
      <button onClick={submit} className="px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-700">Add</button>
      <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600"><X size={12} /></button>
    </div>
  )
}

// ── Waterfall row ──────────────────────────────────────────────

function WaterfallRow({
  label, value, pct, highlight, isCost, bold, indent,
}: {
  label: string; value: string; pct: number
  highlight?: 'indigo' | 'violet' | 'green'; isCost?: boolean; bold?: boolean; indent?: boolean
}) {
  const barPct = Math.min(Math.abs(pct), 100)
  const tl = highlight ? { text: highlight === 'indigo' ? 'text-indigo-700' : highlight === 'violet' ? 'text-violet-700' : 'text-green-700', bg: '', bar: highlight === 'indigo' ? 'bg-indigo-400' : highlight === 'violet' ? 'bg-violet-400' : 'bg-green-400' } : null
  const rowBg = highlight === 'indigo' ? 'bg-indigo-50' : highlight === 'violet' ? 'bg-violet-50' : highlight === 'green' ? 'bg-green-50' : ''
  const valColor = highlight === 'indigo' ? 'text-indigo-700' : highlight === 'violet' ? 'text-violet-700' : highlight === 'green' ? 'text-green-700' : isCost ? 'text-red-600' : 'text-slate-800'
  return (
    <div className={`flex items-center px-5 py-3 border-b border-slate-100 last:border-0 ${rowBg}`}>
      <div className={`flex-1 text-sm ${bold ? 'font-bold text-slate-900' : 'text-slate-700'} ${indent ? 'pl-5' : ''}`}>{label}</div>
      <div className="w-28 mr-4 hidden sm:block">
        <div className="h-1.5 rounded-full bg-slate-100">
          <div
            className={`h-1.5 rounded-full ${tl?.bar ?? (isCost ? 'bg-red-300' : 'bg-slate-300')}`}
            style={{ width: `${barPct}%` }}
          />
        </div>
      </div>
      <div className={`text-xs font-semibold w-10 text-right mr-4 ${tl?.text ?? 'text-slate-400'}`}>
        {fmtPct(pct)}
      </div>
      <div className={`text-sm font-bold w-32 text-right ${valColor}`}>{value}</div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function PnLTab() {
  const trafficLight = useTrafficLight()
  const { getActive, updateField, addPnlAdjustment, updatePnlAdjustment, removePnlAdjustment } = useEstimatorStore()
  const est = getActive()
  if (!est) return null

  const totals = calcTotals(est)
  const { sym, mult, billSym, billMult } = totals
  const billCurrency = est.billingCurrency ?? est.currency
  const fmtFull = (n: number) => `${sym}${Math.round(Math.abs(n)).toLocaleString()}`
  const fmtK    = (n: number) => `${sym}${Math.round(Math.abs(n) / 1000)}k`
  const signed  = (n: number, prefix = '') => `${n >= 0 ? '+' : '−'} ${prefix}${fmtFull(Math.abs(n))}`

  const {
    revenue, directCost, labourMargin, lmPct,
    deliveryOverhead, grossMargin, gmPct,
    salesComm, gaOverhead, ebitda, ebitdaPct,
    lmAdjTotal, gmAdjTotal, opexMonthly,
  } = totals

  const lmAdjs = (est.pnlAdjustments ?? []).filter(a => a.appliesAt === 'lm')
  const gmAdjs = (est.pnlAdjustments ?? []).filter(a => a.appliesAt === 'gm')

  const lmTl = trafficLight(lmPct)
  const gmTl = trafficLight(gmPct)
  const ebitdaTl = trafficLight(ebitdaPct)

  const sellPriceBilled = revenue * (billMult / mult)

  return (
    <div className="space-y-5">

      {/* Headline cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          {
            label: 'Revenue', value: fmtK(revenue),
            sub: billCurrency !== est.currency ? `${billSym}${Math.round(sellPriceBilled / 1000)}k billed` : 'Billing revenue',
            color: 'bg-slate-900 text-white', sub2: '', pct: null,
          },
          {
            label: 'Labour Margin', value: fmtK(labourMargin), sub: `${Math.round(lmPct)}% of revenue`,
            color: `${lmTl.bg} border ${lmTl.bg.replace('bg-', 'border-').replace('-50', '-200')}`,
            sub2: est.targetMarginPct > 0 ? `Target ≥ ${est.targetMarginPct}% ${lmPct >= est.targetMarginPct ? '✓' : '⚠️'}` : '',
            pct: lmPct,
          },
          {
            label: 'Gross Margin', value: fmtK(grossMargin), sub: `${Math.round(gmPct)}% of revenue`,
            color: `${gmTl.bg} border ${gmTl.bg.replace('bg-', 'border-').replace('-50', '-200')}`,
            sub2: 'After delivery overhead', pct: gmPct,
          },
          {
            label: 'EBITDA', value: fmtK(ebitda), sub: `${Math.round(ebitdaPct)}% of revenue`,
            color: `${ebitdaTl.bg} border ${ebitdaTl.bg.replace('bg-', 'border-').replace('-50', '-200')}`,
            sub2: 'After sales & G&A', pct: ebitdaPct,
          },
        ].map(card => {
          const tl = card.pct !== null ? trafficLight(card.pct!) : null
          return (
            <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
              <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${card.color.includes('slate-900') ? 'text-slate-400' : 'text-slate-500'}`}>{card.label}</div>
              <div className={`text-2xl font-black ${card.color.includes('slate-900') ? 'text-white' : tl?.text ?? 'text-slate-900'}`}>{card.value}</div>
              <div className={`text-xs mt-1 font-semibold ${tl?.text ?? 'text-slate-400'}`}>{card.sub}</div>
              {card.sub2 && <div className="text-xs text-slate-400 mt-0.5">{card.sub2}</div>}
            </div>
          )
        })}
      </div>

      {/* P&L config — target margin + overhead sliders */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">P&L parameters</div>
        <div className="grid grid-cols-4 gap-5">
          {[
            { label: 'Target LM floor', field: 'targetMarginPct' as const, min: 5, max: 60, step: 5, help: 'Minimum acceptable labour margin %' },
            { label: 'Delivery overhead', field: 'overheadPct' as const, min: 0, max: 30, step: 1, help: '% of revenue for delivery management costs' },
            { label: 'Sales / bid cost', field: 'salesCommissionPct' as const, min: 0, max: 20, step: 1, help: '% of revenue for sales and bid effort' },
            { label: 'G&A overhead', field: 'gaOverheadPct' as const, min: 0, max: 20, step: 1, help: 'General & admin overhead % of revenue' },
          ].map(cfg => (
            <div key={cfg.field}>
              <label className="text-xs font-semibold text-slate-600 block mb-1">{cfg.label}</label>
              <div className="flex items-center gap-2">
                <input type="range" min={cfg.min} max={cfg.max} step={cfg.step}
                  value={est[cfg.field]} onChange={e => updateField(cfg.field, Number(e.target.value))}
                  className="flex-1 accent-indigo-600" />
                <span className="text-sm font-black text-indigo-600 w-10 text-right">{est[cfg.field]}%</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">{cfg.help}</div>
            </div>
          ))}
        </div>
      </div>

      {/* P&L waterfall with inline adjustments */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">P&L waterfall</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Revenue = billing rate × days × (1 + contingency) &nbsp;·&nbsp; Direct cost = cost rate × days × (1 + contingency)
          </div>
        </div>

        {/* Revenue */}
        <WaterfallRow label={`Revenue${billCurrency !== est.currency ? ` — billed as ${billCurrency}: ${billSym}${Math.round(sellPriceBilled / 1000)}k` : ''}`}
          value={fmtFull(revenue)} pct={100} bold />

        {/* Direct labour cost */}
        <WaterfallRow label={`Direct labour cost (${est.contingencyPct}% contingency included)`}
          value={`− ${fmtFull(directCost)}`} pct={-(directCost / revenue * 100)} isCost />

        {/* LM adjustments */}
        {lmAdjs.map(a => (
          <AdjustmentRow key={a.id} adj={a} sym={sym} mult={mult}
            onUpdate={patch => updatePnlAdjustment(a.id, patch)}
            onRemove={() => removePnlAdjustment(a.id)} />
        ))}
        <AddAdjustment appliesAt="lm" sym={sym} mult={mult} onAdd={addPnlAdjustment} />

        {/* Labour Margin */}
        <WaterfallRow label="Labour Margin (LM)" value={fmtFull(labourMargin)}
          pct={lmPct} bold highlight="indigo" />

        {/* LM adj summary if any */}
        {lmAdjTotal !== 0 && (
          <div className="flex items-center px-5 py-1.5 bg-indigo-50/50 border-b border-indigo-100">
            <span className="text-xs text-indigo-500 flex-1 pl-5">
              Includes {lmAdjs.length} adjustment{lmAdjs.length !== 1 ? 's' : ''}: {signed(lmAdjTotal, sym)}
            </span>
          </div>
        )}

        {/* Delivery overhead */}
        <WaterfallRow label={`Delivery overhead (${est.overheadPct}% of revenue)`}
          value={`− ${fmtFull(deliveryOverhead)}`} pct={-(deliveryOverhead / revenue * 100)} isCost indent />

        {/* GM adjustments */}
        {gmAdjs.map(a => (
          <AdjustmentRow key={a.id} adj={a} sym={sym} mult={mult}
            onUpdate={patch => updatePnlAdjustment(a.id, patch)}
            onRemove={() => removePnlAdjustment(a.id)} />
        ))}
        <AddAdjustment appliesAt="gm" sym={sym} mult={mult} onAdd={addPnlAdjustment} />

        {/* Gross Margin */}
        <WaterfallRow label="Gross Margin (GM)" value={fmtFull(grossMargin)}
          pct={gmPct} bold highlight="violet" />

        {gmAdjTotal !== 0 && (
          <div className="flex items-center px-5 py-1.5 bg-violet-50/50 border-b border-violet-100">
            <span className="text-xs text-violet-500 flex-1 pl-5">
              Includes {gmAdjs.length} adjustment{gmAdjs.length !== 1 ? 's' : ''}: {signed(gmAdjTotal, sym)}
            </span>
          </div>
        )}

        {/* Sales commission */}
        <WaterfallRow label={`Sales & bid cost (${est.salesCommissionPct}% of revenue)`}
          value={`− ${fmtFull(salesComm)}`} pct={-(salesComm / revenue * 100)} isCost indent />

        {/* G&A */}
        <WaterfallRow label={`G&A overhead (${est.gaOverheadPct}% of revenue)`}
          value={`− ${fmtFull(gaOverhead)}`} pct={-(gaOverhead / revenue * 100)} isCost indent />

        {/* EBITDA */}
        <WaterfallRow label="EBITDA" value={fmtFull(ebitda)}
          pct={ebitdaPct} bold highlight="green" />

        {/* OpEx footnote */}
        {opexMonthly > 0 && (
          <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
            <span className="font-bold">OpEx note:</span> {sym}{Math.round(opexMonthly).toLocaleString()}/mo ongoing running costs not included above (client-side cost, separate from delivery margin)
          </div>
        )}
      </div>

      {/* Adjustment legend */}
      <div className="text-xs text-slate-400 space-y-0.5">
        <div><strong>LM adjustments</strong> — sit between "Direct cost" and "Labour Margin". Use for: T&E budget, subcontractor costs, software pass-through, client discounts.</div>
        <div><strong>GM adjustments</strong> — sit between "Labour Margin" and "Gross Margin". Use for: risk reserves, partner/referral fees, deal-specific below-the-line provisions.</div>
        <div>Enter a <strong>negative amount</strong> for costs / deductions. Enter a <strong>positive amount</strong> for revenue items (e.g. licensed software sold with a markup).</div>
      </div>

    </div>
  )
}
