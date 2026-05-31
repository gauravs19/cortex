import { useState } from 'react'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { useEstimatorStore } from '../../store/estimatorStore'
import { ROLES, CATEGORY_LABELS } from '../../data/roles'
import StreamConfigWizard from '../estimator/StreamConfigWizard'
import type { RoleId, StreamCategory } from '../../types'

const CATEGORY_ORDER: StreamCategory[] = [
  'discovery', 'design', 'frontend', 'backend', 'data', 'infra', 'devops', 'security', 'qa', 'pm', 'change'
]

export default function StreamsTab() {
  const { getActive, setEffort, setStreamMonthlyRate, addStream, removeStream, renameStream, toggleRole, setStreams, updateField } = useEstimatorStore()
  const est = getActive()
  const [newStreamName, setNewStreamName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showWizard, setShowWizard] = useState(false)

  if (!est) return null

  const roles = est.activeRoles
  const allRoles = Object.keys(ROLES) as RoleId[]

  const capexStreams = est.streams.filter(s => s.costType === 'capex')
  const opexStreams  = est.streams.filter(s => s.costType === 'opex')

  // Group capex streams by category
  const grouped = CATEGORY_ORDER.reduce<Record<string, typeof capexStreams>>((acc, cat) => {
    const g = capexStreams.filter(s => s.category === cat)
    if (g.length) acc[cat] = g
    return acc
  }, {})

  const streamTotal = (id: string) => {
    const st = est.streams.find(s => s.id === id)
    return st ? Object.values(st.efforts).reduce((a, b) => a + (b ?? 0), 0) : 0
  }

  const roleTotal = (role: RoleId) =>
    capexStreams.reduce((sum, s) => sum + (s.efforts[role] ?? 0), 0)

  const grandTotal = capexStreams.reduce((sum, s) =>
    sum + Object.values(s.efforts).reduce((a, b) => a + (b ?? 0), 0), 0)

  const sym = est.currency === 'GBP' ? '£' : est.currency === 'USD' ? '$' : est.currency === 'EUR' ? '€' : '₹'
  const mult = est.currency === 'GBP' ? 1 : est.currency === 'USD' ? 1.27 : est.currency === 'EUR' ? 1.17 : 105
  const totalMonthlyOpex = opexStreams.reduce((sum, s) => sum + ((s.monthlyRate ?? 0) * mult), 0)

  return (
    <div className="space-y-5">
      {showWizard && (
        <StreamConfigWizard
          initialConfig={est.streamConfig}
          workType={est.workType}
          onWorkTypeChange={wt => updateField('workType', wt)}
          onApply={(streams, config, roles) => {
            setStreams(streams, config, roles)
            setShowWizard(false)
          }}
          onClose={() => setShowWizard(false)}
        />
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWizard(!showWizard)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Wand2 size={13} /> {showWizard ? 'Close configurator' : 'Reconfigure streams'}
          </button>
          <span className="text-xs text-slate-400">or edit the matrix below directly</span>
        </div>
        <div className="text-xs text-slate-400">{capexStreams.length} CapEx · {opexStreams.length} OpEx streams</div>
      </div>

      {/* Role selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active roles in matrix</div>
        <div className="flex flex-wrap gap-1.5">
          {allRoles.map(r => (
            <button
              key={r}
              onClick={() => toggleRole(r)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                roles.includes(r) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {r} <span className="font-normal opacity-60 hidden sm:inline">· {ROLES[r].name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* CapEx matrix — grouped by category */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="text-xs font-bold text-slate-800">CapEx streams <span className="font-normal text-slate-400">— one-time project effort (days)</span></div>
          <div className="text-xs font-black text-indigo-600">{grandTotal}d total</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 560 }}>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-52">Stream</th>
                {roles.map(r => (
                  <th key={r} className="px-2 py-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider w-14" title={ROLES[r]?.name}>{r}</th>
                ))}
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-400 w-14">Days</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([cat, streams]) => (
                <>
                  <tr key={`cat-${cat}`} className="bg-slate-50/80 border-b border-t border-slate-100">
                    <td colSpan={roles.length + 3} className="px-4 py-1.5">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{CATEGORY_LABELS[cat] ?? cat}</span>
                    </td>
                  </tr>
                  {streams.map((stream, i) => (
                    <tr key={stream.id} className={`border-b border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-4 py-2">
                        {editingId === stream.id ? (
                          <input
                            autoFocus
                            className="w-full text-xs font-medium text-slate-800 border-b border-indigo-400 outline-none bg-transparent"
                            value={stream.name}
                            onChange={e => renameStream(stream.id, e.target.value)}
                            onBlur={() => setEditingId(null)}
                            onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                          />
                        ) : (
                          <button onClick={() => setEditingId(stream.id)} className="text-xs font-medium text-slate-700 hover:text-indigo-600 text-left truncate w-full">
                            {stream.name}
                          </button>
                        )}
                      </td>
                      {roles.map(r => (
                        <td key={r} className="px-1 py-1.5 text-center">
                          <input
                            type="number" min={0}
                            value={stream.efforts[r] ?? ''}
                            placeholder="—"
                            onChange={e => setEffort(stream.id, r, parseFloat(e.target.value) || 0)}
                            className="w-12 text-center text-xs bg-transparent border border-transparent rounded focus:border-indigo-300 focus:bg-indigo-50 focus:outline-none py-1 px-0.5 text-slate-700 placeholder:text-slate-300"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <span className={`text-xs font-bold ${streamTotal(stream.id) > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                          {streamTotal(stream.id) || '—'}
                        </span>
                      </td>
                      <td className="pr-2 py-2">
                        <button onClick={() => removeStream(stream.id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded">
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Totals</td>
                {roles.map(r => (
                  <td key={r} className="px-2 py-3 text-center">
                    <span className={`text-xs font-black ${roleTotal(r) > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>{roleTotal(r) || '—'}</span>
                  </td>
                ))}
                <td className="px-3 py-3 text-center text-sm font-black text-slate-900">{grandTotal}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* OpEx streams */}
      {opexStreams.length > 0 && (
        <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50 flex items-center justify-between">
            <div className="text-xs font-bold text-amber-800">OpEx streams <span className="font-normal text-amber-600">— recurring monthly costs after delivery</span></div>
            <div className="text-xs font-black text-amber-700">{sym}{Math.round(totalMonthlyOpex).toLocaleString()}/mo</div>
          </div>
          <div className="divide-y divide-amber-100">
            {opexStreams.map(stream => (
              <div key={stream.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 text-xs font-medium text-slate-700 truncate">{stream.name}</div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-slate-400">{sym}</span>
                  <input
                    type="number" min={0}
                    value={Math.round((stream.monthlyRate ?? 0) * mult)}
                    onChange={e => setStreamMonthlyRate(stream.id, Math.round(Number(e.target.value) / mult))}
                    className="w-24 text-sm font-semibold text-amber-700 text-right border border-amber-200 rounded-lg px-2 py-1 focus:outline-none focus:border-amber-400 bg-amber-50"
                  />
                  <span className="text-xs text-slate-400">/month</span>
                </div>
                <div className="text-xs text-amber-600 font-semibold w-20 text-right">
                  {sym}{Math.round((stream.monthlyRate ?? 0) * mult * 12).toLocaleString()}/yr
                </div>
                <button onClick={() => removeStream(stream.id)} className="p-1 text-amber-300 hover:text-red-400 transition-colors rounded">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-amber-100 bg-amber-50/50 flex items-center justify-between">
            <span className="text-xs text-amber-600">Annual running cost</span>
            <span className="text-sm font-black text-amber-700">{sym}{Math.round(totalMonthlyOpex * 12).toLocaleString()}/yr</span>
          </div>
        </div>
      )}

      {/* Add stream */}
      <div className="flex gap-2">
        <input
          type="text" placeholder="Add a custom stream…"
          value={newStreamName}
          onChange={e => setNewStreamName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && newStreamName.trim()) { addStream(newStreamName.trim()); setNewStreamName('') } }}
          className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-300"
        />
        <button
          onClick={() => { if (newStreamName.trim()) { addStream(newStreamName.trim()); setNewStreamName('') } }}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-900 transition-colors"
        >
          <Plus size={14} /> Add
        </button>
      </div>

      <p className="text-xs text-slate-400">Click stream name to rename · Tab through cells · CapEx = project cost · OpEx = ongoing monthly after go-live</p>
    </div>
  )
}
