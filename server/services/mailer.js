const nodemailer = require('nodemailer');

/**
 * E-mail notifications (nodemailer).
 * If SMTP_HOST is configured, real SMTP is used (e.g. Gmail app password, Mailtrap, Brevo…).
 * Otherwise a JSON transport is used and the message is only logged – handy for local dev.
 */
let transporter;
function getTransporter() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

async function sendMail({ to, subject, html }) {
  try {
    const info = await getTransporter().sendMail({
      from: process.env.MAIL_FROM || 'DentaPlus <no-reply@dentaplus.mk>',
      to,
      subject,
      html,
    });
    if (!process.env.SMTP_HOST) console.log(`[mail] (dev, not sent) to=${to} subject="${subject}"`);
    return info;
  } catch (err) {
    // e-mail must never break the main request
    console.error('[mail] failed:', err.message);
    return null;
  }
}

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const appUrl = () => process.env.APP_URL || 'http://localhost:3000';

const when = (d) => new Date(d).toLocaleString('mk-MK', { dateStyle: 'full', timeStyle: 'short' });
const STATUS_TEXT = { confirmed: 'е потврден ✅', cancelled: 'е откажан', completed: 'е завршен – ви благодариме!' };

const templates = {
  welcome: (user) => ({
    subject: 'Добредојдовте во DentaPlus 🦷',
    html: `<h2>Здраво ${esc(user.fullName || user.username)}!</h2>
      <p>Вашиот профил <b>${esc(user.username)}</b> е креиран. Сега можете онлајн да закажете преглед.</p>
      <p><a href="${appUrl()}/book">Закажи термин</a></p>`,
  }),
  booked: (appt, service, dentist) => ({
    subject: `Барање за термин: ${service.name}`,
    html: `<p>Го примивме вашето барање за <b>${esc(service.name)}</b> кај д-р ${esc(dentist.firstName)} ${esc(dentist.lastName)}.</p>
      <p>Термин: <b>${when(appt.start)}</b>. Ќе добиете е-пошта кога ординацијата ќе го потврди.</p>
      <p><a href="${appUrl()}/my-appointments">Мои термини</a></p>`,
  }),
  newBooking: (appt, service, dentist, patient) => ({
    subject: `Ново барање за термин – ${patient.username}`,
    html: `<p>Пациентот <b>${esc(patient.fullName || patient.username)}</b> побара <b>${esc(service.name)}</b>
      кај д-р ${esc(dentist.lastName)} на ${when(appt.start)}.</p><p><a href="${appUrl()}/admin/appointments">Потврди го терминот</a></p>`,
  }),
  statusChanged: (appt, service, status) => ({
    subject: `Вашиот термин ${STATUS_TEXT[status] || status}`,
    html: `<p>Терминот за <b>${esc(service?.name || '')}</b> на ${when(appt.start)} ${STATUS_TEXT[status] || status}.</p>
      ${appt.cancelReason ? `<p>Причина: ${esc(appt.cancelReason)}</p>` : ''}
      ${status === 'completed' ? `<p>Оставете рецензија: <a href="${appUrl()}/my-appointments">Мои термини</a></p>` : ''}`,
  }),
  reviewReply: (review) => ({
    subject: 'Ординацијата одговори на вашата рецензија',
    html: `<blockquote>${esc(review.text)}</blockquote><p><b>Одговор:</b> ${esc(review.reply)}</p>`,
  }),
};

module.exports = { sendMail, templates };
