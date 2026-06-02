import type { EstimateStream, StreamCategory, StreamConfig } from '../types'
import { useSettingsStore } from '../store/settingsStore'

// blank=true → structure only, no pre-filled effort (used when creating new estimates)
let _blankMode = false
export function setBlankMode(v: boolean) { _blankMode = v }

function s(
  id: string,
  name: string,
  category: StreamCategory,
  efforts: Partial<Record<string, number>>,
  scale = 1.0
): EstimateStream {
  if (_blankMode) {
    return { id, name, category, costType: 'capex', efforts: {} }
  }
  const scaled: Partial<Record<string, number>> = {}
  for (const [k, v] of Object.entries(efforts)) {
    const rounded = Math.round((v ?? 0) * scale)
    if (rounded > 0) scaled[k] = rounded
  }
  return { id, name, category, costType: 'capex', efforts: scaled as EstimateStream['efforts'] }
}

function opex(id: string, name: string, category: StreamCategory, monthlyRate: number): EstimateStream {
  return { id, name, category, costType: 'opex', efforts: {}, monthlyRate }
}

// ── Configurator questions ────────────────────────────────────

export interface ConfigOption { value: string; label: string; icon: string; hint?: string }
export interface ConfigQuestion {
  id: keyof StreamConfig
  question: string
  type: 'single' | 'multi' | 'toggle'
  options?: ConfigOption[]
}

export const CONFIG_QUESTIONS: ConfigQuestion[] = [
  {
    id: 'platforms',
    question: 'What platforms are you building for?',
    type: 'multi',
    options: [
      { value: 'web',     label: 'Web app',              icon: '🌐', hint: 'Browser-based, responsive' },
      { value: 'ios',     label: 'iOS (native)',          icon: '🍎', hint: 'Swift / SwiftUI' },
      { value: 'android', label: 'Android (native)',      icon: '🤖', hint: 'Kotlin / Jetpack Compose' },
      { value: 'rn',      label: 'Cross-platform mobile', icon: '⚡', hint: 'React Native / Flutter' },
      { value: 'desktop', label: 'Desktop app',           icon: '🖥️', hint: 'Electron / WPF / .NET MAUI' },
      { value: 'api-only',label: 'API / Backend only',    icon: '⚙️', hint: 'No front-end in scope' },
    ],
  },
  {
    id: 'deployment',
    question: 'How will the solution be deployed?',
    type: 'single',
    options: [
      { value: 'cloud',   label: 'Cloud-native',  icon: '☁️', hint: 'AWS / Azure / GCP — IaaS or PaaS' },
      { value: 'onprem',  label: 'On-premises',   icon: '🏢', hint: 'Client data centre or private cloud' },
      { value: 'hybrid',  label: 'Hybrid',        icon: '🔀', hint: 'Mix of cloud and on-prem' },
    ],
  },
  {
    id: 'backendComplexity',
    question: 'Backend and integration complexity?',
    type: 'single',
    options: [
      { value: 'simple',  label: 'Simple / greenfield',       icon: '🌱', hint: 'New services, minimal integration' },
      { value: 'medium',  label: 'Medium (1–3 integrations)', icon: '🔌', hint: 'REST/SOAP APIs, some legacy connectors' },
      { value: 'complex', label: 'Complex (4+ / legacy)',      icon: '🕸️', hint: 'Heavy integration, legacy adapters, ESB' },
    ],
  },
  {
    id: 'dataNeeds',
    question: 'Data and analytics requirements?',
    type: 'single',
    options: [
      { value: 'none',      label: 'Minimal',              icon: '📄', hint: 'Standard CRUD, no analytics' },
      { value: 'reporting', label: 'Database + reporting',  icon: '📊', hint: 'Dashboards, scheduled reports' },
      { value: 'platform',  label: 'Data platform / BI',   icon: '🏗️', hint: 'Data lake, pipelines, self-serve BI' },
      { value: 'ai',        label: 'AI / ML workloads',    icon: '🧠', hint: 'Model training, inference, MLOps' },
    ],
  },
  {
    id: 'infraScope',
    question: 'Infrastructure setup scope?',
    type: 'single',
    options: [
      { value: 'minimal',  label: 'Minimal',              icon: '➡️', hint: 'Use existing infra, minimal setup' },
      { value: 'standard', label: 'Standard cloud setup', icon: '☁️', hint: 'VPC, CI/CD, containers, monitoring' },
      { value: 'complex',  label: 'Enterprise-grade',     icon: '🏗️', hint: 'Multi-region, HA, DR, compliance baseline' },
    ],
  },
  {
    id: 'hasSecurityReqs',
    question: 'Are there explicit security or compliance requirements?',
    type: 'toggle',
  },
  {
    id: 'hasChangeManagement',
    question: 'Is change management or end-user training in scope?',
    type: 'toggle',
  },
]

