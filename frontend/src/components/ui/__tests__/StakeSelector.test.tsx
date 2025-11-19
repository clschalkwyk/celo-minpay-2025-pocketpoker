import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StakeSelector } from '../StakeSelector'
import { stakeTiers } from '../../../lib/mockData'

describe('StakeSelector', () => {
  it('calls onChange when a stake is selected', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<StakeSelector stakes={stakeTiers} value={stakeTiers[0]!.amount} onChange={onChange} />)

    await user.click(screen.getByText('R5'))

    expect(onChange).toHaveBeenCalledWith(5)
  })
})
