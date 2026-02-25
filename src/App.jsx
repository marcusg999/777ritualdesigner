import React, { useState, useMemo } from 'react'
import { intents } from './data/intents.js'
import {
  planetaryDayToWeekday,
  sunSignSeasonDateRanges,
  approxMoonPhase,
  suggestRitualDates,
} from './lib/astro/index.js'
import TimingCard from './components/TimingCard.jsx'
import './App.css'

export default function App() {
  const [selectedIntentId, setSelectedIntentId] = useState('')
  const [advancedTiming, setAdvancedTiming] = useState(false)

  const selectedIntent = intents.find((i) => i.id === selectedIntentId)

  const today = useMemo(() => {
    const d = new Date()
    // Normalize to UTC midnight for reproducible suggestions
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  }, [])

  const suggestions = useMemo(() => {
    if (!selectedIntent) return []
    return suggestRitualDates({
      timingHints: selectedIntent.timingHints,
      startDate: today,
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      count: 5,
    })
  }, [selectedIntent, today])

  return (
    <div className="app">
      <header className="app-header">
        <h1>777 Ritual Designer</h1>
        <p className="subtitle">Astrological timing for intentional practice</p>
      </header>

      <main className="app-main">
        <section className="intent-section card">
          <h2>Select an Intent</h2>
          <div className="intent-grid">
            {intents.map((intent) => (
              <button
                key={intent.id}
                className={`intent-btn ${selectedIntentId === intent.id ? 'active' : ''}`}
                onClick={() =>
                  setSelectedIntentId((prev) => (prev === intent.id ? '' : intent.id))
                }
              >
                <span className="intent-label">{intent.label}</span>
                <span className="intent-desc">{intent.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="toggles card">
          <label className="toggle-row">
            <span className="toggle-label">
              <strong>Advanced Timing</strong>
              <span className="toggle-note">
                Requires location &amp; ephemeris model — not available offline
              </span>
            </span>
            <span className="toggle-switch">
              <input
                type="checkbox"
                id="advancedTiming"
                checked={advancedTiming}
                onChange={(e) => setAdvancedTiming(e.target.checked)}
                role="switch"
                aria-describedby="advancedTimingDesc"
              />
              <span className="toggle-slider" />
            </span>
          </label>
          {advancedTiming && (
            <p id="advancedTimingDesc" className="advanced-note">
              Full electional timing (planetary hours, void-of-course moon,
              location-aware ephemeris) is not yet available. Enable this toggle
              in a future update when an ephemeris model and location access are
              configured.
            </p>
          )}
        </section>

        {selectedIntent && (
          <TimingCard
            intent={selectedIntent}
            suggestions={suggestions}
            today={today}
          />
        )}
      </main>
    </div>
  )
}
