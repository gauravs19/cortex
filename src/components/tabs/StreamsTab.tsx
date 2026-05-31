import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useEstimatorStore } from '../../store/estimatorStore'
import { ROLES } from '../../data/roles'
import type { RoleId } from '../../types'

export default function StreamsTab() {
  const { getActive, setEffort, addStream, removeStream, renameStream, toggleRole } = useEstimatorStore()
  const est = getActive()
  const [newStreamName, setNewStreamName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  if (!est) return null

  const roles = est.activeRoles
  const allRoles = Object.keys(ROLES) as RoleId[]

  const streamTotal = (streamId: string) => {
    const stream = est.streams.find(s => s.id === streamId)
    if (!stream) return 0
    return Object.values(stream.efforts).reduce((a, b) => a + (b ?? 0), 0)
  }

  const roleTotal = (role: RoleId) =>
    est.streams.reduce((sum, s) => sum + (s.efforts[role] ?? 0), 0)

  const grandTotal = est.streams.reduce((sum, s) =>
    sum + Object.values(s.efforts).reduce((a, b) => a + (b ?? 0), 0), 0)

  return (
    <div className="space-y-6">
      {/* Role selector */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active roles</div>
        <div className="flex flex-wrap gap-2">
          {allRoles.map(r => (
            <button
              key={r}
              onClick={() => toggleRole(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                roles.includes(r)
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {r} <span className="font-normal opacity-70">· {ROLES[r].name.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Streams matrix */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-48">Work Stream</th>
                {roles.map(r => (
                  <th key={r} className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-16">
                    {r}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-16">Total</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {est.streams.map((stream, i) => (
                <tr key={stream.id} className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                  <td className="px-4 py-2">
                    {editingId === stream.id ? (
                      <input
                        autoFocus
                        className="w-full text-sm font-medium text-slate-800 border-b border-indigo-400 outline-none bg-transparent"
                        value={stream.name}
                        onChange={e => renameStream(stream.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        onKeyDown={e => e.key === 'Enter' && setEditingId(null)}
                      />
                    ) : (
                      <button
                        onClick={() => setEditingId(stream.id)}
                        className="text-sm font-medium text-slate-800 hover:text-indigo-600 text-left w-full truncate"
                      >
                        {stream.name}
                      </button>
                    )}
                  </td>
                  {roles.map(r => (
                    <td key={r} className="px-2 py-1.5 text-center">
                      <input
                        type="number"
                        min={0}
                        value={stream.efforts[r] ?? ''}
                        placeholder="—"
                        onChange={e => setEffort(stream.id, r, parseFloat(e.target.value) || 0)}
                        className="w-14 text-center text-sm bg-transparent border border-transparent rounded focus:border-indigo-300 focus:bg-indigo-50 focus:outline-none py-1 px-1 text-slate-700 placeholder:text-slate-300"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center">
                    <span className={`text-sm font-semibold ${streamTotal(stream.id) > 0 ? 'text-slate-800' : 'text-slate-300'}`}>
                      {streamTotal(stream.id) || '—'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      onClick={() => removeStream(stream.id)}
                      className="p-1 text-slate-300 hover:text-red-400 transition-colors rounded"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50">
                <td className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Total (days)</td>
                {roles.map(r => (
                  <td key={r} className="px-2 py-3 text-center">
                    <span className={`text-sm font-bold ${roleTotal(r) > 0 ? 'text-indigo-600' : 'text-slate-300'}`}>
                      {roleTotal(r) || '—'}
                    </span>
                  </td>
                ))}
                <td className="px-4 py-3 text-center">
                  <span className="text-sm font-black text-slate-900">{grandTotal}</span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Add stream */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="New work stream name…"
          value={newStreamName}
          onChange={e => setNewStreamName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && newStreamName.trim()) {
              addStream(newStreamName.trim())
              setNewStreamName('')
            }
          }}
          className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200"
        />
        <button
          onClick={() => { if (newStreamName.trim()) { addStream(newStreamName.trim()); setNewStreamName('') } }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={14} /> Add stream
        </button>
      </div>

      <p className="text-xs text-slate-400">Click a stream name to rename · Tab through cells to edit effort in days · Roles with no effort are ignored in cost calculations</p>
    </div>
  )
}
