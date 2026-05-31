import { useState } from 'react'
import { Check, Wand2, RotateCcw } from 'lucide-react'
import {
  CONFIG_QUESTIONS, DEFAULT_CONFIG, WORK_TYPES, WORK_TYPE_DEFAULTS,
  generateStreams, getActiveRolesFromStreams,
} from '../../data/streamConfigurator'
import type { StreamConfig } from '../../types'

interface Props {
  initialConfig?: StreamConfig
  workType: string
  onApply: (streams: ReturnType<typeof generateStreams>, config: StreamConfig, roles: string[]) => void
  onWorkTypeChange?: (wt: string) => void
  onClose: () => void
  closeLabel?: string
}

export default function StreamConfigWizard({
  initialConfig, workType, onApply, onWorkTypeChange, onClose, closeLabel = 'Cancel',
}: Props) {
  const [activeWorkType, setActiveWorkType] = useState(workType)
  const [cfg, setCfg] = useState<StreamConfig>(initialConfig ?? WORK_TYPE_DEFAULTS[workType] ?? DEFAULT_CONFIG)
  const [customised, setCustomised] = useState(false)

  const applyWorkType = (wt: string) => {
    setActiveWorkType(wt)
    setCfg(WORK_TYPE_DEFAULTS[wt] ?? DEFAULT_CONFIG)
    setCustomised(false)
    onWorkTypeChange?.(wt)
  }

  const setValue = (id: keyof StreamConfig, value: string | string[] | boolean) => {
    setCfg(prev => ({ ...prev, [id]: value }))
    setCustomised(true)
  }

  const toggleMulti = (id: keyof StreamConfig, value: string) => {
    const current = (cfg[id] as string[]) ?? []
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    setCfg(prev => ({ ...prev, [id]: next }))
    setCustomised(true)
  }

  const resetToDefaults = () => {
    setCfg(WORK_TYPE_DEFAULTS[activeWorkType] ?? DEFAULT_CONFIG)
    setCustomised(false)
  }

  const handleApply = () => {
    const streams = generateStreams(cfg, activeWorkType)
    onApply(streams, cfg, getActiveRolesFromStreams(streams))
  }

  const preview = generateStreams(cfg, activeWorkType)
  const capexStreams = preview.filter(s => s.costType === 'capex')
  const opexStreams  = preview.filter(s => s.costType === 'opex')
  const totalDays   = capexStreams.reduce((sum, s) =>
    sum + Object.values(s.efforts).reduce((a, b) => a + (b ?? 0), 0), 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 w-full">

      {/* Work type selector — top row, full width */}
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Project type</div>
          {customised && (
            <button onClick={resetToDefaults}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-indigo-600 transition-colors">
              <RotateCcw size={11} /> Reset to {WORK_TYPES.find(w => w.value === activeWorkType)?.label ?? 'defaults'}
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {WORK_TYPES.map(wt => (
            <button
              key={wt.value}
              onClick={() => applyWorkType(wt.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
                activeWorkType === wt.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-800'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span>{wt.icon}</span>
              {wt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Configuration grid */}
      <div className="grid grid-cols-3 gap-5 px-5 py-5">

        {/* Platforms — spans 2 cols */}
        <div className="col-span-2">
          <SectionLabel text="Platforms" hint="Select all that apply" />
          <div className="grid grid-cols-3 gap-1.5">
            {CONFIG_QUESTIONS[0].options!.map(opt => {
              const sel = (cfg.platforms ?? []).includes(opt.value)
              return (
                <button key={opt.value} onClick={() => toggleMulti('platforms', opt.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left transition-all ${
                    sel ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}>
                  <span className="text-base shrink-0">{opt.icon}</span>
                  <span className={`text-xs font-semibold leading-tight ${sel ? 'text-indigo-800' : 'text-slate-600'}`}>{opt.label}</span>
                  {sel && <Check size={11} className="text-indigo-500 ml-auto shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Deployment */}
        <div>
          <SectionLabel text="Deployment" />
          <div className="space-y-1.5">
            {CONFIG_QUESTIONS[1].options!.map(opt => {
              const sel = cfg.deployment === opt.value
              return (
                <button key={opt.value} onClick={() => setValue('deployment', opt.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left transition-all ${
                    sel ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <span className="text-base shrink-0">{opt.icon}</span>
                  <span className={`text-xs font-semibold ${sel ? 'text-indigo-800' : 'text-slate-600'}`}>{opt.label}</span>
                  {sel && <Check size={11} className="text-indigo-500 ml-auto" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Backend */}
        <div>
          <SectionLabel text="Backend complexity" />
          <div className="space-y-1.5">
            {CONFIG_QUESTIONS[2].options!.map(opt => {
              const sel = cfg.backendComplexity === opt.value
              return (
                <button key={opt.value} onClick={() => setValue('backendComplexity', opt.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left transition-all ${
                    sel ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <span className="text-base shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${sel ? 'text-indigo-800' : 'text-slate-600'}`}>{opt.label}</div>
                    {opt.hint && <div className="text-xs text-slate-400 truncate">{opt.hint}</div>}
                  </div>
                  {sel && <Check size={11} className="text-indigo-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Data */}
        <div>
          <SectionLabel text="Data requirements" />
          <div className="space-y-1.5">
            {CONFIG_QUESTIONS[3].options!.map(opt => {
              const sel = cfg.dataNeeds === opt.value
              return (
                <button key={opt.value} onClick={() => setValue('dataNeeds', opt.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left transition-all ${
                    sel ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <span className="text-base shrink-0">{opt.icon}</span>
                  <span className={`text-xs font-semibold ${sel ? 'text-indigo-800' : 'text-slate-600'}`}>{opt.label}</span>
                  {sel && <Check size={11} className="text-indigo-500 ml-auto" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Infra */}
        <div>
          <SectionLabel text="Infrastructure" />
          <div className="space-y-1.5">
            {CONFIG_QUESTIONS[4].options!.map(opt => {
              const sel = cfg.infraScope === opt.value
              return (
                <button key={opt.value} onClick={() => setValue('infraScope', opt.value)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-left transition-all ${
                    sel ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <span className="text-base shrink-0">{opt.icon}</span>
                  <span className={`text-xs font-semibold ${sel ? 'text-indigo-800' : 'text-slate-600'}`}>{opt.label}</span>
                  {sel && <Check size={11} className="text-indigo-500 ml-auto" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Toggles + action row */}
        <div className="col-span-3 flex items-center gap-3 pt-3 border-t border-slate-100">
          <Toggle
            label="Security / compliance"
            value={cfg.hasSecurityReqs}
            onChange={v => setValue('hasSecurityReqs', v)}
          />
          <Toggle
            label="Change management & training"
            value={cfg.hasChangeManagement}
            onChange={v => setValue('hasChangeManagement', v)}
          />

          {/* Live summary + actions */}
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-black text-indigo-600">{totalDays}d</div>
              <div className="text-xs text-slate-400">{capexStreams.length} CapEx · {opexStreams.length} OpEx</div>
            </div>
            <button onClick={onClose}
              className="text-xs text-slate-400 hover:text-slate-600 px-3 py-2 rounded-lg transition-colors">
              {closeLabel}
            </button>
            <button onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
              <Wand2 size={14} /> Apply {capexStreams.length + opexStreams.length} streams
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="mb-2">
      <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">{text}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
        value ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'
      }`}>
      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${
        value ? 'bg-indigo-500' : 'border border-slate-300 bg-white'
      }`}>
        {value && <Check size={9} className="text-white" />}
      </div>
      {label}
    </button>
  )
}
