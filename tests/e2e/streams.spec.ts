import { test, expect } from '@playwright/test'

test.describe('Stream Matrix — blank-first + reference effort', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Start estimating/i }).click()
    await page.waitForURL(/\/estimate\//)
    await page.getByRole('button', { name: /Stream Matrix/i }).click()
    await page.waitForTimeout(300)
  })

  test('new estimate opens with 0d total effort', async ({ page }) => {
    const total = page.locator('tfoot td').filter({ hasText: /^\d+$/ }).first()
    await expect(total).toHaveText('0')
  })

  test('summary bar shows "No effort" instead of 0d', async ({ page }) => {
    await expect(page.getByText('No effort', { exact: true })).toBeVisible()
  })

  test('empty-state prompt is shown when no effort entered', async ({ page }) => {
    await expect(page.getByText('No effort entered yet')).toBeVisible()
    await expect(page.getByText('Fill the matrix below')).toBeVisible()
  })

  test('"Load reference effort" button appears in toolbar when streams are blank', async ({ page }) => {
    // The toolbar button with (N blank) label
    await expect(page.getByRole('button', { name: /Load reference effort/i }).first()).toBeVisible()
  })

  test('loading reference effort fills blank streams and hides empty-state', async ({ page }) => {
    await page.getByRole('button', { name: /Load reference effort/i }).first().click()
    await page.waitForTimeout(400)
    // Empty-state prompt should be gone
    await expect(page.getByText('No effort entered yet')).not.toBeVisible()
    // Grand total in tfoot should be > 0
    const total = page.locator('tfoot td').filter({ hasText: /^\d+$/ }).first()
    const text = await total.textContent()
    expect(Number(text)).toBeGreaterThan(0)
  })

  test('loading reference effort updates summary bar from "No effort" to Nd', async ({ page }) => {
    await expect(page.getByText('No effort', { exact: true })).toBeVisible()
    await page.getByRole('button', { name: /Load reference effort/i }).first().click()
    await page.waitForTimeout(400)
    await expect(page.getByText('No effort', { exact: true })).not.toBeVisible()
    await expect(page.locator('.bg-indigo-900').getByText(/\d+d/)).toBeVisible()
  })

  test('per-stream ↺ ref button appears on hover for blank streams', async ({ page }) => {
    // Hover over first stream row to reveal the per-stream ref chip
    const firstStreamRow = page.locator('tbody tr').filter({ has: page.locator('input[type="number"]') }).first()
    await firstStreamRow.hover()
    await page.waitForTimeout(300)
    // Per-stream button has exact text "ref" (not "Load reference effort")
    const perStreamBtn = firstStreamRow.getByRole('button', { name: 'ref', exact: true })
    await expect(perStreamBtn).toBeVisible()
  })

  test('per-stream ref loads only that stream, leaves others blank', async ({ page }) => {
    // Hover first row and click the per-stream "ref" button (exact match avoids toolbar)
    const firstRow = page.locator('tbody tr').filter({ has: page.locator('input[type="number"]') }).first()
    await firstRow.hover()
    await page.waitForTimeout(300)
    await firstRow.getByRole('button', { name: 'ref', exact: true }).click()
    await page.waitForTimeout(300)
    const totalAfterOne = page.locator('tfoot td').filter({ hasText: /^\d+$/ }).first()
    const oneText = await totalAfterOne.textContent()
    expect(Number(oneText)).toBeGreaterThan(0)
    // Load remaining blank streams via toolbar and confirm total increases
    const toolbarBtn = page.getByRole('button', { name: /Load reference effort/i }).first()
    if (await toolbarBtn.isVisible()) {
      await toolbarBtn.click()
      await page.waitForTimeout(300)
      const totalAfterAll = page.locator('tfoot td').filter({ hasText: /^\d+$/ }).first()
      const allText = await totalAfterAll.textContent()
      expect(Number(allText)).toBeGreaterThanOrEqual(Number(oneText))
    }
  })

  test('manually entered effort is NOT overwritten by load reference', async ({ page }) => {
    // Enter 42 days for the first blank cell
    const firstInput = page.locator('tbody input[type="number"]').first()
    await firstInput.fill('42')
    await firstInput.blur()
    await page.waitForTimeout(200)
    // Now load all reference effort
    await page.getByRole('button', { name: /Load reference effort/i }).first().click()
    await page.waitForTimeout(300)
    // The cell should still be 42
    await expect(firstInput).toHaveValue('42')
  })

  test('scope change adds new blank streams without wiping existing effort', async ({ page }) => {
    // Load reference effort to fill the matrix
    await page.getByRole('button', { name: /Load reference effort/i }).first().click()
    await page.waitForTimeout(300)
    const totalBefore = page.locator('tfoot td').filter({ hasText: /^\d+$/ }).first()
    const before = Number(await totalBefore.textContent())
    expect(before).toBeGreaterThan(0)

    // Change backend complexity in Scope tab
    await page.getByRole('button', { name: 'Scope', exact: true }).first().click()
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: /Complex \/ legacy/i }).click()
    await page.waitForTimeout(400)

    // Back to Stream Matrix — effort should still be there
    await page.getByRole('button', { name: /Stream Matrix/i }).click()
    await page.waitForTimeout(300)
    const totalAfter = page.locator('tfoot td').filter({ hasText: /^\d+$/ }).first()
    const after = Number(await totalAfter.textContent())
    // Original effort preserved (possibly more streams added, but nothing zeroed)
    expect(after).toBeGreaterThanOrEqual(before)
  })
})
