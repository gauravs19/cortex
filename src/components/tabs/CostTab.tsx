import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'
import { ROLES, CURRENCY_SYMBOLS } from '../../data/roles'
import type { Currency, RoleId } from '../../types'

const CURRENCIES: Currency[] = ['GBP', 'USD', 'EUR', 'INR']

// ── P&L helpers ───────────────────────────────────────────────

function pct(value: number, base: number) {
  return base > 0 ? `${Math.round((value / base) * 100)}%` : '—'
}

function trafficLight(pct: number) {
  if (pct >= 30) return 'text-green-700'
  if (pct >= 15) return 'text-amber-700'
  return 'text-red-600'
}

// ── Main component ────────────────────────────────────────────

export default function CostTab() {
  const { getActive, setRate, updateField } = useEstimatorStore()
  const est = getActive()
  if (!est) return null

  const totals = calcTotals(est)
  const sym = totals.sym
  const mult = totals.mult
  const { billSym, billMult } = totals
  const billCurrency = est.billingCurrency ?? est.currency
  const sellPriceBilled = totals.sellPrice * (billMult / mult)
  const fmtFull = (n: number) => `${sym}${Math.round(n).toLocaleString()}`
  const fmtK = (n: number) => est.currency === 'INR' ? fmtFull(n) : `${sym}${Math.round(n / 1000)}k`

  // Cost rate card — what we actually pay per role
  const costRateCard = est.costRateCard ?? {}
  const setCostRate = (role: RoleId, v: number) =>
    updateField('costRateCard', { ...est.costRateCard, [role]: Math.round(v / mult) })

  // Labour: effort by role from totals
  const effortByRole = totals.effortByRole

  // Per-role P&L
  const roleRows = est.activeRoles.map(role => {
    const days = effortByRole[role] ?? 0
    const billRate = (est.rateCard[role] ?? ROLES[role]?.defaultRate ?? 0) * mult
    const costRate = (costRateCard[role] ?? Math.round((est.rateCard[role] ?? ROLES[role]?.defaultRate ?? 600) * 0.55)) * mult
    const revenue = days * billRate
    const directCost = days * costRate
    const lm = revenue - directCost
    const lmPct = revenue > 0 ? (lm / revenue) * 100 : 0
    const markup = costRate > 0 ? ((billRate - costRate) / costRate) * 100 : 0
    return { role, days, billRate, costRate, revenue, directCost, lm, lmPct, markup }
  }).filter(r => r.days > 0)

  // Totals
  const totalCostPre    = roleRows.reduce((s, r) => s + r.directCost, 0)

  // With contingency applied
  const contingencyMultiplier = 1 + est.contingencyPct / 100
  const totalDirectCost = totalCostPre * contingencyMultiplier
  const revenue = totals.sellPrice  // final sell price is the revenue line

  // P&L waterfall
  const labourMargin    = revenue - totalDirectCost
  const labourMarginPct = revenue > 0 ? (labourMargin / revenue) * 100 : 0

  const overheadAmt     = revenue * (est.overheadPct / 100)
  const grossMargin     = labourMargin - overheadAmt
  const grossMarginPct  = revenue > 0 ? (grossMargin / revenue) * 100 : 0

  const salesComm       = revenue * (est.salesCommissionPct / 100)
  const gaOverhead      = revenue * (est.gaOverheadPct / 100)
  const ebitda          = grossMargin - salesComm - gaOverhead
  const ebitdaPct       = revenue > 0 ? (ebitda / revenue) * 100 : 0

  const opexMonthly = totals.opexMonthly

  return (
    <div className="space-y-6">

      {/* Settings row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Currency</label>
          <div className="flex gap-1 flex-wrap">
            {CURRENCIES.map(c => (
              <button key={c} onClick={() => updateField('currency', c)}
                className={`px-2.5 py-1.5 text-xs font-bold rounded-lg transition-colors ${est.currency === c ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {CURRENCY_SYMBOLS[c]} {c}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Target margin</label>
          <div className="flex items-center gap-2">
            <input type="range" min={5} max={50} step={5} value={est.targetMarginPct}
              onChange={e => updateField('targetMarginPct', Number(e.target.value))} className="flex-1 accent-indigo-600" />
            <span className="text-sm font-black text-indigo-600 w-10 text-right">{est.targetMarginPct}%</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">Sales commission</label>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={20} step={1} value={est.salesCommissionPct}
              onChange={e => updateField('salesCommissionPct', Number(e.target.value))} className="flex-1 accent-indigo-600" />
            <span className="text-sm font-black text-indigo-600 w-10 text-right">{est.salesCommissionPct}%</span>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">G&amp;A overhead</label>
          <div className="flex items-center gap-2">
            <input type="range" min={0} max={20} step={1} value={est.gaOverheadPct}
              onChange={e => updateField('gaOverheadPct', Number(e.target.value))} className="flex-1 accent-indigo-600" />
            <span className="text-sm font-black text-indigo-600 w-10 text-right">{est.gaOverheadPct}%</span>
          </div>
        </div>
      </div>

      {/* P&L headline cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Revenue', value: fmtK(revenue), sub: 'Sell price incl. contingency', color: 'bg-slate-900 text-white', sub2: '' },
          { label: 'Labour Margin (LM)', value: fmtK(labourMargin), sub: pct(labourMargin, revenue) + ' of revenue', color: 'bg-indigo-50 border border-indigo-200', sub2: '', pctVal: labourMarginPct },
          { label: 'Gross Margin (GM)', value: fmtK(grossMargin), sub: pct(grossMargin, revenue) + ' of revenue', color: 'bg-violet-50 border border-violet-200', sub2: 'After delivery overhead', pctVal: grossMarginPct },
          { label: 'EBITDA', value: fmtK(ebitda), sub: pct(ebitda, revenue) + ' of revenue', color: 'bg-green-50 border border-green-200', sub2: 'After sales & G&A', pctVal: ebitdaPct },
        ].map(card => (
          <div key={card.label} className={`rounded-xl p-4 ${card.color}`}>
            <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${card.color.includes('slate-900') ? 'text-slate-400' : 'text-slate-500'}`}>{card.label}</div>
            <div className={`text-2xl font-black ${card.color.includes('slate-900') ? 'text-white' : 'text-slate-900'}`}>{card.value}</div>
            <div className={`text-xs mt-1 font-semibold ${card.pctVal !== undefined ? trafficLight(card.pctVal) : 'text-slate-400'}`}>{card.sub}</div>
            {card.sub2 && <div className="text-xs text-slate-400 mt-0.5">{card.sub2}</div>}
          </div>
        ))}
      </div>

      {/* Rate card — cost rate | bill rate | mark-up | per role P&L */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Rate card & labour margin by role</div>
            <div className="text-xs text-slate-400 mt-0.5">Cost rate = what you pay · Bill rate = what you charge · Contribution = revenue − cost</div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 w-32">Role</th>
                <th className="px-3 py-2.5 text-right">Days</th>
                <th className="px-3 py-2.5 text-right">Cost/day</th>
                <th className="px-3 py-2.5 text-right">Bill/day</th>
                <th className="px-3 py-2.5 text-right">Mark-up</th>
                <th className="px-3 py-2.5 text-right">Direct cost</th>
                <th className="px-3 py-2.5 text-right">Revenue</th>
                <th className="px-3 py-2.5 text-right">LM</th>
                <th className="px-3 py-2.5 text-right">LM %</th>
              </tr>
            </thead>
            <tbody>
              {roleRows.map(row => (
                <tr key={row.role} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/40">
                  <td className="px-4 py-3">
                    <div className="font-black text-xs text-indigo-600">{row.role}</div>
                    <div className="text-xs text-slate-400">{ROLES[row.role]?.name}</div>
                  </td>
                  <td className="px-3 py-3 text-right text-xs font-semibold text-slate-700">{row.days}</td>
                  {/* Editable cost rate */}
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-xs text-slate-400">{sym}</span>
                      <input type="number" min={0}
                        value={Math.round((costRateCard[row.role] ?? Math.round((est.rateCard[row.role] ?? ROLES[row.role]?.defaultRate ?? 600) * 0.55)) * mult)}
                        onChange={e => setCostRate(row.role, Number(e.target.value))}
                        className="w-16 text-xs font-semibold text-slate-700 text-right border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-400" />
                    </div>
                  </td>
                  {/* Editable bill rate */}
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="text-xs text-slate-400">{sym}</span>
                      <input type="number" min={0}
                        value={Math.round((est.rateCard[row.role] ?? ROLES[row.role]?.defaultRate ?? 0) * mult)}
                        onChange={e => setRate(row.role, Math.round(Number(e.target.value) / mult))}
                        className="w-16 text-xs font-semibold text-slate-700 text-right border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-indigo-400" />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className={`text-xs font-bold ${row.markup >= 50 ? 'text-green-700' : row.markup >= 25 ? 'text-amber-700' : 'text-red-600'}`}>
                      {Math.round(row.markup)}%
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-xs text-slate-600">{fmtFull(row.directCost)}</td>
                  <td className="px-3 py-3 text-right text-xs font-semibold text-slate-800">{fmtFull(row.revenue)}</td>
                  <td className="px-3 py-3 text-right text-xs font-semibold text-green-700">{fmtFull(row.lm)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={`text-xs font-black ${trafficLight(row.lmPct)}`}>{Math.round(row.lmPct)}%</span>
                  </td>
                </tr>
              ))}
              {roleRows.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-6 text-xs text-slate-400 text-center">No effort assigned yet — add line items or fill the stream matrix</td></tr>
              )}
            </tbody>
            {roleRows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 text-xs font-bold">
                  <td className="px-4 py-3 text-slate-500 uppercase tracking-wider">Total</td>
                  <td className="px-3 py-3 text-right text-slate-700">{roleRows.reduce((s, r) => s + r.days, 0)}</td>
                  <td colSpan={3} />
                  <td className="px-3 py-3 text-right text-slate-700">{fmtFull(totalDirectCost)}</td>
                  <td className="px-3 py-3 text-right text-slate-800">{fmtFull(revenue)}</td>
                  <td className="px-3 py-3 text-right text-green-700">{fmtFull(labourMargin)}</td>
                  <td className={`px-3 py-3 text-right font-black ${trafficLight(labourMarginPct)}`}>{Math.round(labourMarginPct)}%</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Full P&L waterfall */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">P&amp;L waterfall</div>
        </div>
        <div className="divide-y divide-slate-100">
          <PLRow label={`Revenue — ${est.currency}${billCurrency !== est.currency ? ` (billed as ${billCurrency}: ${billSym}${Math.round(sellPriceBilled / 1000)}k)` : ''}`} value={fmtFull(revenue)} pctOf={revenue} base={revenue} />
          <PLRow label={`Direct labour cost (${est.contingencyPct}% contingency included)`} value={`− ${fmtFull(totalDirectCost)}`} pctOf={totalDirectCost} base={revenue} isCost />
          <PLRow label="Labour Margin (LM)" value={fmtFull(labourMargin)} pctOf={labourMargin} base={revenue} bold highlight="indigo" />
          <PLRow label={`Delivery overhead (${est.overheadPct}% of revenue)`} value={`− ${fmtFull(overheadAmt)}`} pctOf={overheadAmt} base={revenue} isCost />
          <PLRow label="Gross Margin (GM)" value={fmtFull(grossMargin)} pctOf={grossMargin} base={revenue} bold highlight="violet" />
          <PLRow label={`Sales & bid cost (${est.salesCommissionPct}% of revenue)`} value={`− ${fmtFull(salesComm)}`} pctOf={salesComm} base={revenue} isCost />
          <PLRow label={`G&A overhead (${est.gaOverheadPct}% of revenue)`} value={`− ${fmtFull(gaOverhead)}`} pctOf={gaOverhead} base={revenue} isCost />
          <PLRow label="EBITDA" value={fmtFull(ebitda)} pctOf={ebitda} base={revenue} bold highlight="green" />
        </div>
        {opexMonthly > 0 && (
          <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
            <span className="font-bold">OpEx note:</span> {sym}{Math.round(opexMonthly).toLocaleString()}/mo ongoing running costs not included above (client-side cost, not your margin)
          </div>
        )}
      </div>

    </div>
  )
}

function PLRow({ label, value, pctOf, base, bold, highlight, isCost }: {
  label: string; value: string; pctOf: number; base: number
  bold?: boolean; highlight?: 'indigo' | 'violet' | 'green'; isCost?: boolean
}) {
  const p = base > 0 ? Math.round((Math.abs(pctOf) / base) * 100) : 0
  const rowBg = highlight === 'indigo' ? 'bg-indigo-50' : highlight === 'violet' ? 'bg-violet-50' : highlight === 'green' ? 'bg-green-50' : ''
  const valColor = highlight === 'indigo' ? 'text-indigo-700' : highlight === 'violet' ? 'text-violet-700' : highlight === 'green' ? 'text-green-700' : isCost ? 'text-slate-600' : 'text-slate-800'
  const pctColor = highlight ? trafficLight(p) : 'text-slate-400'
  return (
    <div className={`flex items-center px-5 py-3 ${rowBg}`}>
      <div className={`flex-1 text-sm ${bold ? 'font-bold text-slate-900' : 'text-slate-700'}`}>{label}</div>
      {/* % bar */}
      <div className="w-24 mr-4 hidden sm:block">
        <div className="h-1.5 rounded-full bg-slate-100">
          <div className={`h-1.5 rounded-full ${highlight === 'indigo' ? 'bg-indigo-400' : highlight === 'violet' ? 'bg-violet-400' : highlight === 'green' ? 'bg-green-400' : isCost ? 'bg-red-300' : 'bg-slate-400'}`}
            style={{ width: `${Math.min(p, 100)}%` }} />
        </div>
      </div>
      <div className={`text-xs font-semibold w-10 text-right mr-4 ${pctColor}`}>{p}%</div>
      <div className={`text-sm font-bold w-28 text-right ${valColor}`}>{value}</div>
    </div>
  )
}
