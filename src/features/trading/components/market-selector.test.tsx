// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MarketSelector } from './market-selector'

afterEach(cleanup)

describe('MarketSelector', () => {
  it('renders every market and marks the selected market', () => {
    render(<MarketSelector marketId={2} onMarketChange={() => undefined} />)

    const selector = screen.getByRole('combobox', { name: 'Market' })
    const options = screen.getAllByRole('option')

    expect((selector as HTMLSelectElement).value).toBe('2')
    expect(options.map((option) => option.textContent)).toEqual([
      'SOL/USDC · Market #1',
      'MATO/USDC · Market #2',
      'SB/USDC · Market #3',
      'SF/USDC · Market #4',
    ])
  })

  it('reports the selected market as a numeric market id', () => {
    const onMarketChange = vi.fn()
    render(<MarketSelector marketId={1} onMarketChange={onMarketChange} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Market' }), {
      target: { value: '4' },
    })

    expect(onMarketChange).toHaveBeenCalledWith(4)
  })

  it('can be disabled while a market change is pending', () => {
    render(
      <MarketSelector disabled marketId={1} onMarketChange={() => undefined} />,
    )

    expect(
      screen.getByRole('combobox', { name: 'Market' }).hasAttribute('disabled'),
    ).toBe(true)
  })
})
