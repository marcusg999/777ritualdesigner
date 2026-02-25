import { describe, it, expect } from 'vitest'
import {
  planetaryDayToWeekday,
  sunSignSeasonDateRanges,
  approxMoonPhase,
  suggestRitualDates,
} from '../lib/astro/index.js'

describe('planetaryDayToWeekday', () => {
  it('maps Sun to Sunday (0)', () => {
    expect(planetaryDayToWeekday.Sun).toEqual({ day: 0, name: 'Sunday' })
  })
  it('maps Moon to Monday (1)', () => {
    expect(planetaryDayToWeekday.Moon).toEqual({ day: 1, name: 'Monday' })
  })
  it('maps Mars to Tuesday (2)', () => {
    expect(planetaryDayToWeekday.Mars).toEqual({ day: 2, name: 'Tuesday' })
  })
  it('maps Mercury to Wednesday (3)', () => {
    expect(planetaryDayToWeekday.Mercury).toEqual({ day: 3, name: 'Wednesday' })
  })
  it('maps Jupiter to Thursday (4)', () => {
    expect(planetaryDayToWeekday.Jupiter).toEqual({ day: 4, name: 'Thursday' })
  })
  it('maps Venus to Friday (5)', () => {
    expect(planetaryDayToWeekday.Venus).toEqual({ day: 5, name: 'Friday' })
  })
  it('maps Saturn to Saturday (6)', () => {
    expect(planetaryDayToWeekday.Saturn).toEqual({ day: 6, name: 'Saturday' })
  })
  it('has exactly 7 entries', () => {
    expect(Object.keys(planetaryDayToWeekday)).toHaveLength(7)
  })
})

describe('sunSignSeasonDateRanges', () => {
  it('returns Aries season starting March 20 and ending April 19', () => {
    const range = sunSignSeasonDateRanges('Aries', 2024)
    expect(range.start.toISOString().slice(0, 10)).toBe('2024-03-20')
    expect(range.end.toISOString().slice(0, 10)).toBe('2024-04-19')
  })

  it('returns Leo season starting July 23', () => {
    const range = sunSignSeasonDateRanges('Leo', 2024)
    expect(range.start.toISOString().slice(0, 10)).toBe('2024-07-23')
  })

  it('returns null for an unknown sign', () => {
    expect(sunSignSeasonDateRanges('Ophiuchus', 2024)).toBeNull()
  })

  it('Capricorn season crosses year boundary', () => {
    const range = sunSignSeasonDateRanges('Capricorn', 2024)
    expect(range.start.getUTCFullYear()).toBe(2024)
    expect(range.end.getUTCFullYear()).toBe(2025)
  })

  it('covers all 12 signs', () => {
    const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo',
                   'Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces']
    for (const sign of signs) {
      expect(sunSignSeasonDateRanges(sign, 2025)).not.toBeNull()
    }
  })
})

describe('approxMoonPhase', () => {
  it('returns an object with required fields', () => {
    const result = approxMoonPhase(new Date('2024-01-11T00:00:00Z'))
    expect(result).toHaveProperty('phaseName')
    expect(result).toHaveProperty('illuminationEstimate')
    expect(result).toHaveProperty('waxing')
    expect(result).toHaveProperty('ageInDays')
  })

  it('illuminationEstimate is between 0 and 1', () => {
    for (let day = 0; day < 30; day++) {
      const date = new Date(Date.UTC(2024, 0, 1 + day))
      const result = approxMoonPhase(date)
      expect(result.illuminationEstimate).toBeGreaterThanOrEqual(0)
      expect(result.illuminationEstimate).toBeLessThanOrEqual(1)
    }
  })

  it('returns deterministic result for same date', () => {
    const d = new Date('2024-06-15T12:00:00Z')
    const r1 = approxMoonPhase(d)
    const r2 = approxMoonPhase(d)
    expect(r1).toEqual(r2)
  })

  it('ageInDays is within [0, 29.53)', () => {
    const result = approxMoonPhase(new Date('2024-09-17T00:00:00Z'))
    expect(result.ageInDays).toBeGreaterThanOrEqual(0)
    expect(result.ageInDays).toBeLessThan(29.53058867)
  })

  it('waxing is true in first half, false in second half', () => {
    // Use the known reference new moon (Jan 6, 2000) + small offset
    const newMoonRef = new Date(Date.UTC(2000, 0, 6, 18, 14, 0))
    // 7 days after new moon → waxing
    const waxDate = new Date(newMoonRef.getTime() + 7 * 24 * 60 * 60 * 1000)
    expect(approxMoonPhase(waxDate).waxing).toBe(true)
    // 20 days after new moon → waning
    const waneDate = new Date(newMoonRef.getTime() + 20 * 24 * 60 * 60 * 1000)
    expect(approxMoonPhase(waneDate).waxing).toBe(false)
  })

  it('phase name at new moon reference is New Moon', () => {
    const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0))
    expect(approxMoonPhase(knownNewMoon).phaseName).toBe('New Moon')
  })
})

describe('suggestRitualDates', () => {
  // Use a fixed start date for determinism
  const start = new Date(Date.UTC(2024, 0, 1)) // Jan 1, 2024 UTC

  it('returns an array', () => {
    const results = suggestRitualDates({
      timingHints: { planetaryDay: 'Venus' },
      startDate: start,
    })
    expect(Array.isArray(results)).toBe(true)
  })

  it('returns at most `count` results', () => {
    const results = suggestRitualDates({
      timingHints: { planetaryDay: 'Jupiter' },
      startDate: start,
      count: 3,
    })
    expect(results.length).toBeLessThanOrEqual(3)
  })

  it('each result has date, reasons array, and score', () => {
    const results = suggestRitualDates({
      timingHints: { planetaryDay: 'Moon' },
      startDate: start,
    })
    for (const r of results) {
      expect(r).toHaveProperty('date')
      expect(r).toHaveProperty('reasons')
      expect(r).toHaveProperty('score')
      expect(Array.isArray(r.reasons)).toBe(true)
    }
  })

  it('suggested Fridays appear when Venus is planetaryDay', () => {
    const results = suggestRitualDates({
      timingHints: { planetaryDay: 'Venus' },
      startDate: start,
      count: 5,
    })
    // At least one result should be a Friday (day 5 UTC)
    const hasFriday = results.some((r) => r.date.getUTCDay() === 5)
    expect(hasFriday).toBe(true)
  })

  it('returns empty array when no timingHints match', () => {
    const results = suggestRitualDates({
      timingHints: {},
      startDate: start,
      count: 5,
    })
    expect(results).toEqual([])
  })

  it('is deterministic for same inputs', () => {
    const opts = {
      timingHints: { planetaryDay: 'Saturn', preferredMoonPhase: 'Waning Crescent' },
      startDate: start,
      count: 5,
    }
    const r1 = suggestRitualDates(opts)
    const r2 = suggestRitualDates(opts)
    expect(r1.map((r) => r.date.toISOString())).toEqual(r2.map((r) => r.date.toISOString()))
  })
})
