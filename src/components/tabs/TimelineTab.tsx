import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'

const PHASES = [
  { id: 'disc',  label: 'Discovery & Design',  pct: 0.20, bar: 'bg-indigo-500', light: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200', desc: 'Requirements, architecture, UX design, scope baseline' },
  { id: 'build', label: 'Build & Integrate',   pct: 0.50, bar: 'bg-violet-500', light: 'bg-violet-50',  text: 'text-violet-700',  border: 'border-violet-200', desc: 'Development, integration, DevOps setup' },
  { id: 'test',  label: 'Test & UAT',          pct: 0.20, bar: 'bg-amber-500',  light: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200',  desc: 'System testing, UAT, defect resolution' },
  { id: 'live',  label: 'Go-Live & Hypercare', pct: 0.10, bar: 'bg-green-500',  light: 'bg-green-50',   text: 'text-green-700',   border: 'border-green-200',  desc: 'Cutover, go-live support, hypercare period' },
]

const BAR_COLORS = ['bg-indigo-500', 'bg-violet-500', 'bg-amber-500', 'bg-green-500']
const LABEL_COLORS = ['text-indigo-700', 'text-violet-700', 'text-amber-700', 'text-green-700']

function getPhaseIndex(week: number, phaseWeeks: number[]): number {
  let cum = 0
  for (let i = 0; i < phaseWeeks.length; i++) {
    cum += phaseWeeks[i]
    if (week <= cum) return i
  }
  return phaseWeeks.length - 1
}

export default function TimelineTab() {
  const { getActive, updateField } = useEstimatorStore()
  const est = getActive()
  if (!est) return null

  const totals = calcTotals(est)
  const phaseWeeks = PHASES.map(p => Math.max(1, Math.round(totals.calendarWeeks * p.pct)))
  const totalWeeks = phaseWeeks.reduce((a, b) => a + b, 0)
  const sprintCount = Math.ceil(totalWeeks / est.sprintWeeks)
  const avgHeadcount = totalWeeks > 0 ? Math.ceil(totals.baseDays / (totalWeeks * est.workingDaysPerWeek)) : 1

  // Gantt rows — one per work stream, spread across phases proportionally
  const ganttRows = est.streams.map(stream => {
    const days = Object.values(stream.efforts).reduce((a, b) => a + (b ?? 0), 0)
    if (days === 0) return null
    const streamWeeks = Math.max(1, Math.round((days / Math.max(totals.baseDays, 1)) * totalWeeks))
    // Align stream to most likely phase based on stream name heuristic
    const name = stream.name.toLowerCase()
    let phaseStart = 0
    if (name.includes('ba') || name.includes('require') || name.includes('design') || name.includes('discovery') || name.includes('arch')) {
      phaseStart = 0
    } else if (name.includes('test') || name.includes('qa') || name.includes('uat')) {
      phaseStart = phaseWeeks[0] + phaseWeeks[1]
    } else if (name.includes('pm') || name.includes('change') || name.includes('train') || name.includes('handover')) {
      phaseStart = 0 // PM spans full project
    } else if (name.includes('devops') || name.includes('infra') || name.includes('deploy')) {
      phaseStart = phaseWeeks[0]
    } else {
      phaseStart = phaseWeeks[0] // default: starts after discovery
    }

    // PM and DM span full project
    const isPM = name.includes('pm') || name.includes('programme') || name.includes('project management') || name.includes('change management')
    const startWeek = isPM ? 1 : phaseStart + 1
    const endWeek = isPM ? totalWeeks : Math.min(startWeek + streamWeeks - 1, totalWeeks)

    return { id: stream.id, name: stream.name, days, startWeek, endWeek }
  }).filter(Boolean) as { id: string; name: string; days: number; startWeek: number; endWeek: number }[]

  // Week column labels — show every 2nd week for readability
  const weekLabels = Array.from({ length: totalWeeks }, (_, i) => i + 1)
  const showEvery = totalWeeks <= 16 ? 1 : totalWeeks <= 32 ? 2 : 4

  return (
    <div className="space-y-6">

      {/* Settings row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Sprint length</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4].map(w => (
              <button key={w} onClick={() => updateField('sprintWeeks', w)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${est.sprintWeeks === w ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {w}w
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Working days/week</label>
          <div className="flex gap-2">
            {[4, 5].map(d => (
              <button key={d} onClick={() => updateField('workingDaysPerWeek', d)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${est.workingDaysPerWeek === d ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {d} days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total days',     value: String(totals.totalDays),  sub: `${totals.baseDays}d base + ${totals.contingencyDays}d buffer` },
          { label: 'Calendar weeks', value: String(totalWeeks),        sub: `~${Math.round(totalWeeks / 4.3)} months` },
          { label: 'Sprints',        value: String(sprintCount),       sub: `${est.sprintWeeks}-week sprints` },
          { label: 'Avg team size',  value: String(avgHeadcount),      sub: 'Concurrent headcount' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-slate-800">{card.value}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">{card.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Gantt chart */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gantt — delivery schedule</div>
          <span className="text-xs text-slate-400">{totalWeeks} weeks · {sprintCount} sprints</span>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(700, totalWeeks * 28 + 200) }}>

            {/* Phase header band */}
            <div className="flex" style={{ marginLeft: 200 }}>
              {PHASES.map((p, i) => (
                <div
                  key={p.id}
                  className={`${p.bar} text-white text-xs font-bold flex items-center justify-center py-2 border-r border-white/30`}
                  style={{ width: `${(phaseWeeks[i] / totalWeeks) * 100}%` }}
                >
                  {phaseWeeks[i]}w
                </div>
              ))}
            </div>

            {/* Week numbers header */}
            <div className="flex border-b border-slate-100 bg-slate-50">
              <div className="shrink-0 w-50 px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider" style={{ width: 200 }}>Work stream</div>
              <div className="flex flex-1">
                {weekLabels.map(w => (
                  <div
                    key={w}
                    className="text-center text-xs text-slate-400 py-2 border-r border-slate-100"
                    style={{ width: `${100 / totalWeeks}%` }}
                  >
                    {w % showEvery === 0 ? `W${w}` : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Phase colour guide row */}
            <div className="flex border-b-2 border-slate-200">
              <div style={{ width: 200 }} />
              <div className="flex flex-1 relative">
                {PHASES.map((p, i) => {
                  const startPct = phaseWeeks.slice(0, i).reduce((a, b) => a + b, 0) / totalWeeks * 100
                  return (
                    <div
                      key={p.id}
                      className={`absolute top-0 bottom-0 opacity-10 ${p.bar}`}
                      style={{ left: `${startPct}%`, width: `${(phaseWeeks[i] / totalWeeks) * 100}%` }}
                    />
                  )
                })}
                {weekLabels.map(w => {
                  const phaseIdx = getPhaseIndex(w, phaseWeeks)
                  const isSprintEnd = w % est.sprintWeeks === 0
                  return (
                    <div
                      key={w}
                      className={`relative py-1.5 border-r ${isSprintEnd ? 'border-slate-300' : 'border-slate-100'}`}
                      style={{ width: `${100 / totalWeeks}%` }}
                    >
                      {isSprintEnd && (
                        <div className={`text-center text-xs font-bold ${LABEL_COLORS[phaseIdx]} opacity-60`}>S{Math.ceil(w / est.sprintWeeks)}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Stream rows */}
            {ganttRows.map((row, rowIdx) => (
              <div key={row.id} className={`flex items-center border-b border-slate-100 ${rowIdx % 2 === 1 ? 'bg-slate-50/40' : ''}`} style={{ height: 36 }}>
                <div className="px-4 text-xs font-medium text-slate-700 truncate" style={{ width: 200 }}>
                  {row.name}
                </div>
                <div className="flex flex-1 relative" style={{ height: 36 }}>
                  {/* Phase background */}
                  {PHASES.map((p, i) => {
                    const startPct = phaseWeeks.slice(0, i).reduce((a, b) => a + b, 0) / totalWeeks * 100
                    return (
                      <div
                        key={p.id}
                        className={`absolute top-0 bottom-0 opacity-5 ${p.bar}`}
                        style={{ left: `${startPct}%`, width: `${(phaseWeeks[i] / totalWeeks) * 100}%` }}
                      />
                    )
                  })}
                  {/* Week grid lines */}
                  {weekLabels.map(w => (
                    <div
                      key={w}
                      className={`absolute top-0 bottom-0 border-r ${w % est.sprintWeeks === 0 ? 'border-slate-200' : 'border-slate-100'}`}
                      style={{ left: `${(w / totalWeeks) * 100}%` }}
                    />
                  ))}
                  {/* Activity bar */}
                  <div
                    className={`absolute top-2 bottom-2 rounded-md flex items-center px-2 ${BAR_COLORS[getPhaseIndex(row.startWeek, phaseWeeks)]}`}
                    style={{
                      left: `${((row.startWeek - 1) / totalWeeks) * 100}%`,
                      width: `${((row.endWeek - row.startWeek + 1) / totalWeeks) * 100}%`,
                      minWidth: 4,
                    }}
                    title={`${row.name}: W${row.startWeek}–W${row.endWeek} (${row.days}d)`}
                  >
                    <span className="text-white text-xs font-semibold truncate">{row.days}d</span>
                  </div>
                </div>
              </div>
            ))}

          </div>
        </div>

        {/* Phase legend */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-6 flex-wrap">
          {PHASES.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm ${p.bar}`} />
              <span className={`text-xs font-semibold ${p.text}`}>{p.label}</span>
              <span className="text-xs text-slate-400">{phaseWeeks[i]}w</span>
            </div>
          ))}
          <div className="ml-auto text-xs text-slate-400">Bars coloured by phase · Sprint boundaries marked · Scroll horizontally for long projects</div>
        </div>
      </div>

    </div>
  )
}
