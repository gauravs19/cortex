import { useState } from 'react'
import { BarChart3, Shield, DollarSign, Calendar, Download } from 'lucide-react'
import { useEstimatorStore, calcTotals } from '../store/estimatorStore'
import StreamsTab from '../components/tabs/StreamsTab'
import RiskTab from '../components/tabs/RiskTab'
import CostTab from '../components/tabs/CostTab'
import TimelineTab from '../components/tabs/TimelineTab'
import type { RiskBand } from '../types'

const TABS = [
  { id: 'streams',  label: 'Work Streams',    icon: BarChart3 },
  { id: 'risk',     label: 'Risk & Effort',   icon: Shield },
  { id: 'cost',     label: 'Cost Build-up',   icon: DollarSign },
  { id: 'timeline', label: 'Timeline',        icon: Calendar },
]

const WORK_TYPES = [
  { value: '',                      label: 'Generic / Custom' },
  { value: 'digital-transformation', label: 'Digital Transformation' },
  { value: 'ai-ml',                 label: 'AI / ML' },
  { value: 'erp',                   label: 'ERP Implementation' },
  { value: 'cloud-migration',       label: 'Cloud Migration' },
  { value: 'data-platform',         label: 'Data Platform' },
  { value: 'security',              label: 'Security' },
  { value: 'managed-service',       label: 'Managed Service' },
]

const BAND_COLORS: Record<RiskBand, string> = {
  green:   'bg-green-100 text-green-700',
  amber:   'bg-amber-100 text-amber-700',
  red:     'bg-red-100 text-red-700',
  black:   'bg-slate-200 text-slate-700',
  unknown: 'bg-slate-100 text-slate-500',
}

export default function Estimator() {
  const { getActive, updateField, setWorkType } = useEstimatorStore()
  const [activeTab, setActiveTab] = useState('streams')
  const est = getActive()

  if (!est) return null

  const totals = calcTotals(est)
  const sym = totals.sym

  const fmt = (n: number) =>
    est.currency === 'INR'
      ? `${sym}${Math.round(n).toLocaleString()}`
      : `${sym}${Math.round(n / 1000)}k`

  const handleExport = () => {
    const json = JSON.stringify(est, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cortex-${(est.name || est.id).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Top bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div>
              <div className="text-lg font-black text-slate-900 tracking-tight">CORTEX</div>
              <div className="text-xs text-slate-400">Cost · Rate · Timeline EXecution</div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="flex items-center gap-3 min-w-0">
              <input
                value={est.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder="Estimate name…"
                className="text-base font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 focus:outline-none py-0.5 min-w-32 max-w-64"
              />
              <input
                value={est.clientName}
                onChange={e => updateField('clientName', e.target.value)}
                placeholder="Client name…"
                className="text-sm text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 focus:outline-none py-0.5 max-w-40"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <select
              value={est.workType}
              onChange={e => setWorkType(e.target.value, true)}
              className="text-xs text-slate-600 border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-indigo-300"
            >
              {WORK_TYPES.map(w => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
            {est.riskBand !== 'unknown' && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BAND_COLORS[est.riskBand]}`}>
                {est.riskBand} risk
              </span>
            )}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors"
            >
              <Download size={13} /> Export JSON
            </button>
          </div>
        </div>
      </header>

      {/* Summary strip */}
      <div className="bg-indigo-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-8">
          <SummaryPill label="Base effort" value={`${totals.baseDays}d`} />
          <SummaryPill label="With contingency" value={`${totals.totalDays}d`} highlight />
          <div className="h-4 w-px bg-indigo-700" />
          <SummaryPill label="Direct cost" value={fmt(totals.totalCost)} />
          <SummaryPill label="Sell price" value={fmt(totals.sellPrice)} highlight />
          <SummaryPill label="Margin" value={`${totals.impliedMarginPct.toFixed(0)}%`} />
          <div className="h-4 w-px bg-indigo-700" />
          <SummaryPill label="Duration" value={`${totals.calendarWeeks}w`} />
          <SummaryPill label="Sprints" value={`${totals.sprints}`} />
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex gap-1">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">
        {activeTab === 'streams'  && <StreamsTab />}
        {activeTab === 'risk'     && <RiskTab />}
        {activeTab === 'cost'     && <CostTab />}
        {activeTab === 'timeline' && <TimelineTab />}
      </main>
    </div>
  )
}

function SummaryPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-sm font-black ${highlight ? 'text-white' : 'text-indigo-300'}`}>{value}</div>
      <div className="text-xs text-indigo-400 mt-0.5">{label}</div>
    </div>
  )
}
