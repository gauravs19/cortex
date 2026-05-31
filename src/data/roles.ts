import type { RoleId, RoleDef } from '../types'

export const ROLES: Record<RoleId, RoleDef> = {
  SA: { name: 'Solution Architect',   defaultRate: 900 },
  SD: { name: 'Senior Developer',     defaultRate: 700 },
  MD: { name: 'Mid Developer',        defaultRate: 550 },
  JD: { name: 'Junior Developer',     defaultRate: 350 },
  QA: { name: 'QA Engineer',          defaultRate: 500 },
  BA: { name: 'Business Analyst',     defaultRate: 600 },
  UX: { name: 'UX Designer',          defaultRate: 600 },
  DO: { name: 'DevOps Engineer',      defaultRate: 650 },
  PM: { name: 'Project Manager',      defaultRate: 650 },
  DM: { name: 'Delivery Manager',     defaultRate: 800 },
  DE: { name: 'Data Engineer',        defaultRate: 700 },
  CM: { name: 'Change Manager',       defaultRate: 600 },
}

export const DEFAULT_ROLES: RoleId[] = ['SA', 'SD', 'MD', 'QA', 'BA', 'PM']

export const CONTINGENCY_BY_BAND: Record<string, number> = {
  green:   10,
  amber:   20,
  red:     35,
  black:   50,
  unknown: 20,
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', INR: '₹',
}

export const CURRENCY_RATE_MULTIPLIERS: Record<string, number> = {
  GBP: 1, USD: 1.27, EUR: 1.17, INR: 105,
}
