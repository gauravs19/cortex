export type RoleId = 'SA' | 'SD' | 'MD' | 'JD' | 'QA' | 'BA' | 'UX' | 'DO' | 'PM' | 'DM' | 'DE' | 'CM'

export type RiskBand = 'green' | 'amber' | 'red' | 'black' | 'unknown'

export type Currency = 'GBP' | 'USD' | 'EUR' | 'INR'

export interface RoleDef {
  name: string
  defaultRate: number // in GBP/day
}

export interface EstimateStream {
  id: string
  name: string
  efforts: Partial<Record<RoleId, number>> // days per role
}

export interface Estimate {
  id: string
  name: string
  clientName: string
  workType: string
  riskBand: RiskBand
  cadexDealId?: string
  streams: EstimateStream[]
  activeRoles: RoleId[]
  rateCard: Partial<Record<RoleId, number>>
  currency: Currency
  targetMarginPct: number        // e.g. 25 = 25%
  contingencyPct: number         // auto from risk band, overrideable
  contingencyLocked: boolean     // true = user overrode
  sprintWeeks: number
  workingDaysPerWeek: number
  overheadPct: number            // e.g. 10 = 10% overhead on top of cost
  createdAt: string
  updatedAt: string
}
