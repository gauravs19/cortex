import type { EstimateStream, RoleId } from '../types'

function stream(id: string, name: string, efforts: Partial<Record<RoleId, number>>): EstimateStream {
  return { id, name, efforts }
}

// Generic / Digital Transformation
const GENERIC: EstimateStream[] = [
  stream('ba',    'Business Analysis & Requirements', { BA: 20, SA: 10 }),
  stream('ux',    'UX & Design',                     { UX: 20, BA: 5 }),
  stream('fe',    'Frontend Development',            { SD: 30, MD: 20 }),
  stream('be',    'Backend Development',             { SD: 25, MD: 20, SA: 10 }),
  stream('int',   'Integration & APIs',              { SD: 20, SA: 5 }),
  stream('devops','DevOps & Infrastructure',         { DO: 15, SA: 5 }),
  stream('qa',    'QA & Testing',                    { QA: 25, MD: 5 }),
  stream('pm',    'Project Management',              { PM: 30, DM: 10 }),
]

// AI / ML
const AI_ML: EstimateStream[] = [
  stream('ba',    'Requirements & Data Discovery',   { BA: 15, SA: 10, DE: 10 }),
  stream('de',    'Data Engineering & Preparation',  { DE: 40, SD: 10 }),
  stream('ml',    'Model Development',               { SD: 35, DE: 15, SA: 10 }),
  stream('mlops', 'MLOps & Infrastructure',          { DO: 20, SD: 10 }),
  stream('api',   'API & Integration',               { SD: 15, SA: 5 }),
  stream('qa',    'QA & Model Validation',           { QA: 20, DE: 10 }),
  stream('pm',    'Project Management',              { PM: 25, DM: 10 }),
]

// ERP Implementation
const ERP: EstimateStream[] = [
  stream('design','Solution Design & Architecture',  { SA: 20, BA: 15 }),
  stream('config','Configuration & Customisation',   { SD: 50, MD: 30, SA: 10 }),
  stream('int',   'Integration Development',         { SD: 30, SA: 10 }),
  stream('dm',    'Data Migration',                  { DE: 25, SD: 10, BA: 10 }),
  stream('test',  'Testing (SIT + UAT)',             { QA: 40, BA: 15 }),
  stream('train', 'Training & Change Management',    { CM: 20, BA: 10 }),
  stream('pm',    'Project Management',              { PM: 35, DM: 15 }),
]

// Cloud Migration
const CLOUD: EstimateStream[] = [
  stream('assess','Discovery & Assessment',           { SA: 20, BA: 10 }),
  stream('arch',  'Architecture & Design',            { SA: 25, SD: 10 }),
  stream('mig',   'Migration Development',            { SD: 40, DO: 30 }),
  stream('test',  'Testing & Validation',             { QA: 25, DO: 10 }),
  stream('cut',   'Cutover & Go-Live',                { DO: 15, SA: 10, PM: 5 }),
  stream('pm',    'Project Management',               { PM: 25, DM: 10 }),
]

// Data Platform
const DATA: EstimateStream[] = [
  stream('disc',  'Data Discovery & Profiling',       { DE: 20, BA: 10, SA: 10 }),
  stream('arch',  'Platform Architecture',            { SA: 20, DE: 10 }),
  stream('pipe',  'Pipeline Development',             { DE: 40, SD: 20 }),
  stream('viz',   'Reporting & Visualisation',        { SD: 25, UX: 10, BA: 10 }),
  stream('qa',    'QA & Data Validation',             { QA: 20, DE: 10 }),
  stream('pm',    'Project Management',               { PM: 25, DM: 10 }),
]

// Security
const SECURITY: EstimateStream[] = [
  stream('assess','Security Assessment & Scoping',    { SA: 20, BA: 10 }),
  stream('arch',  'Security Architecture',            { SA: 25, SD: 10 }),
  stream('impl',  'Implementation & Hardening',       { SD: 35, DO: 20 }),
  stream('test',  'Penetration Testing & Review',     { QA: 20, SA: 10 }),
  stream('cm',    'Policy & Change Management',       { CM: 15, BA: 10 }),
  stream('pm',    'Project Management',               { PM: 20, DM: 10 }),
]

// Managed Service
const MANAGED: EstimateStream[] = [
  stream('trans', 'Service Transition',               { SA: 15, PM: 10, BA: 10 }),
  stream('ops',   'Operations Setup',                 { DO: 30, SD: 15 }),
  stream('mon',   'Monitoring & Tooling',             { DO: 20, SD: 10 }),
  stream('doc',   'Documentation & Runbooks',         { BA: 15, DO: 10 }),
  stream('pm',    'Programme Management',             { DM: 20, PM: 15 }),
]

export const STREAM_DEFAULTS: Record<string, EstimateStream[]> = {
  'digital-transformation': GENERIC,
  'custom-development':     GENERIC,
  '':                       GENERIC,
  'ai-ml':                  AI_ML,
  'erp':                    ERP,
  'cloud-migration':        CLOUD,
  'data-platform':          DATA,
  'security':               SECURITY,
  'managed-service':        MANAGED,
}

export function getDefaultStreams(workType: string): EstimateStream[] {
  return (STREAM_DEFAULTS[workType] ?? STREAM_DEFAULTS[''])
    .map(s => ({ ...s, efforts: { ...s.efforts } }))
}
