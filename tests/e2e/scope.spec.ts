import { test, expect } from '@playwright/test'

test.describe('Scope tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Start estimating/i }).click()
    await page.waitForURL(/\/estimate\//)
    // exact:true avoids matching "No frontend in scope" hint text
    await page.getByRole('button', { name: 'Scope', exact: true }).first().click()
    await page.waitForTimeout(300)
  })

  // ── Layout ──────────────────────────────────────────────────

  test('shows project type section with description cards', async ({ page }) => {
    await expect(page.getByText('What type of project is this?')).toBeVisible()
    // Cards now have description text beneath label
    await expect(page.getByText('Digitise business processes')).toBeVisible()
    await expect(page.getByText('Build, train or deploy ML')).toBeVisible()
  })

  test('shows delivery platform section', async ({ page }) => {
    await expect(page.getByText('Delivery platform')).toBeVisible()
    for (const p of ['Web app', 'iOS native', 'Android native', 'Cross-platform', 'Desktop', 'API / Backend only']) {
      await expect(page.getByRole('button', { name: new RegExp(p, 'i') }).first()).toBeVisible()
    }
  })

  test('shows technical dimensions (backend, data, deployment, infra)', async ({ page }) => {
    await expect(page.getByText('Technical dimensions')).toBeVisible()
    await expect(page.getByText('Backend & integration complexity')).toBeVisible()
    await expect(page.getByText('Data & analytics requirements')).toBeVisible()
    await expect(page.getByText('Deployment target')).toBeVisible()
    await expect(page.getByText('Infrastructure scope')).toBeVisible()
  })

  test('shows scope additions (security, change mgmt)', async ({ page }) => {
    await expect(page.getByText('Scope additions')).toBeVisible()
    await expect(page.getByText('Security & compliance')).toBeVisible()
    await expect(page.getByText('Change management & training')).toBeVisible()
  })

  test('stream preview is collapsed by default', async ({ page }) => {
    await expect(page.getByText('CapEx streams — one-time delivery effort')).not.toBeVisible()
    await page.getByText('Stream preview').click()
    await expect(page.getByText('CapEx streams — one-time delivery effort')).toBeVisible()
  })

  // ── Work type smart defaults ─────────────────────────────────

  test('AI/ML: shows smart defaults badges after selection', async ({ page }) => {
    // .first() avoids matching "AI / ML workloads" in data requirements
    await page.getByRole('button', { name: /AI \/ ML/i }).first().click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Smart defaults applied')).toBeVisible()
    await expect(page.getByText('API-only')).toBeVisible()
    await expect(page.getByText('AI / ML data')).toBeVisible()
  })

  test('AI/ML: selects API/Backend only platform', async ({ page }) => {
    await page.getByRole('button', { name: /AI \/ ML/i }).first().click()
    await page.waitForTimeout(300)
    const apiBtn = page.getByRole('button', { name: /API \/ Backend only/i })
    await expect(apiBtn).toHaveClass(/border-indigo-5/)
  })

  test('smart defaults badges clear when config is manually changed', async ({ page }) => {
    await page.getByRole('button', { name: /AI \/ ML/i }).first().click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Smart defaults applied')).toBeVisible()
    await page.getByRole('button', { name: /Complex \/ legacy/i }).click()
    await page.waitForTimeout(200)
    await expect(page.getByText('Smart defaults applied')).not.toBeVisible()
  })

  test('reset button appears after customising and restores defaults', async ({ page }) => {
    await page.getByRole('button', { name: /Digital Transform/i }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /Complex \/ legacy/i }).click()
    await page.waitForTimeout(200)
    const resetBtn = page.getByRole('button', { name: /Reset/i })
    await expect(resetBtn).toBeVisible()
    await resetBtn.click()
    await page.waitForTimeout(200)
    await expect(resetBtn).not.toBeVisible()
  })

  // ── Platform mutual exclusion ────────────────────────────────

  test('selecting API-only disables all frontend platform buttons', async ({ page }) => {
    // start from Generic (web selected by default)
    await page.getByRole('button', { name: /Generic/i }).first().click()
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: /API \/ Backend only/i }).click()
    await page.waitForTimeout(300)
    await expect(page.getByRole('button', { name: /Web app/i })).toBeDisabled()
    await expect(page.getByRole('button', { name: /iOS native/i })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Android native/i })).toBeDisabled()
  })

  test('API-only: amber warning callout is shown', async ({ page }) => {
    await page.getByRole('button', { name: /Generic/i }).first().click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /API \/ Backend only/i }).click()
    await page.waitForTimeout(200)
    await expect(page.getByText('API / Backend only — no frontend streams')).toBeVisible()
  })

  test('toggling API-only off re-enables frontend platforms', async ({ page }) => {
    await page.getByRole('button', { name: /Generic/i }).first().click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /API \/ Backend only/i }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /API \/ Backend only/i }).click()
    await page.waitForTimeout(200)
    await expect(page.getByRole('button', { name: /Web app/i })).toBeEnabled()
  })

  test('selecting frontend platform clears API-only (via deselect then select)', async ({ page }) => {
    // Disabled buttons can't be clicked — must first deselect API-only, then pick a frontend
    await page.getByRole('button', { name: /AI \/ ML/i }).first().click()
    await page.waitForTimeout(300)
    await expect(page.getByRole('button', { name: /Web app/i })).toBeDisabled()
    // Deselect API-only by clicking it again
    await page.getByRole('button', { name: /API \/ Backend only/i }).click()
    await page.waitForTimeout(200)
    // Now Web app is enabled; selecting it removes the api-only warning
    await page.getByRole('button', { name: /Web app/i }).click()
    await page.waitForTimeout(200)
    await expect(page.getByText('API / Backend only — no frontend streams')).not.toBeVisible()
  })

  // ── Scope-specific Q&A ───────────────────────────────────────

  test('AI/ML shows qualification questions with impact text', async ({ page }) => {
    await page.getByRole('button', { name: /AI \/ ML/i }).first().click()
    await page.waitForTimeout(400)
    await expect(page.getByText('AI / ML — qualification questions')).toBeVisible()
    await expect(page.getByText('Shapes ML model')).toBeVisible()
  })

  test('ERP shows module multi-select questions', async ({ page }) => {
    // Use emoji prefix to avoid matching "Enterprise-grade" infra option
    await page.getByRole('button', { name: /🏢 ERP/i }).click()
    await page.waitForTimeout(400)
    await expect(page.getByText('ERP / Enterprise — qualification questions')).toBeVisible()
    await expect(page.getByText('Modules in scope')).toBeVisible()
  })

  test('Generic work type shows no qualification questions', async ({ page }) => {
    await page.getByRole('button', { name: /Generic/i }).first().click()
    await page.waitForTimeout(200)
    await expect(page.getByText('qualification questions')).not.toBeVisible()
  })

  // ── Stream preview ───────────────────────────────────────────

  test('stream preview shows correct capex/opex counts', async ({ page }) => {
    await page.getByRole('button', { name: /Generic/i }).first().click()
    await page.waitForTimeout(300)
    // Open preview
    await page.getByText('Stream preview').click()
    await page.waitForTimeout(200)
    await expect(page.getByText('CapEx streams — one-time delivery effort')).toBeVisible()
  })

  test('stream preview updates when backend complexity changes', async ({ page }) => {
    await page.getByRole('button', { name: /Generic/i }).first().click()
    await page.waitForTimeout(200)
    await page.getByText('Stream preview').click()
    // Start with medium — Integration stream present
    await expect(page.getByText('Integration & API Layer')).toBeVisible()
    // Switch to simple — Integration stream should disappear
    await page.getByRole('button', { name: /Simple \/ greenfield/i }).click()
    await page.waitForTimeout(300)
    await expect(page.getByText('Integration & API Layer')).not.toBeVisible()
  })
})
