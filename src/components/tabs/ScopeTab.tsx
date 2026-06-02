import { useState } from 'react'
import { Check, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import { useEstimatorStore } from '../../store/estimatorStore'
import {
  WORK_TYPES, WORK_TYPE_DEFAULTS, WORK_TYPE_SCOPE_QUESTIONS,
  generateStreams, getActiveRolesFromStreams,
} from '../../data/streamConfigurator'
import { CATEGORY_LABELS } from '../../data/roles'
import type { StreamConfig } from '../../types'

// Which selections were auto-applied when a work type is chosen — shown as "smart default" badges
const WORK_TYPE_AUTO_LABELS: Record<string, string[]> = {
  '':                       [],
  'digital-transformation': ['Web platform', 'Reporting', 'Change mgmt'],
  'ai-ml':                  ['API-only', 'AI / ML data', 'Cloud'],
  'erp':                    ['Web platform', 'Complex backend', 'Reporting', 'Change mgmt'],
  'cloud-migration':        ['API-only', 'Hybrid deploy', 'Complex infra'],
  'data-platform':          ['Web platform', 'Data platform', 'Cloud'],
  'security':               ['API-only', 'Security reqs', 'Cloud'],
  'managed-service':        ['API-only', 'Minimal infra', 'Hybrid deploy', 'Change mgmt'],
}

// Scope-specific Q&A impact descriptions — shows user what answering each question does
const SCOPE_Q_IMPACT: Record<string, string> = {
  model_type:           'Shapes ML model & data engineering streams',
  data_readiness:       'Adds data collection / prep effort if needed',
  serving:              'Affects MLOps and serving infrastructure',
  explainability:       'Adds audit / compliance effort if required',
  platform:             'Adds platform-specific config and integration work',
  impl_type:            'Drives migration vs new-build stream shape',
  modules:              'Each module adds functional scope to the estimate',
  strategy:             'Refactor adds ~2× more SA and DevOps effort than lift-shift',
  workload_count:       'Drives parallelism and PM overhead',
  downtime:             'Zero-downtime adds significant DevOps and QA effort',
  coverage:             'Determines staffing model and SLA response costs',
  sla_tier:             'Critical SLA adds out-of-hours staffing cost',
  ticket_volume:        'Drives headcount in the managed operations stream',
  service_type:         'Each service type adds a distinct managed stream',
  data_sources:         'More sources = more pipeline and integration work',
  processing:           'Streaming adds real-time infra and higher complexity',
  viz_tool:             'Custom BI adds frontend + data effort',
  legacy:               'Heavy legacy adds integration adapter streams',
  user_scale:           'Enterprise scale adds IAM, perf testing, change mgmt',
  programme:            'Multi-workstream adds programme management overhead',
  scope_type:           'Each focus area adds a dedicated security stream',
  compliance_framework: 'ISO 27001 / SOC 2 / PCI each add compliance effort',
}

const PLATFORM_OPTIONS = [
  { value: 'web',      label: 'Web app',       icon: '🌐', hint: 'Browser / responsive' },
  { value: 'ios',      label: 'iOS native',    icon: '🍎', hint: 'Swift / SwiftUI' },
  { value: 'android',  label: 'Android native',icon: '🤖', hint: 'Kotlin / Compose' },
  { value: 'rn',       label: 'Cross-platform',icon: '⚡', hint: 'React Native / Flutter' },
  { value: 'desktop',  label: 'Desktop',       icon: '🖥️', hint: 'Electron / MAUI' },
  { value: 'api-only', label: 'API / Backend only', icon: '⚙️', hint: 'No frontend in scope' },
]

export default function ScopeTab() {
  const { getActive, updateField, setWorkType, setStreams } = useEstimatorStore()
  const est = getActive()
  const [customised, setCustomised] = useState(false)
  const [streamPreviewOpen, setStreamPreviewOpen] = useState(false)
  const [lastAutoLabels, setLastAutoLabels] = useState<string[]>([])

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
    setLastAutoLabels(WORK_TYPE_AUTO_LABELS[wt] ?? [])
  }

  const updateCfg = (patch: Partial<StreamConfig>) => {
    const next = { ...cfg, ...patch }
    const streams = generateStreams(next, est.workType)
    setStreams(streams, next, getActiveRolesFromStreams(streams))
    setCustomised(true)
    setLastAutoLabels([])
  }

  // Platform toggle with mutual-exclusion logic:
  // Selecting api-only clears all frontend platforms; selecting any frontend clears api-only
  const togglePlatform = (val: string) => {
    const cur = cfg.platforms ?? []
    if (val === 'api-only') {
      // api-only is exclusive
      const next = cur.includes('api-only') ? [] : ['api-only']
      updateCfg({ platforms: next })
    } else {
      // selecting a frontend platform removes api-only
      const withoutApiOnly = cur.filter(v => v !== 'api-only')
      const next = withoutApiOnly.includes(val)
        ? withoutApiOnly.filter(v => v !== val)
        : [...withoutApiOnly, val]
      updateCfg({ platforms: next.length ? next : [val] })
    }
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
    setLastAutoLabels(WORK_TYPE_AUTO_LABELS[est.workType] ?? [])
  }

  const streamPreview = generateStreams(cfg, est.workType)
  const capexStreams = streamPreview.filter(s => s.costType === 'capex')
  const opexStreams  = streamPreview.filter(s => s.costType === 'opex')

  const activeWorkType = WORK_TYPES.find(w => w.value === est.workType)
  const apiOnly = cfg.platforms.includes('api-only')

  return (
    <div className="space-y-4">

      {/* ── Project type ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">What type of project is this?</div>
          {customised && (
            <button onClick={resetToDefaults}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
              <RotateCcw size={11} /> Reset {activeWorkType?.label ?? ''} defaults
            </button>
          )}
        </div>

        <div className="grid grid-cols-4 gap-2">
          {WORK_TYPES.map(wt => {
            const sel = est.workType === wt.value
            return (
              <button key={wt.value} onClick={() => applyWorkType(wt.value)}
                className={`flex flex-col gap-1 px-3 py-3 rounded-xl border-2 text-left transition-all ${
                  sel ? 'border-indigo-500 bg-indigo-50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}>
                <div className="flex items-center justify-between w-full">
                  <span className="text-xl">{wt.icon}</span>
                  {sel && <Check size={13} className="text-indigo-500" />}
                </div>
                <div className={`text-xs font-bold leading-tight ${sel ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {wt.label}
                </div>
                <div className="text-xs text-slate-400 leading-tight">{wt.desc}</div>
              </button>
            )
          })}
        </div>

        {/* Smart defaults applied — shown when work type was just selected */}
        {lastAutoLabels.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">Smart defaults applied:</span>
            {lastAutoLabels.map(l => (
              <span key={l} className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full text-xs font-semibold">
                <Check size={9} /> {l}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Delivery platform ──────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Delivery platform</div>
        <p className="text-xs text-slate-400 mb-3">What are you building? Selecting multiple adds parallel frontend streams.</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORM_OPTIONS.map(p => {
            const sel = cfg.platforms.includes(p.value)
            const dimmed = p.value !== 'api-only' && apiOnly
            return (
              <button key={p.value} onClick={() => togglePlatform(p.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all ${
                  sel
                    ? 'border-indigo-500 bg-indigo-50'
                    : dimmed
                      ? 'border-slate-100 bg-slate-50 opacity-40 cursor-not-allowed'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                }`}
                disabled={dimmed}
                title={dimmed ? 'Remove "API / Backend only" first to add a frontend' : undefined}>
                <span className="text-base">{p.icon}</span>
                <div>
                  <div className={`text-xs font-semibold ${sel ? 'text-indigo-700' : 'text-slate-700'}`}>{p.label}</div>
                  <div className="text-xs text-slate-400">{p.hint}</div>
                </div>
                {sel && <Check size={13} className="text-indigo-500 ml-1" />}
              </button>
            )
          })}
        </div>
        {apiOnly && (
          <p className="text-xs text-amber-600 mt-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
            API / Backend only — no frontend streams will be generated. Frontend platforms are disabled.
          </p>
        )}
        {cfg.platforms.length === 0 && (
          <p className="text-xs text-red-500 mt-2">Select at least one platform.</p>
        )}
      </div>

      {/* ── Technical dimensions ───────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Technical dimensions</div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5">

          {/* Backend complexity */}
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2">Backend & integration complexity</div>
            <div className="space-y-1.5">
              {[
                { value: 'simple',  label: 'Simple / greenfield',        icon: '🌱', hint: 'New services, minimal or no integrations' },
                { value: 'medium',  label: 'Medium — 1–3 integrations',  icon: '🔌', hint: 'REST/SOAP APIs, one or two legacy connectors' },
                { value: 'complex', label: 'Complex / legacy',           icon: '🕸️', hint: 'Heavy integration, legacy adapters, ESB, 4+ systems' },
              ].map(b => (
                <button key={b.value} onClick={() => updateCfg({ backendComplexity: b.value })}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                    cfg.backendComplexity === b.value
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                  <span className="text-base mt-0.5 shrink-0">{b.icon}</span>
                  <div>
                    <div className={`text-xs font-semibold ${cfg.backendComplexity === b.value ? 'text-indigo-700' : 'text-slate-700'}`}>{b.label}</div>
                    <div className="text-xs text-slate-400">{b.hint}</div>
                  </div>
                  {cfg.backendComplexity === b.value && <Check size={13} className="text-indigo-500 ml-auto mt-0.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Data & analytics */}
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2">Data & analytics requirements</div>
            <div className="space-y-1.5">
              {[
                { value: 'none',      label: 'Minimal',               icon: '📄', hint: 'Standard CRUD — no analytics or reporting needed' },
                { value: 'reporting', label: 'Reporting / dashboards', icon: '📊', hint: 'KPI dashboards, scheduled reports, basic BI' },
                { value: 'platform',  label: 'Data platform / BI',    icon: '🏗️', hint: 'Data lake, pipelines, self-serve analytics' },
                { value: 'ai',        label: 'AI / ML workloads',     icon: '🧠', hint: 'Model training, inference, feature store, MLOps' },
              ].map(d => (
                <button key={d.value} onClick={() => updateCfg({ dataNeeds: d.value })}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                    cfg.dataNeeds === d.value
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                  <span className="text-base mt-0.5 shrink-0">{d.icon}</span>
                  <div>
                    <div className={`text-xs font-semibold ${cfg.dataNeeds === d.value ? 'text-indigo-700' : 'text-slate-700'}`}>{d.label}</div>
                    <div className="text-xs text-slate-400">{d.hint}</div>
                  </div>
                  {cfg.dataNeeds === d.value && <Check size={13} className="text-indigo-500 ml-auto mt-0.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Deployment */}
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2">Deployment target</div>
            <div className="space-y-1.5">
              {[
                { value: 'cloud',   label: 'Cloud-native',  icon: '☁️', hint: 'AWS / Azure / GCP — IaaS, PaaS or serverless' },
                { value: 'onprem',  label: 'On-premises',   icon: '🏢', hint: 'Client data centre or private cloud' },
                { value: 'hybrid',  label: 'Hybrid',        icon: '🔀', hint: 'Mix of public cloud and on-prem' },
              ].map(d => (
                <button key={d.value} onClick={() => updateCfg({ deployment: d.value })}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                    cfg.deployment === d.value
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                  <span className="text-base mt-0.5 shrink-0">{d.icon}</span>
                  <div>
                    <div className={`text-xs font-semibold ${cfg.deployment === d.value ? 'text-indigo-700' : 'text-slate-700'}`}>{d.label}</div>
                    <div className="text-xs text-slate-400">{d.hint}</div>
                  </div>
                  {cfg.deployment === d.value && <Check size={13} className="text-indigo-500 ml-auto mt-0.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Infrastructure */}
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2">Infrastructure scope</div>
            <div className="space-y-1.5">
              {[
                { value: 'minimal',  label: 'Use existing infra',     icon: '➡️', hint: 'Minimal setup — deploy into client\'s existing environment' },
                { value: 'standard', label: 'Standard cloud setup',   icon: '☁️', hint: 'VPC, containers, CI/CD, monitoring, standard baseline' },
                { value: 'complex',  label: 'Enterprise-grade',       icon: '🏗️', hint: 'Multi-region, HA, DR, security baseline, compliance controls' },
              ].map(i => (
                <button key={i.value} onClick={() => updateCfg({ infraScope: i.value })}
                  className={`w-full flex items-start gap-2.5 px-3 py-2 rounded-lg border text-left transition-all ${
                    cfg.infraScope === i.value
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                  <span className="text-base mt-0.5 shrink-0">{i.icon}</span>
                  <div>
                    <div className={`text-xs font-semibold ${cfg.infraScope === i.value ? 'text-indigo-700' : 'text-slate-700'}`}>{i.label}</div>
                    <div className="text-xs text-slate-400">{i.hint}</div>
                  </div>
                  {cfg.infraScope === i.value && <Check size={13} className="text-indigo-500 ml-auto mt-0.5 shrink-0" />}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Scope additions */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-600 mb-2">Scope additions</div>
          <div className="grid grid-cols-2 gap-3">
            {([
              { key: 'hasSecurityReqs'     as const, icon: '🔒', label: 'Security & compliance', hint: 'Adds security implementation, hardening and pen-testing streams' },
              { key: 'hasChangeManagement' as const, icon: '🎓', label: 'Change management & training', hint: 'Adds change management, comms and end-user training stream' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => updateCfg({ [t.key]: !cfg[t.key] })}
                className={`flex items-start gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                  cfg[t.key] ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                }`}>
                <span className="text-lg mt-0.5 shrink-0">{t.icon}</span>
                <div className="flex-1">
                  <div className={`text-xs font-bold ${cfg[t.key] ? 'text-indigo-700' : 'text-slate-700'}`}>{t.label}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t.hint}</div>
                </div>
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${cfg[t.key] ? 'bg-indigo-500 border-indigo-500' : 'border-slate-300'}`}>
                  {cfg[t.key] && <Check size={10} className="text-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Work-type-specific Q&A ─────────────────────────── */}
      {scopeQ.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-1">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {activeWorkType?.label} — qualification questions
            </div>
            <span className="text-xs text-slate-400 mt-0.5">Answers help qualify effort in the Stream Matrix</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            These answers are recorded for SOW and proposal context. They do not directly change stream numbers — switch to Stream Matrix to tune effort directly.
          </p>
          <div className="grid grid-cols-3 gap-5">
            {scopeQ.map(q => {
              const answer = scopeAnswers[q.id]
              const impact = SCOPE_Q_IMPACT[q.id]
              return (
                <div key={q.id}>
                  <div className="text-xs font-semibold text-slate-700 mb-0.5">{q.label}</div>
                  {impact && <div className="text-xs text-slate-400 mb-2">{impact}</div>}
                  {q.type === 'single' ? (
                    <div className="space-y-1.5">
                      {q.options.map(opt => {
                        const sel = answer === opt.value
                        return (
                          <button key={opt.value} onClick={() => setScopeAnswer(q.id, opt.value)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                              sel ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                            }`}>
                            <div className="flex-1">
                              <div className={`text-xs font-semibold ${sel ? 'text-indigo-700' : 'text-slate-700'}`}>{opt.label}</div>
                              {opt.hint && <div className="text-xs text-slate-400">{opt.hint}</div>}
                            </div>
                            {sel && <Check size={11} className="text-indigo-500 shrink-0" />}
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

      {/* ── Stream preview ─────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setStreamPreviewOpen(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stream preview</div>
            <div className="flex gap-1.5">
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-semibold rounded-full border border-indigo-100">
                {capexStreams.length} CapEx
              </span>
              {opexStreams.length > 0 && (
                <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs font-semibold rounded-full border border-amber-100">
                  {opexStreams.length} OpEx
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>What will be generated</span>
            {streamPreviewOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </button>

        {streamPreviewOpen && (
          <div className="border-t border-slate-100 px-5 py-4">
            {capexStreams.length > 0 && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">CapEx streams — one-time delivery effort</div>
                <div className="space-y-1">
                  {capexStreams.map(s => {
                    const days = Object.values(s.efforts).reduce((a, b) => a + (b ?? 0), 0)
                    return (
                      <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                        <div>
                          <span className="text-xs font-semibold text-slate-800">{s.name}</span>
                          <span className="ml-2 text-xs text-slate-400">{CATEGORY_LABELS[s.category] ?? s.category}</span>
                        </div>
                        {days > 0 && <span className="text-xs font-bold text-indigo-600">{days}d</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {opexStreams.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">OpEx streams — ongoing monthly costs</div>
                <div className="space-y-1">
                  {opexStreams.map(s => (
                    <div key={s.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                      <span className="text-xs font-semibold text-slate-700">{s.name}</span>
                      {(s.monthlyRate ?? 0) > 0 && (
                        <span className="text-xs font-bold text-amber-700">~${s.monthlyRate?.toLocaleString()}/mo</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-xs text-slate-400 mt-3">
              Switch to <strong>Stream Matrix</strong> to edit role effort within each stream directly.
            </p>
          </div>
        )}
      </div>

    </div>
  )
}
