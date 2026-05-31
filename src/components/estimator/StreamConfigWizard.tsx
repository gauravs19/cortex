import { useState } from 'react'
import { ArrowRight, ArrowLeft, Check, Wand2 } from 'lucide-react'
import { CONFIG_QUESTIONS, DEFAULT_CONFIG, generateStreams, getActiveRolesFromStreams } from '../../data/streamConfigurator'
import type { StreamConfig } from '../../types'

interface Props {
  initialConfig?: StreamConfig
  workType: string
  onApply: (streams: ReturnType<typeof generateStreams>, config: StreamConfig, roles: string[]) => void
  onClose: () => void
  closeLabel?: string  // override the cancel/close button text
}

export default function StreamConfigWizard({ initialConfig, workType, onApply, onClose, closeLabel = 'Cancel' }: Props) {
  const [step, setStep] = useState(0)
  const [cfg, setCfg] = useState<StreamConfig>(initialConfig ?? DEFAULT_CONFIG)

  const q = CONFIG_QUESTIONS[step]
  const isLast = step === CONFIG_QUESTIONS.length - 1

  const setValue = (id: keyof StreamConfig, value: string | string[] | boolean) => {
    setCfg(prev => ({ ...prev, [id]: value }))
  }

  const toggleMulti = (id: keyof StreamConfig, value: string) => {
    const current = (cfg[id] as string[]) ?? []
    const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value]
    setCfg(prev => ({ ...prev, [id]: next }))
  }

  const handleApply = () => {
    const streams = generateStreams(cfg, workType)
    const roles = getActiveRolesFromStreams(streams)
    onApply(streams, cfg, roles)
  }

  const preview = generateStreams(cfg, workType)
  const capexStreams = preview.filter(s => s.costType === 'capex')
  const opexStreams  = preview.filter(s => s.costType === 'opex')
  const totalDays = capexStreams.reduce((sum, s) =>
    sum + Object.values(s.efforts).reduce((a, b) => a + (b ?? 0), 0), 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Wand2 size={18} className="text-indigo-600" />
            <div>
              <div className="text-sm font-bold text-slate-900">Configure work streams</div>
              <div className="text-xs text-slate-400 mt-0.5">Answer a few questions to auto-generate your stream breakdown</div>
            </div>
          </div>
          <div className="flex gap-1">
            {CONFIG_QUESTIONS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-indigo-600' : i < step ? 'w-2 bg-indigo-300' : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Question panel */}
          <div className="flex-1 px-6 py-6 overflow-y-auto">
            <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">
              Question {step + 1} of {CONFIG_QUESTIONS.length}
            </div>
            <div className="text-base font-bold text-slate-900 mb-5">{q.question}</div>

            {q.type === 'multi' && q.options && (
              <div className="grid grid-cols-2 gap-2">
                {q.options.map(opt => {
                  const selected = ((cfg[q.id] as string[]) ?? []).includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleMulti(q.id, opt.value)}
                      className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl shrink-0">{opt.icon}</span>
                      <div>
                        <div className={`text-sm font-semibold ${selected ? 'text-indigo-800' : 'text-slate-700'}`}>{opt.label}</div>
                        {opt.hint && <div className="text-xs text-slate-400 mt-0.5">{opt.hint}</div>}
                      </div>
                      {selected && <Check size={14} className="text-indigo-600 ml-auto shrink-0 mt-0.5" />}
                    </button>
                  )
                })}
              </div>
            )}

            {q.type === 'single' && q.options && (
              <div className="space-y-2">
                {q.options.map(opt => {
                  const selected = cfg[q.id] === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setValue(q.id, opt.value)}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                        selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-2xl shrink-0">{opt.icon}</span>
                      <div className="flex-1">
                        <div className={`text-sm font-semibold ${selected ? 'text-indigo-800' : 'text-slate-700'}`}>{opt.label}</div>
                        {opt.hint && <div className="text-xs text-slate-400 mt-0.5">{opt.hint}</div>}
                      </div>
                      {selected && <Check size={16} className="text-indigo-600 shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}

            {q.type === 'toggle' && (
              <div className="flex gap-3">
                {[{ value: true, label: 'Yes, include it', icon: '✅' }, { value: false, label: 'No, skip it', icon: '⏭️' }].map(opt => {
                  const selected = cfg[q.id] === opt.value
                  return (
                    <button
                      key={String(opt.value)}
                      onClick={() => setValue(q.id, opt.value)}
                      className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                        selected ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      <span className={`text-sm font-semibold ${selected ? 'text-indigo-800' : 'text-slate-600'}`}>{opt.label}</span>
                      {selected && <Check size={14} className="text-indigo-600 ml-auto" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Preview panel */}
          <div className="w-64 shrink-0 border-l border-slate-100 bg-slate-50 overflow-y-auto p-4 flex flex-col gap-4">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live preview</div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                <div className="text-lg font-black text-indigo-700">{totalDays}</div>
                <div className="text-xs text-slate-500">Base days</div>
              </div>
              <div className="bg-white rounded-lg p-2.5 text-center border border-slate-200">
                <div className="text-lg font-black text-slate-700">{capexStreams.length + opexStreams.length}</div>
                <div className="text-xs text-slate-500">Streams</div>
              </div>
            </div>

            {capexStreams.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1.5">CapEx streams</div>
                <div className="space-y-1">
                  {capexStreams.map(st => {
                    const d = Object.values(st.efforts).reduce((a, b) => a + (b ?? 0), 0)
                    return (
                      <div key={st.id} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-slate-200">
                        <span className="text-xs text-slate-600 truncate flex-1">{st.name}</span>
                        <span className="text-xs font-bold text-indigo-600 ml-2 shrink-0">{d}d</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {opexStreams.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-amber-600 mb-1.5">OpEx streams</div>
                <div className="space-y-1">
                  {opexStreams.map(st => (
                    <div key={st.id} className="flex items-center justify-between bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-200">
                      <span className="text-xs text-amber-700 truncate flex-1">{st.name}</span>
                      <span className="text-xs font-bold text-amber-600 ml-2 shrink-0">£{st.monthlyRate}/mo</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex gap-2">
            <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 px-3 py-2 rounded-lg transition-colors">
              {closeLabel}
            </button>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft size={13} /> Back
              </button>
            )}
          </div>

          {isLast ? (
            <button
              onClick={handleApply}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              <Wand2 size={14} /> Apply {capexStreams.length + opexStreams.length} streams
            </button>
          ) : (
            <button
              onClick={() => setStep(s => s + 1)}
              className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Next <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
