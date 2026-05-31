import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, Shield, DollarSign, Calendar, Download, Settings, List, Share2, Check, Users, FileText, SlidersHorizontal } from 'lucide-react'
import { useEstimatorStore, calcTotals } from '../store/estimatorStore'
import StreamsTab from '../components/tabs/StreamsTab'
import RiskTab from '../components/tabs/RiskTab'
import CostTab from '../components/tabs/CostTab'
import TimelineTab from '../components/tabs/TimelineTab'
import LineItemsTab from '../components/tabs/LineItemsTab'
import ResourceTab from '../components/tabs/ResourceTab'
import ScopeTab from '../components/tabs/ScopeTab'
import { encodeEstimateToUrl } from '../lib/shareIO'
import { generateEstimatePrint } from '../lib/printExport'
import type { RiskBand, Currency } from '../types'

const TABS = [
  { id: 'scope',     label: 'Scope',          icon: SlidersHorizontal },
  { id: 'lineitems', label: 'Line Items',      icon: List },
  { id: 'streams',   label: 'Stream Matrix',   icon: BarChart3 },
  { id: 'risk',      label: 'Risk & Effort',   icon: Shield },
  { id: 'cost',      label: 'Cost Build-up',   icon: DollarSign },
  { id: 'timeline',  label: 'Timeline',        icon: Calendar },
  { id: 'resource',  label: 'Resource Plan',   icon: Users },
]

const BAND_COLORS: Record<RiskBand, string> = {
  green:   'bg-green-100 text-green-700',
  amber:   'bg-amber-100 text-amber-700',
  red:     'bg-red-100 text-red-700',
  black:   'bg-slate-200 text-slate-700',
  unknown: 'bg-slate-100 text-slate-500',
}