// ── Work-type-specific scope questions ───────────────────────

export interface ScopeQuestion {
  id: string
  label: string
  type: 'single' | 'multi'
  options: { value: string; label: string; hint?: string }[]
}

export const WORK_TYPE_SCOPE_QUESTIONS: Record<string, ScopeQuestion[]> = {
  'ai-ml': [
    { id: 'model_type', label: 'Model approach', type: 'single', options: [
      { value: 'pretrained', label: '🤗 Fine-tune pre-trained', hint: 'GPT, BERT, foundation models' },
      { value: 'custom',     label: '🏗️ Build from scratch',   hint: 'Custom architecture, full training' },
      { value: 'traditional',label: '📐 Traditional ML',       hint: 'sklearn, XGBoost, regression' },
    ]},
    { id: 'data_readiness', label: 'Data readiness', type: 'single', options: [
      { value: 'clean',       label: '✅ Available & clean' },
      { value: 'needs_prep',  label: '🔧 Exists, needs prep' },
      { value: 'needs_collect', label: '🕸️ Needs collecting / labelling' },
    ]},
    { id: 'serving', label: 'Inference pattern', type: 'single', options: [
      { value: 'realtime', label: '⚡ Real-time API' },
      { value: 'batch',    label: '📦 Batch / scheduled' },
      { value: 'both',     label: '🔀 Both' },
    ]},
    { id: 'explainability', label: 'Explainability required?', type: 'single', options: [
      { value: 'no',       label: 'No' },
      { value: 'basic',    label: 'Basic (feature importance)' },
      { value: 'full',     label: 'Full (regulatory / audit)' },
    ]},
  ],
  'erp': [
    { id: 'platform', label: 'ERP platform', type: 'single', options: [
      { value: 'sap',      label: '🔷 SAP' },
      { value: 'oracle',   label: '🔴 Oracle' },
      { value: 'dynamics', label: '🟦 MS Dynamics' },
      { value: 'workday',  label: '🟨 Workday' },
      { value: 'other',    label: '⚙️ Other / Custom' },
    ]},
    { id: 'impl_type', label: 'Implementation type', type: 'single', options: [
      { value: 'greenfield', label: '🌱 Greenfield (new)' },
      { value: 'migration',  label: '🔄 Legacy migration' },
      { value: 'upgrade',    label: '⬆️ Version upgrade' },
    ]},
    { id: 'modules', label: 'Modules in scope', type: 'multi', options: [
      { value: 'finance',       label: '💰 Finance / GL' },
      { value: 'hr',            label: '👥 HR / Payroll' },
      { value: 'supply',        label: '📦 Supply Chain' },
      { value: 'crm',           label: '🤝 CRM / Sales' },
      { value: 'manufacturing', label: '🏭 Manufacturing' },
      { value: 'analytics',     label: '📊 Reporting / BI' },
    ]},
  ],
  'cloud-migration': [
    { id: 'strategy', label: 'Migration strategy', type: 'single', options: [
      { value: 'liftshift',  label: '🚛 Lift & shift (rehost)' },
      { value: 'replatform', label: '🔧 Replatform (managed services)' },
      { value: 'refactor',   label: '🏗️ Refactor / re-architect' },
    ]},
    { id: 'workload_count', label: 'Workload count', type: 'single', options: [
      { value: 'small',  label: '1–5 workloads' },
      { value: 'medium', label: '6–20 workloads' },
      { value: 'large',  label: '20+ workloads' },
    ]},
    { id: 'downtime', label: 'Migration window', type: 'single', options: [
      { value: 'flexible',  label: '✅ Flexible downtime OK' },
      { value: 'limited',   label: '⚠️ Limited window' },
      { value: 'zero',      label: '🚫 Zero downtime required' },
    ]},
  ],
  'managed-service': [
    { id: 'coverage', label: 'Service coverage', type: 'single', options: [
      { value: 'biz',      label: '🏢 Business hours (8×5)' },
      { value: 'extended', label: '📅 Extended (12×7)' },
      { value: 'fulltime', label: '🌐 24×7' },
    ]},
    { id: 'sla_tier', label: 'SLA tier', type: 'single', options: [
      { value: 'standard',  label: '4hr response — Standard' },
      { value: 'enhanced',  label: '2hr response — Enhanced' },
      { value: 'critical',  label: '30min response — Mission critical' },
    ]},
    { id: 'ticket_volume', label: 'Expected ticket volume', type: 'single', options: [
      { value: 'low',    label: 'Low  (<50/mo)' },
      { value: 'medium', label: 'Medium  (50–200/mo)' },
      { value: 'high',   label: 'High  (200+/mo)' },
    ]},
    { id: 'service_type', label: 'What is being managed?', type: 'multi', options: [
      { value: 'app',   label: '💻 Application support' },
      { value: 'infra', label: '☁️ Infrastructure' },
      { value: 'data',  label: '📊 Data / BI' },
      { value: 'sec',   label: '🔒 Security ops' },
    ]},
  ],
  'data-platform': [
    { id: 'data_sources', label: 'Source system count', type: 'single', options: [
      { value: 'few',    label: '1–3 sources' },
      { value: 'several', label: '4–10 sources' },
      { value: 'many',   label: '10+ sources' },
    ]},
    { id: 'processing', label: 'Processing pattern', type: 'single', options: [
      { value: 'batch',      label: '📦 Batch / scheduled' },
      { value: 'streaming',  label: '⚡ Real-time streaming' },
      { value: 'mixed',      label: '🔀 Mixed batch + stream' },
    ]},
    { id: 'viz_tool', label: 'Visualisation tooling', type: 'single', options: [
      { value: 'powerbi',    label: 'Power BI' },
      { value: 'tableau',    label: 'Tableau' },
      { value: 'looker',     label: 'Looker / Metabase' },
      { value: 'custom',     label: 'Custom / embedded' },
    ]},
  ],
  'digital-transformation': [
    { id: 'legacy', label: 'Legacy system dependency', type: 'single', options: [
      { value: 'none',   label: '🌱 Greenfield, no legacy' },
      { value: 'some',   label: '🔌 Some legacy integration' },
      { value: 'heavy',  label: '🕸️ Heavy legacy dependency' },
    ]},
    { id: 'user_scale', label: 'User scale', type: 'single', options: [
      { value: 'small',      label: '<100 users' },
      { value: 'medium',     label: '100–1,000 users' },
      { value: 'enterprise', label: '1,000+ users' },
    ]},
    { id: 'programme', label: 'Programme type', type: 'single', options: [
      { value: 'single',  label: 'Single workstream' },
      { value: 'multi',   label: 'Multi-workstream programme' },
    ]},
  ],
  'security': [
    { id: 'scope_type', label: 'Security focus', type: 'multi', options: [
      { value: 'app',      label: '💻 Application security' },
      { value: 'infra',    label: '🏗️ Infrastructure hardening' },
      { value: 'identity', label: '🔑 Identity & access' },
      { value: 'compliance', label: '📋 Compliance / audit' },
      { value: 'pentest',  label: '🎯 Penetration testing' },
    ]},
    { id: 'compliance_framework', label: 'Compliance framework', type: 'multi', options: [
      { value: 'iso27001', label: 'ISO 27001' },
      { value: 'soc2',     label: 'SOC 2' },
      { value: 'gdpr',     label: 'GDPR' },
      { value: 'pci',      label: 'PCI-DSS' },
      { value: 'none',     label: 'None specific' },
    ]},
  ],
}

