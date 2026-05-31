import type { WorkItemDefinition, SizeCode } from '../types'

// ── Size helper ───────────────────────────────────────────────

type E = Partial<Record<string, number>>

function sz(code: SizeCode, label: string, description: string, efforts: E) {
  return { code, label, description, efforts: efforts as WorkItemDefinition['sizes'][0]['efforts'] }
}

// ── Default bank ──────────────────────────────────────────────

export const DEFAULT_WORK_ITEM_BANK: WorkItemDefinition[] = [

  // ═══════════════════════════════════════
  // BACKEND
  // ═══════════════════════════════════════

  {
    id: 'be-api-endpoint',
    name: 'API Endpoint',
    category: 'backend',
    description: 'A single REST or GraphQL endpoint. Size reflects complexity of logic, validation, and auth.',
    sizes: [
      sz('XS', 'Trivial', 'Simple GET, no auth, no logic — reference data or health check', { SD: 0.5, QA: 0.25 }),
      sz('S',  'Simple',  'Standard CRUD (1 resource). Basic validation. No business rules.',  { SD: 1, QA: 0.5 }),
      sz('M',  'Standard','CRUD with filtering, pagination, auth. Some business logic.',        { SD: 2, QA: 1 }),
      sz('L',  'Complex', 'Complex business logic, multiple resource orchestration, events.',   { SD: 3, SA: 0.5, QA: 1.5 }),
      sz('XL', 'Heavy',   'Multi-service orchestration, saga patterns, complex transactions.',  { SD: 5, SA: 1, QA: 2 }),
    ],
  },

  {
    id: 'be-db-entity',
    name: 'Database Table / Entity',
    category: 'backend',
    description: 'Schema design and migration for a data entity. Includes indexes, constraints.',
    sizes: [
      sz('XS', 'Reference', 'Simple lookup / reference table. ≤5 columns, no FK.',   { SD: 0.5 }),
      sz('S',  'Simple',    'Standard entity. Basic relations, standard columns.',     { SD: 1 }),
      sz('M',  'Standard',  'Multi-FK entity. Indexes, soft delete, audit fields.',   { SD: 1.5, SA: 0.5 }),
      sz('L',  'Complex',   'Complex normalised schema. Triggers, views, partitions.', { SD: 2.5, SA: 1 }),
    ],
  },

  {
    id: 'be-integration',
    name: 'External System Integration',
    category: 'backend',
    description: 'Integration with a third-party or legacy system. Includes mapping, error handling, retry logic.',
    sizes: [
      sz('S',  'Simple',      '2–4 endpoints. Read-only or simple push. Well-documented API.',          { SD: 2, SA: 0.5, QA: 1 }),
      sz('M',  'Standard',    '5–10 endpoints. Bidirectional. Auth, mapping, some transformation.',     { SD: 5, SA: 1, QA: 2 }),
      sz('L',  'Complex',     '10–20 endpoints. Legacy system, SOAP or bespoke protocol. Rich mapping.',{ SD: 10, SA: 2, QA: 3 }),
      sz('XL', 'Enterprise',  'ESB/middleware, event streaming, complex transformation, CDC patterns.',  { SD: 15, SA: 3, QA: 5 }),
    ],
  },

  {
    id: 'be-auth',
    name: 'Authentication / Auth Flow',
    category: 'backend',
    description: 'User authentication and authorisation. Includes session management, token handling.',
    sizes: [
      sz('M',  'Basic',   'Username/password. JWT sessions. Login, logout, refresh.',                  { SD: 3, QA: 1 }),
      sz('L',  'OAuth2',  'OAuth2 / OIDC. SSO integration. Role-based access control.',               { SD: 5, SA: 1, QA: 2 }),
      sz('XL', 'Complex', 'Multi-tenant auth. MFA. Fine-grained permissions. Audit logging.',          { SD: 8, SA: 2, QA: 3 }),
    ],
  },

  {
    id: 'be-background-job',
    name: 'Background Job / Worker',
    category: 'backend',
    description: 'Async processing task. Scheduled, event-triggered, or queue-driven.',
    sizes: [
      sz('S',  'Simple',   'Simple scheduled task or one-step processor.',           { SD: 1, QA: 0.5 }),
      sz('M',  'Standard', 'Async worker. Queue, retry, dead-letter handling.',      { SD: 2, QA: 1 }),
      sz('L',  'Complex',  'Multi-step pipeline. Parallel processing. State machine.',{ SD: 4, SA: 0.5, QA: 2 }),
    ],
  },

  {
    id: 'be-event-handler',
    name: 'Event / Message Handler',
    category: 'backend',
    description: 'Pub/sub or event-driven handler. Consumes messages from queue or event stream.',
    sizes: [
      sz('S',  'Simple',   'Single-topic consumer, simple processing, no side effects.',  { SD: 1, QA: 0.5 }),
      sz('M',  'Standard', 'Multi-topic. Idempotent handler. Side effects to DB or API.', { SD: 2, QA: 1 }),
      sz('L',  'Complex',  'Event sourcing / CQRS. Complex projections. Saga orchestration.',{ SD: 4, SA: 1, QA: 2 }),
    ],
  },

  {
    id: 'be-microservice',
    name: 'Microservice',
    category: 'backend',
    description: 'A standalone deployable service with its own domain, DB, and API surface.',
    sizes: [
      sz('S',  'Lightweight', 'Single-purpose, ≤5 endpoints, shared infrastructure.',          { SD: 3, DO: 0.5, QA: 1 }),
      sz('M',  'Standard',    'Full bounded context. Own DB. ~10 endpoints. CI/CD wired.',    { SD: 5, SA: 1, DO: 1, QA: 2 }),
      sz('L',  'Complex',     'Event-driven service. Saga. Own cache + DB. Observability.',   { SD: 8, SA: 2, DO: 1, QA: 3 }),
    ],
  },

  // ═══════════════════════════════════════
  // FRONTEND — WEB
  // ═══════════════════════════════════════

  {
    id: 'fe-web-screen-display',
    name: 'Web Screen — Display',
    category: 'frontend',
    description: 'Read-only page or view. No data entry. May include lists, cards, or charts.',
    sizes: [
      sz('XS', 'Static',    'Static copy page. No dynamic data.',                        { MD: 0.5 }),
      sz('S',  'Simple',    'Simple data display. 1 API call. Standard layout.',         { MD: 1 }),
      sz('M',  'Standard',  'Data-rich page. Filtering, sorting, pagination. ~3 API calls.', { SD: 1.5, MD: 0.5, UX: 0.5 }),
      sz('L',  'Complex',   'Dashboard with charts, real-time updates, drill-down.',     { SD: 3, MD: 1, UX: 1, DE: 0.5 }),
    ],
  },

  {
    id: 'fe-web-screen-form',
    name: 'Web Screen — Form / Input',
    category: 'frontend',
    description: 'Data entry screen. Includes form fields, validation, submission, and error handling.',
    sizes: [
      sz('S',  'Simple',    '3–5 fields. Basic validation. Single-step.',                { SD: 1, UX: 0.5, QA: 0.5 }),
      sz('M',  'Standard',  '6–15 fields. Complex validation. Conditional logic.',       { SD: 2, UX: 0.5, QA: 1 }),
      sz('L',  'Complex',   'Multi-section form. File uploads. Dynamic fields.',          { SD: 3, UX: 1, QA: 1.5 }),
      sz('XL', 'Wizard',    'Multi-step wizard. Branching logic. Progress save.',         { SD: 5, UX: 1.5, QA: 2 }),
    ],
  },

  {
    id: 'fe-web-component',
    name: 'Reusable UI Component',
    category: 'frontend',
    description: 'Shared component used across multiple screens. Covers design + build.',
    sizes: [
      sz('XS', 'Trivial',  'Display-only. No state. Pure presentational.',              { MD: 0.5 }),
      sz('S',  'Simple',   'Standard component with configurable props.',               { MD: 1 }),
      sz('M',  'Standard', 'Stateful component. Events. Variants. Accessibility.',      { SD: 1.5, UX: 0.5 }),
      sz('L',  'Complex',  'Complex interaction. Animation. Compound component.',        { SD: 2.5, UX: 1 }),
    ],
  },

  // ═══════════════════════════════════════
  // FRONTEND — MOBILE
  // ═══════════════════════════════════════

  {
    id: 'fe-mobile-screen',
    name: 'Mobile Screen',
    category: 'frontend',
    description: 'A single mobile screen (iOS / Android / React Native). Per-platform if native.',
    sizes: [
      sz('XS', 'Static',   'Static content. No API. No interaction.',                   { MD: 0.5 }),
      sz('S',  'Simple',   'Standard info screen. 1 API call. List or detail view.',    { MD: 1 }),
      sz('M',  'Standard', 'Interactive screen. Form or gesture input. ~3 APIs.',       { SD: 2, UX: 0.5 }),
      sz('L',  'Complex',  'Native feature (camera, push, biometric). Rich interaction.',{ SD: 3, UX: 1, QA: 1 }),
    ],
  },

  {
    id: 'fe-mobile-nav',
    name: 'Mobile Navigation Flow',
    category: 'frontend',
    description: 'Navigation structure. Tab bars, stack navigators, deep links.',
    sizes: [
      sz('S',  'Basic',    'Simple tab or stack navigation.',                           { SD: 1 }),
      sz('M',  'Standard', 'Mixed navigation. Auth-gated routes. Deep linking.',        { SD: 2, QA: 0.5 }),
      sz('L',  'Complex',  'Complex flows. Push navigation from notifications. Handoff.',{ SD: 3, QA: 1 }),
    ],
  },

  // ═══════════════════════════════════════
  // DATA & ANALYTICS
  // ═══════════════════════════════════════

  {
    id: 'data-pipeline',
    name: 'Data Pipeline / ETL',
    category: 'data',
    description: 'Extract, transform, load pipeline. Batch or streaming. Includes monitoring.',
    sizes: [
      sz('S',  'Simple',    'Single source → target. Basic transform. Batch daily.',    { DE: 2 }),
      sz('M',  'Standard',  'Multi-source. Validation rules. Error handling. Scheduling.',{ DE: 5, SA: 0.5 }),
      sz('L',  'Complex',   'Multiple sources. Complex transformation. Incremental / CDC.',{ DE: 8, SA: 1, QA: 2 }),
      sz('XL', 'Enterprise','Streaming + batch. Data quality framework. Lineage tracking.',{ DE: 15, SA: 2, QA: 3 }),
    ],
  },

  {
    id: 'data-report',
    name: 'Report / Dashboard',
    category: 'data',
    description: 'Analytics report or business intelligence dashboard.',
    sizes: [
      sz('S',  'Tabular',   'Simple table or list report. Filters and export.',         { DE: 1, UX: 0.5 }),
      sz('M',  'Standard',  'Dashboard. 2–4 chart types. Date range, drill-down.',      { DE: 3, UX: 1 }),
      sz('L',  'Complex',   'Executive dashboard. Cross-dataset. Scheduled delivery.',   { DE: 5, UX: 2, SA: 0.5 }),
    ],
  },

  {
    id: 'data-ml-model',
    name: 'ML Model / AI Feature',
    category: 'data',
    description: 'Machine learning model or AI-powered feature. Includes training, evaluation, serving.',
    sizes: [
      sz('M',  'Simple',    'Basic classifier / regressor on clean data. Standard algorithm.', { DE: 5 }),
      sz('L',  'Standard',  'Feature engineering. Cross-validation. A/B test framework.',      { DE: 10, SA: 1 }),
      sz('XL', 'Complex',   'Custom architecture. Training pipeline. Inference serving. Monitoring.',{ DE: 20, SA: 2, QA: 2 }),
    ],
  },

  // ═══════════════════════════════════════
  // INFRASTRUCTURE & DEVOPS
  // ═══════════════════════════════════════

  {
    id: 'infra-env-setup',
    name: 'Environment Setup',
    category: 'infra',
    description: 'Cloud or on-prem environment provisioning. IaC, networking, IAM.',
    sizes: [
      sz('S',  'Basic',       'Dev + prod. Manual or basic IaC. Single region.',        { DO: 1 }),
      sz('M',  'Standard',    'Dev / staging / prod. Terraform/CDK. VPC, IAM, monitoring.',{ DO: 3, SA: 0.5 }),
      sz('L',  'Enterprise',  'Multi-region. HA + DR. Compliance controls. WAF. Cost management.',{ DO: 6, SA: 1.5 }),
    ],
  },

  {
    id: 'infra-cicd',
    name: 'CI/CD Pipeline',
    category: 'devops',
    description: 'Automated build, test, and deployment pipeline.',
    sizes: [
      sz('S',  'Basic',     'Build + test + deploy to single env. GitHub Actions / GitLab CI.',{ DO: 1 }),
      sz('M',  'Standard',  'Multi-env promotion. Quality gates. Automated rollback.',         { DO: 2.5, QA: 0.5 }),
      sz('L',  'Complex',   'Canary / blue-green. Security scan. Multi-repo. Approval gates.', { DO: 4, SA: 0.5, QA: 1 }),
    ],
  },

  // ═══════════════════════════════════════
  // QA
  // ═══════════════════════════════════════

  {
    id: 'qa-test-suite',
    name: 'Test Suite',
    category: 'qa',
    description: 'Automated test coverage for a component, service, or feature.',
    sizes: [
      sz('S',  'Unit',        'Unit tests for a module or component.',                  { QA: 1 }),
      sz('M',  'Integration', 'Integration tests for an API or service.',               { QA: 2 }),
      sz('L',  'E2E',         'End-to-end tests. Browser automation. Critical journeys.',{ QA: 4 }),
    ],
  },

  {
    id: 'qa-uat',
    name: 'UAT Planning & Execution',
    category: 'qa',
    description: 'User acceptance testing. Includes test plan, execution, sign-off.',
    sizes: [
      sz('S',  'Light',    'Informal UAT. 1 stakeholder. ≤10 scenarios.',               { BA: 1, QA: 1 }),
      sz('M',  'Standard', 'Formal UAT. Multiple stakeholders. Test plan + execution.', { BA: 2, QA: 2 }),
      sz('L',  'Full',     'Structured UAT. Multiple rounds. Defect management. Sign-off.',{ BA: 4, QA: 3 }),
    ],
  },

  // ═══════════════════════════════════════
  // DISCOVERY & PM
  // ═══════════════════════════════════════

  {
    id: 'disc-workshop',
    name: 'Discovery Workshop',
    category: 'discovery',
    description: 'Structured requirements or architecture workshop with stakeholders.',
    sizes: [
      sz('S',  'Half-day', '½-day session. 1 topic. Output: decisions + notes.',        { BA: 1.5, SA: 0.5 }),
      sz('M',  'Full-day', '1-day workshop. Multiple workstreams. Output: design doc.',  { BA: 3, SA: 1.5, UX: 0.5 }),
      sz('L',  'Sprint',   '1-week discovery sprint. Interviews + workshops + doc.',     { BA: 8, SA: 3, UX: 2 }),
    ],
  },

  {
    id: 'disc-spike',
    name: 'Technical Spike / PoC',
    category: 'discovery',
    description: 'Time-boxed investigation to validate a technical approach.',
    sizes: [
      sz('S',  'Quick', '1–2 day spike. Answer a specific question.',                   { SD: 2, SA: 0.5 }),
      sz('M',  'Week',  '1-week PoC. Working prototype. Written findings.',             { SD: 5, SA: 1 }),
      sz('L',  'Full',  '2-week PoC. Multiple options evaluated. Demo + report.',        { SD: 8, SA: 2, QA: 1 }),
    ],
  },

]

