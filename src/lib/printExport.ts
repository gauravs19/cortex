import type { Estimate } from '../types'
import { ROLES } from '../data/roles'
import { DEFAULT_WORK_ITEM_BANK, getWorkItemById, computeLineItemEfforts } from '../data/workItemBank'
import { useSettingsStore } from '../store/settingsStore'

const PHASE_LABELS = ['Discovery', 'Design', 'Implementation', 'QA / Testing', 'UAT', 'Go-Live', 'Hypercare']
const DEFAULT_PHASE_PCTS = [0.10, 0.10, 0.45, 0.15, 0.10, 0.05, 0.05]

function addWeeks(dateStr: string, weeks: number) {
  const d = new Date(dateStr); d.setDate(d.getDate() + weeks * 7)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function generateEstimatePrint(est: Estimate, sym: string, mult: number): void {
  const fmt = (n: number) => `${sym}${Math.round(n).toLocaleString()}`
  const fmtK = (n: number) => `${sym}${Math.round(n / 1000)}k`

  // Settings-driven values
  const settings = useSettingsStore.getState().settings
  const costPct = (settings.defaultCostRatePct ?? 55) / 100
  const fallback = settings.fallbackDayRate ?? 600
  const ps = settings.phaseSplits
  const PHASE_PCTS = ps
    ? [ps.discovery, ps.design, ps.build, ps.qa, ps.uat, ps.golive, ps.hypercare].map(v => (v ?? 10) / 100)
    : DEFAULT_PHASE_PCTS

  // Effort source
  const effortByRole: Record<string, number> = {}
  let baseDays = 0
  if (est.estimationMode === 'detailed' && est.lineItems?.length) {
    for (const li of est.lineItems) {
      const def = getWorkItemById(li.definitionId, DEFAULT_WORK_ITEM_BANK)
      if (!def) continue
      const efforts = computeLineItemEfforts(def, li.sizeCode, li.quantity)
      for (const [r, d] of Object.entries(efforts)) {
        effortByRole[r] = (effortByRole[r] ?? 0) + (d as number)
        baseDays += d as number
      }
    }
  } else {
    for (const st of est.streams.filter(s => s.costType !== 'opex')) {
      for (const [r, d] of Object.entries(st.efforts)) {
        effortByRole[r] = (effortByRole[r] ?? 0) + (d ?? 0)
        baseDays += d ?? 0
      }
    }
  }
  const contingencyFactor = 1 + est.contingencyPct / 100
  const contingencyDays = Math.round(baseDays * est.contingencyPct / 100)
  const totalDays = baseDays + contingencyDays
  // Two-rate model: revenue = billing rate × days; direct cost = cost rate × days
  let baseRevenue = 0, baseDirectCost = 0
  const costRates = est.costRateCard ?? {}
  for (const [r, d] of Object.entries(effortByRole)) {
    const billRate = (est.rateCard[r as keyof typeof est.rateCard] ?? ROLES[r as keyof typeof ROLES]?.defaultRate ?? fallback) * mult
    const costRate = (costRates[r as keyof typeof costRates] ?? Math.round(billRate * costPct / mult)) * mult
    baseRevenue += d * billRate
    baseDirectCost += d * costRate
  }
  const sellPrice = baseRevenue * contingencyFactor
  const directCost = baseDirectCost * contingencyFactor
  const labourMargin = sellPrice - directCost
  const overhead = sellPrice * est.overheadPct / 100
  const margin = labourMargin
  void directCost  // referenced in template via directCost directly
  const activeHeadcount = Object.values(effortByRole).filter(d => d > 0).length || 1
  const calendarWeeks = Math.ceil(totalDays / (activeHeadcount * est.workingDaysPerWeek))
  const startDate = est.startDate ?? new Date().toISOString().slice(0, 10)

  const opexMonthly = est.streams
    .filter(s => s.costType === 'opex')
    .reduce((sum, s) => sum + (s.monthlyRate ?? 0) * mult, 0)

  // Line items table HTML
  const lineItemsHtml = (est.estimationMode === 'detailed' && est.lineItems?.length)
    ? `<table class="li-table">
        <thead><tr><th>Item</th><th>Type</th><th>Size</th><th>Qty</th><th>Days</th></tr></thead>
        <tbody>
        ${est.lineItems.map(li => {
          const def = getWorkItemById(li.definitionId, DEFAULT_WORK_ITEM_BANK)
          const d = def ? Object.values(computeLineItemEfforts(def, li.sizeCode, li.quantity)).reduce((a,b)=>a+(b??0),0) : 0
          return `<tr><td>${li.label}</td><td>${def?.name ?? '—'}</td><td>${li.sizeCode}</td><td>${li.quantity}</td><td>${Math.round(d*10)/10}d</td></tr>`
        }).join('')}
        </tbody></table>`
    : '<p class="muted">Quick mode — see stream matrix for breakdown.</p>'

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>CORTEX Estimate — ${est.name}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;font-size:12px;color:#1e293b;background:#fff;padding:32px}
h1{font-size:22px;font-weight:900;margin-bottom:4px}
h2{font-size:13px;font-weight:800;color:#6366f1;text-transform:uppercase;letter-spacing:.05em;margin:24px 0 10px;border-bottom:1px solid #e2e8f0;padding-bottom:4px}
.meta{color:#64748b;font-size:11px;margin-bottom:24px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px}
.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px}
.card-label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin-bottom:4px}
.card-value{font-size:20px;font-weight:900;color:#1e293b}
.card-sub{font-size:10px;color:#94a3b8;margin-top:2px}
.cost-table{width:100%;border-collapse:collapse}
.cost-table td{padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12px}
.cost-table td:last-child{text-align:right;font-weight:700}
.cost-total{background:#eef2ff}
.cost-total td{font-size:14px;font-weight:900;color:#4f46e5}
.li-table{width:100%;border-collapse:collapse;font-size:11px}
.li-table th{background:#f8fafc;padding:6px 8px;text-align:left;font-weight:600;color:#64748b;border-bottom:2px solid #e2e8f0}
.li-table td{padding:5px 8px;border-bottom:1px solid #f1f5f9}
.phases{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.phase{background:#f8fafc;border-radius:6px;padding:8px 6px;text-align:center}
.phase-label{font-size:10px;font-weight:700;color:#6366f1}
.phase-weeks{font-size:14px;font-weight:900;color:#1e293b}
.phase-dates{font-size:9px;color:#94a3b8}
.assume{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;margin-bottom:6px;font-size:11px}
.assume-badge{display:inline-block;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;margin-right:6px}
.high{background:#fee2e2;color:#b91c1c}.medium{background:#fef9c3;color:#92400e}.low{background:#dcfce7;color:#166534}
.muted{color:#94a3b8;font-style:italic;font-size:11px}
.opex{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:12px;margin-top:12px}
.footer{margin-top:32px;padding-top:12px;border-top:1px solid #e2e8f0;color:#94a3b8;font-size:10px;display:flex;justify-content:space-between}
@media print{body{padding:16px}}
</style></head><body>

<h1>${est.name || 'Untitled Estimate'}</h1>
<div class="meta">${est.clientName ? `Client: <strong>${est.clientName}</strong> · ` : ''}Work type: ${est.workType || 'General'} · Risk: ${est.riskBand} · Generated: ${new Date().toLocaleDateString('en-GB', {day:'numeric',month:'short',year:'numeric'})}</div>

<h2>Project summary</h2>
<div class="grid3">
  <div class="card"><div class="card-label">Total effort</div><div class="card-value">${totalDays}d</div><div class="card-sub">${baseDays}d base + ${contingencyDays}d contingency (${est.contingencyPct}%)</div></div>
  <div class="card"><div class="card-label">Duration</div><div class="card-value">${calendarWeeks}w</div><div class="card-sub">~${Math.round(calendarWeeks/4.3)} months · ${Math.ceil(calendarWeeks/est.sprintWeeks)} sprints</div></div>
  <div class="card" style="background:#eef2ff;border-color:#c7d2fe"><div class="card-label">Sell price</div><div class="card-value" style="color:#4f46e5">${fmtK(sellPrice)}</div><div class="card-sub">Margin ${est.targetMarginPct}%</div></div>
</div>

<h2>Cost build-up</h2>
<table class="cost-table">
<tr><td>Revenue (billing rate × days, incl. ${est.contingencyPct}% contingency)</td><td>${fmt(sellPrice)}</td></tr>
<tr><td>Direct labour cost (cost rate × days)</td><td>− ${fmt(directCost)}</td></tr>
<tr><td>Labour Margin (LM)</td><td>${fmt(labourMargin)} (${sellPrice > 0 ? Math.round(labourMargin/sellPrice*100) : 0}%)</td></tr>
<tr><td>Delivery overhead (${est.overheadPct}%)</td><td>− ${fmt(overhead)}</td></tr>
<tr class="cost-total"><td>Gross Margin (GM)</td><td>${fmt(margin - overhead)}</td></tr>
</table>
${opexMonthly > 0 ? `<div class="opex"><strong>OpEx (ongoing monthly):</strong> ${fmt(opexMonthly)}/mo · ${fmt(opexMonthly*12)}/yr</div>` : ''}

<h2>Delivery phases</h2>
<div class="phases">
${PHASE_LABELS.map((label, i) => {
  const wks = Math.max(1, Math.round(calendarWeeks * PHASE_PCTS[i]))
  const prevWeeks = PHASE_PCTS.slice(0,i).reduce((a,p)=>a+Math.max(1,Math.round(calendarWeeks*p)),0)
  return `<div class="phase"><div class="phase-label">${label}</div><div class="phase-weeks">${wks}w</div><div class="phase-dates">${addWeeks(startDate, prevWeeks)}</div></div>`
}).join('')}
</div>

<h2>Effort by role</h2>
<div class="grid3">
${Object.entries(effortByRole).filter(([,d])=>d>0).map(([r,d])=>`<div class="card"><div class="card-label">${r} · ${ROLES[r as keyof typeof ROLES]?.name ?? r}</div><div class="card-value" style="font-size:16px">${Math.round(d)}d</div></div>`).join('')}
</div>

<h2>Line items</h2>
${lineItemsHtml}

${(est.assumptions ?? []).length > 0 ? `<h2>Assumptions</h2>
${est.assumptions.map(a=>`<div class="assume"><span class="assume-badge ${a.impact}">${a.impact.toUpperCase()}</span>${a.text}</div>`).join('')}` : ''}

${est.notes ? `<h2>Notes</h2><p style="font-size:12px;color:#334155;line-height:1.6">${est.notes}</p>` : ''}

<div class="footer">
  <span>CORTEX · Cost Rate Timeline EXecution · v0.1</span>
  <span>This estimate is indicative and subject to scope confirmation</span>
</div>
</body></html>`

  const blob = new Blob([html], { type: 'text/html' })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