export default function Estimator() {
  const { getActive, updateField, forkEstimate } = useEstimatorStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('scope')
  const [copied, setCopied] = useState(false)
  const [saveFlash, setSaveFlash] = useState(false)
  const est = getActive()

  if (!est) return null

  const totals = calcTotals(est)
  const sym = totals.sym

  const fmt = (n: number) =>
    est.currency === 'INR' ? `${sym}${Math.round(n).toLocaleString()}` : `${sym}${Math.round(n / 1000)}k`

  // #10 auto-save flash wrapper
  const touch = <K extends keyof typeof est>(k: K, v: typeof est[K]) => {
    updateField(k, v); setSaveFlash(true); setTimeout(() => setSaveFlash(false), 1200)
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(est, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `cortex-${(est.name || est.id).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`
    a.click(); URL.revokeObjectURL(url)
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
              <input value={est.name} onChange={e => touch('name', e.target.value)} placeholder="Estimate name…"
                className="text-base font-semibold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 focus:outline-none py-0.5 min-w-32 max-w-64" />
              <input value={est.clientName} onChange={e => touch('clientName', e.target.value)} placeholder="Client name…"
                className="text-sm text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-400 focus:outline-none py-0.5 max-w-40" />
              {/* #10 auto-save */}
              <span className={`text-xs transition-all duration-700 ${saveFlash ? 'text-green-500' : 'text-slate-300'}`}>
                {saveFlash ? '✓ Saved' : 'Auto-saved'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            {/* Work type shown as badge — edit in Scope tab */}
            <button onClick={() => setActiveTab('scope')}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors flex items-center gap-1.5">
              <SlidersHorizontal size={12} />
              {est.workType ? est.workType.replace('-', ' ') : 'Generic'}
            </button>
            {est.riskBand !== 'unknown' && (
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${BAND_COLORS[est.riskBand]}`}>{est.riskBand} risk</span>
            )}
            {/* #7 Fork */}
            <button onClick={() => { const id = forkEstimate(); if (id) navigate(`/estimate/${id}`) }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
              Fork
            </button>
            {/* #9 Billing currency */}
            <select value={est.billingCurrency ?? est.currency} onChange={e => touch('billingCurrency', e.target.value as Currency)}
              title="Billing currency — may differ from delivery cost currency"
              className="text-xs text-slate-600 border border-slate-200 rounded-lg px-2 py-2 bg-white focus:outline-none">
              <option value="USD">$ USD bill</option>
              <option value="GBP">£ GBP bill</option>
              <option value="EUR">€ EUR bill</option>
              <option value="INR">₹ INR bill</option>
            </select>
            {/* #3 Share */}
            <button onClick={async () => { await navigator.clipboard.writeText(encodeEstimateToUrl(est)).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
              {copied ? <Check size={13} className="text-green-600" /> : <Share2 size={13} />}
              {copied ? 'Copied!' : 'Share'}
            </button>
            {/* #5 Print */}
            <button onClick={() => generateEstimatePrint(est, totals.sym, totals.mult)}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
              <FileText size={13} /> Print
            </button>
            <button onClick={handleExport}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 px-3 py-2 rounded-lg border border-slate-200 hover:border-indigo-300 transition-colors">
              <Download size={13} /> Export
            </button>
            <button onClick={() => navigate('/settings')}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
              <Settings size={13} /> Settings
            </button>
          </div>
        </div>
      </header>

      {/* Mode toggle + summary strip */}
      <div className="bg-indigo-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-5 overflow-x-auto">
          {/* Mode toggle */}
          <div className="flex items-center gap-1 bg-indigo-800 rounded-lg p-1 shrink-0">
            <button onClick={() => updateField('estimationMode', 'detailed')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${est.estimationMode === 'detailed' ? 'bg-white text-indigo-900' : 'text-indigo-300 hover:text-white'}`}>
              Detailed
            </button>
            <button onClick={() => updateField('estimationMode', 'quick')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${est.estimationMode === 'quick' ? 'bg-white text-indigo-900' : 'text-indigo-300 hover:text-white'}`}>
              Quick
            </button>
          </div>
          <div className="text-xs text-indigo-400 shrink-0">
            {est.estimationMode === 'detailed' ? `${(est.lineItems ?? []).length} line items` : 'stream matrix'}
          </div>
          <div className="h-4 w-px bg-indigo-700" />
          <SummaryPill label="Total effort" value={`${totals.totalDays}d`} highlight />
          <div className="h-4 w-px bg-indigo-700" />
          <SummaryPill label="Direct cost" value={fmt(totals.totalCost)} />
          <SummaryPill label="Sell price" value={fmt(totals.sellPrice)} highlight />
          <SummaryPill label="Margin" value={`${totals.impliedMarginPct.toFixed(0)}%`} />
          <div className="h-4 w-px bg-indigo-700" />
          <SummaryPill label="Duration" value={`${totals.calendarWeeks}w`} />
          <SummaryPill label="Sprints" value={`${totals.sprints}`} />
          {/* #8 Budget gap */}
          {(est.targetBudget ?? 0) > 0 && (() => {
            const budget = est.targetBudget! * totals.mult
            const delta = budget - totals.sellPrice
            const over = delta < 0
            return (
              <>
                <div className="h-4 w-px bg-indigo-700" />
                <div className="text-center shrink-0">
                  <div className={`text-sm font-black ${over ? 'text-red-400' : 'text-green-400'}`}>
                    {over ? '▲' : '▼'} {sym}{Math.round(Math.abs(delta) / 1000)}k
                  </div>
                  <div className="text-xs text-indigo-400 mt-0.5">{over ? 'over budget' : 'under budget'}</div>
                </div>
              </>
            )
          })()}
        </div>
        {est.estimationMode === 'detailed' && (est.lineItems ?? []).length === 0 && (
          <div className="max-w-6xl mx-auto px-6 pb-2 text-xs text-amber-300">
            ⚠ Detailed mode — no line items yet. Go to Line Items tab and pick from the standards bank.
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 flex gap-1 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}>
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-6">
        {activeTab === 'scope'     && <ScopeTab />}
        {activeTab === 'lineitems' && <LineItemsTab />}
        {activeTab === 'streams'   && <StreamsTab />}
        {activeTab === 'risk'      && <RiskTab />}
        {activeTab === 'cost'      && <CostTab />}
        {activeTab === 'timeline'  && <TimelineTab />}
        {activeTab === 'resource'  && <ResourceTab />}
      </main>
    </div>
  )
}

function SummaryPill({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center shrink-0">
      <div className={`text-sm font-black ${highlight ? 'text-white' : 'text-indigo-300'}`}>{value}</div>
      <div className="text-xs text-indigo-400 mt-0.5">{label}</div>
    </div>
  )
}