// ── Work type definitions ─────────────────────────────────────

export const WORK_TYPES = [
  { value: '',                       label: 'Generic',              icon: '⚙️', desc: 'Custom or mixed project — configure all dimensions manually' },
  { value: 'digital-transformation', label: 'Digital Transform',   icon: '🔄', desc: 'Digitise business processes, modernise a platform or build a new product' },
  { value: 'ai-ml',                  label: 'AI / ML',             icon: '🧠', desc: 'Build, train or deploy ML models, LLM apps or intelligent automation' },
  { value: 'erp',                    label: 'ERP / Enterprise',    icon: '🏢', desc: 'Implement, migrate or upgrade ERP (SAP, Oracle, Dynamics, Workday)' },
  { value: 'cloud-migration',        label: 'Cloud Migration',     icon: '☁️', desc: 'Lift-and-shift, re-platform or re-architect workloads to the cloud' },
  { value: 'data-platform',          label: 'Data Platform',       icon: '📊', desc: 'Build data pipelines, warehouses, lakehouses or self-serve BI' },
  { value: 'security',               label: 'Security',            icon: '🔒', desc: 'Security assessment, hardening, identity, compliance or pen-testing' },
  { value: 'managed-service',        label: 'Managed Service',     icon: '🛠️', desc: 'Ongoing application, infrastructure or security support and operations' },
]

