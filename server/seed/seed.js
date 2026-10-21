/**
 * Initial data for the /db page (and SEED_ON_START in Docker).
 * All people are fictional. Appointments are generated relative to "today", so there are always
 * completed visits (with dental record and reviews) and upcoming appointments.
 */
const User = require('../models/user');
const Dentist = require('../models/dentist');
const Service = require('../models/service');
const Appointment = require('../models/appointment');
const Review = require('../models/review');
const Record = require('../models/record');
const Activity = require('../models/activity');
const { TEETH } = require('../utils/patterns');

const MODELS = { users: User, dentists: Dentist, services: Service, appointments: Appointment, reviews: Review, records: Record, activities: Activity };

// deterministic pseudo random so the seed is always the same
let s = 11;
const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// fixed-date public holidays (MM-DD) – no appointments on these days
const HOLIDAYS = ['01-01', '01-07', '05-01', '05-24', '08-02', '09-08', '10-11', '10-23', '12-08'];
const pad = (n) => String(n).padStart(2, '0');
const isHoliday = (d) => HOLIDAYS.includes(`${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);

async function clearDatabase() {
  const counts = {};
  for (const [name, Model] of Object.entries(MODELS)) {
    counts[name] = (await Model.deleteMany({})).deletedCount;
  }
  return counts;
}

async function seedDatabase() {
  s = 11;
  await clearDatabase();

  // ---------- users ----------
  const usersData = [
    { username: 'admin', email: 'admin@dentaplus.mk', fullName: 'Рецепција DentaPlus', role: 'admin', phone: '+389 2 3100 100', password: 'Admin1234' },
    { username: 'marija.s', email: 'marija@dentaplus.mk', fullName: 'Марија Стојанова', role: 'user', phone: '+389 70 111 222', password: 'Pacient123' },
    { username: 'petar.n', email: 'petar@dentaplus.mk', fullName: 'Петар Николов', role: 'user', phone: '+389 71 333 444', password: 'Pacient123' },
    { username: 'ivana.t', email: 'ivana@dentaplus.mk', fullName: 'Ивана Трајкова', role: 'user', phone: '+389 75 555 666', password: 'Pacient123' },
    { username: 'goran.m', email: 'goran@dentaplus.mk', fullName: 'Горан Митев', role: 'user', phone: '+389 78 777 888', password: 'Pacient123' },
  ];
  const users = [];
  for (const { password, ...u } of usersData) {
    const user = new User({ ...u, emailNotifications: false });
    await user.setPassword(password);
    users.push(await user.save());
  }
  const [admin, ...patients] = users;

  // ---------- dentists (fictional) ----------
  const dentists = await Dentist.insertMany([
    { firstName: 'Елена', lastName: 'Николовска', specialty: 'general', yearsExperience: 12, workDays: [1, 2, 3, 4, 5], startHour: 8, endHour: 16,
      bio: 'Општа стоматологија и превенција. Верува дека редовниот преглед е најдобриот лек.' },
    { firstName: 'Александар', lastName: 'Петров', specialty: 'orthodontics', yearsExperience: 9, workDays: [1, 3, 5], startHour: 10, endHour: 18,
      bio: 'Ортодонт – фиксни и мобилни апарати, невидливи фолии за возрасни.' },
    { firstName: 'Марко', lastName: 'Ристевски', specialty: 'surgery', yearsExperience: 15, workDays: [2, 4], startHour: 8, endHour: 15,
      bio: 'Орален хирург – вадење умници, импланти и хируршки интервенции.' },
    { firstName: 'Ана', lastName: 'Георгиева', specialty: 'pediatric', yearsExperience: 7, workDays: [1, 2, 3, 4, 5], startHour: 9, endHour: 17,
      bio: 'Детски стоматолог. Првата посета е игра – без страв и без солзи.' },
    { firstName: 'Стефан', lastName: 'Костов', specialty: 'endodontics', yearsExperience: 10, workDays: [1, 2, 3, 4], startHour: 12, endHour: 20,
      bio: 'Ендодонција – лекување канали со микроскоп, попладневни термини.' },
    { firstName: 'Билјана', lastName: 'Тодорова', specialty: 'prosthetics', yearsExperience: 20, workDays: [2, 3, 4, 5, 6], startHour: 8, endHour: 14,
      bio: 'Протетика – коронки, мостови и фасети. Работи и во сабота.' },
  ]);
  const [elena, aleksandar, marko, ana, stefan, biljana] = dentists;

  // ---------- services (price list, MKD) ----------
  const services = await Service.insertMany([
    { name: 'Преглед и консултација', category: 'preventive', price: 800, durationMin: 30, description: 'Комплетен преглед, план на терапија и совети за орална хигиена.' },
    { name: 'Чистење на забен камен', category: 'preventive', price: 1500, durationMin: 45, description: 'Ултразвучно отстранување на камен и полирање.' },
    { name: 'Пескарење', category: 'preventive', price: 1200, durationMin: 30, description: 'Отстранување пигментации од кафе, чај и цигари.' },
    { name: 'Бела пломба (композит)', category: 'restorative', price: 2500, durationMin: 45, description: 'Естетска пломба во бојата на забот.' },
    { name: 'Лекување на канал', category: 'restorative', price: 6000, durationMin: 90, description: 'Ендодонтски третман на еден канал, со контролна снимка.' },
    { name: 'Вадење заб', category: 'surgery', price: 2000, durationMin: 30, description: 'Едноставна екстракција под локална анестезија.' },
    { name: 'Хируршко вадење умник', category: 'surgery', price: 7000, durationMin: 60, description: 'Вадење на импактиран умник со шиење.' },
    { name: 'Белење заби', category: 'cosmetic', price: 9000, durationMin: 60, description: 'Професионално белење во ординација, до 8 нијанси посветло.' },
    { name: 'Керамичка фасета', category: 'cosmetic', price: 12000, durationMin: 90, description: 'Тенка керамичка фасета по заб.' },
    { name: 'Ортодонтска консултација', category: 'orthodontics', price: 1500, durationMin: 45, description: 'Анализа на загризот и план за апарат.' },
    { name: 'Преглед за деца', category: 'pediatric', price: 600, durationMin: 30, description: 'Прв преглед и навикнување на детето на столот.' },
    { name: 'Заштитни лакови за деца', category: 'pediatric', price: 1000, durationMin: 30, description: 'Силанти за трајните катници.' },
  ]);
  const byCat = (c) => services.filter((x) => x.category === c);
  // which services each dentist performs
  const offers = new Map([
    [elena, [...byCat('preventive'), ...byCat('restorative').slice(0, 1), services[5]]],
    [aleksandar, byCat('orthodontics')],
    [marko, byCat('surgery')],
    [ana, byCat('pediatric')],
    [stefan, byCat('restorative')],
    [biljana, byCat('cosmetic')],
  ]);

  // ---------- appointments ----------
  const busy = new Map(dentists.map((d) => [String(d._id), []]));
  const free = (d, start, end) => !busy.get(String(d._id)).some(([a, b]) => start < b && a < end);
  function slotFor(d, service, dayOffset) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() + dayOffset);
    if (!d.workDays.includes(day.getDay()) || isHoliday(day)) return null;
    for (let tries = 0; tries < 8; tries += 1) {
      const minutes = d.startHour * 60 + int(0, Math.floor(((d.endHour - d.startHour) * 60 - service.durationMin) / 30)) * 30;
      const start = new Date(day.getTime() + minutes * 60000);
      const end = new Date(start.getTime() + service.durationMin * 60000);
      if (free(d, start, end)) { busy.get(String(d._id)).push([start, end]); return { start, end }; }
    }
    return null;
  }

  const NOTES = ['Ме боли кога пијам ладно.', 'Би сакал/а попладневен термин.', 'Контрола по претходната интервенција.', '', '', ''];
  const docs = [];
  // past visits (last 75 days)
  for (let off = -75; off <= -1; off += 1) {
    for (const d of dentists) {
      if (rnd() < 0.45) continue;
      const service = pick(offers.get(d));
      const slot = slotFor(d, service, off);
      if (!slot) continue;
      docs.push({ patient: pick(patients)._id, dentist: d._id, service: service._id, ...slot, price: service.price,
        status: rnd() < 0.85 ? 'completed' : 'cancelled', note: pick(NOTES) || undefined });
    }
  }
  // upcoming (next 14 days) – max 3 per patient
  const openCount = new Map();
  for (let off = 1; off <= 14; off += 1) {
    for (const d of dentists) {
      if (rnd() < 0.7) continue;
      const patient = pick(patients);
      if ((openCount.get(String(patient._id)) || 0) >= 3) continue;
      const service = pick(offers.get(d));
      const slot = slotFor(d, service, off);
      if (!slot) continue;
      openCount.set(String(patient._id), (openCount.get(String(patient._id)) || 0) + 1);
      docs.push({ patient: patient._id, dentist: d._id, service: service._id, ...slot, price: service.price,
        status: off <= 4 ? 'confirmed' : 'pending', note: pick(NOTES) || undefined });
    }
  }
  docs.forEach((a) => { if (a.status === 'cancelled') a.cancelReason = pick(['Откажано од пациентот', 'Болест', 'Промена на планови']); });
  const appointments = await Appointment.insertMany(docs);

  // ---------- dental record (for completed visits) ----------
  const completedAppts = appointments.filter((a) => a.status === 'completed');
  const svc = (id) => services.find((x) => x._id.equals(id));
  const records = await Record.insertMany(completedAppts.map((a) => {
    const service = svc(a.service);
    const perTooth = ['restorative', 'surgery', 'cosmetic'].includes(service.category);
    return {
      patient: a.patient, appointment: a._id, dentist: a.dentist, date: a.start,
      tooth: perTooth ? pick(service.category === 'surgery' && service.name.includes('умник') ? [18, 28, 38, 48] : TEETH) : null,
      procedure: service.name, notes: pick(['Без компликации.', 'Контрола за 6 месеци.', 'Препорачана подобра хигиена.', '']) || undefined,
    };
  }));

  // ---------- reviews ----------
  const TEXTS = {
    5: ['Многу љубезна докторка, интервенцијата беше безболна. Препорачувам!', 'Професионално и брзо, ординацијата е чиста и пријатна.', 'Конечно стоматолог од кој не се плашам. Одлично искуство!'],
    4: ['Многу добро, само малку чекав во чекалната.', 'Задоволен сум од третманот, цената е реална.'],
    3: ['Солидно, но терминот доцнеше 20 минути.'],
  };
  const reviewDocs = completedAppts.filter(() => rnd() < 0.6).map((a) => {
    const rating = pick([5, 5, 5, 4, 4, 3]);
    return { patient: a.patient, dentist: a.dentist, appointment: a._id, rating, text: pick(TEXTS[rating]),
      ...(rnd() < 0.4 ? { reply: 'Ви благодариме на довербата! Се гледаме на следната контрола.', replyAt: new Date(a.start.getTime() + 2 * 864e5) } : {}) };
  });
  const reviews = await Review.insertMany(reviewDocs);
  await Promise.all(reviews.map((r, i) => {
    const appt = appointments.find((a) => a._id.equals(reviewDocs[i].appointment));
    return Review.collection.updateOne({ _id: r._id }, { $set: { createdAt: new Date(appt.start.getTime() + 864e5) } });
  }));

  // ---------- history (raw insert keeps the historical dates) ----------
  const fmt = (d) => d.toLocaleString('mk-MK', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  await Activity.collection.insertMany([
    { user: admin._id, action: 'create', entityType: 'Database', description: 'Внесени иницијални податоци', createdAt: new Date() },
    ...appointments.map((a) => ({
      user: a.patient, action: 'book', entityType: 'Appointment', entityId: a._id,
      description: `Закажан термин: ${svc(a.service).name}, ${fmt(a.start)}`, createdAt: new Date(a.start.getTime() - int(2, 10) * 864e5),
    })),
    ...completedAppts.map((a) => ({
      user: admin._id, action: 'complete', entityType: 'Appointment', entityId: a._id,
      description: `${svc(a.service).name}, ${fmt(a.start)} → завршен`, createdAt: a.end,
    })),
  ]);

  return {
    users: users.length, dentists: dentists.length, services: services.length, appointments: appointments.length,
    reviews: reviews.length, records: records.length,
  };
}

module.exports = { seedDatabase, clearDatabase };
