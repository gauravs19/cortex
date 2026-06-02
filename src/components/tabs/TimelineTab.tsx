import { useState } from 'react'
import { Gantt, ViewMode } from 'gantt-task-react'
import type { Task } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'
import { useSettingsStore } from '../../store/settingsStore'
import { ROLES } from '../../data/roles'
import type { RoleId } from '../../types'

// ── Phase meta — colour/label only; split % come from settings ─

const PHASE_META = [
  { id: 'disc',   key: 'discovery' as const, label: 'Discovery',      color: '#6366f1', light: 'bg-indigo-50',  text: 'text-indigo-700',  bar: 'bg-indigo-500' },
  { id: 'design', key: 'design'    as const, label: 'Design',         color: '#3b82f6', light: 'bg-blue-50',    text: 'text-blue-700',    bar: 'bg-blue-500' },
  { id: 'build',  key: 'build'     as const, label: 'Implementation', color: '#8b5cf6', light: 'bg-violet-50',  text: 'text-violet-700',  bar: 'bg-violet-500' },
  { id: 'qa',     key: 'qa'        as const, label: 'QA / Testing',   color: '#f59e0b', light: 'bg-amber-50',   text: 'text-amber-700',   bar: 'bg-amber-500' },
  { id: 'uat',    key: 'uat'        as const, label: 'UAT',           color: '#f97316', light: 'bg-orange-50',  text: 'text-orange-700',  bar: 'bg-orange-500' },
  { id: 'live',   key: 'golive'    as const, label: 'Go-Live',        color: '#22c55e', light: 'bg-green-50',   text: 'text-green-700',   bar: 'bg-green-500' },
  { id: 'hyper',  key: 'hypercare' as const, label: 'Hypercare',      color: '#14b8a6', light: 'bg-teal-50',    text: 'text-teal-700',    bar: 'bg-teal-500' },
]

function streamPhaseIndex(name: string): number {
  const n = name.toLowerCase()
  if (n.includes('discover') || n.includes('research') || n.includes('workshop') || n.includes('spike')) return 0
  if (n.includes('design') || n.includes('ux') || n.includes('arch')) return 1
  if (n.includes('qa') || (n.includes('test') && !n.includes('uat'))) return 3
  if (n.includes('uat')) return 4
  if (n.includes('go-live') || n.includes('cutover')) return 5
  if (n.includes('hypercare') || n.includes('hyper')) return 6
  if (n.includes('pm') || n.includes('programme') || n.includes('delivery manag')) return 2
  if (n.includes('change manag') || n.includes('training')) return 4
  if (n.includes('devops') || n.includes('infra')) return 2
  return 2
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ── Custom tooltip ────────────────────────────────────────────

type RichTask = Task & { _days?: number; _roles?: string }

function CustomTooltip({ task }: { task: Task; fontSize: string; fontFamily: string }) {
  const t = task as RichTask
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', fontSize: 12 }}
      className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 max-w-56 pointer-events-none">
      <div className="font-bold text-slate-900 mb-1">{t.name}</div>
      <div className="text-slate-500">{fmtDate(t.start)} → {fmtDate(t.end)}</div>
      {(t._days ?? 0) > 0 && (
        <div className="mt-1.5 font-semibold text-indigo-700">{t._days}d effort</div>
      )}
      {t._roles && (
        <div className="mt-1 text-slate-500 leading-relaxed">{t._roles}</div>
      )}
    </div>
  )
}

// ── Custom task list ──────────────────────────────────────────

function CustomTaskListHeader({ headerHeight, rowWidth }: {
  headerHeight: number; rowWidth: string; fontFamily: string; fontSize: string
}) {
  return (
    <div style={{ height: headerHeight, width: rowWidth }}
      className="flex items-end px-3 pb-2 border-b border-r border-slate-200 bg-slate-50">
      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Work stream</span>
    </div>
  )
}

