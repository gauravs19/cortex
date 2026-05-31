import { } from 'react'
import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'

// 7 sequential phases — each starts when the previous ends
const DEFAULT_PHASES = [
  { id: 'disc',  label: 'Discovery',      defaultPct: 0.10, bar: 'bg-indigo-500',  light: 'bg-indigo-50',  text: 'text-indigo-700',  desc: 'Requirements, stakeholder interviews, scope baseline' },
  { id: 'design',label: 'Design',         defaultPct: 0.10, bar: 'bg-blue-500',    light: 'bg-blue-50',    text: 'text-blue-700',    desc: 'Architecture, UX design, technical design docs' },
  { id: 'build', label: 'Implementation', defaultPct: 0.45, bar: 'bg-violet-500',  light: 'bg-violet-50',  text: 'text-violet-700',  desc: 'Development, integration, DevOps setup' },
  { id: 'qa',    label: 'QA / Testing',   defaultPct: 0.15, bar: 'bg-amber-500',   light: 'bg-amber-50',   text: 'text-amber-700',   desc: 'System testing, regression, defect resolution' },
  { id: 'uat',   label: 'UAT',            defaultPct: 0.10, bar: 'bg-orange-500',  light: 'bg-orange-50',  text: 'text-orange-700',  desc: 'User acceptance testing, stakeholder sign-off' },
  { id: 'live',  label: 'Go-Live',        defaultPct: 0.05, bar: 'bg-green-500',   light: 'bg-green-50',   text: 'text-green-700',   desc: 'Cutover, production deployment, go-live support' },
  { id: 'hyper', label: 'Hypercare',      defaultPct: 0.05, bar: 'bg-teal-500',    light: 'bg-teal-50',    text: 'text-teal-700',    desc: 'Post-launch stabilisation, critical bug resolution' },
]

const BAR_COLORS = DEFAULT_PHASES.map(p => p.bar)
const LABEL_COLORS = DEFAULT_PHASES.map(p => p.text)

// Map stream category / name → phase index
function streamPhaseIndex(name: string): number {
  const n = name.toLowerCase()
  if (n.includes('discover') || n.includes('research') || n.includes('workshop') || n.includes('spike')) return 0
  if (n.includes('design') || n.includes('ux') || n.includes('arch')) return 1
  if (n.includes('qa') || n.includes('test') && !n.includes('uat')) return 3
  if (n.includes('uat')) return 4
  if (n.includes('go-live') || n.includes('cutover')) return 5
  if (n.includes('hypercare') || n.includes('hyper')) return 6
  if (n.includes('pm') || n.includes('programme') || n.includes('delivery manag')) return -1 // full span
  if (n.includes('change manag') || n.includes('training')) return 4
  if (n.includes('devops') || n.includes('infra')) return 2
  return 2 // default: build phase
}

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + weeks * 7)
  return d.toISOString().slice(0, 10)
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function getPhaseIndex(week: number, cumWeeks: number[]): number {
  for (let i = 0; i < cumWeeks.length; i++) {
    if (week <= cumWeeks[i]) return i
  }
  return cumWeeks.length - 1
}

