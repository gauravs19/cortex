import { useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { useEstimatorStore } from '../../store/estimatorStore'
import {
  WORK_TYPES, WORK_TYPE_DEFAULTS, WORK_TYPE_SCOPE_QUESTIONS,
  generateStreams, getActiveRolesFromStreams,
} from '../../data/streamConfigurator'
import type { StreamConfig } from '../../types'

export default function ScopeTab() {
  const { getActive, updateField, setWorkType, setStreams } = useEstimatorStore()
  const est = getActive()
  const [customised, setCustomised] = useState(false)

  if (!est) return null

  const cfg: StreamConfig = est.streamConfig ?? WORK_TYPE_DEFAULTS[est.workType] ?? WORK_TYPE_DEFAULTS['']
  const scopeQ = WORK_TYPE_SCOPE_QUESTIONS[est.workType] ?? []
  const scopeAnswers = est.scopeAnswers ?? {}

  const applyWorkType = (wt: string) => {
    const defaults = WORK_TYPE_DEFAULTS[wt] ?? WORK_TYPE_DEFAULTS['']
    setWorkType(wt, false)
    const streams = generateStreams(defaults, wt)
    setStreams(streams, defaults, getActiveRolesFromStreams(streams))
    setCustomised(false)
  }

  const updateCfg = (patch: Partial<StreamConfig>) => {
    const next = { ...cfg, ...patch }
    const streams = generateStreams(next, est.workType)
    setStreams(streams, next, getActiveRolesFromStreams(streams))
    setCustomised(true)
  }

  const togglePlatform = (val: string) => {
    const cur = cfg.platforms ?? []
    const next = cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val]
    updateCfg({ platforms: next })
  }

  const setScopeAnswer = (id: string, value: string | string[]) => {
    updateField('scopeAnswers', { ...scopeAnswers, [id]: value })
  }

  const toggleScopeMulti = (id: string, value: string) => {
    const cur = (scopeAnswers[id] as string[]) ?? []
    const next = cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value]
    setScopeAnswer(id, next)
  }

  const resetToDefaults = () => {
    const defaults = WORK_TYPE_DEFAULTS[est.workType] ?? WORK_TYPE_DEFAULTS['']
    const streams = generateStreams(defaults, est.workType)
    setStreams(streams, defaults, getActiveRolesFromStreams(streams))
    setCustomised(false)
  }

  const streamPreview = generateStreams(cfg, est.workType)
  const capexCount = streamPreview.filter(s => s.costType === 'capex').length
  const opexCount  = streamPreview.filter(s => s.costType === 'opex').length

  return (
    <div className="space-y-5">

      {/* Work type */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project type</div>
          {customised && (
            <button onClick={resetToDefaults}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
              <RotateCcw size={11} /> Reset to {WORK_TYPES.find(w => w.value === est.workType)?.label ?? 'defaults'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {WORK_TYPES.map(wt => (
            <button key={wt.value} onClick={() => applyWorkType(wt.value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                est.workType === wt.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
              }`}>
              <span className="text-lg shrink-0">{wt.icon}</span>
              <span className={`text-xs font-semibold leading-tight ${est.workType === wt.value ? 'text-indigo-700' : 'text-slate-600'}`}>
                {wt.label}
              </span>
              {est.workType === wt.value && <Check size={11} className="text-indigo-500 ml-auto shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Platform + core config */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Technical scope</div>
          <div className="text-xs text-slate-400">{capexCount + opexCount} streams · {capexCount} CapEx · {opexCount} OpEx</div>
        </div>
        <div className="grid grid-cols-3 gap-5">

          {/* Platforms */}
          <div className="col-span-2">
            <div className="text-xs font-semibold text-slate-500 mb-2">Platforms</div>
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: 'web',      label: 'Web',            icon: '🌐' },
                { value: 'ios',      label: 'iOS',            icon: '🍎' },
                { value: 'android',  label: 'Android',        icon: '🤖' },
                { value: 'rn',       label: 'React Native',   icon: '⚡' },
                { value: 'desktop',  label: 'Desktop',        icon: '🖥️' },
                { value: 'api-only', label: 'API / Backend',  icon: '⚙️' },
              ].map(p => {
                const sel = cfg.platforms.includes(p.value)
                return (
                  <button key={p.value} onClick={() => togglePlatform(p.value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                      sel ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}>
                    {p.icon} {p.label}
                    {sel && <Check size={10} className="text-indigo-400" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Deployment */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">Deployment</div>
            <div className="flex flex-col gap-1.5">
              {[
                { value: 'cloud',   label: '☁️ Cloud-native' },
                { value: 'onprem',  label: '🏢 On-premises' },
                { value: 'hybrid',  label: '🔀 Hybrid' },
              ].map(d => (
                <button key={d.value} onClick={() => updateCfg({ deployment: d.value })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                    cfg.deployment === d.value ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Backend */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">Backend complexity</div>
            <div className="flex flex-col gap-1.5">
              {[
                { value: 'simple',  label: '🌱 Simple / greenfield' },
                { value: 'medium',  label: '🔌 Medium (1–3 integrations)' },
                { value: 'complex', label: '🕸️ Complex / legacy' },
              ].map(b => (
                <button key={b.value} onClick={() => updateCfg({ backendComplexity: b.value })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                    cfg.backendComplexity === b.value ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          {/* Data */}
          <div>
            <div className="text-xs font-semibold text-slate-500 mb-2">Data requirements</div>
            <div className="flex flex-col gap-1.5">
              {[
                { value: 'none',      label: '📄 Minimal' },
                { value: 'reporting', label: '📊 Reporting / dashboards' },
                { value: 'platform',  label: '🏗️ Data platform / BI' },
                { value: 'ai',        label: '🧠 AI / ML workloads' },
              ].map(d => (
                <button key={d.value} onClick={() => updateCfg({ dataNeeds: d.value })}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                    cfg.dataNeeds === d.value ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Infra + toggles */}
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-2">Infrastructure</div>
              <div className="flex flex-col gap-1.5">
                {[
                  { value: 'minimal',  label: '➡️ Use existing' },
                  { value: 'standard', label: '☁️ Standard cloud' },
                  { value: 'complex',  label: '🏗️ Enterprise-grade' },
                ].map(i => (
                  <button key={i.value} onClick={() => updateCfg({ infraScope: i.value })}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                      cfg.infraScope === i.value ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}>
                    {i.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              {[
                { key: 'hasSecurityReqs'    as const, label: '🔒 Security / compliance' },
                { key: 'hasChangeManagement' as const, label: '🎓 Change management' },
              ].map(t => (
                <button key={t.key} onClick={() => updateCfg({ [t.key]: !cfg[t.key] })}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold text-left transition-all ${
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
        </div>
      </div>

      {/* Work-type-specific questions */}
      {scopeQ.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">
            {WORK_TYPES.find(w => w.value === est.workType)?.label} specifics
          </div>
          <div className="grid grid-cols-3 gap-5">
            {scopeQ.map(q => {
              const answer = scopeAnswers[q.id]
              return (
                <div key={q.id}>
                  <div className="text-xs font-semibold text-slate-600 mb-2">{q.label}</div>
                  {q.type === 'single' ? (
                    <div className="flex flex-col gap-1.5">
                      {q.options.map(opt => {
                        const sel = answer === opt.value
                        return (
                          <button key={opt.value} onClick={() => setScopeAnswer(q.id, opt.value)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold text-left transition-all ${
                              sel ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}>
                            {opt.label}
                            {opt.hint && <span className="text-slate-400 font-normal ml-1">— {opt.hint}</span>}
                          </button>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {q.options.map(opt => {
                        const sel = ((answer as string[]) ?? []).includes(opt.value)
                        return (
                          <button key={opt.value} onClick={() => toggleScopeMulti(q.id, opt.value)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                              sel ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}>
                            {opt.label}
                            {sel && <Check size={10} className="text-indigo-400" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 pb-2">
        Changes here regenerate streams immediately. Switch to Stream Matrix to edit effort directly.
      </p>
    </div>
  )
}
