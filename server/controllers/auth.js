const User = require('../models/user');
const { HttpError, asyncHandler } = require('../utils/http');
const { sendMail, templates } = require('../services/mailer');
const { logActivity } = require('../services/activity');

const register = asyncHandler(async (req, res) => {
  const { username, email, password, fullName, phone, emailNotifications } = req.body;
  const user = new User({ username, email, fullName, phone, emailNotifications });
  await user.setPassword(password);
  await user.save(); // duplicates -> 409 from error handler

  logActivity(user, 'register', 'User', user._id, `Нов пациент ${user.username}`);
  if (user.emailNotifications !== false) sendMail({ to: user.email, ...templates.welcome(user) });

  res.status(201).json({ token: user.generateJwt(), user });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email).toLowerCase() }).select('+passwordHash');
  if (!user || !(await user.validPassword(password))) {
    throw new HttpError(401, 'Погрешна е-пошта или лозинка');
  }
  logActivity(user, 'login', 'User', user._id, `${user.username} се најави`);
  res.json({ token: user.generateJwt(), user });
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new HttpError(404, 'Корисникот не постои');
  res.json(user);
});

module.exports = { register, login, me };