function CustomTaskListTable({ tasks, rowHeight, rowWidth, onExpanderClick }: {
  tasks: Task[]; rowHeight: number; rowWidth: string; fontFamily: string; fontSize: string
  locale: string; selectedTaskId: string; setSelectedTask: (id: string) => void
  onExpanderClick: (task: Task) => void
}) {
  return (
    <div className="border-r border-slate-200">
      {tasks.map(t => {
        const rt = t as RichTask
        const isProject = t.type === 'project'
        return (
          <div key={t.id} style={{ height: rowHeight, width: rowWidth }}
            className={`flex items-center px-3 border-b border-slate-100 ${isProject ? 'bg-slate-50' : 'bg-white'}`}>
            {isProject ? (
              <button onClick={() => onExpanderClick(t)} className="flex items-center gap-1.5 w-full text-left">
                <span className="text-slate-400 text-xs">{t.hideChildren ? '▶' : '▼'}</span>
                <span className="font-bold text-slate-800 text-xs truncate">{t.name}</span>
              </button>
            ) : (
              <div className="flex items-center justify-between w-full gap-2">
                <span className="text-xs text-slate-700 truncate pl-4">{t.name}</span>
                {(rt._days ?? 0) > 0 && (
                  <span className="text-xs font-semibold text-indigo-600 shrink-0">{rt._days}d</span>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function TimelineTab() {
  const { getActive, updateField } = useEstimatorStore()
  const est = getActive()
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week)
  const [hiddenPhases, setHiddenPhases] = useState<Record<string, boolean>>({})

  const { phaseSplits } = useSettingsStore(s => s.settings)
  const splits = phaseSplits ?? { discovery: 10, design: 10, build: 45, qa: 15, uat: 10, golive: 5, hypercare: 5 }
  // Build PHASES with current split % from settings
  const PHASES = PHASE_META.map(p => ({ ...p, pct: (splits[p.key] ?? 10) / 100 }))

  if (!est) return null

  const startDate = est.startDate ?? new Date().toISOString().slice(0, 10)
  const baseDate = new Date(startDate)
  const totals = calcTotals(est)
  const totalWeeks = totals.calendarWeeks || 1

  // Phase week allocations
  const rawWeeks = PHASES.map(p => Math.max(1, Math.round(totalWeeks * p.pct)))
  const rawSum = rawWeeks.reduce((a, b) => a + b, 0)
  const scale = totalWeeks / rawSum
  const normWeeks = rawWeeks.map(w => Math.max(1, Math.round(w * scale)))

  // Phase date ranges
  let wOffset = 0
  const phaseRanges = normWeeks.map(w => {
    const start = addDays(baseDate, wOffset * 7)
    const end = addDays(baseDate, (wOffset + w) * 7 - 1)
    wOffset += w
    return { start, end, weeks: w }
  })

  const projectEnd = phaseRanges[phaseRanges.length - 1].end
  const avgHeadcount = Math.ceil(totals.baseDays / Math.max(totalWeeks * est.workingDaysPerWeek, 1)) || 1
  const sprintCount = Math.ceil(totalWeeks / est.sprintWeeks)

  // Build gantt task list
  const tasks: RichTask[] = []

  PHASES.forEach((phase, i) => {
    const { start, end } = phaseRanges[i]
    tasks.push({
      id: phase.id,
      name: phase.label,
      type: 'project',
      start,
      end,
      progress: 0,
      isDisabled: true,
      hideChildren: hiddenPhases[phase.id] ?? false,
      styles: {
        backgroundColor: phase.color + '20',
        backgroundSelectedColor: phase.color + '35',
        progressColor: phase.color,
        progressSelectedColor: phase.color,
      },
    })
  })

  for (const stream of est.streams) {
    if (stream.costType === 'opex') continue
    const days = Object.values(stream.efforts).reduce((a, b) => a + (b ?? 0), 0)
    if (days === 0) continue

    const phaseIdx = streamPhaseIndex(stream.name)
    const { start: phaseStart, end: phaseEnd } = phaseRanges[phaseIdx]

    const phaseDays = normWeeks[phaseIdx] * est.workingDaysPerWeek
    const durDays = Math.max(1, Math.round((days / Math.max(totals.baseDays, 1)) * phaseDays * 1.5))
    const end = new Date(Math.min(addDays(phaseStart, durDays).getTime(), phaseEnd.getTime()))

    const topRoles = (Object.entries(stream.efforts) as [RoleId, number][])
      .filter(([, d]) => d > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([r, d]) => `${ROLES[r]?.name ?? r}: ${d}d`)
      .join(' · ')

    const phase = PHASES[phaseIdx]
    tasks.push({
      id: stream.id,
      name: stream.name,
      type: 'task',
      project: phase.id,
      start: phaseStart,
      end,
      progress: 0,
      isDisabled: true,
      styles: {
        backgroundColor: phase.color + 'bb',
        backgroundSelectedColor: phase.color,
        progressColor: phase.color,
        progressSelectedColor: phase.color,
      },
      _days: days,
      _roles: topRoles,
    })
  }

  // Sprint milestones
  for (let s = 1; s <= sprintCount; s++) {
    const ms = addDays(baseDate, s * est.sprintWeeks * 7)
    if (ms > projectEnd) break
    tasks.push({
      id: `sprint-${s}`,
      name: `S${s}`,
      type: 'milestone',
      start: ms,
      end: ms,
      progress: 0,
      isDisabled: true,
      styles: {
        backgroundColor: '#94a3b8',
        backgroundSelectedColor: '#64748b',
        progressColor: '#94a3b8',
        progressSelectedColor: '#64748b',
      },
    })
  }

  const handleExpanderClick = (task: Task) => {
    setHiddenPhases(prev => ({ ...prev, [task.id]: !(prev[task.id] ?? false) }))
  }

  const hasData = tasks.filter(t => t.type === 'task').length > 0

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
          <div className="text-xs text-slate-400 mt-1.5">End: {fmtDate(projectEnd)}</div>
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
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Working days / week</label>
          <div className="flex gap-2">
            {[4, 5].map(d => (
              <button key={d} onClick={() => updateField('workingDaysPerWeek', d)}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${est.workingDaysPerWeek === d ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total days',     value: String(totals.totalDays),  sub: `${totals.baseDays}d + ${totals.contingencyDays}d buffer` },
          { label: 'Calendar weeks', value: String(totalWeeks),        sub: `~${Math.round(totalWeeks / 4.3)} months · ends ${fmtDate(projectEnd)}` },
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

      {/* Phase overview bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Sequential delivery phases</div>
        <div className="flex rounded-lg overflow-hidden h-10 mb-4">
          {PHASES.map((p, i) => (
            <div key={p.id}
              className={`${p.bar} flex items-center justify-center text-white text-xs font-bold border-r border-white/30 last:border-0`}
              style={{ width: `${(normWeeks[i] / totalWeeks) * 100}%` }}
              title={`${p.label}: ${normWeeks[i]}w`}>
              <span className="truncate px-1">{normWeeks[i]}w</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {PHASES.map((p, i) => (
            <div key={p.id} className={`rounded-lg p-2.5 ${p.light}`}>
              <div className={`text-xs font-bold ${p.text}`}>{p.label}</div>
              <div className="text-xs text-slate-500 mt-0.5">{normWeeks[i]}w</div>
              <div className="text-xs text-slate-400 mt-0.5">{fmtDate(phaseRanges[i].start)}</div>
              <div className="text-xs text-slate-400">→ {fmtDate(phaseRanges[i].end)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt chart */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Gantt — stream schedule
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{sprintCount} sprints · phases sequential</span>
            <div className="flex gap-1">
              {([ViewMode.Week, ViewMode.Month] as ViewMode[]).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${viewMode === m ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>

        {hasData ? (
          <Gantt
            tasks={tasks}
            viewMode={viewMode}
            viewDate={baseDate}
            locale="en-GB"
            rowHeight={40}
            headerHeight={50}
            columnWidth={viewMode === ViewMode.Week ? 65 : 220}
            listCellWidth="240px"
            barFill={75}
            barCornerRadius={4}
            fontSize="12px"
            fontFamily="system-ui, -apple-system, sans-serif"
            todayColor="rgba(99,102,241,0.10)"
            ganttHeight={Math.min(tasks.length * 40 + 70, 580)}
            TooltipContent={CustomTooltip}
            TaskListTable={CustomTaskListTable}
            TaskListHeader={CustomTaskListHeader}
            onExpanderClick={handleExpanderClick}
          />
        ) : (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            No streams with effort — add line items or fill the stream matrix first.
          </div>
        )}
      </div>
    </div>
  )
}
