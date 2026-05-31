export type RoleId = 'SA' | 'SD' | 'MD' | 'JD' | 'QA' | 'BA' | 'UX' | 'DO' | 'PM' | 'DM' | 'DE' | 'CM' | 'SE'
export type RiskBand = 'green' | 'amber' | 'red' | 'black' | 'unknown'
export type Currency = 'GBP' | 'USD' | 'EUR' | 'INR'
export type CostType = 'capex' | 'opex'
export type SizeCode = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
export type StreamCategory =
  | 'discovery' | 'design' | 'frontend' | 'backend'
  | 'data' | 'infra' | 'qa' | 'devops' | 'security' | 'pm' | 'change'

export interface RoleDef { name: string; defaultRate: number }

// Work Item Bank
export interface WorkItemSize {
  code: SizeCode; label: string; description: string
  efforts: Partial<Record<RoleId, number>>
}
export interface WorkItemDefinition {
  id: string; name: string; category: StreamCategory; description: string
  sizes: WorkItemSize[]; custom?: boolean
}
export interface EstimateLineItem {
  id: string; label: string; definitionId: string; sizeCode: SizeCode
  streamId?: string; featureId?: string; quantity: number; notes?: string
}

// Streams
export interface EstimateStream {
  id: string; name: string; category: StreamCategory; costType: CostType
  efforts: Partial<Record<RoleId, number>>; monthlyRate?: number
}
export interface StreamConfig {
  platforms: string[]; deployment: string; backendComplexity: string
  dataNeeds: string; infraScope: string; hasSecurityReqs: boolean; hasChangeManagement: boolean
}

// Resource plan (#1) — month index → role → headcount
export type ResourcePlan = Record<number, Partial<Record<RoleId, number>>>

// Assumptions
export interface Assumption { id: string; text: string; impact: 'low' | 'medium' | 'high' }

// Feature groups — requirements/stories that group line items
export interface EstimateFeature { id: string; name: string; collapsed?: boolean }

export type EstimationMode = 'quick' | 'detailed'

export interface Estimate {
  id: string; name: string; clientName: string; workType: string; riskBand: RiskBand
  estimationMode: EstimationMode; wizardCompleted: boolean; streamConfig?: StreamConfig; cadexDealId?: string
  streams: EstimateStream[]; activeRoles: RoleId[]; rateCard: Partial<Record<RoleId, number>>
  currency: Currency; billingCurrency?: Currency   // #9
  targetMarginPct: number; contingencyPct: number; contingencyLocked: boolean
  sprintWeeks: number; workingDaysPerWeek: number; overheadPct: number
  projectMonths: number; startDate?: string
  lineItems: EstimateLineItem[]
  features: EstimateFeature[]       // requirement/feature groups
  targetBudget?: number; targetEffort?: number
  resourcePlan?: ResourcePlan    // #1
  assumptions: Assumption[]      // #6
  notes?: string
  scopeAnswers?: Record<string, string | string[]>
  createdAt: string; updatedAt: string
}
