import { expect, test } from '@playwright/test'

test.describe('MiniPay detection errors', () => {
  test('shows Splash error when MiniPay is on the wrong chain', async ({ page }) => {
    await page.addInitScript(() => {
      const provider = {
        isMiniPay: true,
        async request({ method }: { method: string }) {
          if (method === 'eth_chainId') return '0xAEF3'
          if (method === 'eth_requestAccounts') {
            throw new Error('MiniPay unavailable in this browser')
          }
          return null
        },
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(window as any).ethereum = provider
    })

    await page.goto('/')
    await expect(page.getByText('MiniPay unavailable in this browser')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry connection' })).toBeVisible()
  })
})
