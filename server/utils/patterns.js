/**
 * Regular expressions and closed value sets shared by the Mongoose schemas
 * (schema-level validation) and the validation middleware (application level).
 * The React client has an equivalent copy in client/src/utils/validators.js.
 */
const PATTERNS = {
  username: /^[a-zA-Z0-9._]{3,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/,
  // at least 8 chars, one letter and one digit
  password: /^(?=.*[A-Za-z])(?=.*\d).{8,64}$/,
  personName: /^[\p{L}][\p{L}\s.'-]{1,59}$/u,
  phone: /^\+?[0-9 /-]{8,18}$/,
  serviceName: /^[\p{L}\d][\p{L}\d\s.,'()/+-]{2,59}$/u,
  url: /^https?:\/\/[^\s]+$/i,
  date: /^\d{4}-\d{2}-\d{2}$/,
  objectId: /^[a-f\d]{24}$/i,
};

const SPECIALTIES = ['general', 'orthodontics', 'surgery', 'endodontics', 'pediatric', 'prosthetics', 'periodontics'];
const CATEGORIES = ['preventive', 'restorative', 'cosmetic', 'surgery', 'orthodontics', 'pediatric'];
const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];
// FDI tooth numbers: 11–18, 21–28, 31–38, 41–48
const TEETH = [1, 2, 3, 4].flatMap((q) => [1, 2, 3, 4, 5, 6, 7, 8].map((n) => q * 10 + n));
const ROLES = ['user', 'admin'];
const ACTIVITY_ACTIONS = ['create', 'update', 'delete', 'login', 'register', 'book', 'cancel', 'confirm', 'complete', 'reply'];
const ENTITY_TYPES = ['User', 'Dentist', 'Service', 'Appointment', 'Review', 'Record', 'Database'];

module.exports = {
  PATTERNS, SPECIALTIES, CATEGORIES, APPOINTMENT_STATUSES, TEETH, ROLES, ACTIVITY_ACTIONS, ENTITY_TYPES,
};
