/**
 * Client-side classes equivalent to the MongoDB documents.
 * Each class wraps the JSON returned by the REST API and adds derived properties.
 */
import { formatDate } from '../pipes';
import { doctorUri } from '../utils/graphics';

const idOf = (v) => (v && typeof v === 'object' ? v._id : v || '');

export class User {
  constructor(json = {}) {
    this._id = json._id;
    this.username = json.username || '';
    this.email = json.email || '';
    this.fullName = json.fullName || '';
    this.phone = json.phone || '';
    this.role = json.role || 'user';
    this.emailNotifications = json.emailNotifications ?? true;
    this.appointmentCount = json.appointmentCount ?? 0;
    this.completedCount = json.completedCount ?? 0;
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
  }
  get isAdmin() { return this.role === 'admin'; }
  get displayName() { return this.fullName || this.username; }
}

// female names end with -a in Macedonian (used only for the generated portrait)
const looksFemale = (first = '') => /а$/i.test(first.trim());

export class Dentist {
  constructor(json = {}) {
    this._id = json._id;
    this.firstName = json.firstName || '';
    this.lastName = json.lastName || '';
    this.specialty = json.specialty || '';
    this.bio = json.bio || '';
    this.yearsExperience = json.yearsExperience ?? '';
    this.photoUrl = json.photoUrl || '';
    this.workDays = json.workDays || [1, 2, 3, 4, 5];
    this.startHour = json.startHour ?? 8;
    this.endHour = json.endHour ?? 16;
    this.active = json.active ?? true;
    this.avgRating = json.avgRating ?? null;
    this.reviewCount = json.reviewCount ?? 0;
    this.ratingDistribution = json.ratingDistribution || [0, 0, 0, 0, 0];
    this.upcoming = json.upcoming ?? 0;
    this.completed = json.completed ?? 0;
  }
  get fullName() { return `${this.firstName} ${this.lastName}`.trim(); }
  get title() { return `д-р ${this.fullName}`; }
  get photo() { return this.photoUrl || doctorUri(this.fullName, looksFemale(this.firstName)); }
  get hours() { return `${String(this.startHour).padStart(2, '0')}:00 – ${String(this.endHour).padStart(2, '0')}:00`; }
  toPayload() {
    const num = (v) => (v === '' || v == null ? undefined : Number(v));
    return {
      firstName: this.firstName.trim(), lastName: this.lastName.trim(), specialty: this.specialty, bio: this.bio,
      yearsExperience: num(this.yearsExperience), photoUrl: this.photoUrl.trim() || undefined,
      workDays: [...this.workDays].map(Number).sort(), startHour: num(this.startHour), endHour: num(this.endHour), active: !!this.active,
    };
  }
}

export class Service {
  constructor(json = {}) {
    this._id = json._id;
    this.name = json.name || '';
    this.category = json.category || '';
    this.description = json.description || '';
    this.price = json.price ?? '';
    this.durationMin = json.durationMin ?? 30;
    this.active = json.active ?? true;
    this.bookings = json.bookings ?? 0;
  }
  toPayload() {
    return {
      name: this.name.trim(), category: this.category, description: this.description,
      price: Number(this.price), durationMin: Number(this.durationMin), active: !!this.active,
    };
  }
}

export class Review {
  constructor(json = {}) {
    this._id = json._id;
    this.patient = json.patient && typeof json.patient === 'object' ? new User(json.patient) : null;
    this.dentist = json.dentist && typeof json.dentist === 'object' ? new Dentist(json.dentist) : null;
    this.dentistId = idOf(json.dentist);
    this.appointment = idOf(json.appointment);
    this.rating = json.rating ?? 5;
    this.text = json.text || '';
    this.reply = json.reply || '';
    this.replyAt = json.replyAt ? new Date(json.replyAt) : null;
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
  }
}

export class Record {
  constructor(json = {}) {
    this._id = json._id;
    this.patient = idOf(json.patient);
    this.dentist = json.dentist && typeof json.dentist === 'object' ? new Dentist(json.dentist) : null;
    this.appointment = json.appointment || null;
    this.tooth = json.tooth ?? null;
    this.procedure = json.procedure || '';
    this.notes = json.notes || '';
    this.date = json.date ? new Date(json.date) : null;
  }
}

export class Appointment {
  constructor(json = {}) {
    this._id = json._id;
    this.patient = json.patient && typeof json.patient === 'object' ? new User(json.patient) : null;
    this.dentist = json.dentist && typeof json.dentist === 'object' ? new Dentist(json.dentist) : null;
    this.service = json.service && typeof json.service === 'object' ? new Service(json.service) : null;
    this.start = json.start ? new Date(json.start) : null;
    this.end = json.end ? new Date(json.end) : null;
    this.status = json.status || 'pending';
    this.price = json.price ?? null;
    this.note = json.note || '';
    this.cancelReason = json.cancelReason || '';
    this.review = json.review ? new Review(json.review) : null;
    this.records = (json.records || []).map((r) => new Record(r));
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
  }
  get isActive() { return ['pending', 'confirmed'].includes(this.status); }
  get isUpcoming() { return this.start > new Date(); }
  /** patients may cancel until 24 h before */
  get canCancel() { return this.isActive && this.start - Date.now() > 24 * 3600 * 1000; }
  get canReview() { return this.status === 'completed' && !this.review; }
  get when() { return `${formatDate(this.start, 'day')} · ${formatDate(this.start, 'time')}–${formatDate(this.end, 'time')}`; }
}

export class Activity {
  constructor(json = {}) {
    this._id = json._id;
    this.user = json.user && typeof json.user === 'object' ? new User(json.user) : null;
    this.action = json.action;
    this.entityType = json.entityType;
    this.entityId = json.entityId;
    this.description = json.description || '';
    this.createdAt = json.createdAt ? new Date(json.createdAt) : null;
  }
  get link() {
    const map = { Dentist: '/dentists/', Appointment: '/appointments/', Service: '/services/' };
    return this.action !== 'delete' && map[this.entityType] && this.entityId ? map[this.entityType] + this.entityId : null;
  }
}

/** Wrap a paginated API response */
export const toPage = (json, Cls) => ({ ...json, items: (json.items || []).map((i) => new Cls(i)) });