// Smart defaults per work type — pre-fills the configurator
export const WORK_TYPE_DEFAULTS: Record<string, StreamConfig> = {
  '': {
    platforms: ['web'], deployment: 'cloud', backendComplexity: 'medium',
    dataNeeds: 'none', infraScope: 'standard', hasSecurityReqs: false, hasChangeManagement: false,
  },
  'digital-transformation': {
    platforms: ['web'], deployment: 'cloud', backendComplexity: 'medium',
    dataNeeds: 'reporting', infraScope: 'standard', hasSecurityReqs: false, hasChangeManagement: true,
  },
  'ai-ml': {
    platforms: ['api-only'], deployment: 'cloud', backendComplexity: 'medium',
    dataNeeds: 'ai', infraScope: 'standard', hasSecurityReqs: false, hasChangeManagement: false,
  },
  'erp': {
    platforms: ['web'], deployment: 'cloud', backendComplexity: 'complex',
    dataNeeds: 'reporting', infraScope: 'standard', hasSecurityReqs: false, hasChangeManagement: true,
  },
  'cloud-migration': {
    platforms: ['api-only'], deployment: 'cloud', backendComplexity: 'complex',
    dataNeeds: 'none', infraScope: 'complex', hasSecurityReqs: false, hasChangeManagement: false,
  },
  'data-platform': {
    platforms: ['web'], deployment: 'cloud', backendComplexity: 'medium',
    dataNeeds: 'platform', infraScope: 'standard', hasSecurityReqs: false, hasChangeManagement: false,
  },
  'security': {
    platforms: ['api-only'], deployment: 'cloud', backendComplexity: 'medium',
    dataNeeds: 'none', infraScope: 'standard', hasSecurityReqs: true, hasChangeManagement: false,
  },
  'managed-service': {
    platforms: ['api-only'], deployment: 'hybrid', backendComplexity: 'simple',
    dataNeeds: 'none', infraScope: 'minimal', hasSecurityReqs: false, hasChangeManagement: true,
  },
}

export const DEFAULT_CONFIG: StreamConfig = {
  platforms: ['web'],
  deployment: 'cloud',
  backendComplexity: 'medium',
  dataNeeds: 'none',
  infraScope: 'standard',
  hasSecurityReqs: false,
  hasChangeManagement: false,
}

// ── Stream generator ──────────────────────────────────────────

