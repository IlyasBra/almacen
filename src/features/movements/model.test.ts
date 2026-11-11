import { describe, expect, it } from 'vitest'

import { makeMovement } from '@/test/factories'

import { groupMovementsByDay, kindForChange } from './model'

describe('movements', () => {
  it('groups by local day, newest first', () => {
    const morning = makeMovement({ createdAt: new Date(2026, 10, 10, 9, 0).toISOString() })
    const evening = makeMovement({ createdAt: new Date(2026, 10, 10, 20, 0).toISOString() })
    const nextDay = makeMovement({ createdAt: new Date(2026, 10, 11, 8, 0).toISOString() })

    expect(groupMovementsByDay([morning, nextDay, evening])).toEqual([
      { day: '2026-11-11', movements: [nextDay] },
      { day: '2026-11-10', movements: [evening, morning] },
    ])
  })

  it('names the kind of a +/- change', () => {
    expect(kindForChange(2, 5)).toBe('in')
    expect(kindForChange(5, 2)).toBe('out')
  })
})
