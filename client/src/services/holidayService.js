/**
 * Service 2: public holidays of North Macedonia (external source Nager.Date, via our backend proxy
 * /api/external/holidays). Used by the booking calendar to grey out the days when the clinic is closed.
 */
import api from './api';

class HolidayService {
  constructor() {
    this.cache = new Map();
  }

  /** -> { source, holidays: [{ date: 'YYYY-MM-DD', name, localName }] } */
  async forYear(year) {
    if (!this.cache.has(year)) {
      this.cache.set(year, api.get(`/external/holidays?year=${year}`).catch(() => ({ source: 'none', holidays: [] })));
    }
    return this.cache.get(year);
  }

  /** Map 'YYYY-MM-DD' -> holiday name, for all years touched by the given dates */
  async mapFor(dates) {
    const years = [...new Set(dates.map((d) => d.getFullYear()))];
    const lists = await Promise.all(years.map((y) => this.forYear(y)));
    return Object.fromEntries(lists.flatMap((l) => l.holidays).map((h) => [h.date, h.localName || h.name]));
  }
}

export const holidayService = new HolidayService();
export default holidayService;
