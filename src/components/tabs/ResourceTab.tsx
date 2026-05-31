import { useEstimatorStore, calcTotals } from '../../store/estimatorStore'
import { ROLES } from '../../data/roles'
import type { RoleId, ResourcePlan } from '../../types'

// Phase-to-month role weight heuristics
const PHASE_ROLE_WEIGHT: Record<string, Partial<Record<RoleId, number>>> = {
  discovery: { SA: 1, BA: 1, UX: 0.5, PM: 0.5, DM: 0.5 },
  build:      { SD: 1, MD: 1, SA: 0.5, DO: 0.5, DE: 0.5, PM: 0.5, DM: 0.5 },
  test:       { QA: 1, BA: 0.5, SD: 0.25, PM: 0.5 },
  live:       { DO: 0.5, SA: 0.25, PM: 0.5, CM: 1, DM: 0.5 },
}

function autoGeneratePlan(
  effortByRole: Partial<Record<RoleId, number>>,
  totalMonths: number,
  workDaysPerMonth: number
): ResourcePlan {
  // Phase durations (as fraction of total months)
  const phases = [
    { key: 'discovery', pct: 0.20 },
    { key: 'build',     pct: 0.50 },
    { key: 'test',      pct: 0.20 },
    { key: 'live',      pct: 0.10 },
  ]

  const plan: ResourcePlan = {}
  for (let m = 0; m < totalMonths; m++) plan[m] = {}

  // Assign each role to months based on their phase weight
  for (const [role, totalDays] of Object.entries(effortByRole) as [RoleId, number][]) {
    if (!totalDays) continue
    let monthStart = 0
    for (const phase of phases) {
      const phaseMonths = Math.max(1, Math.round(totalMonths * phase.pct))
      const weight = PHASE_ROLE_WEIGHT[phase.key]?.[role] ?? 0
      if (weight === 0) { monthStart += phaseMonths; continue }

      // Headcount = days available in this phase / working days per month / phase months
      const daysInPhase = totalDays * weight * (phase.pct)
      const headcount = daysInPhase / workDaysPerMonth / phaseMonths

      for (let m = monthStart; m < Math.min(monthStart + phaseMonths, totalMonths); m++) {
        if (!plan[m]) plan[m] = {}
        plan[m][role] = Math.max(plan[m][role] ?? 0, Math.round(headcount * 10) / 10)
      }
      monthStart += phaseMonths
    }
  }
  return plan
}

export default function ResourceTab() {
  const { getActive, updateField } = useEstimatorStore()
  const est = getActive()
  if (!est) return null

  const totals = calcTotals(est)
  const months = est.projectMonths ?? 6
  const workDaysPerMonth = (est.workingDaysPerWeek ?? 5) * 4.3

  const plan: ResourcePlan = est.resourcePlan ?? autoGeneratePlan(totals.effortByRole, months, workDaysPerMonth)
  const monthLabels = Array.from({ length: months }, (_, i) => `M${i + 1}`)

  // Roles that appear in the plan or have effort
  const activeRoles = [
    ...new Set([
      ...est.activeRoles,
      ...Object.values(plan).flatMap(m => Object.keys(m) as RoleId[]),
    ])
  ].filter(r => totals.effortByRole[r] || Object.values(plan).some(m => (m[r] ?? 0) > 0))

  const setCell = (month: number, role: RoleId, val: number) => {
    const next = { ...plan, [month]: { ...(plan[month] ?? {}), [role]: val > 0 ? val : undefined } }
    updateField('resourcePlan', next)
  }

  const resetPlan = () => {
    updateField('resourcePlan', autoGeneratePlan(totals.effortByRole, months, workDaysPerMonth) as ResourcePlan)
  }

  // FTE total per month
  const monthTotal = (m: number) =>
    activeRoles.reduce((sum, r) => sum + (plan[m]?.[r] ?? 0), 0)

  // Peak month
  const peak = Math.max(...Array.from({ length: months }, (_, m) => monthTotal(m)))

  return (
    <div className="space-y-5">

      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-slate-800">Resource loading plan</div>
          <div className="text-xs text-slate-400 mt-0.5">Headcount per role per month. Auto-generated from effort distribution — edit any cell to override.</div>
        </div>
        <button onClick={resetPlan} className="text-xs text-slate-400 hover:text-indigo-600 px-3 py-1.5 border border-slate-200 rounded-lg transition-colors">
          ↺ Re-generate
        </button>
      </div>

      {/* Matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase w-36">Role</th>
                {monthLabels.map(m => (
                  <th key={m} className="px-2 py-2.5 text-center text-xs font-semibold text-slate-400 uppercase w-14">{m}</th>
                ))}
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-400 uppercase w-14">Total<br/>days</th>
              </tr>
            </thead>
            <tbody>
              {activeRoles.map(role => {
                const totalDays = totals.effortByRole[role] ?? 0
                return (
                  <tr key={role} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2">
                      <div className="text-xs font-bold text-slate-700">{role}</div>
                      <div className="text-xs text-slate-400">{ROLES[role]?.name}</div>
                    </td>
                    {Array.from({ length: months }, (_, m) => {
                      const v = plan[m]?.[role] ?? 0
                      return (
                        <td key={m} className="px-1 py-1.5 text-center">
                          <input
                            type="number" min={0} max={20} step={0.5}
                            value={v || ''}
                            placeholder="—"
                            onChange={e => setCell(m, role, parseFloat(e.target.value) || 0)}
                            className={`w-12 text-center text-xs rounded py-1 border focus:outline-none focus:border-indigo-400 ${
                              v > 0 ? 'bg-indigo-50 border-indigo-200 font-semibold text-indigo-700' : 'bg-transparent border-transparent text-slate-300 placeholder:text-slate-200'
                            }`}
                          />
                        </td>
                      )
                    })}
                    <td className="px-4 py-2 text-center">
                      <span className={`text-xs font-black ${totalDays > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                        {totalDays > 0 ? `${Math.round(totalDays)}d` : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-4 py-2.5 text-xs font-bold text-slate-500 uppercase">Total FTE</td>
                {Array.from({ length: months }, (_, m) => {
                  const t = monthTotal(m)
                  const intensity = peak > 0 ? t / peak : 0
                  return (
                    <td key={m} className="px-1 py-2 text-center">
                      <div className={`text-xs font-black rounded-md py-1 ${
                        intensity > 0.8 ? 'bg-indigo-600 text-white' :
                        intensity > 0.4 ? 'bg-indigo-100 text-indigo-700' :
                        t > 0 ? 'text-slate-500' : 'text-slate-300'
                      }`}>
                        {t > 0 ? t.toFixed(1) : '—'}
                      </div>
                    </td>
                  )
                })}
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* FTE ramp chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Headcount ramp</div>
        <div className="flex items-end gap-2 h-20">
          {Array.from({ length: months }, (_, m) => {
            const t = monthTotal(m)
            const heightPct = peak > 0 ? (t / peak) * 100 : 0
            return (
              <div key={m} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs text-slate-500 font-semibold">{t > 0 ? t.toFixed(1) : ''}</div>
                <div
                  className="w-full rounded-t-md bg-indigo-500 transition-all"
                  style={{ height: `${Math.max(heightPct, t > 0 ? 8 : 0)}%`, opacity: 0.7 + (heightPct / 100) * 0.3 }}
                />
                <div className="text-xs text-slate-400">M{m + 1}</div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
