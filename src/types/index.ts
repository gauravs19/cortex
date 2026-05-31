export type RoleId = 'SA' | 'SD' | 'MD' | 'JD' | 'QA' | 'BA' | 'UX' | 'DO' | 'PM' | 'DM' | 'DE' | 'CM' | 'SE'

export type RiskBand = 'green' | 'amber' | 'red' | 'black' | 'unknown'

export type Currency = 'GBP' | 'USD' | 'EUR' | 'INR'

export type CostType = 'capex' | 'opex'

export type SizeCode = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'

export type StreamCategory =
  | 'discovery' | 'design' | 'frontend' | 'backend'
  | 'data' | 'infra' | 'qa' | 'devops' | 'security' | 'pm' | 'change'

export interface RoleDef {
  name: string
  defaultRate: number
}

// ── Work Item Bank ────────────────────────────────────────────

export interface WorkItemSize {
  code: SizeCode
  label: string           // "Simple" | "Standard" | "Complex"
  description: string     // "1-2 fields, GET only" | "Standard CRUD with validation"
  efforts: Partial<Record<RoleId, number>>  // days per role
}

export interface WorkItemDefinition {
  id: string
  name: string            // "API Endpoint" | "Database Table" | "UI Screen"
  category: StreamCategory
  description: string
  sizes: WorkItemSize[]
  custom?: boolean        // user-defined, not from defaults
}

export interface EstimateLineItem {
  id: string
  label: string           // user-given name: "User login", "Products list API"
  definitionId: string    // references WorkItemDefinition.id
  sizeCode: SizeCode
  streamId?: string       // optional stream assignment
  quantity: number        // default 1, e.g. "5 API endpoints"
  notes?: string
}

// ── Streams ───────────────────────────────────────────────────

export interface EstimateStream {
  id: string
  name: string
  category: StreamCategory
  costType: CostType
  efforts: Partial<Record<RoleId, number>>  // capex: days per role
  monthlyRate?: number                       // opex: £/month base
}

export interface StreamConfig {
  platforms: string[]
  deployment: string
  backendComplexity: string
  dataNeeds: string
  infraScope: string
  hasSecurityReqs: boolean
  hasChangeManagement: boolean
}

// ── Estimate ──────────────────────────────────────────────────

export type EstimationMode = 'quick' | 'detailed'

export interface Estimate {
  id: string
  name: string
  clientName: string
  workType: string
  riskBand: RiskBand
  estimationMode: EstimationMode  // 'quick' = stream matrix | 'detailed' = line items
  wizardCompleted: boolean        // false = show configurator wizard on open
  streamConfig?: StreamConfig
  cadexDealId?: string
  // Stream matrix (manual or synced from line items)
  streams: EstimateStream[]
  activeRoles: RoleId[]
  rateCard: Partial<Record<RoleId, number>>
  currency: Currency
  targetMarginPct: number
  contingencyPct: number
  contingencyLocked: boolean
  sprintWeeks: number
  workingDaysPerWeek: number
  overheadPct: number
  projectMonths: number
  startDate?: string
  // Line items (detailed bottom-up)
  lineItems: EstimateLineItem[]
  // Top-down constraints
  targetBudget?: number   // in GBP base (0 = not set)
  targetEffort?: number   // in days (0 = not set)
  createdAt: string
  updatedAt: string
}
