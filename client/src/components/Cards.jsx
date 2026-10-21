/** Data-driven cards reused on several pages. */
import { Link } from 'react-router-dom';
import { Stars, StatusBadge } from './common';
import { CATEGORY, price, duration, specialtyLabel, MONTHS_SHORT, DAYS_SHORT, formatDate, doctor, pipe, truncate } from '../pipes';

export function ServiceCard({ service, onBook }) {
  const c = CATEGORY[service.category] || {};
  return (
    <div className="card svc-card">
      <div className="card-body d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <span className="svc-icon" style={{ background: c.bg, color: c.color }}><i className={`bi ${c.icon}`} /></span>
          <span className="badge rounded-pill" style={{ background: c.bg, color: c.color }}>{c.label}</span>
        </div>
        <h3 className="h5 mb-1"><Link to={`/services/${service._id}`} className="text-reset stretched-link">{service.name}</Link></h3>
        <p className="small text-muted flex-grow-1 mb-3">{pipe(service.description, truncate(90))}</p>
        <div className="d-flex justify-content-between align-items-end">
          <div className="price">{price(service.price)}</div>
          <span className="small text-muted"><i className="bi bi-clock me-1" />{duration(service.durationMin)}</span>
        </div>
        {onBook && <button type="button" className="btn btn-primary btn-sm mt-3 position-relative" style={{ zIndex: 2 }} onClick={() => onBook(service)}>Закажи</button>}
      </div>
    </div>
  );
}

export function DentistCard({ dentist }) {
  const d = dentist;
  return (
    <div className="card doc-card">
      <img src={d.photo} alt={d.title} className="doc-photo" loading="lazy" />
      <div className="card-body">
        <div className="small fw-bold text-teal mb-1">{specialtyLabel(d.specialty)}</div>
        <h3 className="h5 mb-1"><Link to={`/dentists/${d._id}`} className="text-reset stretched-link">{d.title}</Link></h3>
        <Stars value={d.avgRating} count={d.reviewCount} />
        <div className="d-flex justify-content-between small text-muted mt-2">
          <span><i className="bi bi-award me-1" />{d.yearsExperience} год. искуство</span>
          <span><i className="bi bi-clock me-1" />{d.hours}</span>
        </div>
        <div className="mt-2">{[1, 2, 3, 4, 5, 6].map((n) => <span key={n} className={`day-pill${d.workDays.includes(n) ? ' on' : ''}`}>{DAYS_SHORT[n].slice(0, 2)}</span>)}</div>
      </div>
    </div>
  );
}

/** One appointment as a row: date block, service, dentist, status and actions (children). */
export function AppointmentCard({ appt, children, showPatient = false }) {
  const a = appt;
  return (
    <div className="card mb-3">
      <div className="card-body appt flex-wrap">
        <div className="appt-date"><small>{MONTHS_SHORT[a.start.getMonth()]}</small><b>{a.start.getDate()}</b><small>{formatDate(a.start, 'time')}</small></div>
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
            <Link to={`/appointments/${a._id}`} className="fw-bold h6 mb-0 text-reset">{a.service?.name || 'Услуга'}</Link>
            <StatusBadge status={a.status} />
          </div>
          <div className="small text-muted">
            {doctor(a.dentist)} · {a.when}{showPatient && a.patient && <> · <i className="bi bi-person" /> {a.patient.fullName || a.patient.username}</>}
          </div>
          {a.note && <div className="small mt-1"><i className="bi bi-chat-left-text me-1 text-muted" />{a.note}</div>}
          {a.status === 'cancelled' && a.cancelReason && <div className="small text-danger mt-1">{a.cancelReason}</div>}
        </div>
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <span className="fw-bold me-2">{price(a.price)}</span>
          {children}
        </div>
      </div>
    </div>
  );
}

export function ReviewCard({ review, children }) {
  const r = review;
  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <Stars value={r.rating} />
          <small className="text-muted">{formatDate(r.createdAt)}</small>
        </div>
        <p className="review-quote mb-2">{r.text}</p>
        <div className="small text-muted">
          — {r.patient?.fullName || r.patient?.username || 'пациент'}{r.dentist && <> · кај {doctor(r.dentist)}</>}
        </div>
        {r.reply && <div className="reply mt-3"><i className="bi bi-reply me-1 text-teal" /><strong>DentaPlus:</strong> {r.reply}</div>}
        {children}
      </div>
    </div>
  );
}