export function generateStreams(cfg: StreamConfig, workType = ''): EstimateStream[] {
  const streams: EstimateStream[] = []
  const hasWeb     = cfg.platforms.includes('web')
  const hasIOS     = cfg.platforms.includes('ios')
  const hasAndroid = cfg.platforms.includes('android')
  const hasRN      = cfg.platforms.includes('rn')
  const hasDesktop = cfg.platforms.includes('desktop')
  const hasFE      = hasWeb || hasIOS || hasAndroid || hasRN || hasDesktop
  const isCloud    = cfg.deployment === 'cloud' || cfg.deployment === 'hybrid'
  const isOnPrem   = cfg.deployment === 'onprem' || cfg.deployment === 'hybrid'

  // Complexity multipliers — use settings calibration if available
  const scale = useSettingsStore.getState().settings.effortScale
  const beScale = cfg.backendComplexity === 'simple' ? scale.simple : cfg.backendComplexity === 'complex' ? scale.complex : scale.medium
  const infraScale = cfg.infraScope === 'minimal' ? scale.infraMinimal : cfg.infraScope === 'complex' ? scale.infraComplex : scale.infraStandard

  // ── Discovery & BA ───────────────────────────────────────
  streams.push(s('disc-ba', 'Business Analysis & Requirements', 'discovery', { BA: 20, SA: 10 }, beScale * 0.8 + 0.2))

  if (hasFE) {
    streams.push(s('disc-ux', 'UX Research & Design', 'design', { UX: 25, BA: 5 }))
  }

  if (workType === 'ai-ml' || cfg.dataNeeds === 'ai') {
    streams.push(s('disc-ds', 'Data Discovery & Scoping', 'discovery', { DE: 15, BA: 10, SA: 5 }))
  }

  // ── Frontend ─────────────────────────────────────────────
  if (hasWeb) {
    streams.push(s('fe-web', 'Frontend — Web', 'frontend', { SD: 35, MD: 25, UX: 5 }))
  }
  if (hasIOS) {
    streams.push(s('fe-ios', 'Frontend — iOS (native)', 'frontend', { SD: 30, MD: 20 }))
  }
  if (hasAndroid) {
    streams.push(s('fe-android', 'Frontend — Android (native)', 'frontend', { SD: 30, MD: 20 }))
  }
  if (hasRN) {
    streams.push(s('fe-rn', 'Frontend — React Native / Flutter', 'frontend', { SD: 35, MD: 20 }))
  }
  if (hasDesktop) {
    streams.push(s('fe-desktop', 'Frontend — Desktop App', 'frontend', { SD: 30, MD: 15 }))
  }

  // ── Backend ───────────────────────────────────────────────
  streams.push(s('be-core', 'Backend — Core Services & APIs', 'backend', { SD: 40, MD: 25, SA: 10 }, beScale))

  if (cfg.backendComplexity === 'medium' || cfg.backendComplexity === 'complex') {
    streams.push(s('be-int', 'Integration & API Layer', 'backend', { SD: 25, SA: 10 }, beScale))
  }
  if (cfg.backendComplexity === 'complex') {
    streams.push(s('be-legacy', 'Legacy Adapter / ESB Layer', 'backend', { SD: 20, SA: 15, MD: 10 }))
  }

  // Database is always present
  streams.push(s('be-db', 'Database Design & Setup', 'backend', { SD: 15, SA: 10, BA: 5 }, beScale * 0.7 + 0.3))

  // ── Data & Analytics ─────────────────────────────────────
  if (cfg.dataNeeds === 'reporting') {
    streams.push(s('data-rep', 'Reporting & Dashboards', 'data', { SD: 20, DE: 10, UX: 5 }))
  }
  if (cfg.dataNeeds === 'platform') {
    streams.push(s('data-eng', 'Data Engineering & Pipelines', 'data', { DE: 40, SD: 15, SA: 10 }))
    streams.push(s('data-bi', 'BI & Visualisation Layer', 'data', { DE: 20, SD: 15, UX: 10 }))
  }
  if (cfg.dataNeeds === 'ai') {
    streams.push(s('data-eng', 'Data Engineering & Preparation', 'data', { DE: 40, SD: 10 }))
    streams.push(s('data-ml', 'ML Model Development', 'data', { DE: 35, SD: 20, SA: 10 }))
    streams.push(s('data-mlops', 'MLOps & Model Serving', 'data', { DO: 20, SD: 15, DE: 10 }))
  }

  // ── Infrastructure — CapEx (one-time setup) ───────────────
  if (cfg.infraScope !== 'minimal') {
    streams.push(s('infra-setup', 'Infrastructure Setup (CapEx)', 'infra', { DO: 20, SA: 10 }, infraScale))
  }

  // DevOps & CI/CD (CapEx one-time setup)
  if (cfg.infraScope !== 'minimal') {
    streams.push(s('devops', 'DevOps & CI/CD Pipeline', 'devops', { DO: 20, SD: 5 }, infraScale * 0.7 + 0.3))
  }

  // ── Infrastructure — OpEx (ongoing monthly costs) ─────────
  if (isCloud && cfg.infraScope !== 'minimal') {
    const monthlyCloud = cfg.infraScope === 'complex' ? 8000 : 3000
    streams.push(opex('infra-cloud', 'Cloud Infrastructure Running Cost (OpEx)', 'infra', monthlyCloud))
  }
  if (isOnPrem) {
    const monthlyOnprem = cfg.infraScope === 'complex' ? 5000 : 2000
    streams.push(opex('infra-onprem', 'On-Prem Hosting & Licensing (OpEx)', 'infra', monthlyOnprem))
  }
  // Monitoring / observability OpEx
  if (cfg.infraScope !== 'minimal') {
    streams.push(opex('infra-mon', 'Monitoring & Observability Tools (OpEx)', 'infra', 500))
  }

  // ── Security ─────────────────────────────────────────────
  if (cfg.hasSecurityReqs) {
    streams.push(s('sec-impl', 'Security Implementation & Hardening', 'security', { SE: 20, SA: 10, SD: 10 }))
    streams.push(s('sec-test', 'Penetration Testing & Security Review', 'security', { SE: 15, QA: 10 }))
  }

  // ── QA & Testing ─────────────────────────────────────────
  streams.push(s('qa-main', 'QA & Functional Testing', 'qa', { QA: 30, MD: 5 }, beScale * 0.6 + 0.4))
  if (hasFE) {
    streams.push(s('qa-ui', 'UI / UX Testing & Accessibility', 'qa', { QA: 15 }))
  }
  if (cfg.backendComplexity === 'complex' || cfg.infraScope === 'complex') {
    streams.push(s('qa-perf', 'Performance & Load Testing', 'qa', { QA: 15, DO: 5 }))
  }

  // ── Delivery Management ───────────────────────────────────
  const pmDays = Math.round(
    streams
      .filter(st => st.costType === 'capex')
      .reduce((sum, st) => sum + Object.values(st.efforts).reduce((a, b) => a + (b ?? 0), 0), 0) * 0.15
  )
  streams.push(s('pm', 'Project Management', 'pm', { PM: Math.max(pmDays, 20), DM: Math.round(pmDays * 0.4) }))

  // ── Change Management ─────────────────────────────────────
  if (cfg.hasChangeManagement) {
    streams.push(s('change', 'Change Management & Training', 'change', { CM: 20, BA: 10 }))
  }

  return streams
}

