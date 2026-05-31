import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'
import { ROLES, CURRENCY_SYMBOLS } from '../../data/roles'
import type { Currency } from '../../types'

const CURRENCIES: Currency[] = ['GBP', 'USD', 'EUR', 'INR']

export default function CostTab() {
  const { getActive, setRate, updateField } = useEstimatorStore()
  const est = getActive()
  if (!est) return null

  const totals = calcTotals(est)
  const sym = totals.sym

  const fmt = (n: number) => {
    if (est.currency === 'INR') return `${sym}${Math.round(n).toLocaleString()}`
    return `${sym}${Math.round(n / 1000).toFixed(0)}k`
  }
  const fmtFull = (n: number) => `${sym}${Math.round(n).toLocaleString()}`

  return (
    <div className="space-y-6">

      {/* Settings row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Currency</label>
          <div className="flex gap-1.5 flex-wrap">
            {CURRENCIES.map(c => (
              <button
                key={c}
                onClick={() => updateField('currency', c)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  est.currency === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {CURRENCY_SYMBOLS[c]} {c}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Target margin</label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={5} max={50} step={5}
              value={est.targetMarginPct}
              onChange={e => updateField('targetMarginPct', Number(e.target.value))}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-lg font-black text-indigo-600 w-12 text-right">{est.targetMarginPct}%</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Overhead</label>
          <div className="flex items-center gap-2">
            <input
              type="range" min={0} max={30} step={5}
              value={est.overheadPct}
              onChange={e => updateField('overheadPct', Number(e.target.value))}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-lg font-black text-indigo-600 w-12 text-right">{est.overheadPct}%</span>
          </div>
        </div>
      </div>

      {/* Rate card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate card — daily rates ({sym})</div>
        </div>
        <div className="divide-y divide-slate-100">
          {est.activeRoles.map(role => {
            const days = totals.effortByRole[role] ?? 0
            const rate = (est.rateCard[role] ?? ROLES[role]?.defaultRate ?? 0) * totals.mult
            const cost = days * rate
            return (
              <div key={role} className="flex items-center gap-4 px-5 py-3">
                <div className="w-10 font-black text-xs text-slate-400">{role}</div>
                <div className="flex-1 text-sm font-medium text-slate-700">{ROLES[role]?.name}</div>
                <div className="text-xs text-slate-400 w-16 text-right">{days > 0 ? `${days}d` : '—'}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">{sym}</span>
                  <input
                    type="number"
                    min={0}
                    value={Math.round((est.rateCard[role] ?? ROLES[role]?.defaultRate ?? 0) * totals.mult)}
                    onChange={e => setRate(role, Math.round(Number(e.target.value) / totals.mult))}
                    className="w-20 text-sm font-semibold text-slate-800 text-right border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-400"
                  />
                  <span className="text-xs text-slate-400">/day</span>
                </div>
                <div className="w-24 text-right text-sm font-semibold text-slate-700">
                  {days > 0 ? fmtFull(cost) : <span className="text-slate-300">—</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cost build-up */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cost build-up</div>
        </div>
        <div className="divide-y divide-slate-100">
          <BuildRow label="Base cost" value={fmtFull(totals.baseCost)} sub="Direct effort × rates" />
          <BuildRow label={`Contingency (${est.contingencyPct}%)`} value={`+ ${fmtFull(totals.contingencyCost)}`} sub={`${totals.contingencyDays} extra days`} accent />
          <BuildRow label="Total direct cost" value={fmtFull(totals.totalCost)} bold />
          <BuildRow label={`Overhead (${est.overheadPct}%)`} value={`+ ${fmtFull(totals.overhead)}`} sub="Delivery overhead" />
          <BuildRow label="Cost with overhead" value={fmtFull(totals.costWithOverhead)} />
          <BuildRow label={`Margin (${est.targetMarginPct}%)`} value={`+ ${fmtFull(totals.margin)}`} sub={`${totals.impliedMarginPct.toFixed(1)}% of sell price`} accent />
        </div>
        <div className="px-5 py-4 bg-indigo-50 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-indigo-900">Sell price</div>
            <div className="text-xs text-indigo-600 mt-0.5">Including contingency, overhead and margin</div>
          </div>
          <div className="text-3xl font-black text-indigo-700">{fmt(totals.sellPrice)}</div>
        </div>
      </div>

    </div>
  )
}

function BuildRow({ label, value, sub, bold, accent }: {
  label: string; value: string; sub?: string; bold?: boolean; accent?: boolean
}) {
  return (
    <div className={`flex items-center justify-between px-5 py-3 ${accent ? 'bg-amber-50/50' : ''}`}>
      <div>
        <div className={`text-sm ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{label}</div>
        {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
      </div>
      <div className={`text-sm font-bold ${accent ? 'text-amber-700' : bold ? 'text-slate-900' : 'text-slate-700'}`}>
        {value}
      </div>
    </div>
  )
}