export function getWorkItemById(id: string, bank: WorkItemDefinition[] = DEFAULT_WORK_ITEM_BANK) {
  return bank.find(d => d.id === id)
}

export function getSizeDefinition(def: WorkItemDefinition, code: string) {
  return def.sizes.find(s => s.code === code)
}

export function computeLineItemEfforts(def: WorkItemDefinition, sizeCode: string, quantity = 1) {
  const size = getSizeDefinition(def, sizeCode)
  if (!size) return {}
  const scaled: Partial<Record<string, number>> = {}
  for (const [role, days] of Object.entries(size.efforts)) {
    scaled[role] = Math.round((days ?? 0) * quantity * 10) / 10
  }
  return scaled as Partial<Record<import('../types').RoleId, number>>
}

export const CATEGORY_BANK_ORDER = [
  'backend', 'frontend', 'data', 'infra', 'devops', 'qa', 'discovery', 'pm', 'change'
]

export const SIZE_COLORS: Record<string, string> = {
  XS:  'bg-slate-100 text-slate-600',
  S:   'bg-blue-100 text-blue-700',
  M:   'bg-indigo-100 text-indigo-700',
  L:   'bg-violet-100 text-violet-700',
  XL:  'bg-purple-100 text-purple-700',
  XXL: 'bg-rose-100 text-rose-700',
}
