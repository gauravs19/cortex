import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'
import { ROLES, CURRENCY_SYMBOLS } from '../../data/roles'
import type { Currency, RoleId } from '../../types'

const CURRENCIES: Currency[] = ['GBP', 'USD', 'EUR', 'INR']

function trafficLight(pct: number) {
  if (pct >= 30) return 'text-green-700'
  if (pct >= 15) return 'text-amber-700'
  return 'text-red-600'
}

export default function CostBuildupTab() {
  const { getActive, setRate, updateField } = useEstimatorStore()
  const est = getActive()
  if (!est) return null

  const totals = calcTotals(est)
  const sym = totals.sym
  const mult = totals.mult
  const fmtFull = (n: number) => `${sym}${Math.round(n).toLocaleString()}`

  const costRateCard = est.costRateCard ?? {}
  const setCostRate = (role: RoleId, v: number) =>
    updateField('costRateCard', { ...est.costRateCard, [role]: Math.round(v / mult) })

  const effortByRole = totals.effortByRole

  const roleRows = est.activeRoles.map(role => {
    const days = effortByRole[role] ?? 0
    const billRate = (est.rateCard[role] ?? ROLES[role]?.defaultRate ?? 0) * mult
    const costRate = (costRateCard[role] ?? Math.round((est.rateCard[role] ?? ROLES[role]?.defaultRate ?? 600) * 0.55)) * mult
    const rowRevenue = days * billRate
    const rowCost = days * costRate
    const lm = rowRevenue - rowCost
    const lmPct = rowRevenue > 0 ? (lm / rowRevenue) * 100 : 0
    const markup = costRate > 0 ? ((billRate - costRate) / costRate) * 100 : 0
    return { role, days, billRate, costRate, rowRevenue, rowCost, lm, lmPct, markup }
  }).filter(r => r.days > 0)

  const contingencyFactor = 1 + est.contingencyPct / 100
  const totalDirectCost = roleRows.reduce((s, r) => s + r.rowCost, 0) * contingencyFactor
  const totalRevenue    = roleRows.reduce((s, r) => s + r.rowRevenue, 0) * contingencyFactor
  const totalLM = totalRevenue - totalDirectCost
  const totalLMPct = totalRevenue > 0 ? (totalLM / totalRevenue) * 100 : 0

  return (
    <div className="space-y-5">

      {/* Currency + contingency info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Delivery currency</label>
          <div className="flex gap-1.5 flex-wrap">
            {CURRENCIES.map(c => (
              <button key={c} onClick={() => updateField('currency', c)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${est.currency === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {CURRENCY_SYMBOLS[c]} {c}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">All rates below are entered in this currency. Change in Cost Build-up; bill currency is set in the header.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Contingency applied</div>
            <div className="text-2xl font-black text-slate-800">{est.contingencyPct}%</div>
            <div className="text-xs text-slate-400 mt-0.5">Scales both cost and revenue — change in Risk tab</div>
          </div>
          <div className="text-right">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Labour margin target</div>
            <div className="text-2xl font-black text-indigo-700">{est.targetMarginPct}%</div>
            <div className="text-xs text-slate-400 mt-0.5">Target floor — set in P&L tab</div>
          </div>
        </div>
      </div>

      {/* Rate card table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rate card — cost vs billing by role</div>
          <div className="text-xs text-slate-400 mt-0.5">
            Cost/day = what you pay the team &nbsp;·&nbsp; Bill/day = what you charge the client &nbsp;·&nbsp; Mark-up = (bill − cost) / cost &nbsp;·&nbsp; LM = (bill − cost) × days
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 700 }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 w-36">Role</th>
                <th className="px-3 py-2.5 text-right w-14">Days</th>
                <th className="px-3 py-2.5 text-right">Cost / day</th>
                <th className="px-3 py-2.5 text-right">Bill / day</th>
                <th className="px-3 py-2.5 text-right w-16">Mark-up</th>
                <th className="px-3 py-2.5 text-right">Direct cost</th>
                <th className="px-3 py-2.5 text-right">Revenue</th>
                <th className="px-3 py-2.5 text-right">LM</th>
                <th className="px-3 py-2.5 text-right w-14">LM %</th>
              </tr>
            </thead>
            <tbody>
              {roleRows.map(row => (
                <tr key={row.role} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40">
                  <td className="px-4 py-2.5">
                    <div className="font-black text-xs text-indigo-600">{row.role}</div>
                    <div className="text-xs text-slate-400">{ROLES[row.role]?.name}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">{row.days}</td>
                  {/* Editable cost rate */}
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-xs text-slate-400">{sym}</span>
                      <input type="number" min={0}
                        value={Math.round((costRateCard[row.role] ?? Math.round((est.rateCard[row.role] ?? ROLES[row.role]?.defaultRate ?? 600) * 0.55)) * mult)}
                        onChange={e => setCostRate(row.role, Number(e.target.value))}
                        className="w-20 text-xs font-semibold text-slate-700 text-right border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-400 bg-slate-50" />
                    </div>
                  </td>
                  {/* Editable bill rate */}
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-xs text-slate-400">{sym}</span>
                      <input type="number" min={0}
                        value={Math.round((est.rateCard[row.role] ?? ROLES[row.role]?.defaultRate ?? 0) * mult)}
                        onChange={e => setRate(row.role, Math.round(Number(e.target.value) / mult))}
                        className="w-20 text-xs font-semibold text-indigo-700 text-right border border-indigo-200 rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500 bg-indigo-50" />
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-xs font-bold ${row.markup >= 50 ? 'text-green-700' : row.markup >= 25 ? 'text-amber-700' : 'text-red-600'}`}>
                      {Math.round(row.markup)}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-slate-600">{fmtFull(row.rowCost)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-800">{fmtFull(row.rowRevenue)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-semibold text-green-700">{fmtFull(row.lm)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className={`text-xs font-black ${trafficLight(row.lmPct)}`}>{Math.round(row.lmPct)}%</span>
                  </td>
                </tr>
              ))}
              {roleRows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-8 text-xs text-slate-400 text-center">No effort entered yet — fill the stream matrix or load reference effort</td></tr>
              )}
            </tbody>
            {roleRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 text-xs font-bold">
                  <td className="px-4 py-3 text-slate-500 uppercase tracking-wider">Total (incl. {est.contingencyPct}% cont.)</td>
                  <td className="px-3 py-3 text-right text-slate-700">{roleRows.reduce((s, r) => s + r.days, 0)}</td>
                  <td colSpan={3} />
                  <td className="px-3 py-3 text-right text-slate-700">{fmtFull(totalDirectCost)}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{fmtFull(totalRevenue)}</td>
                  <td className="px-3 py-3 text-right text-green-700">{fmtFull(totalLM)}</td>
                  <td className={`px-3 py-3 text-right ${trafficLight(totalLMPct)}`}>{Math.round(totalLMPct)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400">
          Blue inputs = billing rate (what client pays) &nbsp;·&nbsp; Grey inputs = cost rate (what you pay) &nbsp;·&nbsp; Totals include {est.contingencyPct}% contingency
        </div>
      </div>

    </div>
  )
}
