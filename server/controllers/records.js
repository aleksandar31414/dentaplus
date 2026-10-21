const Record = require('../models/record');
const User = require('../models/user');
const { HttpError, asyncHandler } = require('../utils/http');
const { logActivity } = require('../services/activity');
const { PATTERNS } = require('../utils/patterns');

/** GET /api/records?patient= – patients see their own dental record, admins any patient's. */
const list = asyncHandler(async (req, res) => {
  let patient = req.user._id;
  if (req.user.role === 'admin' && req.query.patient) {
    if (!PATTERNS.objectId.test(req.query.patient)) throw new HttpError(400, 'Невалиден пациент');
    patient = req.query.patient;
  }
  const records = await Record.find({ patient }).sort({ date: -1 })
    .populate('dentist', 'firstName lastName')
    .populate({ path: 'appointment', select: 'service start', populate: { path: 'service', select: 'name' } });
  res.json(records);
});

const create = asyncHandler(async (req, res) => {
  if (!(await User.exists({ _id: req.body.patient }))) throw new HttpError(400, 'Пациентот не постои', { patient: 'не постои' });
  const { patient, tooth, procedure, notes } = req.body;
  const record = await Record.create({ patient, tooth: tooth === '' || tooth == null ? null : Number(tooth), procedure, notes });
  logActivity(req.user, 'create', 'Record', record._id, `Запис во картон: ${procedure}${record.tooth ? ` (заб ${record.tooth})` : ''}`);
  res.status(201).json(record);
});

const remove = asyncHandler(async (req, res) => {
  const record = await Record.findByIdAndDelete(req.params.id);
  if (!record) throw new HttpError(404, 'Записот не постои');
  logActivity(req.user, 'delete', 'Record', record._id, `Избришан запис: ${record.procedure}`);
  res.status(204).end();
});

module.exports = { list, create, remove };
