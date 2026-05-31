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
  const fmtFull = (n: number) => `${sym}${Math.round(n).toLocaleString()}`
  const fmtK = (n: number) => est.currency === 'INR' ? fmtFull(n) : `${sym}${Math.round(n / 1000)}k`

  return (
    <div className="space-y-6">

      {/* Settings row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Currency</label>
          <div className="flex gap-1.5 flex-wrap">
            {CURRENCIES.map(c => (
              <button key={c} onClick={() => updateField('currency', c)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${est.currency === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {CURRENCY_SYMBOLS[c]} {c}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Target margin</label>
          <div className="flex items-center gap-2">
            <input type="range" min={5} max={50} step={5} value={est.targetMarginPct}
              onChange={e => updateField('targetMarginPct', Number(e.target.value))}
              className="flex-1 accent-indigo-600" />
            <span className="text-lg font-black text-indigo-600 w-12 text-right">{est.targetMarginPct}%</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Overhead</label>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={30} step={5} value={est.overheadPct}
              onChange={e => updateField('overheadPct', Number(e.target.value))}
              className="flex-1 accent-indigo-600" />
            <span className="text-lg font-black text-indigo-600 w-12 text-right">{est.overheadPct}%</span>
          </div>
        </div>
      </div>

      {/* CapEx summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
          <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">CapEx — project delivery cost</div>
          <div className="text-3xl font-black text-indigo-900 mt-2">{fmtK(totals.sellPrice)}</div>
          <div className="text-xs text-indigo-600 mt-1">One-time · includes contingency, overhead & margin</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="bg-white/70 rounded-lg p-2"><div className="font-black text-indigo-700">{fmtK(totals.totalCost)}</div><div className="text-indigo-500">Direct cost</div></div>
            <div className="bg-white/70 rounded-lg p-2"><div className="font-black text-indigo-700">{totals.impliedMarginPct.toFixed(0)}%</div><div className="text-indigo-500">Margin</div></div>
          </div>
        </div>

        {totals.opexMonthly > 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">OpEx — recurring running cost</div>
            <div className="text-3xl font-black text-amber-900 mt-2">{fmtFull(totals.opexMonthly)}<span className="text-base font-normal text-amber-600">/mo</span></div>
            <div className="text-xs text-amber-600 mt-1">Ongoing after go-live</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/70 rounded-lg p-2"><div className="font-black text-amber-700">{fmtFull(totals.opexAnnual)}</div><div className="text-amber-500">Annual</div></div>
              <div className="bg-white/70 rounded-lg p-2">
                <div className="flex items-center gap-1">
                  <input type="number" min={1} max={60} value={est.projectMonths ?? 6}
                    onChange={e => updateField('projectMonths', Number(e.target.value))}
                    className="w-10 font-black text-amber-700 text-center border-b border-amber-300 outline-none bg-transparent" />
                  <span className="text-amber-600">mo project</span>
                </div>
                <div className="font-semibold text-amber-700 mt-0.5">{fmtFull(totals.opexProjectTotal)} total</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-5 flex flex-col items-center justify-center text-center">
            <div className="text-xs font-semibold text-slate-400 mb-1">No OpEx streams</div>
            <div className="text-xs text-slate-400">Use the stream wizard to add infrastructure running costs or configure cloud hosting streams</div>
          </div>
        )}
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
                <div className="w-8 font-black text-xs text-slate-400">{role}</div>
                <div className="flex-1 text-sm font-medium text-slate-700">{ROLES[role]?.name}</div>
                <div className="text-xs text-slate-400 w-14 text-right">{days > 0 ? `${days}d` : '—'}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">{sym}</span>
                  <input
                    type="number" min={0}
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

      {/* CapEx build-up */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CapEx cost build-up</div>
        </div>
        <div className="divide-y divide-slate-100">
          <BuildRow label="Base cost"                          value={fmtFull(totals.baseCost)}         sub="Direct effort × rates" />
          <BuildRow label={`Contingency (${est.contingencyPct}%)`} value={`+ ${fmtFull(totals.contingencyCost)}`} sub={`${totals.contingencyDays} extra days`} accent />
          <BuildRow label="Total direct cost"                  value={fmtFull(totals.totalCost)}        bold />
          <BuildRow label={`Overhead (${est.overheadPct}%)`}  value={`+ ${fmtFull(totals.overhead)}`}  sub="Delivery overhead" />
          <BuildRow label="Cost with overhead"                 value={fmtFull(totals.costWithOverhead)} />
          <BuildRow label={`Margin (${est.targetMarginPct}%)`} value={`+ ${fmtFull(totals.margin)}`}   sub={`${totals.impliedMarginPct.toFixed(1)}% of sell price`} accent />
        </div>
        <div className="px-5 py-4 bg-indigo-50 flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-indigo-900">CapEx sell price</div>
            <div className="text-xs text-indigo-600 mt-0.5">One-time project delivery</div>
          </div>
          <div className="text-3xl font-black text-indigo-700">{fmtK(totals.sellPrice)}</div>
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
      <div className={`text-sm font-bold ${accent ? 'text-amber-700' : bold ? 'text-slate-900' : 'text-slate-700'}`}>{value}</div>
    </div>
  )
}
