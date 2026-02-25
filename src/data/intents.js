/**
 * Intent and entity records for the 777 Ritual Designer.
 * Each record includes timingHints for astrological scheduling.
 * Fields:
 *   planetaryDay      - preferred planet whose day to perform the ritual
 *   preferredMoonPhase - preferred lunar phase name
 *   preferredSunSigns  - array of zodiac sign names whose season is favorable
 *   avoidMoonPhase    - lunar phase to avoid (optional)
 */

export const intents = [
  {
    id: 'prosperity',
    label: 'Prosperity / Abundance',
    description: 'Workings oriented toward growth, material increase, and financial flow.',
    timingHints: {
      planetaryDay: 'Jupiter',
      preferredMoonPhase: 'Waxing Gibbous',
      preferredSunSigns: ['Taurus', 'Sagittarius', 'Pisces'],
      avoidMoonPhase: 'Waning Crescent',
    },
  },
  {
    id: 'love',
    label: 'Love / Attraction',
    description: 'Workings oriented toward drawing connection, harmony, and affection.',
    timingHints: {
      planetaryDay: 'Venus',
      preferredMoonPhase: 'Waxing Crescent',
      preferredSunSigns: ['Taurus', 'Libra'],
      avoidMoonPhase: 'Waning Gibbous',
    },
  },
  {
    id: 'protection',
    label: 'Protection / Banishing',
    description: 'Workings oriented toward warding, cleansing, and boundary-setting.',
    timingHints: {
      planetaryDay: 'Saturn',
      preferredMoonPhase: 'Waning Crescent',
      preferredSunSigns: ['Scorpio', 'Capricorn'],
      avoidMoonPhase: 'Full Moon',
    },
  },
  {
    id: 'wisdom',
    label: 'Wisdom / Communication',
    description: 'Workings oriented toward mental clarity, learning, and inspired speech.',
    timingHints: {
      planetaryDay: 'Mercury',
      preferredMoonPhase: 'First Quarter',
      preferredSunSigns: ['Gemini', 'Virgo', 'Aquarius'],
    },
  },
  {
    id: 'healing',
    label: 'Healing / Renewal',
    description: 'Workings oriented toward health, restoration, and emotional balance.',
    timingHints: {
      planetaryDay: 'Moon',
      preferredMoonPhase: 'Waxing Gibbous',
      preferredSunSigns: ['Cancer', 'Virgo', 'Pisces'],
      avoidMoonPhase: 'Last Quarter',
    },
  },
  {
    id: 'courage',
    label: 'Courage / Willpower',
    description: 'Workings oriented toward strength, assertion, and overcoming obstacles.',
    timingHints: {
      planetaryDay: 'Mars',
      preferredMoonPhase: 'Full Moon',
      preferredSunSigns: ['Aries', 'Leo', 'Scorpio'],
      avoidMoonPhase: 'Waning Crescent',
    },
  },
  {
    id: 'illumination',
    label: 'Illumination / Solar',
    description: 'Workings oriented toward vitality, identity, and solar energies.',
    timingHints: {
      planetaryDay: 'Sun',
      preferredMoonPhase: 'Full Moon',
      preferredSunSigns: ['Leo', 'Aries'],
    },
  },
]
