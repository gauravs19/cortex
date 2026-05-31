import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, BarChart3, ArrowRight, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import { useEstimatorStore } from '../store/estimatorStore'
import { decodeEstimateFromUrl, clearShareFromUrl } from '../lib/shareIO'
import LZString from 'lz-string'
import { WORK_TYPES, WORK_TYPE_DEFAULTS, generateStreams, getActiveRolesFromStreams } from '../data/streamConfigurator'
import type { Estimate, StreamConfig } from '../types'

export default function Home() {
  const { createEstimate, importFromJson, estimates } = useEstimatorStore()
  const navigate = useNavigate()
  const [importError, setImportError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Entry state: work type + platforms override
  const [workType, setWorkType] = useState('')
  const [cfg, setCfg] = useState<StreamConfig>(WORK_TYPE_DEFAULTS[''])

  // When work type changes, update config with smart defaults
  const applyWorkType = (wt: string) => {
    setWorkType(wt)
    setCfg(WORK_TYPE_DEFAULTS[wt] ?? WORK_TYPE_DEFAULTS[''])
  }

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
    const id = createEstimate('New estimate', workType)
    // Apply configured streams immediately via store directly
    const streams = generateStreams(cfg, workType)
    const roles = getActiveRolesFromStreams(streams)
    useEstimatorStore.getState().setStreams(streams, cfg, roles)
    // Mark wizard as done — streams are already configured
    useEstimatorStore.getState().updateField('wizardCompleted', true)
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

  // CADEX share link detection
  const cadexHash = window.location.hash
  const cadexMatch = cadexHash.match(/[?&]cadex=([^&]*)/)
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

  const streamPreview = generateStreams(cfg, workType)
  const capexCount = streamPreview.filter(s => s.costType === 'capex').length
  const opexCount  = streamPreview.filter(s => s.costType === 'opex').length

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-5">

        {/* Brand */}
        <div className="text-center relative">
          <div className="text-4xl font-black text-slate-900 tracking-tight">CORTEX</div>
          <div className="text-slate-500 mt-1 text-sm">Cost · Rate · Timeline EXecution</div>
          <div className="text-xs text-slate-400 mt-0.5">Project estimator · free · browser-only</div>
          <button onClick={() => navigate('/settings')}
            className="absolute right-0 top-0 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Settings size={13} /> Settings
          </button>
        </div>

        {/* CADEX import */}
        {cadexMatch && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-indigo-800">CADEX deal detected</div>
              <div className="text-xs text-indigo-600 mt-0.5">Import risk band and work type</div>
            </div>
            <button onClick={handleCadexImport}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shrink-0">
              Import from CADEX <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Main new estimate card */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">

          {/* Work type */}
          <div className="p-5 border-b border-slate-100">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">What are you building?</div>
            <div className="grid grid-cols-4 gap-2">
              {WORK_TYPES.map(wt => (
                <button key={wt.value} onClick={() => applyWorkType(wt.value)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-center transition-all ${
                    workType === wt.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}>
                  <span className="text-xl">{wt.icon}</span>
                  <span className={`text-xs font-semibold leading-tight ${workType === wt.value ? 'text-indigo-700' : 'text-slate-600'}`}>
                    {wt.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced config — collapsible */}
          <div className="border-b border-slate-100">
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
            >
              <span className="uppercase tracking-wider">Adjust configuration</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-normal normal-case">
                  {capexCount + opexCount} streams · {cfg.platforms.join(', ')} · {cfg.backendComplexity} backend
                </span>
                {showAdvanced ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </div>
            </button>

            {showAdvanced && (
              <div className="px-5 pb-5 grid grid-cols-3 gap-4 bg-slate-50/50 border-t border-slate-100">

                {/* Platforms */}
                <div className="col-span-2 pt-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Platforms</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { value: 'web', label: 'Web', icon: '🌐' },
                      { value: 'ios', label: 'iOS', icon: '🍎' },
                      { value: 'android', label: 'Android', icon: '🤖' },
                      { value: 'rn', label: 'React Native', icon: '⚡' },
                      { value: 'desktop', label: 'Desktop', icon: '🖥️' },
                      { value: 'api-only', label: 'API only', icon: '⚙️' },
                    ].map(p => {
                      const sel = cfg.platforms.includes(p.value)
                      return (
                        <button key={p.value}
                          onClick={() => {
                            const next = sel ? cfg.platforms.filter(x => x !== p.value) : [...cfg.platforms, p.value]
                            setCfg(c => ({ ...c, platforms: next }))
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            sel ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}>
                          {p.icon} {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Backend */}
                <div className="pt-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Backend</div>
                  <div className="flex flex-col gap-1">
                    {[
                      { value: 'simple', label: '🌱 Simple' },
                      { value: 'medium', label: '🔌 Medium' },
                      { value: 'complex', label: '🕸️ Complex / legacy' },
                    ].map(b => (
                      <button key={b.value}
                        onClick={() => setCfg(c => ({ ...c, backendComplexity: b.value }))}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                          cfg.backendComplexity === b.value ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}>
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data needs */}
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Data</div>
                  <div className="flex flex-col gap-1">
                    {[
                      { value: 'none', label: '📄 Minimal' },
                      { value: 'reporting', label: '📊 Reporting' },
                      { value: 'platform', label: '🏗️ Data platform' },
                      { value: 'ai', label: '🧠 AI / ML' },
                    ].map(d => (
                      <button key={d.value}
                        onClick={() => setCfg(c => ({ ...c, dataNeeds: d.value }))}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                          cfg.dataNeeds === d.value ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Infra */}
                <div>
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Infrastructure</div>
                  <div className="flex flex-col gap-1">
                    {[
                      { value: 'minimal', label: '➡️ Use existing' },
                      { value: 'standard', label: '☁️ Standard cloud' },
                      { value: 'complex', label: '🏗️ Enterprise-grade' },
                    ].map(i => (
                      <button key={i.value}
                        onClick={() => setCfg(c => ({ ...c, infraScope: i.value }))}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                          cfg.infraScope === i.value ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}>
                        {i.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div className="flex flex-col gap-2 pt-1">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Include</div>
                  {[
                    { key: 'hasSecurityReqs' as const, label: '🔒 Security / compliance' },
                    { key: 'hasChangeManagement' as const, label: '🎓 Change management' },
                  ].map(t => (
                    <button key={t.key}
                      onClick={() => setCfg(c => ({ ...c, [t.key]: !c[t.key] }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold text-left transition-all ${
                        cfg[t.key] ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}>
                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${cfg[t.key] ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                        {cfg[t.key] && <span className="text-white text-xs leading-none">✓</span>}
                      </div>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Start button */}
          <div className="p-4">
            <button onClick={handleNew}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm">
              Start estimating →
              <span className="opacity-60 font-normal text-xs">
                {capexCount + opexCount} streams pre-configured
              </span>
            </button>
          </div>
        </div>

        {/* Load / CADEX */}
        <div className="grid grid-cols-2 gap-3">
          <label className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-indigo-300 transition-colors flex items-center gap-3">
            <FolderOpen size={18} className="text-slate-400 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-700">Load JSON</div>
              <div className="text-xs text-slate-400">Resume saved estimate</div>
            </div>
            <input type="file" accept=".json" className="hidden" onChange={handleFileLoad} />
          </label>
          <a href="https://gauravs19.github.io/cadex/app/" target="_blank" rel="noopener noreferrer"
            className="bg-white border border-slate-200 rounded-xl p-4 hover:border-indigo-300 transition-colors flex items-center gap-3">
            <BarChart3 size={18} className="text-indigo-500 shrink-0" />
            <div>
              <div className="text-xs font-semibold text-slate-700">Open CADEX</div>
              <div className="text-xs text-slate-400">Qualify first, then estimate</div>
            </div>
          </a>
        </div>

        {importError && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{importError}</div>
        )}

        {/* Recent estimates */}
        {recent.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent</div>
            <ul>
              {recent.map(est => (
                <li key={est.id}>
                  <button onClick={() => navigate(`/estimate/${est.id}`)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left text-sm hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                    <div>
                      <div className="font-medium text-slate-800 text-xs">{est.name || 'Unnamed'}</div>
                      <div className="text-xs text-slate-400">{est.clientName || 'No client'} · {est.workType || 'Generic'}</div>
                    </div>
                    <div className="text-xs font-bold text-indigo-600">
                      {est.currency === 'GBP' ? '£' : est.currency === 'USD' ? '$' : est.currency === 'EUR' ? '€' : '₹'}
                      {Math.round(calcQuickSell(est) / 1000)}k
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function calcQuickSell(est: Estimate): number {
  let baseCost = 0
  const mult = est.currency === 'GBP' ? 1 : est.currency === 'USD' ? 1.27 : est.currency === 'EUR' ? 1.17 : 105
  for (const st of est.streams.filter(s => s.costType !== 'opex')) {
    for (const [r, d] of Object.entries(st.efforts)) {
      const rate = ((est.rateCard as Record<string, number>)[r] ?? 600) * mult
      baseCost += (d ?? 0) * rate
    }
  }
  for (const li of est.lineItems ?? []) {
    baseCost += (li.quantity ?? 1) * 2 * 600 * mult
  }
  const total = baseCost * (1 + (est.contingencyPct ?? 20) / 100) * (1 + (est.overheadPct ?? 10) / 100)
  return total / (1 - (est.targetMarginPct ?? 25) / 100)
}
