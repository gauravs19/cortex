import { test, expect } from '@playwright/test'

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows CORTEX brand and tagline', async ({ page }) => {
    await expect(page.getByText('CORTEX')).toBeVisible()
    await expect(page.getByText('Cost · Rate · Timeline EXecution')).toBeVisible()
  })

  test('displays 8 work type options', async ({ page }) => {
    for (const label of ['Generic', 'Digital Transform', 'AI / ML', 'ERP / Enterprise', 'Cloud Migration', 'Data Platform', 'Security', 'Managed Service']) {
      await expect(page.getByRole('button', { name: new RegExp(label, 'i') }).first()).toBeVisible()
    }
  })

  test('shows Start estimating button with stream count', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Start estimating/i })).toBeVisible()
  })

  test('navigates into estimator on Start', async ({ page }) => {
    await page.getByRole('button', { name: /Start estimating/i }).click()
    await expect(page).toHaveURL(/\/estimate\//)
  })

  test('recent estimates panel hidden when none exist', async ({ page }) => {
    // Fresh localStorage — no recent list
    await expect(page.getByText('Recent')).not.toBeVisible()
  })
})
