import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, RotateCcw, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { useSettingsStore, DEFAULT_SETTINGS } from '../store/settingsStore'
import { ROLES, CURRENCY_SYMBOLS, CATEGORY_LABELS } from '../data/roles'
import { DEFAULT_WORK_ITEM_BANK } from '../data/workItemBank'
import type { RoleId, Currency, WorkItemDefinition } from '../types'

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
  const fx = settings.fxRates ?? DEFAULT_SETTINGS.fxRates
  const fxTyped = fx as Record<string, number>
  const mult = settings.currency === 'USD' ? 1 : fxTyped[settings.currency] ?? 1

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

        {/* FX rates */}
        <Section
          title="FX conversion rates"
          sub="Applied to all currency conversions. Base = GBP 1.0"
          action={<button onClick={() => updateSettings({ fxRates: DEFAULT_SETTINGS.fxRates })} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"><RotateCcw size={12} /> Reset</button>}
        >
          <p className="text-xs text-slate-400 mb-3">USD is the base currency (1.0). All other currencies are expressed as "1 $ = X".</p>
          <div className="grid grid-cols-3 gap-4">
            {(['GBP', 'EUR', 'INR'] as const).map(cur => (
              <div key={cur} className="bg-white border border-slate-200 rounded-xl p-4">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">USD → {cur}</label>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-500">1 $ =</span>
                  <input
                    type="number" min={0} step={0.01}
                    value={(settings.fxRates as Record<string, number> ?? DEFAULT_SETTINGS.fxRates)[cur] ?? 1}
                    onChange={e => updateSettings({ fxRates: { ...(settings.fxRates ?? DEFAULT_SETTINGS.fxRates), [cur]: parseFloat(e.target.value) || 1 } as typeof DEFAULT_SETTINGS.fxRates })}
                    className="flex-1 text-sm font-black text-indigo-700 text-right border border-indigo-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-400 bg-indigo-50"
                  />
                  <span className="text-sm font-semibold text-slate-500">{CURRENCY_SYMBOLS[cur]}</span>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Cost rate default + fallback day rate */}
        <Section
          title="Cost rate defaults"
          sub="Used when no per-role cost rate has been set on an estimate"
          action={<button onClick={() => updateSettings({ defaultCostRatePct: DEFAULT_SETTINGS.defaultCostRatePct, fallbackDayRate: DEFAULT_SETTINGS.fallbackDayRate })} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"><RotateCcw size={12} /> Reset</button>}
        >
          <div className="grid grid-cols-2 gap-4">
            <Slider
              label="Default cost rate (% of billing rate)"
              value={settings.defaultCostRatePct ?? DEFAULT_SETTINGS.defaultCostRatePct}
              min={20} max={90} step={5} unit="%"
              onChange={v => updateSettings({ defaultCostRatePct: v })}
            />
            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Fallback day rate (when no role rate set)</label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{sym}</span>
                <input
                  type="number" min={0}
                  value={Math.round((settings.fallbackDayRate ?? DEFAULT_SETTINGS.fallbackDayRate) * mult)}
                  onChange={e => updateSettings({ fallbackDayRate: Math.round(Number(e.target.value) / mult) })}
                  className="flex-1 text-sm font-black text-slate-700 text-right border border-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:border-indigo-400"
                />
                <span className="text-xs text-slate-400">/day</span>
              </div>
            </div>
          </div>
        </Section>

        {/* Contingency by risk band */}
        <Section
          title="Contingency by risk band"
          sub="Default contingency % applied when a risk band is selected on an estimate"
          action={<button onClick={() => updateSettings({ contingencyByBand: DEFAULT_SETTINGS.contingencyByBand })} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"><RotateCcw size={12} /> Reset</button>}
        >
          <div className="grid grid-cols-5 gap-3">
            {(['green', 'amber', 'red', 'black', 'unknown'] as const).map(band => {
              const colors: Record<string, string> = { green: 'text-green-700 border-green-200 bg-green-50', amber: 'text-amber-700 border-amber-200 bg-amber-50', red: 'text-red-700 border-red-200 bg-red-50', black: 'text-slate-700 border-slate-300 bg-slate-100', unknown: 'text-slate-500 border-slate-200 bg-slate-50' }
              const cfg = settings.contingencyByBand ?? DEFAULT_SETTINGS.contingencyByBand
              return (
                <div key={band} className={`rounded-xl p-3 border ${colors[band]}`}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2 capitalize">{band}</div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number" min={0} max={100}
                      value={cfg[band]}
                      onChange={e => updateSettings({ contingencyByBand: { ...cfg, [band]: Number(e.target.value) } })}
                      className="w-full text-lg font-black text-center border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-300 rounded"
                    />
                    <span className="text-sm font-bold shrink-0">%</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Margin traffic-light thresholds */}
        <Section
          title="Margin health thresholds"
          sub="LM / GM % thresholds for green / amber / red traffic lights across the app"
          action={<button onClick={() => updateSettings({ marginThresholds: DEFAULT_SETTINGS.marginThresholds })} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"><RotateCcw size={12} /> Reset</button>}
        >
          <div className="grid grid-cols-2 gap-4">
            <Slider
              label="Green threshold (≥ X% = healthy)"
              value={(settings.marginThresholds ?? DEFAULT_SETTINGS.marginThresholds).green}
              min={10} max={60} step={5} unit="%"
              onChange={v => updateSettings({ marginThresholds: { ...(settings.marginThresholds ?? DEFAULT_SETTINGS.marginThresholds), green: v } })}
            />
            <Slider
              label="Amber threshold (≥ X% = caution)"
              value={(settings.marginThresholds ?? DEFAULT_SETTINGS.marginThresholds).amber}
              min={5} max={40} step={5} unit="%"
              onChange={v => updateSettings({ marginThresholds: { ...(settings.marginThresholds ?? DEFAULT_SETTINGS.marginThresholds), amber: v } })}
            />
          </div>
          <div className="mt-3 flex gap-3 text-xs">
            <span className="text-green-700 font-semibold">Green ≥ {(settings.marginThresholds ?? DEFAULT_SETTINGS.marginThresholds).green}%</span>
            <span className="text-amber-700 font-semibold">Amber ≥ {(settings.marginThresholds ?? DEFAULT_SETTINGS.marginThresholds).amber}%</span>
            <span className="text-red-600 font-semibold">Red &lt; {(settings.marginThresholds ?? DEFAULT_SETTINGS.marginThresholds).amber}%</span>
          </div>
        </Section>

        {/* OpEx monthly defaults */}
        <Section
          title="OpEx monthly defaults"
          sub="Default monthly costs (GBP) inserted as OpEx streams when a project is configured"
          action={<button onClick={() => updateSettings({ opexDefaults: DEFAULT_SETTINGS.opexDefaults })} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"><RotateCcw size={12} /> Reset</button>}
        >
          <div className="grid grid-cols-3 gap-3">
            {([
              { key: 'cloudStandard'  as const, label: 'Cloud — standard'      },
              { key: 'cloudComplex'   as const, label: 'Cloud — enterprise'     },
              { key: 'onPremStandard' as const, label: 'On-prem — standard'     },
              { key: 'onPremComplex'  as const, label: 'On-prem — enterprise'   },
              { key: 'monitoring'     as const, label: 'Monitoring / observability' },
            ]).map(row => {
              const cfg = settings.opexDefaults ?? DEFAULT_SETTINGS.opexDefaults
              return (
                <div key={row.key} className="bg-white border border-slate-200 rounded-xl p-3">
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">{row.label}</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-400">£</span>
                    <input
                      type="number" min={0} step={100}
                      value={cfg[row.key]}
                      onChange={e => updateSettings({ opexDefaults: { ...cfg, [row.key]: Number(e.target.value) } })}
                      className="flex-1 text-sm font-bold text-slate-700 text-right border border-slate-200 rounded px-2 py-1 focus:outline-none focus:border-indigo-400"
                    />
                    <span className="text-xs text-slate-400">/mo</span>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-slate-400 mt-2">Values are in GBP and converted to the estimate's currency. Edit individual streams in the Stream Matrix after generation.</p>
        </Section>

        {/* Phase splits */}
        <Section
          title="Timeline phase splits"
          sub="How total calendar duration is divided across the 7 delivery phases. Must sum to 100%."
          action={<button onClick={() => updateSettings({ phaseSplits: DEFAULT_SETTINGS.phaseSplits })} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"><RotateCcw size={12} /> Reset</button>}
        >
          {(() => {
            const ps = settings.phaseSplits ?? DEFAULT_SETTINGS.phaseSplits
            const total = Object.values(ps).reduce((a, b) => a + b, 0)
            const phases = [
              { key: 'discovery' as const, label: 'Discovery',      color: 'accent-indigo-600' },
              { key: 'design'    as const, label: 'Design',          color: 'accent-blue-600' },
              { key: 'build'     as const, label: 'Implementation',  color: 'accent-violet-600' },
              { key: 'qa'        as const, label: 'QA / Testing',    color: 'accent-amber-600' },
              { key: 'uat'       as const, label: 'UAT',             color: 'accent-orange-600' },
              { key: 'golive'    as const, label: 'Go-Live',         color: 'accent-green-600' },
              { key: 'hypercare' as const, label: 'Hypercare',       color: 'accent-teal-600' },
            ]
            return (
              <>
                <div className={`text-xs font-bold mb-3 ${Math.abs(total - 100) < 1 ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {total}% {Math.abs(total - 100) < 1 ? '✓' : `(should be 100%)`}
                </div>
                <div className="space-y-3">
                  {phases.map(p => (
                    <div key={p.key} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-28 shrink-0">{p.label}</span>
                      <input
                        type="range" min={0} max={80} step={1}
                        value={ps[p.key]}
                        onChange={e => updateSettings({ phaseSplits: { ...ps, [p.key]: Number(e.target.value) } })}
                        className={`flex-1 ${p.color}`}
                      />
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number" min={0} max={100}
                          value={ps[p.key]}
                          onChange={e => updateSettings({ phaseSplits: { ...ps, [p.key]: Number(e.target.value) } })}
                          className="w-12 text-xs font-bold text-right border border-slate-200 rounded px-1 py-1 focus:outline-none focus:border-indigo-400"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          })()}
        </Section>

        {/* Standards bank editor */}
        <BankEditor />

        <div className="h-8" />
      </div>
    </div>
  )
}

// ── Standards bank editor ─────────────────────────────────────

function BankEditor() {
  const { settings, updateSettings } = useSettingsStore()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCat, setNewItemCat] = useState('backend')

  const custom: WorkItemDefinition[] = settings.customBank ?? []

  const addCustomItem = () => {
    if (!newItemName.trim()) return
    const def: WorkItemDefinition = {
      id: `custom-${Date.now()}`,
      name: newItemName.trim(),
      category: newItemCat as WorkItemDefinition['category'],
      description: 'Custom work item',
      custom: true,
      sizes: [
        { code: 'S', label: 'Small', description: 'Simple case', efforts: { SD: 1 } },
        { code: 'M', label: 'Medium', description: 'Standard case', efforts: { SD: 2 } },
        { code: 'L', label: 'Large', description: 'Complex case', efforts: { SD: 4 } },
      ],
    }
    updateSettings({ customBank: [...custom, def] })
    setNewItemName('')
  }

  const removeCustomItem = (id: string) => {
    updateSettings({ customBank: custom.filter(d => d.id !== id) })
  }

  const updateCustomSize = (defId: string, sizeCode: string, role: RoleId, days: number) => {
    updateSettings({
      customBank: custom.map(d => {
        if (d.id !== defId) return d
        return {
          ...d,
          sizes: d.sizes.map(s =>
            s.code === sizeCode
              ? { ...s, efforts: { ...s.efforts, [role]: days > 0 ? days : undefined } }
              : s
          ),
        }
      }),
    })
  }

  return (
    <Section title="Standards bank" sub="Default work item types (built-in) and your custom definitions. Edit efforts per role per size.">
      {/* Built-in list */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Built-in definitions ({DEFAULT_WORK_ITEM_BANK.length})
        </div>
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
          {DEFAULT_WORK_ITEM_BANK.map(def => (
            <div key={def.id}>
              <button
                onClick={() => setExpanded(expanded === def.id ? null : def.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                {expanded === def.id ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
                <span className="text-xs font-semibold text-slate-700 flex-1">{def.name}</span>
                <span className="text-xs text-slate-400">{CATEGORY_LABELS[def.category] ?? def.category}</span>
                <span className="text-xs text-slate-400">{def.sizes.map(s => s.code).join(' / ')}</span>
              </button>
              {expanded === def.id && (
                <div className="px-4 pb-3 space-y-2 bg-slate-50/50">
                  <div className="text-xs text-slate-400 pb-1">{def.description}</div>
                  {def.sizes.map(sz => (
                    <div key={sz.code} className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-black text-indigo-600 w-6">{sz.code}</span>
                        <span className="text-xs font-semibold text-slate-700">{sz.label}</span>
                        <span className="text-xs text-slate-400">— {sz.description}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(sz.efforts).map(([role, days]) => (
                          <div key={role} className="flex items-center gap-1 bg-indigo-50 rounded px-2 py-0.5">
                            <span className="text-xs font-bold text-indigo-600">{role}</span>
                            <span className="text-xs text-slate-500">{days}d</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Custom items */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden mb-4">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-500 uppercase tracking-wider">
          Custom definitions ({custom.length})
        </div>
        {custom.length === 0 ? (
          <div className="px-4 py-6 text-xs text-slate-400 text-center">No custom items yet — add one below</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {custom.map(def => (
              <div key={def.id}>
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <button onClick={() => setExpanded(expanded === def.id ? null : def.id)} className="text-slate-400">
                    {expanded === def.id ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  </button>
                  <span className="text-xs font-semibold text-slate-700 flex-1">{def.name}</span>
                  <span className="text-xs text-slate-400">{CATEGORY_LABELS[def.category] ?? def.category}</span>
                  <button onClick={() => removeCustomItem(def.id)} className="p-1 text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={12} /></button>
                </div>
                {expanded === def.id && (
                  <div className="px-4 pb-3 space-y-2 bg-slate-50/50">
                    {def.sizes.map(sz => (
                      <div key={sz.code} className="bg-white rounded-lg border border-slate-200 px-3 py-2">
                        <div className="text-xs font-bold text-indigo-600 mb-1.5">{sz.code} — {sz.label}</div>
                        <div className="flex flex-wrap gap-2">
                          {(Object.keys(ROLES) as RoleId[]).map(role => (
                            <div key={role} className="flex items-center gap-1">
                              <span className="text-xs text-slate-400 w-6">{role}</span>
                              <input
                                type="number" min={0} step={0.5}
                                value={sz.efforts[role] ?? ''}
                                placeholder="0"
                                onChange={e => updateCustomSize(def.id, sz.code, role, parseFloat(e.target.value) || 0)}
                                className="w-12 text-xs text-center border border-slate-200 rounded py-0.5 focus:outline-none focus:border-indigo-400"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add custom */}
      <div className="flex gap-2">
        <input
          value={newItemName}
          onChange={e => setNewItemName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addCustomItem()}
          placeholder="New work item name…"
          className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-indigo-300"
        />
        <select value={newItemCat} onChange={e => setNewItemCat(e.target.value)}
          className="text-xs border border-slate-200 rounded-xl px-2 py-2 focus:outline-none">
          {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button onClick={addCustomItem} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-colors">
          <Plus size={13} /> Add
        </button>
      </div>
    </Section>
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
