export type RoleId = 'SA' | 'SD' | 'MD' | 'JD' | 'QA' | 'BA' | 'UX' | 'DO' | 'PM' | 'DM' | 'DE' | 'CM' | 'SE'

export type RiskBand = 'green' | 'amber' | 'red' | 'black' | 'unknown'

export type Currency = 'GBP' | 'USD' | 'EUR' | 'INR'

export type CostType = 'capex' | 'opex'

export type StreamCategory =
  | 'discovery' | 'design' | 'frontend' | 'backend'
  | 'data' | 'infra' | 'qa' | 'devops' | 'security' | 'pm' | 'change'

export interface RoleDef {
  name: string
  defaultRate: number
}

export interface EstimateStream {
  id: string
  name: string
  category: StreamCategory
  costType: CostType
  efforts: Partial<Record<RoleId, number>>  // capex: days per role
  monthlyRate?: number                       // opex: £/month base
}

export interface StreamConfig {
  platforms: string[]       // web | ios | android | rn | desktop | api-only
  deployment: string        // cloud | onprem | hybrid
  backendComplexity: string // simple | medium | complex
  dataNeeds: string         // none | reporting | platform | ai
  infraScope: string        // minimal | standard | complex
  hasSecurityReqs: boolean
  hasChangeManagement: boolean
}

export interface Estimate {
  id: string
  name: string
  clientName: string
  workType: string
  riskBand: RiskBand
  streamConfig?: StreamConfig
  cadexDealId?: string
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
  projectMonths: number     // used for opex duration
  startDate?: string        // ISO date string for Gantt
  createdAt: string
  updatedAt: string
}
