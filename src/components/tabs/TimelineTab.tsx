import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'

const PHASES = [
  { id: 'disc',  label: 'Discovery & Design',  pct: 0.20, color: 'bg-indigo-500',  light: 'bg-indigo-50',  text: 'text-indigo-700',  desc: 'Requirements, architecture, UX design, scope baseline' },
  { id: 'build', label: 'Build & Integrate',   pct: 0.50, color: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-700',  desc: 'Development, integration, DevOps setup' },
  { id: 'test',  label: 'Test & UAT',          pct: 0.20, color: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-700',   desc: 'System testing, UAT, defect resolution' },
  { id: 'live',  label: 'Go-Live & Hypercare', pct: 0.10, color: 'bg-green-500',   light: 'bg-green-50',   text: 'text-green-700',   desc: 'Cutover, go-live support, hypercare period' },
]

export default function TimelineTab() {
  const { getActive, updateField } = useEstimatorStore()
  const est = getActive()
  if (!est) return null

  const totals = calcTotals(est)

  const phaseWeeks = PHASES.map(p => Math.max(1, Math.round(totals.calendarWeeks * p.pct)))
  const totalWeeks = phaseWeeks.reduce((a, b) => a + b, 0)

  // Sprint breakdown
  const sprintCount = Math.ceil(totalWeeks / est.sprintWeeks)

  return (
    <div className="space-y-6">

      {/* Settings */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Sprint length</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(w => (
              <button
                key={w}
                onClick={() => updateField('sprintWeeks', w)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                  est.sprintWeeks === w ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {w}w
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Working days/week</label>
          <div className="flex gap-2">
            {[4, 5].map(d => (
              <button
                key={d}
                onClick={() => updateField('workingDaysPerWeek', d)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
                  est.workingDaysPerWeek === d ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary numbers */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total days',    value: String(totals.totalDays),    sub: `${totals.baseDays} base + ${totals.contingencyDays} contingency` },
          { label: 'Calendar weeks', value: String(totalWeeks),         sub: `~${Math.round(totalWeeks / 4.3)} months` },
          { label: 'Sprints',        value: String(sprintCount),        sub: `${est.sprintWeeks}-week sprints` },
          { label: 'Team size',      value: String(totals.calendarWeeks > 0 ? Math.ceil(totals.baseDays / (totalWeeks * est.workingDaysPerWeek)) : 1), sub: 'Avg concurrent headcount' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-slate-800">{card.value}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">{card.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Phase bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Delivery phases</div>
        <div className="flex gap-1 rounded-lg overflow-hidden h-10 mb-4">
          {PHASES.map((p, i) => (
            <div
              key={p.id}
              className={`${p.color} flex items-center justify-center transition-all`}
              style={{ width: `${(phaseWeeks[i] / totalWeeks) * 100}%` }}
              title={`${p.label}: ${phaseWeeks[i]} weeks`}
            >
              <span className="text-white text-xs font-bold px-1 truncate">{phaseWeeks[i]}w</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {PHASES.map((p, i) => (
            <div key={p.id} className={`flex items-start gap-3 rounded-lg px-4 py-3 ${p.light}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${p.color} mt-1 shrink-0`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-bold ${p.text}`}>{p.label}</span>
                  <span className={`text-sm font-black ${p.text}`}>{phaseWeeks[i]} weeks</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sprint table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sprint plan ({sprintCount} sprints)</div>
          <span className="text-xs text-slate-400">{est.sprintWeeks}-week sprints · {est.workingDaysPerWeek} working days each</span>
        </div>
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {Array.from({ length: sprintCount }).map((_, i) => {
            const week = i * est.sprintWeeks + 1
            const phase = PHASES[
              week <= phaseWeeks[0] ? 0
              : week <= phaseWeeks[0] + phaseWeeks[1] ? 1
              : week <= phaseWeeks[0] + phaseWeeks[1] + phaseWeeks[2] ? 2
              : 3
            ]
            return (
              <div key={i} className="flex items-center gap-4 px-5 py-2.5">
                <div className="w-16 text-xs font-black text-slate-400">S{i + 1}</div>
                <div className="text-xs text-slate-500">Week {week}–{week + est.sprintWeeks - 1}</div>
                <div className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${phase.light} ${phase.text}`}>
                  {phase.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
