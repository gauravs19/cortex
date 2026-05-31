import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { useSettingsStore } from '../store/settingsStore'
import { ROLES, CURRENCY_SYMBOLS } from '../data/roles'
import type { RoleId, Currency } from '../types'

const CURRENCIES: { value: Currency; label: string; symbol: string }[] = [
  { value: 'USD', label: 'US Dollar',       symbol: '$' },
  { value: 'GBP', label: 'British Pound',   symbol: '£' },
  { value: 'EUR', label: 'Euro',            symbol: '€' },
  { value: 'INR', label: 'Indian Rupee',    symbol: '₹' },
]

const SCALE_LABELS: Record<string, string> = {
  simple:       'Simple project (greenfield, minimal integration)',
  medium:       'Medium project (standard complexity)',
  complex:      'Complex project (legacy, heavy integration)',
  infraMinimal: 'Infra scope: Minimal (use existing)',
  infraStandard:'Infra scope: Standard cloud setup',
  infraComplex: 'Infra scope: Enterprise-grade',
}

export default function Settings() {
  const navigate = useNavigate()
  const { settings, updateSettings, setRate, setEffortScale, resetRates, resetEffortScale } = useSettingsStore()
  const sym = CURRENCY_SYMBOLS[settings.currency] ?? '$'
  const mult = settings.currency === 'GBP' ? 1 : settings.currency === 'USD' ? 1.27 : settings.currency === 'EUR' ? 1.17 : 105

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-base font-bold text-slate-900">Settings</div>
            <div className="text-xs text-slate-400">Firm defaults applied to all new estimates</div>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">

        {/* Firm profile */}
        <Section title="Firm profile" sub="Basic info applied to all estimates">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Firm name</label>
              <input
                value={settings.firmName}
                onChange={e => updateSettings({ firmName: e.target.value })}
                placeholder="Your firm / team name…"
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-300"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Default currency</label>
              <div className="flex gap-2">
                {CURRENCIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => updateSettings({ currency: c.value })}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-colors border-2 ${
                      settings.currency === c.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {c.symbol} {c.value}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Estimate defaults */}
        <Section title="Estimate defaults" sub="Applied when creating a new estimate">
          <div className="grid grid-cols-2 gap-x-6 gap-y-5">
            <Slider
              label="Default margin target"
              value={settings.defaultMarginPct}
              min={5} max={50} step={5} unit="%"
              onChange={v => updateSettings({ defaultMarginPct: v })}
            />
            <Slider
              label="Default overhead"
              value={settings.defaultOverheadPct}
              min={0} max={30} step={5} unit="%"
              onChange={v => updateSettings({ defaultOverheadPct: v })}
            />
            <Slider
              label="Default sprint length"
              value={settings.defaultSprintWeeks}
              min={1} max={4} step={1} unit="wk"
              onChange={v => updateSettings({ defaultSprintWeeks: v })}
            />
            <Slider
              label="Default working days/week"
              value={settings.defaultWorkingDaysPerWeek}
              min={4} max={5} step={1} unit="d"
              onChange={v => updateSettings({ defaultWorkingDaysPerWeek: v })}
            />
            <Slider
              label="Default project duration (OpEx)"
              value={settings.defaultProjectMonths}
              min={1} max={36} step={1} unit="mo"
              onChange={v => updateSettings({ defaultProjectMonths: v })}
            />
          </div>
        </Section>

        {/* Blended rate */}
        <Section title="Rate mode" sub="Choose between per-role rates or a single blended day rate">
          <div className="flex gap-3 mb-5">
            <button
              onClick={() => updateSettings({ useBlendedRate: false })}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl border-2 transition-colors ${
                !settings.useBlendedRate ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              Per-role rates
            </button>
            <button
              onClick={() => updateSettings({ useBlendedRate: true })}
              className={`flex-1 py-3 text-sm font-semibold rounded-xl border-2 transition-colors ${
                settings.useBlendedRate ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              Blended day rate
            </button>
          </div>

          {settings.useBlendedRate ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
              <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">Blended daily rate</div>
              <div className="flex items-center gap-3">
                <span className="text-xl font-bold text-indigo-600">{sym}</span>
                <input
                  type="number"
                  min={0}
                  value={Math.round(settings.blendedRate * mult)}
                  onChange={e => updateSettings({ blendedRate: Math.round(Number(e.target.value) / mult) })}
                  className="w-32 text-2xl font-black text-indigo-700 text-center border border-indigo-200 rounded-xl py-2 focus:outline-none focus:border-indigo-400 bg-white"
                />
                <span className="text-sm text-slate-500">per day · applied to all roles</span>
              </div>
              <p className="text-xs text-indigo-500 mt-3">A blended rate simplifies costing when you don't want to break down by role seniority. All roles use this single rate in new estimates.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Default rate card ({sym}/day)</span>
                <button onClick={resetRates} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  <RotateCcw size={12} /> Reset to defaults
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {(Object.keys(ROLES) as RoleId[]).map(role => (
                  <div key={role} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-8 text-xs font-black text-slate-400">{role}</div>
                    <div className="flex-1 text-sm text-slate-700">{ROLES[role].name}</div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-400">{sym}</span>
                      <input
                        type="number"
                        min={0}
                        value={Math.round((settings.rateCard[role] ?? ROLES[role].defaultRate) * mult)}
                        onChange={e => setRate(role, Math.round(Number(e.target.value) / mult))}
                        className="w-24 text-sm font-semibold text-slate-800 text-right border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400"
                      />
                      <span className="text-xs text-slate-400">/day</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Effort calibration */}
        <Section
          title="Effort calibration"
          sub="Scale the wizard's base effort values up or down to match your team's typical velocity"
          action={<button onClick={resetEffortScale} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"><RotateCcw size={12} /> Reset</button>}
        >
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4 text-xs text-amber-700 leading-relaxed">
            These multipliers scale the wizard's auto-generated effort. A value of <strong>1.0</strong> = wizard default. <strong>0.8</strong> = your team is 20% faster. <strong>1.3</strong> = your projects typically run 30% larger than the default assumption.
          </div>
          <div className="space-y-4">
            {(Object.entries(settings.effortScale) as [keyof typeof settings.effortScale, number][]).map(([key, val]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-700">{SCALE_LABELS[key]}</span>
                  <span className="text-sm font-black text-indigo-600 w-10 text-right">{val.toFixed(1)}×</span>
                </div>
                <input
                  type="range"
                  min={0.3} max={3.0} step={0.1}
                  value={val}
                  onChange={e => setEffortScale(key, parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
                <div className="flex justify-between text-xs text-slate-300 mt-0.5">
                  <span>0.3× faster</span>
                  <span className="text-slate-400 font-semibold">1.0 default</span>
                  <span>3.0× larger</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        <div className="h-8" />
      </div>
    </div>
  )
}

// ── Small helpers ─────────────────────────────────────────────

function Section({ title, sub, children, action }: {
  title: string; sub: string; children: React.ReactNode; action?: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-sm font-bold text-slate-900">{title}</div>
          <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function Slider({ label, value, min, max, step, unit, onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit: string; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</label>
        <span className="text-sm font-black text-indigo-600">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </div>
  )
}
