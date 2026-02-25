import React from 'react'
import { planetaryDayToWeekday, sunSignSeasonDateRanges } from '../lib/astro/index.js'

const PHASE_EMOJI = {
  'New Moon': '🌑',
  'Waxing Crescent': '🌒',
  'First Quarter': '🌓',
  'Waxing Gibbous': '🌔',
  'Full Moon': '🌕',
  'Waning Gibbous': '🌖',
  'Last Quarter': '🌗',
  'Waning Crescent': '🌘',
}

function formatDateLocal(date) {
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export default function TimingCard({ intent, suggestions, today }) {
  const { timingHints } = intent
  const {
    planetaryDay,
    preferredMoonPhase,
    preferredSunSigns = [],
    avoidMoonPhase,
  } = timingHints

  const weekdayInfo = planetaryDay ? planetaryDayToWeekday[planetaryDay] : null

  // Find the next occurrence of the preferred sun sign season window
  const signWindows = preferredSunSigns
    .map((sign) => {
      const year = today.getUTCFullYear()
      let range = sunSignSeasonDateRanges(sign, year)
      // If the end is already past, try next year
      if (range && range.end < today) {
        range = sunSignSeasonDateRanges(sign, year + 1)
      }
      return range ? { sign, ...range } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.start - b.start)

  return (
    <section className="timing-card card" aria-label="Timing Recommendations">
      <h2>Timing Recommendations</h2>
      <p className="timing-mode-badge">Dataset-only mode · offline capable</p>

      <div className="timing-grid">
        {/* Best Weekday */}
        {weekdayInfo && (
          <div className="timing-item">
            <h3>Best Weekday</h3>
            <p className="timing-value">{weekdayInfo.name}</p>
            <p className="timing-detail">Ruled by {planetaryDay}</p>
          </div>
        )}

        {/* Best Lunar Phase */}
        {preferredMoonPhase && (
          <div className="timing-item">
            <h3>Best Lunar Phase</h3>
            <p className="timing-value">
              {PHASE_EMOJI[preferredMoonPhase] || '🌙'} {preferredMoonPhase}
            </p>
            {avoidMoonPhase && (
              <p className="timing-detail timing-avoid">
                Avoid: {PHASE_EMOJI[avoidMoonPhase] || '🌙'} {avoidMoonPhase}
              </p>
            )}
          </div>
        )}

        {/* Best Sign Season */}
        {signWindows.length > 0 && (
          <div className="timing-item timing-item-wide">
            <h3>Favorable Sign Seasons</h3>
            <ul className="sign-windows">
              {signWindows.map(({ sign, start, end }) => (
                <li key={sign}>
                  <strong>{sign}</strong>{' '}
                  <span className="season-range">
                    {formatDateLocal(start)} – {formatDateLocal(end)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Suggested Dates */}
      {suggestions.length > 0 && (
        <div className="suggestions">
          <h3>Next Suggested Dates</h3>
          <ol className="suggestion-list">
            {suggestions.map(({ date, reasons, phase }, i) => (
              <li key={i} className="suggestion-item">
                <span className="suggestion-date">{formatDateLocal(date)}</span>
                <span className="suggestion-phase">
                  {PHASE_EMOJI[phase.phaseName] || '🌙'} {phase.phaseName}
                </span>
                <ul className="suggestion-reasons">
                  {reasons.map((r, j) => (
                    <li key={j}>{r}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </div>
      )}

      {suggestions.length === 0 && (
        <p className="no-suggestions">
          No high-scoring dates found in the next 90 days for this intent.
          Try broadening the timing preferences.
        </p>
      )}
    </section>
  )
}
