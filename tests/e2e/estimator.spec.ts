import { test, expect } from '@playwright/test'

test.describe('Estimator — summary bar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Start estimating/i }).click()
    await page.waitForURL(/\/estimate\//)
  })

  test('summary bar shows all key pills', async ({ page }) => {
    await expect(page.getByText('Total effort')).toBeVisible()
    await expect(page.getByText('Direct cost')).toBeVisible()
    await expect(page.getByText('Duration')).toBeVisible()
    await expect(page.getByText('Sprints')).toBeVisible()
  })

  test('billing currency pill updates label when billing ≠ delivery', async ({ page }) => {
    // Change delivery to GBP
    await page.getByRole('button', { name: /Cost Build-up/i }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /£ GBP/i }).click()
    await page.waitForTimeout(200)
    // Set billing to USD
    await page.locator('select[title*="Billing currency"]').selectOption('USD')
    await page.waitForTimeout(400)
    // Pill label should read "Sell (USD)"
    await expect(page.getByText('Sell (USD)')).toBeVisible()
  })

  test('billing currency pill shows plain "Sell price" when same currency', async ({ page }) => {
    // Ensure both currencies are USD (default)
    await page.locator('select[title*="Billing currency"]').selectOption('USD')
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /Cost Build-up/i }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /\$ USD/i }).click()
    await page.waitForTimeout(300)
    // Pill label should be exactly "Sell price" — use exact to avoid matching "Sell price incl. contingency"
    await expect(page.getByText('Sell price', { exact: true })).toBeVisible()
    await expect(page.getByText('Sell (USD)')).not.toBeVisible()
  })
})

test.describe('Estimator — Cost Build-up tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Start estimating/i }).click()
    await page.waitForURL(/\/estimate\//)
    await page.getByRole('button', { name: /Cost Build-up/i }).click()
    await page.waitForTimeout(300)
  })

  test('rate card table is visible', async ({ page }) => {
    await expect(page.getByText('Rate card — cost vs billing by role')).toBeVisible()
  })

  test('delivery currency selector works', async ({ page }) => {
    await page.getByRole('button', { name: /£ GBP/i }).click()
    await page.waitForTimeout(200)
    await expect(page.getByText('Delivery currency')).toBeVisible()
  })
})

test.describe('Estimator — P&L tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Start estimating/i }).click()
    await page.waitForURL(/\/estimate\//)
    await page.getByRole('button', { name: 'P&L', exact: true }).click()
    await page.waitForTimeout(300)
  })

  test('P&L waterfall shows all key rows', async ({ page }) => {
    await expect(page.getByText('P&L waterfall')).toBeVisible()
    await expect(page.getByText('Revenue').first()).toBeVisible()
    await expect(page.getByText('Labour Margin (LM)').first()).toBeVisible()
    await expect(page.getByText('Gross Margin (GM)').first()).toBeVisible()
    await expect(page.getByText('EBITDA').first()).toBeVisible()
  })

  test('Revenue row shows billing currency annotation when currencies differ', async ({ page }) => {
    await page.getByRole('button', { name: /Cost Build-up/i }).click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /£ GBP/i }).click()
    await page.waitForTimeout(200)
    await page.locator('select[title*="Billing currency"]').selectOption('USD')
    await page.waitForTimeout(300)
    await page.getByRole('button', { name: 'P&L', exact: true }).click()
    await page.waitForTimeout(300)
    await expect(page.getByText(/billed as USD/i)).toBeVisible()
  })

  test('P&L parameters sliders are visible', async ({ page }) => {
    await expect(page.getByText('P&L parameters')).toBeVisible()
    await expect(page.getByText('Target LM floor')).toBeVisible()
    await expect(page.getByText('Delivery overhead').first()).toBeVisible()
  })

  test('headline cards show Revenue, LM, GM, EBITDA', async ({ page }) => {
    await expect(page.getByText('Labour Margin').first()).toBeVisible()
    await expect(page.getByText('Gross Margin').first()).toBeVisible()
    await expect(page.getByText('EBITDA').first()).toBeVisible()
  })
})

test.describe('Estimator — Timeline tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Start estimating/i }).click()
    await page.waitForURL(/\/estimate\//)
    // Give it some effort so Gantt has rows
    await page.getByRole('button', { name: 'Scope', exact: true }).first().click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /Generic/i }).first().click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /Stream Matrix/i }).click()
    await page.waitForTimeout(300)
    await page.locator('input[type="number"]').first().fill('20')
    await page.locator('input[type="number"]').first().blur()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: 'Timeline', exact: true }).click()
    await page.waitForTimeout(600)
  })

  test('shows summary cards (days, weeks, sprints, team)', async ({ page }) => {
    await expect(page.getByText('Total days').first()).toBeVisible()
    await expect(page.getByText('Calendar weeks').first()).toBeVisible()
    // "Sprints" in summary bar + timeline card — use first()
    await expect(page.getByText('Sprints').first()).toBeVisible()
    await expect(page.getByText('Avg team size')).toBeVisible()
  })

  test('shows phase overview bar with all 7 phases', async ({ page }) => {
    for (const phase of ['Discovery', 'Design', 'Implementation', 'QA / Testing', 'UAT', 'Go-Live', 'Hypercare']) {
      await expect(page.getByText(phase).first()).toBeVisible()
    }
  })

  test('shows Gantt section with stream schedule label', async ({ page }) => {
    await expect(page.getByText('Gantt — stream schedule')).toBeVisible()
  })

  test('Week/Month view toggle switches active state', async ({ page }) => {
    const weekBtn = page.getByRole('button', { name: 'Week' })
    const monthBtn = page.getByRole('button', { name: 'Month' })
    await expect(weekBtn).toHaveClass(/bg-indigo-6/)
    await monthBtn.click()
    await page.waitForTimeout(400)
    await expect(monthBtn).toHaveClass(/bg-indigo-6/)
    await expect(weekBtn).not.toHaveClass(/bg-indigo-6/)
  })

  test('sprint length toggle updates value', async ({ page }) => {
    await page.getByRole('button', { name: /^1w$/ }).click()
    await page.waitForTimeout(200)
    await expect(page.getByRole('button', { name: /^1w$/ })).toHaveClass(/bg-indigo-6/)
  })

  test('start date input is editable', async ({ page }) => {
    const dateInput = page.locator('input[type="date"]')
    await dateInput.fill('2026-09-01')
    await dateInput.blur()
    await page.waitForTimeout(200)
    await expect(dateInput).toHaveValue('2026-09-01')
  })
})
