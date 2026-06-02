import type { RoleId, RoleDef } from '../types'

// Default rates in USD (base currency)
export const ROLES: Record<RoleId, RoleDef> = {
  SA:  { name: 'Solution Architect',       defaultRate: 1150 },
  SD:  { name: 'Senior Developer',         defaultRate: 900 },
  MD:  { name: 'Mid Developer',            defaultRate: 700 },
  JD:  { name: 'Junior Developer',         defaultRate: 450 },
  QA:  { name: 'QA Engineer',              defaultRate: 650 },
  BA:  { name: 'Business Analyst',         defaultRate: 750 },
  UX:  { name: 'UX / Product Designer',    defaultRate: 750 },
  DO:  { name: 'DevOps Engineer',          defaultRate: 825 },
  PM:  { name: 'Project Manager',          defaultRate: 825 },
  DM:  { name: 'Delivery Manager',         defaultRate: 1025 },
  DE:  { name: 'Data Engineer',            defaultRate: 900 },
  CM:  { name: 'Change Manager',           defaultRate: 750 },
  SE:  { name: 'Security Engineer',        defaultRate: 950 },
}

export const DEFAULT_ROLES: RoleId[] = ['SA', 'SD', 'MD', 'QA', 'BA', 'PM']

export const CONTINGENCY_BY_BAND: Record<string, number> = {
  green: 10, amber: 20, red: 35, black: 50, unknown: 20,
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', INR: '₹',
}

// USD = 1.0 base; other currencies expressed as "1 USD = X"
export const CURRENCY_RATE_MULTIPLIERS: Record<string, number> = {
  USD: 1, GBP: 0.79, EUR: 0.92, INR: 82.7,
}

export const CATEGORY_LABELS: Record<string, string> = {
  discovery: 'Discovery & Analysis',
  design:    'UX & Design',
  frontend:  'Frontend',
  backend:   'Backend',
  data:      'Data & Analytics',
  infra:     'Infrastructure',
  devops:    'DevOps & CI/CD',
  security:  'Security',
  qa:        'QA & Testing',
  pm:        'Delivery Management',
  change:    'Change & Training',
}
