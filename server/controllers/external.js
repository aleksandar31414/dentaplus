const { getHolidays } = require('../services/holidays');
const { HttpError, asyncHandler } = require('../utils/http');

/** GET /api/external/holidays?year=2026 – public holidays of North Macedonia (Nager.Date API) */
const holidays = asyncHandler(async (req, res) => {
  const year = Number(req.query.year || new Date().getFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new HttpError(400, 'Невалидна година', { year: '2000–2100' });
  res.json(await getHolidays(year));
});

module.exports = { holidays };