export function getActiveRolesFromStreams(streams: EstimateStream[]): string[] {
  const roles = new Set<string>()
  for (const st of streams) {
    for (const r of Object.keys(st.efforts)) roles.add(r)
  }
  // Always include PM
  roles.add('PM')
  return Array.from(roles)
}

/**
 * Merge a new stream structure into existing streams.
 * - Streams whose ID exists in `existing` keep their current effort and monthly rate.
 * - Streams new to the structure start blank.
 * - Streams removed from the structure are dropped.
 * This means scope changes (platform, backend complexity, etc.) never wipe manual effort.
 */
export function mergeStreams(existing: EstimateStream[], next: EstimateStream[]): EstimateStream[] {
  const byId = new Map(existing.map(s => [s.id, s]))
  return next.map(s => {
    const old = byId.get(s.id)
    if (!old) return s // new stream — keep as-is (caller controls blank mode)
    return { ...s, efforts: old.efforts, monthlyRate: old.monthlyRate ?? s.monthlyRate }
  })
}

/**
 * Generate streams with their full reference effort (ignores blank mode).
 * Used by the "Load reference effort" action in the Stream Matrix.
 */
export function getReferenceStreams(cfg: StreamConfig, workType: string): EstimateStream[] {
  const prev = _blankMode
  _blankMode = false
  const streams = generateStreams(cfg, workType)
  _blankMode = prev
  return streams
}
