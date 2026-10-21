/**
 * External source: public holidays of North Macedonia from the Nager.Date REST API
 * (https://date.nager.at – free, no API key). The clinic is closed on public holidays,
 * so these dates cannot be booked. If the API is not reachable, a built-in list of the
 * fixed-date holidays is used instead.
 */
const cache = new Map();
const TTL = 12 * 60 * 60 * 1000;

const FIXED = [
  ['01-01', 'Нова година'],
  ['01-07', 'Божик (православен)'],
  ['05-01', 'Ден на трудот'],
  ['05-24', 'Св. Кирил и Методиј'],
  ['08-02', 'Ден на Републиката (Илинден)'],
  ['09-08', 'Ден на независноста'],
  ['10-11', 'Ден на народното востание'],
  ['10-23', 'Ден на македонската револуционерна борба'],
  ['12-08', 'Св. Климент Охридски'],
];

const fallback = (year) => FIXED.map(([md, name]) => ({ date: `${year}-${md}`, name, localName: name }));

async function getHolidays(year) {
  const y = Number(year);
  const hit = cache.get(y);
  if (hit && Date.now() - hit.t < TTL) return hit.data;
  let data;
  try {
    const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${y}/MK`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const list = await res.json();
    if (!Array.isArray(list) || list.length === 0) throw new Error('empty');
    data = { source: 'nager.date', holidays: list.map((h) => ({ date: h.date, name: h.name, localName: h.localName })) };
  } catch (err) {
    data = { source: 'fallback', holidays: fallback(y) };
  }
  cache.set(y, { t: Date.now(), data });
  return data;
}

/** "2026-10-23" -> holiday object or null */
async function holidayOn(dateStr) {
  const { holidays } = await getHolidays(dateStr.slice(0, 4));
  return holidays.find((h) => h.date === dateStr) || null;
}

module.exports = { getHolidays, holidayOn };
