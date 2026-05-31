import { useState } from 'react'
import { Check, Wand2 } from 'lucide-react'
import { CONFIG_QUESTIONS, DEFAULT_CONFIG, generateStreams, getActiveRolesFromStreams } from '../../data/streamConfigurator'
import type { StreamConfig } from '../../types'

interface Props {
  initialConfig?: StreamConfig
  workType: string
  onApply: (streams: ReturnType<typeof generateStreams>, config: StreamConfig, roles: string[]) => void
  onClose: () => void
  closeLabel?: string
}

export default function StreamConfigWizard({ initialConfig, workType, onApply, onClose, closeLabel = 'Cancel' }: Props) {
  const [cfg, setCfg] = useState<StreamConfig>(initialConfig ?? DEFAULT_CONFIG)

  const setValue = (id: keyof StreamConfig, value: string | string[] | boolean) =>
    setCfg(prev => ({ ...prev, [id]: value }))

  const toggleMulti = (id: keyof StreamConfig, value: string) => {
    const current = (cfg[id] as string[]) ?? []
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    setCfg(prev => ({ ...prev, [id]: next }))
  }

  const handleApply = () => {
    const streams = generateStreams(cfg, workType)
    onApply(streams, cfg, getActiveRolesFromStreams(streams))
  }

  const preview = generateStreams(cfg, workType)
  const capexCount = preview.filter(s => s.costType === 'capex').length
  const opexCount  = preview.filter(s => s.costType === 'opex').length
  const totalDays  = preview.filter(s => s.costType === 'capex')
    .reduce((sum, s) => sum + Object.values(s.efforts).reduce((a, b) => a + (b ?? 0), 0), 0)

  return (
    <div className="bg-white rounded-2xl border border-slate-200 w-full">

      {/* All questions — single screen */}
      <div className="grid grid-cols-3 gap-6 px-6 py-6">

        {/* Q1 — Platforms */}
        <div className="col-span-2">
          <QuestionLabel text="Target platforms" hint="Select all that apply" />
          <div className="grid grid-cols-3 gap-2">
            {CONFIG_QUESTIONS[0].options!.map(opt => {
              const selected = ((cfg.platforms) ?? []).includes(opt.value)
              return (
                <button key={opt.value} onClick={() => toggleMulti('platforms', opt.value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <span className="text-lg shrink-0">{opt.icon}</span>
                  <span className={`text-xs font-semibold leading-tight ${selected ? 'text-indigo-800' : 'text-slate-700'}`}>{opt.label}</span>
                  {selected && <Check size={12} className="text-indigo-500 ml-auto shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Q2 — Deployment */}
        <div>
          <QuestionLabel text="Deployment" />
          <div className="space-y-1.5">
            {CONFIG_QUESTIONS[1].options!.map(opt => {
              const selected = cfg.deployment === opt.value
              return (
                <button key={opt.value} onClick={() => setValue('deployment', opt.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <span className="text-base shrink-0">{opt.icon}</span>
                  <span className={`text-xs font-semibold ${selected ? 'text-indigo-800' : 'text-slate-700'}`}>{opt.label}</span>
                  {selected && <Check size={12} className="text-indigo-500 ml-auto" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Q3 — Backend complexity */}
        <div>
          <QuestionLabel text="Backend complexity" />
          <div className="space-y-1.5">
            {CONFIG_QUESTIONS[2].options!.map(opt => {
              const selected = cfg.backendComplexity === opt.value
              return (
                <button key={opt.value} onClick={() => setValue('backendComplexity', opt.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <span className="text-base shrink-0">{opt.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${selected ? 'text-indigo-800' : 'text-slate-700'}`}>{opt.label}</div>
                    {opt.hint && <div className="text-xs text-slate-400 truncate">{opt.hint}</div>}
                  </div>
                  {selected && <Check size={12} className="text-indigo-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Q4 — Data requirements */}
        <div>
          <QuestionLabel text="Data requirements" />
          <div className="space-y-1.5">
            {CONFIG_QUESTIONS[3].options!.map(opt => {
              const selected = cfg.dataNeeds === opt.value
              return (
                <button key={opt.value} onClick={() => setValue('dataNeeds', opt.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <span className="text-base shrink-0">{opt.icon}</span>
                  <span className={`text-xs font-semibold ${selected ? 'text-indigo-800' : 'text-slate-700'}`}>{opt.label}</span>
                  {selected && <Check size={12} className="text-indigo-500 ml-auto" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Q5 — Infra scope */}
        <div>
          <QuestionLabel text="Infrastructure scope" />
          <div className="space-y-1.5">
            {CONFIG_QUESTIONS[4].options!.map(opt => {
              const selected = cfg.infraScope === opt.value
              return (
                <button key={opt.value} onClick={() => setValue('infraScope', opt.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
                    selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <span className="text-base shrink-0">{opt.icon}</span>
                  <span className={`text-xs font-semibold ${selected ? 'text-indigo-800' : 'text-slate-700'}`}>{opt.label}</span>
                  {selected && <Check size={12} className="text-indigo-500 ml-auto" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Q6 + Q7 — Toggles */}
        <div className="col-span-3 flex items-center gap-4 pt-2 border-t border-slate-100">
          <ToggleChip
            label="Security / compliance requirements"
            value={cfg.hasSecurityReqs}
            onChange={v => setValue('hasSecurityReqs', v)}
          />
          <ToggleChip
            label="Change management & training in scope"
            value={cfg.hasChangeManagement}
            onChange={v => setValue('hasChangeManagement', v)}
          />
          <div className="ml-auto flex items-center gap-4">
            {/* Live stream count */}
            <div className="text-right">
              <div className="text-sm font-black text-indigo-600">{totalDays}d · {capexCount + opexCount} streams</div>
              <div className="text-xs text-slate-400">{capexCount} CapEx · {opexCount} OpEx</div>
            </div>
            <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 px-3 py-2 rounded-lg transition-colors">
              {closeLabel}
            </button>
            <button onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors">
              <Wand2 size={14} /> Apply streams
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuestionLabel({ text, hint }: { text: string; hint?: string }) {
  return (
    <div className="mb-2.5">
      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">{text}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  )
}

function ToggleChip({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-xs font-semibold transition-all ${
        value ? 'border-indigo-400 bg-indigo-50 text-indigo-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'
      }`}>
      <div className={`w-4 h-4 rounded flex items-center justify-center ${value ? 'bg-indigo-500' : 'border border-slate-300'}`}>
        {value && <Check size={10} className="text-white" />}
      </div>
      {label}
    </button>
  )
}
