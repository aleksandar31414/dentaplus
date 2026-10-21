import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import holidayService from '../services/holidayService';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, EmptyState, Stars } from '../components/common';
import { CATEGORY, price, duration, specialtyLabel, formatDate, DAYS_SHORT, MONTHS_SHORT, doctor } from '../pipes';
import { validate, bookingSchema } from '../utils/validators';

// which specialties fit a service category (recommended dentists first)
const FIT = {
  preventive: ['general', 'periodontics'], restorative: ['endodontics', 'general'], cosmetic: ['prosthetics'],
  surgery: ['surgery'], orthodontics: ['orthodontics'], pediatric: ['pediatric'],
};
const DAYS_AHEAD = 21;

function Steps({ current }) {
  const items = ['Услуга', 'Стоматолог', 'Термин', 'Потврда'];
  return (
    <div className="steps">
      {items.map((l, i) => (
        <div key={l} className={`step${i === current ? ' active' : ''}${i < current ? ' done' : ''}`}>
          <span className="num">{i < current ? <i className="bi bi-check-lg" /> : i + 1}</span>{l}
        </div>
      ))}
    </div>
  );
}

/** Online booking wizard. Service, dentist and date are kept in the URL (back / forward works). */
export default function BookingPage() {
  const { isLoggedIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const serviceId = params.get('service') || '';
  const dentistId = params.get('dentist') || '';
  const date = params.get('date') || '';

  const services = useAsync(() => api.getServices(), []);
  const dentists = useAsync(() => api.getDentists(), []);
  const slots = useAsync(() => (serviceId && dentistId && date ? api.getSlots(dentistId, date, serviceId) : Promise.resolve(null)), [serviceId, dentistId, date]);
  const [start, setStart] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState(null);
  const [holidays, setHolidays] = useState({});

  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i); return d; }), []);
  useEffect(() => { holidayService.mapFor(days).then(setHolidays); }, [days]);
  useEffect(() => setStart(''), [serviceId, dentistId, date]);

  const set = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  const service = services.data?.find((s) => s._id === serviceId);
  const dentist = dentists.data?.find((d) => d._id === dentistId);
  const step = !service ? 0 : !dentist ? 1 : !start ? 2 : 3;
  const sortedDentists = (dentists.data || []).slice().sort((a, b) => {
    const fit = FIT[service?.category] || [];
    return (fit.includes(b.specialty) ? 1 : 0) - (fit.includes(a.specialty) ? 1 : 0);
  });

  const submit = async () => {
    const errs = validate({ serviceId, dentistId, start, note }, bookingSchema);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!isLoggedIn) { navigate('/login', { state: { from: location.pathname + location.search } }); return; }
    setBusy(true);
    try {
      setBooked(await api.book({ service: serviceId, dentist: dentistId, start, note: note.trim() || undefined }));
    } catch (err) {
      setErrors({ _: err.message });
      if (err.status === 409) slots.reload();
    } finally {
      setBusy(false);
    }
  };

  if (isAdmin) return <div className="alert alert-info">Администраторот ги управува термините од <Link to="/admin/appointments">Управување со термини</Link>.</div>;

  if (booked) {
    return (
      <div className="card mx-auto text-center" style={{ maxWidth: 620 }}>
        <div className="card-body p-5">
          <span className="tile-icon mb-3" style={{ width: 64, height: 64, fontSize: '2rem' }}><i className="bi bi-check2-circle" /></span>
          <h1 className="h3">Барањето е испратено!</h1>
          <p className="text-muted">Терминот <strong>{booked.service?.name}</strong> кај <strong>{doctor(booked.dentist)}</strong><br />{booked.when}<br />чека потврда од ординацијата. Ќе добиете е-пошта.</p>
          <div className="d-flex justify-content-center gap-2 flex-wrap">
            <Link to={`/appointments/${booked._id}`} className="btn btn-primary">Прикажи термин</Link>
            <Link to="/my-appointments" className="btn btn-light">Мои термини</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader kicker="Онлајн закажување" title="Закажи термин" subtitle="Четири кратки чекори. Слободните термини се пресметуваат според работното време, другите закажувања и државните празници." />
      <Steps current={step} />
      <div className="row g-4">
        <div className="col-lg-8">
          {/* 1. service */}
          <div className="card mb-4">
            <div className="card-header">1. Изберете услуга</div>
            <div className="card-body">
              {services.loading ? <Loader /> : services.error ? <ErrorAlert error={services.error} onRetry={services.reload} /> : (
                <div className="row g-2">
                  {services.data.map((s) => {
                    const c = CATEGORY[s.category] || {};
                    return (
                      <div className="col-md-6" key={s._id}>
                        <button type="button" className={`pick${s._id === serviceId ? ' selected' : ''}`} onClick={() => set({ service: s._id, date: '' })}>
                          <div className="d-flex gap-2 align-items-center">
                            <span className="svc-icon" style={{ background: c.bg, color: c.color, width: 38, height: 38, fontSize: '1rem' }}><i className={`bi ${c.icon}`} /></span>
                            <div className="flex-grow-1 min-w-0">
                              <div className="fw-bold text-truncate">{s.name}</div>
                              <div className="small text-muted">{duration(s.durationMin)} · {price(s.price)}</div>
                            </div>
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 2. dentist */}
          {service && (
            <div className="card mb-4">
              <div className="card-header">2. Изберете стоматолог</div>
              <div className="card-body">
                {dentists.loading ? <Loader /> : dentists.error ? <ErrorAlert error={dentists.error} /> : (
                  <div className="row g-2">
                    {sortedDentists.map((d) => (
                      <div className="col-md-6" key={d._id}>
                        <button type="button" className={`pick${d._id === dentistId ? ' selected' : ''}`} onClick={() => set({ dentist: d._id, date: '' })}>
                          <div className="d-flex gap-3 align-items-center">
                            <img src={d.photo} alt="" width="52" height="52" className="rounded-circle" style={{ objectFit: 'cover' }} />
                            <div className="min-w-0">
                              <div className="fw-bold">{d.title}</div>
                              <div className="small text-muted">{specialtyLabel(d.specialty)}</div>
                              <Stars value={d.avgRating} count={d.reviewCount} />
                              {(FIT[service.category] || []).includes(d.specialty) && <div><span className="badge bg-mint text-teal mt-1">препорачан за оваа услуга</span></div>}
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 3. date + slot */}
          {service && dentist && (
            <div className="card mb-4">
              <div className="card-header">3. Изберете ден и час</div>
              <div className="card-body">
                <div className="date-strip mb-3">
                  {days.map((d) => {
                    const iso = formatDate(d, 'iso');
                    const holiday = holidays[iso];
                    const off = !dentist.workDays.includes(d.getDay()) || holiday;
                    return (
                      <button type="button" key={iso} className={`date-btn${iso === date ? ' selected' : ''}${off ? ' closed' : ''}`}
                        onClick={() => set({ date: iso })} title={holiday || (off ? 'Не работи' : '')}>
                        <small>{DAYS_SHORT[d.getDay()]}</small><b>{d.getDate()}</b><small>{MONTHS_SHORT[d.getMonth()]}</small>
                      </button>
                    );
                  })}
                </div>
                {!date ? <p className="text-muted mb-0">Изберете ден. Посивените денови се неработни или празници.</p>
                  : slots.loading ? <Loader text="Се бараат слободни термини..." />
                    : slots.error ? <ErrorAlert error={slots.error} onRetry={slots.reload} />
                      : slots.data?.closed ? <div className="alert alert-warning mb-0"><i className="bi bi-calendar-x me-2" />{slots.data.closed}</div>
                        : slots.data && slots.data.slots.every((s) => !s.free) ? <div className="alert alert-warning mb-0">Нема слободни термини тој ден – изберете друг ден.</div>
                          : slots.data && (
                            <div className="row g-2">
                              {slots.data.slots.map((s) => (
                                <div className="col-4 col-sm-3 col-md-2" key={s.start}>
                                  <button type="button" className={`slot${start === s.start ? ' selected' : ''}`} disabled={!s.free} onClick={() => setStart(s.start)}>
                                    {formatDate(s.start, 'time')}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                {errors.start && <div className="invalid-feedback d-block mt-2">{errors.start}</div>}
              </div>
            </div>
          )}
        </div>

        {/* 4. summary */}
        <div className="col-lg-4">
          <div className="card position-sticky" style={{ top: 90 }}>
            <div className="card-header">4. Потврда</div>
            <div className="card-body">
              {!service ? <EmptyState icon="bi-clipboard2-plus" text="Изберете услуга за да почнете." /> : (
                <>
                  <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Услуга</span><strong className="text-end">{service.name}</strong></div>
                  <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Стоматолог</span><strong className="text-end">{dentist ? dentist.title : '–'}</strong></div>
                  <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Термин</span><strong className="text-end">{start ? `${formatDate(start, 'day')}, ${formatDate(start, 'time')}` : '–'}</strong></div>
                  <div className="d-flex justify-content-between py-2 border-bottom"><span className="text-muted">Траење</span><strong>{duration(service.durationMin)}</strong></div>
                  <div className="d-flex justify-content-between py-2 mb-3"><span className="text-muted">Цена</span><span className="price">{price(service.price)}</span></div>
                  <label className="form-label" htmlFor="note">Белешка за стоматологот</label>
                  <textarea id="note" className={`form-control mb-1${errors.note ? ' is-invalid' : ''}`} rows={3} maxLength={300} value={note}
                    placeholder="пр. Ме боли долниот лев заб кога пијам ладно" onChange={(e) => setNote(e.target.value)} />
                  <div className="form-text mb-3">{note.length}/300 · не е задолжително</div>
                  {errors._ && <div className="alert alert-danger py-2">{errors._}</div>}
                  {(errors.serviceId || errors.dentistId) && <div className="alert alert-warning py-2">{errors.serviceId || errors.dentistId}</div>}
                  <button type="button" className="btn btn-primary btn-lg w-100" disabled={busy || !start} onClick={submit}>
                    {busy && <span className="spinner-border spinner-border-sm me-2" />}{isLoggedIn ? 'Закажи' : 'Најави се и закажи'}
                  </button>
                  <p className="small text-muted mt-2 mb-0"><i className="bi bi-info-circle me-1" />Термин може да се откаже најдоцна 24 часа однапред.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
