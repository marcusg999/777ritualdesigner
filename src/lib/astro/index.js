/**
 * Astrological timing utilities (offline / dataset-only mode).
 * No ephemeris data or network calls required.
 */

/**
 * Planetary day → weekday mapping.
 * Index matches JavaScript Date.getDay() (0 = Sunday).
 */
export const planetaryDayToWeekday = {
  Sun: { day: 0, name: 'Sunday' },
  Moon: { day: 1, name: 'Monday' },
  Mars: { day: 2, name: 'Tuesday' },
  Mercury: { day: 3, name: 'Wednesday' },
  Jupiter: { day: 4, name: 'Thursday' },
  Venus: { day: 5, name: 'Friday' },
  Saturn: { day: 6, name: 'Saturday' },
}

/**
 * Western tropical zodiac sun-sign season date ranges for a given year.
 * Approximate ingress dates based on standard tropical calendar.
 * Returns { start: Date, end: Date } in UTC.
 */
export function sunSignSeasonDateRanges(sign, year) {
  const y = year
  const ny = year + 1

  const ranges = {
    Aries:       { start: new Date(Date.UTC(y,  2, 20)), end: new Date(Date.UTC(y,  3, 19)) },
    Taurus:      { start: new Date(Date.UTC(y,  3, 20)), end: new Date(Date.UTC(y,  4, 20)) },
    Gemini:      { start: new Date(Date.UTC(y,  4, 21)), end: new Date(Date.UTC(y,  5, 20)) },
    Cancer:      { start: new Date(Date.UTC(y,  5, 21)), end: new Date(Date.UTC(y,  6, 22)) },
    Leo:         { start: new Date(Date.UTC(y,  6, 23)), end: new Date(Date.UTC(y,  7, 22)) },
    Virgo:       { start: new Date(Date.UTC(y,  7, 23)), end: new Date(Date.UTC(y,  8, 22)) },
    Libra:       { start: new Date(Date.UTC(y,  8, 23)), end: new Date(Date.UTC(y,  9, 22)) },
    Scorpio:     { start: new Date(Date.UTC(y,  9, 23)), end: new Date(Date.UTC(y, 10, 21)) },
    Sagittarius: { start: new Date(Date.UTC(y, 10, 22)), end: new Date(Date.UTC(y, 11, 21)) },
    Capricorn:   { start: new Date(Date.UTC(y, 11, 22)), end: new Date(Date.UTC(ny, 0, 19)) },
    Aquarius:    { start: new Date(Date.UTC(y,  0, 20)), end: new Date(Date.UTC(y,  1, 18)) },
    Pisces:      { start: new Date(Date.UTC(y,  1, 19)), end: new Date(Date.UTC(y,  2, 19)) },
  }

  return ranges[sign] ?? null
}

/**
 * Approximate moon phase for a given Date using a synodic period algorithm.
 * Suitable for offline use — no ephemeris required.
 *
 * @param {Date} date
 * @returns {{ phaseName: string, illuminationEstimate: number, waxing: boolean, ageInDays: number }}
 */
export function approxMoonPhase(date) {
  // Known new moon: Jan 6, 2000 18:14 UTC (J2000-era reference)
  const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0))
  const synodicPeriod = 29.53058867 // days

  const elapsed = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24)
  const ageInDays = ((elapsed % synodicPeriod) + synodicPeriod) % synodicPeriod

  const waxing = ageInDays < synodicPeriod / 2
  // Approximate illumination (0–1) using cosine curve
  const illuminationEstimate = (1 - Math.cos((2 * Math.PI * ageInDays) / synodicPeriod)) / 2

  let phaseName
  if (ageInDays < 1.85) {
    phaseName = 'New Moon'
  } else if (ageInDays < 7.38) {
    phaseName = 'Waxing Crescent'
  } else if (ageInDays < 9.22) {
    phaseName = 'First Quarter'
  } else if (ageInDays < 14.77) {
    phaseName = 'Waxing Gibbous'
  } else if (ageInDays < 16.61) {
    phaseName = 'Full Moon'
  } else if (ageInDays < 22.15) {
    phaseName = 'Waning Gibbous'
  } else if (ageInDays < 23.99) {
    phaseName = 'Last Quarter'
  } else if (ageInDays < 29.53) {
    phaseName = 'Waning Crescent'
  } else {
    phaseName = 'New Moon'
  }

  return { phaseName, illuminationEstimate, waxing, ageInDays }
}

/**
 * Suggest ritual dates based on timing hints.
 *
 * @param {{ timingHints: object, startDate: Date, tz: string, count: number }} opts
 * @returns {Array<{ date: Date, reasons: string[], score: number }>}
 */
export function suggestRitualDates({ timingHints = {}, startDate, tz, count = 5 } = {}) {
  const start = startDate instanceof Date ? startDate : new Date()
  const results = []

  const {
    planetaryDay,
    preferredMoonPhase,
    preferredSunSigns = [],
    avoidMoonPhase,
  } = timingHints

  const preferredWeekday = planetaryDay ? planetaryDayToWeekday[planetaryDay]?.day : null

  // Scan the next 90 days
  for (let offset = 0; offset < 90 && results.length < count * 3; offset++) {
    const candidate = new Date(start.getTime() + offset * 24 * 60 * 60 * 1000)
    const reasons = []
    let score = 0

    // Check weekday match
    if (preferredWeekday !== null && preferredWeekday !== undefined) {
      if (candidate.getUTCDay() === preferredWeekday) {
        reasons.push(`${planetaryDay}'s day (${planetaryDayToWeekday[planetaryDay].name})`)
        score += 3
      }
    }

    // Check moon phase
    const phase = approxMoonPhase(candidate)
    if (preferredMoonPhase && phase.phaseName === preferredMoonPhase) {
      reasons.push(`${phase.phaseName} (preferred phase)`)
      score += 2
    }
    if (avoidMoonPhase && phase.phaseName === avoidMoonPhase) {
      score -= 3
    }

    // Check sun sign season
    if (preferredSunSigns.length > 0) {
      const year = candidate.getUTCFullYear()
      for (const sign of preferredSunSigns) {
        const range = sunSignSeasonDateRanges(sign, year)
        if (range && candidate >= range.start && candidate <= range.end) {
          reasons.push(`${sign} season`)
          score += 2
          break
        }
      }
    }

    if (score > 0) {
      results.push({ date: candidate, reasons, score, phase })
    }
  }

  // Sort by score descending, then by date ascending
  results.sort((a, b) => b.score - a.score || a.date - b.date)

  // Return top `count` unique dates
  const seen = new Set()
  const top = []
  for (const r of results) {
    const key = r.date.toISOString().slice(0, 10)
    if (!seen.has(key)) {
      seen.add(key)
      top.push(r)
      if (top.length === count) break
    }
  }

  // If we didn't find enough, fall back to next preferred weekday occurrences
  if (top.length < count && preferredWeekday !== null && preferredWeekday !== undefined) {
    for (let offset = 0; offset < 90 && top.length < count; offset++) {
      const candidate = new Date(start.getTime() + offset * 24 * 60 * 60 * 1000)
      const key = candidate.toISOString().slice(0, 10)
      if (candidate.getUTCDay() === preferredWeekday && !seen.has(key)) {
        const phase = approxMoonPhase(candidate)
        seen.add(key)
        top.push({
          date: candidate,
          reasons: [`${planetaryDayToWeekday[planetaryDay].name} (planetary day)`],
          score: 1,
          phase,
        })
      }
    }
  }

  return top.slice(0, count)
}
