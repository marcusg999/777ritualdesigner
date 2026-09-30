import { hinduFestivals, lunarMonths, LUNAR_MONTHS, tithiAt, tithiName } from '@/lib/panchang';
import { monthAlmanac } from '@/lib/almanac';

// Published dates are Drik Panchang's for New Delhi. Festival dates are the
// place's own calendar days, so these hold whatever zone the tests run in.
const DELHI = { lat: 28.61, lon: 77.21 };
const ist = (d: Date) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }).format(d);

function keptOn(year: number, place = DELHI) {
  const all = hinduFestivals(new Date(year, 0, 1), new Date(year + 1, 0, 1), place);
  return (name: string) => all.filter((f) => f.name === name).map((f) => f.date.toDateString());
}

describe('tithis', () => {
  it('counts lunar days from the new moon', () => {
    // New moon 11 Sept 2026, 03:27 UTC; full moon 26 Sept, 16:49 UTC.
    expect(tithiAt(new Date('2026-09-11T04:00Z'))).toBe(1);
    expect(tithiAt(new Date('2026-09-26T12:00Z'))).toBe(15);
    expect(tithiAt(new Date('2026-09-27T12:00Z'))).toBe(16);
    expect(tithiName(4)).toBe('Shukla Chaturthi');
    expect(tithiName(19)).toBe('Krishna Chaturthi');
    expect(tithiName(30)).toBe('Amavasya');
  });

  it('names amanta months by their sankranti, with 2026’s leap Jyeshtha', () => {
    const months = lunarMonths(new Date('2026-05-01T00:00Z'), new Date('2026-07-31T00:00Z'));
    expect(months.map((m) => `${m.adhika ? 'Adhika ' : ''}${LUNAR_MONTHS[m.month]}`)).toEqual([
      'Vaishakha', 'Adhika Jyeshtha', 'Jyeshtha', 'Ashadha',
    ]);
  });
});

describe('Hindu festivals (New Delhi, as published)', () => {
  const published: Record<string, Record<number, string>> = {
    'Vasant Panchami': { 2024: 'Wed Feb 14', 2025: 'Sun Feb 02', 2026: 'Fri Jan 23' },
    'Maha Shivaratri': { 2024: 'Fri Mar 08', 2025: 'Wed Feb 26', 2026: 'Sun Feb 15' },
    'Chaitra Navaratri begins': { 2024: 'Tue Apr 09', 2025: 'Sun Mar 30' },
    'Ganesh Chaturthi': { 2024: 'Sat Sep 07', 2025: 'Wed Aug 27', 2026: 'Mon Sep 14' },
    'Sharad Navaratri begins': { 2024: 'Thu Oct 03', 2025: 'Mon Sep 22', 2026: 'Sun Oct 11' },
    'Durga Ashtami': { 2024: 'Fri Oct 11', 2025: 'Tue Sep 30' },
    Vijayadashami: { 2024: 'Sat Oct 12', 2025: 'Thu Oct 02', 2026: 'Tue Oct 20' },
    // 2024: Amavasya covered Pradosh on both evenings, and the second was kept.
    'Diwali · Lakshmi Puja': { 2024: 'Fri Nov 01', 2025: 'Mon Oct 20', 2026: 'Sun Nov 08' },
    'Kali Puja': { 2025: 'Mon Oct 20', 2026: 'Sun Nov 08' },
    'Kali Chaudas': { 2025: 'Sun Oct 19', 2026: 'Sat Nov 07' },
  };
  for (const year of [2024, 2025, 2026]) {
    it(`keeps each festival on its published day in ${year}`, () => {
      const on = keptOn(year);
      for (const [name, dates] of Object.entries(published)) {
        if (dates[year]) expect({ name, on: on(name) }).toEqual({ name, on: [`${dates[year]} ${year}`] });
      }
    });
  }

  it('keeps Ratanti Kali Puja on its published night', () => {
    expect(keptOn(2027)('Ratanti Kali Puja')).toEqual(['Thu Feb 04 2027']);
  });

  it('gives the puja windows Drik Panchang publishes', () => {
    const f = hinduFestivals(new Date(2026, 0, 1), new Date(2027, 0, 1), DELHI);
    const window = (name: string) => {
      const x = f.find((y) => y.name === name)!;
      return `${ist(x.start!)}–${ist(x.end!)}`;
    };
    expect(window('Vasant Panchami')).toBe('07:13–12:33');
    expect(window('Maha Shivaratri')).toBe('00:09–01:00'); // published 00:09–00:59
    expect(window('Ganesh Chaturthi')).toBe('11:02–13:30'); // published 11:02–13:31
  });

  it('keeps Sankashti on the day Krishna Chaturthi holds at moonrise, Angaraki on Tuesdays', () => {
    const on = keptOn(2026);
    expect(on('Angaraki Sankashti Chaturthi')).toEqual(['Tue Jan 06 2026', 'Tue May 05 2026', 'Tue Sep 29 2026']);
    expect(on('Masik Shivaratri')).toContain('Fri Jan 16 2026');
    // Maha Shivaratri replaces Magha's monthly Shivaratri.
    expect(on('Masik Shivaratri')).not.toContain('Sun Feb 15 2026');
  });

  it('holds no festival in a leap month', () => {
    // Adhika Jyeshtha, 17 May – 15 June 2026: only the monthly observances fall in it.
    const f = hinduFestivals(new Date(2026, 4, 17), new Date(2026, 5, 15), DELHI);
    expect(new Set(f.map((x) => x.name))).toEqual(new Set(['Masik Shivaratri', 'Sankashti Chaturthi']));
  });
});

describe('Hindu festivals in the Almanac', () => {
  it('lists them as holy days linked to their deity, with the tithi of each day', () => {
    const sept = monthAlmanac(2026, 8, DELHI);
    const ganesh = sept[13].events.find((e) => e.title === 'Ganesh Chaturthi')!;
    expect(ganesh).toMatchObject({ kind: 'holy-day', query: 'Ganesha' });
    expect(ganesh.detail).toMatch(/Shukla Chaturthi/);
    // Chaturthi begins later that morning on the 14th — the day still opens on
    // Tritiya — and holds through midday, which is what decides the festival.
    expect(tithiName(sept[13].tithi)).toBe('Shukla Tritiya');
    expect(tithiName(sept[14].tithi)).toBe('Shukla Chaturthi');
  });

  it('reckons from a 6 am sunrise without a location', () => {
    // Los Angeles time: Amavasya begins late on 7 Nov and holds at that night's midnight.
    const nov = monthAlmanac(2026, 10);
    expect(nov[6].events.map((e) => e.title)).toContain('Kali Puja');
    expect(nov[7].events.map((e) => e.title)).toContain('Diwali · Lakshmi Puja');
  });
});
