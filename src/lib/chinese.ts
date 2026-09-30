/**
 * The Chinese calendar: the sixty-day cycle of stems and branches, whose
 * twelve branches are the zodiac animals, and Lunar New Year.
 */
import { SearchMoonPhase, Seasons, SunPosition } from 'astronomy-engine';

export const ZODIAC_ANIMALS = [
  'Rat', 'Ox', 'Tiger', 'Rabbit', 'Dragon', 'Snake', 'Horse', 'Goat', 'Monkey', 'Rooster', 'Dog', 'Pig',
];
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const STEM_ELEMENTS = ['Wood', 'Fire', 'Earth', 'Metal', 'Water'];

const DAY = 86_400_000;

export interface SexagenaryDay {
  /** 0 = 甲子, the first of the sixty. */
  index: number;
  stem: number;
  branch: number;
  /** e.g. 丙午 */
  name: string;
  animal: string;
}

/** The place of a local calendar day in the unbroken sixty-day cycle, from its Julian day number. */
export function sexagenaryDay(day: Date): SexagenaryDay {
  const jdn = Math.round(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / DAY) + 2_440_588;
  const index = (((jdn + 49) % 60) + 60) % 60;
  return {
    index,
    stem: index % 10,
    branch: index % 12,
    name: STEMS[index % 10] + BRANCHES[index % 12],
    animal: ZODIAC_ANIMALS[index % 12],
  };
}

/** The animal and element of a Chinese year (which begins at Lunar New Year). */
export function yearAnimal(year: number): { animal: string; element: string } {
  const n = ((year - 4) % 60 + 60) % 60;
  return { animal: ZODIAC_ANIMALS[n % 12], element: STEM_ELEMENTS[Math.floor((n % 10) / 2)] };
}

// The Chinese calendar is reckoned in Beijing time: UTC+8 since 1929, the
// meridian of Beijing (116°25′ E, UTC+7:45:40) before.
const STANDARD_SINCE = Date.UTC(1929, 0, 1);
const beijingOffset = (ms: number) => (ms < STANDARD_SINCE ? 27_940_000 : 8 * 3_600_000);
const beijingDay = (t: Date) => Math.floor((t.getTime() + beijingOffset(t.getTime())) / DAY);

/** The new moon that begins the lunar month containing the given instant's Beijing date. */
function monthStart(t: Date): Date {
  let m = SearchMoonPhase(0, new Date(t.getTime() - 31 * DAY), 32)!.date;
  for (;;) {
    const next = SearchMoonPhase(0, new Date(m.getTime() + DAY), 32)!.date;
    if (beijingDay(next) > beijingDay(t)) return m;
    m = next;
  }
}

/** Whether a lunar month holds a principal term (zhongqi) — the Sun crossing a multiple of 30°. */
function hasZhongqi(start: Date, next: Date): boolean {
  const sign = (d: number) => Math.floor(SunPosition(new Date(d * DAY - beijingOffset(d * DAY))).elon / 30);
  return sign(beijingDay(start)) !== sign(beijingDay(next));
}

/**
 * Lunar New Year: the start of the second lunar month after the one holding
 * the winter solstice — or the third, when a leap month (a month without a
 * principal term) falls between.
 */
export function lunarNewYear(year: number): Date {
  const m11 = monthStart(Seasons(year - 1).dec_solstice.date);
  const nextM11 = monthStart(Seasons(year).dec_solstice.date);
  const moons = [m11];
  while (beijingDay(moons[moons.length - 1]) < beijingDay(nextM11)) {
    moons.push(SearchMoonPhase(0, new Date(moons[moons.length - 1].getTime() + DAY), 32)!.date);
  }
  // Thirteen months between the solstices: the first without a principal term is the leap month.
  let leap = -1;
  if (moons.length - 1 === 13) {
    for (let k = 1; k < 13 && leap < 0; k++) if (!hasZhongqi(moons[k], moons[k + 1])) leap = k;
  }
  const newYear = moons[leap === 1 || leap === 2 ? 3 : 2];
  const d = new Date(beijingDay(newYear) * DAY);
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}
