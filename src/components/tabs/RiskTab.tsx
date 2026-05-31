import { Lock, Unlock } from 'lucide-react'
import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'
import { CONTINGENCY_BY_BAND } from '../../data/roles'
import type { RiskBand } from '../../types'

const BANDS: { id: RiskBand; label: string; color: string; bg: string; border: string; desc: string }[] = [
  { id: 'green',   label: 'Green',   color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200', desc: '≥ 75% — Low risk, well-defined scope' },
  { id: 'amber',   label: 'Amber',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200', desc: '50–74% — Moderate risk, some gaps' },
  { id: 'red',     label: 'Red',     color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-200',   desc: '25–49% — High risk, significant unknowns' },
  { id: 'black',   label: 'Black',   color: 'text-slate-700',  bg: 'bg-slate-100', border: 'border-slate-300', desc: '< 25% — Very high risk, consider no-bid' },
  { id: 'unknown', label: 'Unknown', color: 'text-slate-500',  bg: 'bg-slate-50',  border: 'border-slate-200', desc: 'Not assessed — default 20% applied' },
]

const AXIS_IMPACT: Record<string, { axis: string; high: string; low: string }[]> = {
  green:   [{ axis: 'All axes', high: 'Strong across the board', low: '' }],
  amber:   [
    { axis: 'SC — Scope Clarity', high: '', low: 'Requirements gaps likely → add dev buffer' },
    { axis: 'GR — Governance', high: '', low: 'Decision delays likely → add PM buffer' },
  ],
  red:     [
    { axis: 'SC — Scope Clarity', high: '', low: 'Significant scope unknowns — discovery phase recommended' },
    { axis: 'TC — Technical Complexity', high: '', low: 'Integration/legacy risk — add SA and QA buffer' },
    { axis: 'GR — Governance', high: '', low: 'Weak governance — budget extra PM and change management' },
  ],
  black:   [
    { axis: 'All axes', high: '', low: 'Risk profile suggests re-scoping or discovery phase before fixed-price commitment' },
  ],
  unknown: [{ axis: 'Not assessed', high: 'Run CADEX to get an accurate risk band', low: '' }],
}

export default function RiskTab() {
  const { getActive, setRiskBand, setContingency } = useEstimatorStore()
  const est = getActive()
  if (!est) return null

  const totals = calcTotals(est)
  const autoContingency = CONTINGENCY_BY_BAND[est.riskBand] ?? 20

  return (
    <div className="space-y-6">

      {/* Risk band selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Risk band</div>
        <div className="grid grid-cols-5 gap-2">
          {BANDS.map(b => (
            <button
              key={b.id}
              onClick={() => setRiskBand(b.id)}
              className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                est.riskBand === b.id
                  ? `${b.bg} ${b.border} ${b.color} shadow-sm`
                  : 'border-transparent hover:bg-slate-50 text-slate-500'
              }`}
            >
              <span className={`text-sm font-bold ${est.riskBand === b.id ? b.color : ''}`}>{b.label}</span>
              <span className="text-xs leading-tight opacity-70">{b.desc}</span>
              <span className={`text-lg font-black mt-1 ${est.riskBand === b.id ? b.color : 'text-slate-300'}`}>
                +{CONTINGENCY_BY_BAND[b.id]}%
              </span>
            </button>
          ))}
        </div>
        {est.cadexDealId && (
          <p className="text-xs text-indigo-600 mt-3 font-medium">
            ↗ Risk band imported from CADEX deal — change here to override
          </p>
        )}
      </div>

      {/* Contingency */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contingency</div>
          <button
            onClick={() => setContingency(est.contingencyPct, !est.contingencyLocked)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              est.contingencyLocked
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {est.contingencyLocked ? <Lock size={12} /> : <Unlock size={12} />}
            {est.contingencyLocked ? 'Manual override' : 'Auto from risk band'}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="range"
              min={0} max={60} step={5}
              value={est.contingencyPct}
              onChange={e => setContingency(Number(e.target.value), true)}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0%</span><span>15%</span><span>30%</span><span>45%</span><span>60%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0} max={100}
              value={est.contingencyPct}
              onChange={e => setContingency(Number(e.target.value), true)}
              className="w-16 text-center text-lg font-black text-indigo-600 border border-slate-200 rounded-lg py-2 focus:outline-none focus:border-indigo-400"
            />
            <span className="text-lg font-bold text-slate-400">%</span>
          </div>
        </div>

        {!est.contingencyLocked && (
          <p className="text-xs text-slate-400 mt-2">
            Auto-set to {autoContingency}% based on {est.riskBand} risk band · Drag or type to override (locks manually)
          </p>
        )}
      </div>

      {/* Effort breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Effort breakdown</div>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-slate-800">{totals.baseDays}</div>
            <div className="text-xs text-slate-500 mt-1">Base days</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-black text-amber-700">+{totals.contingencyDays}</div>
            <div className="text-xs text-amber-600 mt-1">Contingency ({est.contingencyPct}%)</div>
          </div>
          <div className="bg-indigo-50 rounded-xl p-4 text-center border-2 border-indigo-200">
            <div className="text-2xl font-black text-indigo-700">{totals.totalDays}</div>
            <div className="text-xs text-indigo-600 mt-1 font-semibold">Total days</div>
          </div>
        </div>
      </div>

      {/* Axis insights */}
      {(AXIS_IMPACT[est.riskBand] ?? []).length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Risk insights for this band</div>
          <div className="space-y-2">
            {(AXIS_IMPACT[est.riskBand] ?? []).map((item, i) => (
              <div key={i} className="flex gap-3 items-start bg-slate-50 rounded-lg px-4 py-2.5">
                <span className="text-xs font-bold text-amber-600 shrink-0 mt-0.5 w-32">{item.axis}</span>
                <p className="text-xs text-slate-600 leading-relaxed">{item.low || item.high}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