export default function TimelineTab() {
  const { getActive, updateField } = useEstimatorStore()
  const est = getActive()

  if (!est) return null

  const startDate = est.startDate ?? new Date().toISOString().slice(0, 10)
  const totals = calcTotals(est)

  // Phase weeks — sequential, no overlap
  const phaseWeeks = DEFAULT_PHASES.map(p => Math.max(1, Math.round(totals.calendarWeeks * p.defaultPct)))
  // Normalise so they sum to calendarWeeks
  const rawSum = phaseWeeks.reduce((a, b) => a + b, 0)
  const scale = totals.calendarWeeks > 0 ? totals.calendarWeeks / rawSum : 1
  const normPhaseWeeks = phaseWeeks.map(w => Math.max(1, Math.round(w * scale)))
  const totalWeeks = normPhaseWeeks.reduce((a, b) => a + b, 0)

  // Cumulative end week per phase (1-indexed)
  const cumWeeks: number[] = []
  let cum = 0
  for (const w of normPhaseWeeks) { cum += w; cumWeeks.push(cum) }

  // Phase start weeks (1-indexed)
  const phaseStartWeeks = [1, ...cumWeeks.slice(0, -1).map(c => c + 1)]

  const sprintCount = Math.ceil(totalWeeks / est.sprintWeeks)
  const avgHeadcount = totalWeeks > 0 ? Math.ceil(totals.baseDays / (totalWeeks * est.workingDaysPerWeek)) : 1
  const weekLabels = Array.from({ length: totalWeeks }, (_, i) => i + 1)
  const showEvery = totalWeeks <= 16 ? 1 : totalWeeks <= 28 ? 2 : 4

  // Gantt rows per stream
  const ganttRows = est.streams.map(stream => {
    const days = Object.values(stream.efforts).reduce((a, b) => a + (b ?? 0), 0)
    if (days === 0) return null
    const phaseIdx = streamPhaseIndex(stream.name)
    const isFullSpan = phaseIdx === -1

    if (isFullSpan) {
      return { id: stream.id, name: stream.name, days, startWeek: 1, endWeek: totalWeeks, phaseIdx: 0 }
    }

    const phaseStartW = phaseStartWeeks[phaseIdx]
    const phaseEndW = cumWeeks[phaseIdx]
    const streamWeeks = Math.max(1, Math.round((days / Math.max(totals.baseDays, 1)) * totalWeeks))
    const startWeek = phaseStartW
    const endWeek = Math.min(phaseStartW + streamWeeks - 1, phaseEndW)
    return { id: stream.id, name: stream.name, days, startWeek, endWeek, phaseIdx }
  }).filter(Boolean) as { id: string; name: string; days: number; startWeek: number; endWeek: number; phaseIdx: number }[]

  return (
    <div className="space-y-6">

      {/* Settings row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Project start date</label>
          <input
            type="date"
            value={startDate}
            onChange={e => updateField('startDate', e.target.value)}
            className="w-full text-sm font-semibold text-slate-700 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
          />
          <div className="text-xs text-slate-400 mt-1.5">End: {fmtDate(addWeeks(startDate, totalWeeks))}</div>
        </div>
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
          { label: 'Total days',     value: String(totals.totalDays),  sub: `${totals.baseDays}d + ${totals.contingencyDays}d buffer` },
          { label: 'Calendar weeks', value: String(totalWeeks),        sub: `~${Math.round(totalWeeks / 4.3)} months · ${fmtDate(addWeeks(startDate, totalWeeks))}` },
          { label: 'Sprints',        value: String(sprintCount),       sub: `${est.sprintWeeks}-week sprints` },
          { label: 'Avg team size',  value: String(avgHeadcount),      sub: 'FTE concurrent' },
        ].map(card => (
          <div key={card.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-black text-slate-800">{card.value}</div>
            <div className="text-xs font-semibold text-slate-500 mt-1">{card.label}</div>
            <div className="text-xs text-slate-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Sequential phase timeline */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Sequential delivery phases</div>
        {/* Phase bar — sequential, no overlap */}
        <div className="flex rounded-lg overflow-hidden h-10 mb-5">
          {DEFAULT_PHASES.map((p, i) => (
            <div
              key={p.id}
              className={`${p.bar} flex items-center justify-center text-white text-xs font-bold transition-all border-r border-white/30 last:border-0`}
              style={{ width: `${(normPhaseWeeks[i] / totalWeeks) * 100}%` }}
              title={`${p.label}: W${phaseStartWeeks[i]}–W${cumWeeks[i]} (${normPhaseWeeks[i]}w)`}
            >
              <span className="truncate px-1">{normPhaseWeeks[i]}w</span>
            </div>
          ))}
        </div>
        {/* Phase details row */}
        <div className="grid grid-cols-7 gap-2">
          {DEFAULT_PHASES.map((p, i) => (
            <div key={p.id} className={`rounded-lg p-2.5 ${p.light}`}>
              <div className={`text-xs font-bold ${p.text}`}>{p.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{normPhaseWeeks[i]}w</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {fmtDate(addWeeks(startDate, phaseStartWeeks[i] - 1))} →
              </div>
              <div className="text-xs text-slate-400">{fmtDate(addWeeks(startDate, cumWeeks[i]))}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt chart */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gantt — stream schedule</div>
          <span className="text-xs text-slate-400">{totalWeeks} weeks · {sprintCount} sprints · phases sequential</span>
        </div>

        <div className="overflow-x-auto">
          <div style={{ minWidth: Math.max(700, totalWeeks * 28 + 200) }}>

            {/* Phase header band */}
            <div className="flex" style={{ marginLeft: 200 }}>
              {DEFAULT_PHASES.map((p, i) => (
                <div
                  key={p.id}
                  className={`${p.bar} text-white text-xs font-bold flex items-center justify-center py-2 border-r border-white/30`}
                  style={{ width: `${(normPhaseWeeks[i] / totalWeeks) * 100}%` }}
                >
                  {p.label}
                </div>
              ))}
            </div>

            {/* Week header */}
            <div className="flex border-b border-slate-100 bg-slate-50">
              <div style={{ width: 200 }} className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase shrink-0">Work stream</div>
              <div className="flex flex-1">
                {weekLabels.map(w => (
                  <div key={w} className="text-center text-xs text-slate-400 py-2 border-r border-slate-100" style={{ width: `${100 / totalWeeks}%` }}>
                    {w % showEvery === 0 ? `W${w}` : ''}
                  </div>
                ))}
              </div>
            </div>

            {/* Phase boundary guide */}
            <div className="flex border-b-2 border-slate-200">
              <div style={{ width: 200 }} />
              <div className="flex flex-1 relative">
                {DEFAULT_PHASES.map((p, i) => {
                  const startPct = (phaseStartWeeks[i] - 1) / totalWeeks * 100
                  return (
                    <div key={p.id} className={`absolute top-0 bottom-0 opacity-10 ${p.bar}`}
                      style={{ left: `${startPct}%`, width: `${(normPhaseWeeks[i] / totalWeeks) * 100}%` }} />
                  )
                })}
                {weekLabels.map(w => {
                  const phaseIdx = getPhaseIndex(w, cumWeeks)
                  const isSprintEnd = w % est.sprintWeeks === 0
                  return (
                    <div key={w} className={`relative py-1.5 border-r ${isSprintEnd ? 'border-slate-300' : 'border-slate-100'}`}
                      style={{ width: `${100 / totalWeeks}%` }}>
                      {isSprintEnd && (
                        <div className={`text-center text-xs font-bold ${LABEL_COLORS[phaseIdx]} opacity-60`}>
                          S{Math.ceil(w / est.sprintWeeks)}
                        </div>
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
                  {DEFAULT_PHASES.map((p, i) => (
                    <div key={p.id} className={`absolute top-0 bottom-0 opacity-5 ${p.bar}`}
                      style={{ left: `${(phaseStartWeeks[i] - 1) / totalWeeks * 100}%`, width: `${(normPhaseWeeks[i] / totalWeeks) * 100}%` }} />
                  ))}
                  {weekLabels.map(w => (
                    <div key={w} className={`absolute top-0 bottom-0 border-r ${w % est.sprintWeeks === 0 ? 'border-slate-200' : 'border-slate-100/50'}`}
                      style={{ left: `${(w / totalWeeks) * 100}%` }} />
                  ))}
                  <div
                    className={`absolute top-2 bottom-2 rounded-md flex items-center px-2 opacity-90 ${BAR_COLORS[Math.min(row.phaseIdx, BAR_COLORS.length - 1)]}`}
                    style={{
                      left: `${((row.startWeek - 1) / totalWeeks) * 100}%`,
                      width: `${Math.max(((row.endWeek - row.startWeek + 1) / totalWeeks) * 100, 1)}%`,
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

        {/* Legend */}
        <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-4">
          {DEFAULT_PHASES.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-sm ${p.bar}`} />
              <span className={`text-xs font-semibold ${p.text}`}>{p.label}</span>
              <span className="text-xs text-slate-400">{normPhaseWeeks[i]}w · {fmtDate(addWeeks(startDate, phaseStartWeeks[i] - 1))}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
