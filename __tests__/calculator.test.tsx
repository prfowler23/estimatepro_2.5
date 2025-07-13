import { render, screen, fireEvent } from '@testing-library/react'
import { GlassRestorationCalculator } from '@/lib/calculations/services/glass-restoration'

describe('Glass Restoration Calculator', () => {
  test('calculates correct base price', () => {
    const calculator = new GlassRestorationCalculator('raleigh')
    const result = calculator.calculate({
      glassSqft: 240, // 10 windows
      buildingHeightStories: 2,
      numberOfDrops: 4,
      crewSize: 2,
      shiftLength: 8
    })

    expect(result.basePrice).toBe(700) // 10 windows * $70
    expect(result.serviceType).toBe('GR')
  })

  test('validates minimum glass square footage', () => {
    const calculator = new GlassRestorationCalculator('raleigh')
    
    expect(() => {
      calculator.calculate({
        glassSqft: 0,
        buildingHeightStories: 1,
        numberOfDrops: 1,
        crewSize: 2,
        shiftLength: 8
      })
    }).toThrow()
  })
})