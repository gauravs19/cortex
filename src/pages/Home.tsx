import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FolderOpen, BarChart3, ArrowRight, Settings } from 'lucide-react'
import { useEstimatorStore } from '../store/estimatorStore'
import { decodeEstimateFromUrl, clearShareFromUrl } from '../lib/shareIO'
import LZString from 'lz-string'
import type { Estimate } from '../types'

const WORK_TYPES = [
  { value: '',                       label: 'Generic / Custom Dev',     icon: '⚙️' },
  { value: 'digital-transformation', label: 'Digital Transformation',   icon: '🔄' },
  { value: 'ai-ml',                  label: 'AI / ML',                  icon: '🤖' },
  { value: 'erp',                    label: 'ERP Implementation',       icon: '🏢' },
  { value: 'cloud-migration',        label: 'Cloud Migration',          icon: '☁️' },
  { value: 'data-platform',          label: 'Data Platform',            icon: '📊' },
  { value: 'security',               label: 'Security',                 icon: '🔒' },
  { value: 'managed-service',        label: 'Managed Service',          icon: '🛠️' },
]

export default function Home() {
  const { createEstimate, importFromJson, estimates } = useEstimatorStore()
  const navigate = useNavigate()
  const [selectedType, setSelectedType] = useState('')
  const [importError, setImportError] = useState('')

  // Decode shared estimate from URL on load
  useEffect(() => {
    const shared = decodeEstimateFromUrl()
    if (shared) {
      clearShareFromUrl()
      const id = importFromJson(shared)
      navigate(`/estimate/${id}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleNew = () => {
    const id = createEstimate('New estimate', selectedType)
    navigate(`/estimate/${id}`)
  }

  const handleFileLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as Partial<Estimate>
        const id = importFromJson(data)
        navigate(`/estimate/${id}`)
      } catch {
        setImportError('Invalid file — expected a CORTEX JSON export.')
      }
    }
    reader.readAsText(file)
  }

  // Check for CADEX share link in URL hash
  const cadexHash = window.location.hash
  const cadexMatch = cadexHash.match(/[?&]cadex=([^&]*)/)
  const cadexImportAvailable = !!cadexMatch

  const handleCadexImport = () => {
    if (!cadexMatch) return
    try {
      const json = LZString.decompressFromEncodedURIComponent(cadexMatch[1])
      if (!json) return
      const deal = JSON.parse(json)
      const id = importFromJson({
        name: deal.meta?.name || 'Imported from CADEX',
        clientName: deal.meta?.clientName || '',
        workType: deal.meta?.workType || '',
        riskBand: deal.assessment?.scoreBand || 'unknown',
        cadexDealId: deal.id,
      })
      navigate(`/estimate/${id}`)
    } catch {
      setImportError('Could not parse CADEX deal link.')
    }
  }

  const recent = [...estimates]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-3xl space-y-8">

        {/* Header */}
        <div className="text-center relative">
          <div className="text-4xl font-black text-slate-900 tracking-tight">CORTEX</div>
          <div className="text-slate-500 mt-1 text-sm">Cost · Rate · Timeline EXecution</div>
          <div className="text-xs text-slate-400 mt-1">IT consulting deal estimator · free · browser-only</div>
          <button
            onClick={() => navigate('/settings')}
            className="absolute right-0 top-0 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-700 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Settings size={13} /> Settings
          </button>
        </div>

        {/* CADEX import banner */}
        {cadexImportAvailable && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-indigo-800">CADEX deal detected</div>
              <div className="text-xs text-indigo-600 mt-0.5">Import risk band and work type from your qualified deal</div>
            </div>
            <button
              onClick={handleCadexImport}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shrink-0"
            >
              Import from CADEX <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* New estimate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Start new estimate</div>
            <div className="grid grid-cols-4 gap-2">
              {WORK_TYPES.map(w => (
                <button
                  key={w.value}
                  onClick={() => setSelectedType(w.value)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                    selectedType === w.value
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-xl">{w.icon}</span>
                  <span className="text-xs font-semibold text-slate-700 leading-tight">{w.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleNew}
            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Plus size={16} /> New estimate
            {selectedType && <span className="opacity-70 text-sm font-normal">— {WORK_TYPES.find(w => w.value === selectedType)?.label}</span>}
          </button>
        </div>

        {/* Load / recent */}
        <div className="grid grid-cols-2 gap-4">
          <label className="bg-white border border-slate-200 rounded-2xl p-5 cursor-pointer hover:border-indigo-300 transition-colors flex items-center gap-3">
            <FolderOpen size={20} className="text-slate-400" />
            <div>
              <div className="text-sm font-semibold text-slate-700">Load JSON export</div>
              <div className="text-xs text-slate-400">Resume a saved estimate</div>
            </div>
            <input type="file" accept=".json" className="hidden" onChange={handleFileLoad} />
          </label>
          <a
            href="https://gauravs19.github.io/cadex/app/"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 transition-colors flex items-center gap-3"
          >
            <BarChart3 size={20} className="text-indigo-500" />
            <div>
              <div className="text-sm font-semibold text-slate-700">Open CADEX</div>
              <div className="text-xs text-slate-400">Qualify your deal first, then estimate</div>
            </div>
          </a>
        </div>

        {importError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{importError}</div>
        )}

        {/* Recent */}
        {recent.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent estimates</div>
            <ul>
              {recent.map(est => {
                const totals = calcTotalsSimple(est)
                return (
                  <li key={est.id}>
                    <button
                      onClick={() => navigate(`/estimate/${est.id}`)}
                      className="w-full flex items-center justify-between px-5 py-3 text-left text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <div className="font-medium text-slate-800">{est.name || 'Unnamed'}</div>
                        <div className="text-xs text-slate-400">{est.clientName || 'No client'} · {totals.totalDays}d total</div>
                      </div>
                      <div className="text-sm font-bold text-indigo-600">
                        {est.currency === 'GBP' ? '£' : est.currency === 'USD' ? '$' : est.currency === 'EUR' ? '€' : '₹'}
                        {Math.round(totals.sellPrice / 1000)}k
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// Lightweight totals for the home page list
function calcTotalsSimple(est: Estimate) {
  const baseDays = est.streams.reduce((sum, s) =>
    sum + Object.values(s.efforts).reduce((a, b) => a + (b ?? 0), 0), 0)
  const totalDays = Math.round(baseDays * (1 + est.contingencyPct / 100))
  const mult = est.currency === 'GBP' ? 1 : est.currency === 'USD' ? 1.27 : est.currency === 'EUR' ? 1.17 : 105
  let baseCost = 0
  for (const stream of est.streams) {
    for (const [role, days] of Object.entries(stream.efforts)) {
      const rate = ((est.rateCard as Record<string, number>)[role] ?? 600) * mult
      baseCost += (days ?? 0) * rate
    }
  }
  const total = baseCost * (1 + est.contingencyPct / 100) * (1 + est.overheadPct / 100)
  const sellPrice = total / (1 - est.targetMarginPct / 100)
  return { totalDays, sellPrice }
}
