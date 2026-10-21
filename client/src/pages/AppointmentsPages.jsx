import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, EmptyState, Pagination, StatusBadge, StarInput, Stars } from '../components/common';
import { AppointmentCard } from '../components/Cards';
import { FormModal, ConfirmModal } from '../components/Modals';
import FormField from '../components/FormField';
import { price, duration, formatDate, doctor, specialtyLabel, STATUS, telHref } from '../pipes';
import { validate, reviewSchema, recordSchema, TEETH } from '../utils/validators';

/** Popup: cancel with an optional reason */
function CancelModal({ appt, onHide, onDone }) {
  const [reason, setReason] = useState('');
  return (
    <ConfirmModal show title="Откажи термин" confirmText="Откажи термин" onCancel={onHide}
      onConfirm={async () => { await api.cancelAppointment(appt._id, reason.trim() || undefined); onDone(); }}>
      <p>Дали сакате да го откажете терминот <strong>{appt.service?.name}</strong> – {appt.when}?</p>
      <label className="form-label" htmlFor="reason">Причина (не е задолжително)</label>
      <input id="reason" className="form-control" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="пр. Болест" />
    </ConfirmModal>
  );
}

/** Popup: review a completed appointment (stars + text) */
function ReviewModal({ appt, onHide, onDone }) {
  const [v, setV] = useState({ rating: 5, text: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const errs = validate(v, reviewSchema);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await api.addReview({ appointment: appt._id, rating: v.rating, text: v.text.trim() }); onDone(); } catch (err) { setErrors({ _: err.message }); } finally { setBusy(false); }
  };
  return (
    <FormModal show title={`Оценете: ${doctor(appt.dentist)}`} onHide={onHide} onSubmit={submit} busy={busy} submitText="Испрати рецензија">
      {errors._ && <div className="col-12"><div className="alert alert-danger mb-0">{errors._}</div></div>}
      <div className="col-12">
        <span className="form-label d-block">Оценка</span>
        <StarInput value={v.rating} onChange={(rating) => setV({ ...v, rating })} />
        {errors.rating && <div className="invalid-feedback d-block">{errors.rating}</div>}
      </div>
      <FormField label="Вашето искуство" name="text" type="textarea" value={v.text} onChange={(k, val) => { setV({ ...v, text: val }); setErrors({}); }}
        error={errors.text} help={`${v.text.length}/500 · најмалку 10 знаци`} maxLength={500} />
    </FormModal>
  );
}

/** Admin popup: complete the appointment and add entries to the patient's dental record */
function CompleteModal({ appt, onHide, onDone }) {
  const [rows, setRows] = useState([{ tooth: '', procedure: appt.service?.name || '', notes: '' }]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const setRow = (i, k, v) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const submit = async () => {
    const errs = {};
    rows.forEach((r, i) => { const e = validate(r, recordSchema); if (Object.keys(e).length) errs[i] = Object.values(e)[0]; });
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.setAppointmentStatus(appt._id, 'completed', { records: rows.filter((r) => r.procedure.trim()).map((r) => ({ ...r, tooth: r.tooth === '' ? null : Number(r.tooth) })) });
      onDone();
    } catch (err) { setErrors({ _: err.message }); } finally { setBusy(false); }
  };
  return (
    <FormModal show size="lg" title="Заврши термин – запис во картон" onHide={onHide} onSubmit={submit} busy={busy} submitText="Заврши">
      <p className="col-12 small text-muted mb-0">{appt.patient?.fullName} · {appt.service?.name} · {appt.when}</p>
      {errors._ && <div className="col-12"><div className="alert alert-danger mb-0">{errors._}</div></div>}
      {rows.map((r, i) => (
        <div className="col-12" key={i}>
          <div className="row g-2 align-items-start">
            <div className="col-3 col-md-2">
              <select className="form-select" value={r.tooth} onChange={(e) => setRow(i, 'tooth', e.target.value)} aria-label="Заб">
                <option value="">цела уста</option>
                {TEETH.map((t) => <option key={t} value={t}>заб {t}</option>)}
              </select>
            </div>
            <div className="col-9 col-md-4"><input className="form-control" placeholder="Интервенција" maxLength={80} value={r.procedure} onChange={(e) => setRow(i, 'procedure', e.target.value)} aria-label="Интервенција" /></div>
            <div className="col-10 col-md-5"><input className="form-control" placeholder="Белешка" maxLength={500} value={r.notes} onChange={(e) => setRow(i, 'notes', e.target.value)} aria-label="Белешка" /></div>
            <div className="col-2 col-md-1"><button type="button" className="btn btn-light" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Отстрани" disabled={rows.length === 1}><i className="bi bi-x" /></button></div>
          </div>
          {errors[i] && <div className="invalid-feedback d-block">{errors[i]}</div>}
        </div>
      ))}
      <div className="col-12"><button type="button" className="btn btn-soft btn-sm" onClick={() => setRows([...rows, { tooth: '', procedure: '', notes: '' }])}><i className="bi bi-plus" /> Уште една интервенција</button></div>
    </FormModal>
  );
}

/** Patient: own appointments – upcoming / past, cancel, review */
export function MyAppointmentsPage() {
  const [params, setParams] = useSearchParams();
  const when = params.get('when') || 'upcoming';
  const page = Number(params.get('page')) || 1;
  const { data, loading, error, reload } = useAsync(() => api.getAppointments({ when, page, limit: 10, mine: 'true' }), [when, page]);
  const [cancel, setCancel] = useState(null);
  const [review, setReview] = useState(null);
  const tab = (v, l) => <li className="nav-item"><button type="button" className={`nav-link${when === v ? ' active' : ''}`} onClick={() => setParams({ when: v })}>{l}</button></li>;

  return (
    <>
      <PageHeader kicker="Мојот профил" title="Мои термини">
        <Link to="/book" className="btn btn-primary"><i className="bi bi-calendar-plus me-1" />Нов термин</Link>
      </PageHeader>
      <ul className="nav nav-pills mb-3">{tab('upcoming', 'Претстојни')}{tab('past', 'Минати')}</ul>
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : data && data.items.length === 0 ? (
        <EmptyState icon="bi-calendar-heart" text={when === 'upcoming' ? 'Немате закажани термини.' : 'Немате минати термини.'}>
          <Link to="/book" className="btn btn-primary">Закажи термин</Link>
        </EmptyState>
      ) : data && (
        <>
          {data.items.map((a) => (
            <AppointmentCard key={a._id} appt={a}>
              <Link to={`/appointments/${a._id}`} className="btn btn-light btn-sm">Детали</Link>
              {a.isActive && a.isUpcoming && (a.canCancel
                ? <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setCancel(a)}>Откажи</button>
                : <span className="small text-muted" title="Помалку од 24 часа до терминот">откажување само по телефон</span>)}
              {a.canReview && <button type="button" className="btn btn-soft btn-sm" onClick={() => setReview(a)}><i className="bi bi-star me-1" />Оцени</button>}
              {a.review && <Stars value={a.review.rating} />}
            </AppointmentCard>
          ))}
          <Pagination page={page} pages={data.pages} onChange={(n) => setParams({ when, page: String(n) })} />
        </>
      )}
      {cancel && <CancelModal appt={cancel} onHide={() => setCancel(null)} onDone={() => { setCancel(null); reload(); }} />}
      {review && <ReviewModal appt={review} onHide={() => setReview(null)} onDone={() => { setReview(null); reload(); }} />}
    </>
  );
}

/** One appointment – print-friendly confirmation (owner or admin) */
export function AppointmentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: a, loading, error, reload } = useAsync(() => api.getAppointment(id), [id]);
  const [modal, setModal] = useState(null); // cancel | review | complete | delete
  if (loading) return <Loader />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const done = () => { setModal(null); reload(); };

  return (
    <>
      <PageHeader kicker="Термин" title={a.service?.name || 'Термин'} breadcrumbs={[[isAdmin ? 'Термини' : 'Мои термини', isAdmin ? '/admin/appointments' : '/my-appointments'], [formatDate(a.start)]]}>
        <button type="button" className="btn btn-light d-print-none" onClick={() => window.print()}><i className="bi bi-printer me-1" />Печати</button>
        {isAdmin && a.status === 'pending' && <button type="button" className="btn btn-primary d-print-none" onClick={async () => { await api.setAppointmentStatus(id, 'confirmed'); reload(); }}>Потврди</button>}
        {isAdmin && a.isActive && a.start <= new Date() && <button type="button" className="btn btn-primary d-print-none" onClick={() => setModal('complete')}>Заврши</button>}
        {a.isActive && (isAdmin || a.canCancel) && <button type="button" className="btn btn-outline-danger d-print-none" onClick={() => setModal('cancel')}>Откажи</button>}
        {!isAdmin && a.canReview && <button type="button" className="btn btn-soft d-print-none" onClick={() => setModal('review')}><i className="bi bi-star me-1" />Оцени</button>}
        {isAdmin && <button type="button" className="btn btn-link text-danger d-print-none" onClick={() => setModal('delete')}>Избриши</button>}
      </PageHeader>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="card"><div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div><div className="small text-muted">Статус</div><StatusBadge status={a.status} /></div>
              <div className="text-end"><div className="small text-muted">Број на термин</div><code>{String(a._id).slice(-8).toUpperCase()}</code></div>
            </div>
            <table className="table">
              <tbody>
                <tr><th className="text-muted fw-semibold">Датум и време</th><td className="fw-bold">{a.when}</td></tr>
                <tr><th className="text-muted fw-semibold">Стоматолог</th><td><Link to={`/dentists/${a.dentist?._id}`}>{doctor(a.dentist)}</Link> <span className="text-muted small">· {specialtyLabel(a.dentist?.specialty)}</span></td></tr>
                <tr><th className="text-muted fw-semibold">Услуга</th><td>{a.service?.name} · {duration(a.service?.durationMin)}</td></tr>
                <tr><th className="text-muted fw-semibold">Цена</th><td className="price">{price(a.price)}</td></tr>
                {isAdmin && a.patient && <tr><th className="text-muted fw-semibold">Пациент</th><td>{a.patient.fullName} · <a href={telHref(a.patient.phone)}>{a.patient.phone}</a> · <Link to={`/admin/patients/${a.patient._id}`}>картон</Link></td></tr>}
                {a.note && <tr><th className="text-muted fw-semibold">Белешка</th><td>{a.note}</td></tr>}
                {a.cancelReason && <tr><th className="text-muted fw-semibold">Причина за откажување</th><td className="text-danger">{a.cancelReason}</td></tr>}
              </tbody>
            </table>
            <p className="small text-muted mb-0 mt-3"><i className="bi bi-geo-alt me-1" />DentaPlus, ул. Илинденска 1, Скопје · 02 3100 100. Дојдете 10 минути порано.</p>
          </div></div>
        </div>
        <div className="col-lg-5">
          <div className="card mb-3"><div className="card-header">Внесено во картонот</div>
            <ul className="list-group list-group-flush">
              {a.records.length === 0 && <li className="list-group-item text-muted small">{a.status === 'completed' ? 'Нема записи.' : 'Записите се внесуваат по завршување на терминот.'}</li>}
              {a.records.map((r) => <li key={r._id} className="list-group-item"><strong>{r.tooth ? `Заб ${r.tooth}` : 'Цела уста'}</strong> – {r.procedure}{r.notes && <div className="small text-muted">{r.notes}</div>}</li>)}
            </ul>
          </div>
          {a.review && (
            <div className="card"><div className="card-header">Рецензија</div><div className="card-body">
              <Stars value={a.review.rating} /><p className="mb-0 mt-1">{a.review.text}</p>
              {a.review.reply && <div className="reply mt-2"><strong>DentaPlus:</strong> {a.review.reply}</div>}
            </div></div>
          )}
        </div>
      </div>

      {modal === 'cancel' && <CancelModal appt={a} onHide={() => setModal(null)} onDone={done} />}
      {modal === 'review' && <ReviewModal appt={a} onHide={() => setModal(null)} onDone={done} />}
      {modal === 'complete' && <CompleteModal appt={a} onHide={() => setModal(null)} onDone={done} />}
      <ConfirmModal show={modal === 'delete'} title="Избриши термин" confirmText="Избриши" onCancel={() => setModal(null)}
        onConfirm={async () => { await api.deleteAppointment(id); navigate('/admin/appointments', { replace: true }); }}>
        Терминот и неговата рецензија ќе бидат избришани. Записите во картонот остануваат.
      </ConfirmModal>
    </>
  );
}

/** Admin: all appointments – filter by day / status / dentist, confirm, complete, cancel, CSV */
export function AdminAppointmentsPage() {
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const page = Number(query.page) || 1;
  const dentists = useAsync(() => api.getDentists({ all: 'true' }), []);
  const { data, loading, error, reload } = useAsync(() => api.getAppointments({ limit: 15, ...query }), [params.toString()]);
  const [modal, setModal] = useState(null); // { type, appt }
  const [msg, setMsg] = useState(null);
  const update = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setParams(n); };
  const shiftDay = (delta) => { const d = query.date ? new Date(query.date) : new Date(); d.setDate(d.getDate() + delta); update('date', formatDate(d, 'iso')); };

  const confirm = async (a) => {
    try { await api.setAppointmentStatus(a._id, 'confirmed'); setMsg({ type: 'success', text: `Потврден: ${a.patient?.fullName}, ${a.when}` }); reload(); } catch (err) { setMsg({ type: 'danger', text: err.message }); }
  };
  const exportCsv = async () => {
    try { await api.downloadAppointmentsCsv({ status: query.status, date: query.date, dentist: query.dentist }); } catch (err) { setMsg({ type: 'danger', text: err.message }); }
  };

  return (
    <>
      <PageHeader kicker="Ординација" title="Управување со термини" subtitle="Потврдете ги барањата, завршете ги прегледите и внесете ги интервенциите во картонот.">
        <button type="button" className="btn btn-light" onClick={exportCsv}><i className="bi bi-filetype-csv me-1" />CSV извештај</button>
      </PageHeader>
      {msg && <div className={`alert alert-${msg.type} alert-dismissible`}>{msg.text}<button type="button" className="btn-close" onClick={() => setMsg(null)} aria-label="Затвори" /></div>}
      <div className="soft p-3 mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-md-4">
            <div className="input-group">
              <button type="button" className="btn btn-light" onClick={() => shiftDay(-1)} aria-label="Претходен ден"><i className="bi bi-chevron-left" /></button>
              <input type="date" className="form-control" value={query.date || ''} onChange={(e) => update('date', e.target.value)} aria-label="Ден" />
              <button type="button" className="btn btn-light" onClick={() => shiftDay(1)} aria-label="Следен ден"><i className="bi bi-chevron-right" /></button>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <select className="form-select" value={query.status || ''} onChange={(e) => update('status', e.target.value)} aria-label="Статус">
              <option value="">Сите статуси</option>
              {Object.entries(STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
            </select>
          </div>
          <div className="col-6 col-md-3">
            <select className="form-select" value={query.dentist || ''} onChange={(e) => update('dentist', e.target.value)} aria-label="Стоматолог">
              <option value="">Сите стоматолози</option>
              {(dentists.data || []).map((d) => <option key={d._id} value={d._id}>{d.title}</option>)}
            </select>
          </div>
          <div className="col-md-2 d-grid">
            <button type="button" className="btn btn-soft" onClick={() => setParams({ date: formatDate(new Date(), 'iso') })}>Денес</button>
          </div>
        </div>
        <div className="mt-2 d-flex flex-wrap gap-2">
          <button type="button" className={`btn btn-sm ${query.when === 'upcoming' ? 'btn-primary' : 'btn-light'}`} onClick={() => setParams({ when: 'upcoming', status: 'pending' })}>Чекаат потврда</button>
          <button type="button" className={`btn btn-sm ${!query.date && !query.status && !query.when ? 'btn-primary' : 'btn-light'}`} onClick={() => setParams({})}>Сите</button>
        </div>
      </div>
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : data && data.items.length === 0 ? <EmptyState icon="bi-calendar-x" text="Нема термини за избраните филтри." /> : data && (
        <>
          <p className="small text-muted">{data.total} термини{query.date && ` · ${formatDate(query.date, 'day')}`}</p>
          {data.items.map((a) => (
            <AppointmentCard key={a._id} appt={a} showPatient>
              <Link to={`/appointments/${a._id}`} className="btn btn-light btn-sm">Детали</Link>
              {a.status === 'pending' && <button type="button" className="btn btn-primary btn-sm" onClick={() => confirm(a)}>Потврди</button>}
              {a.isActive && a.start <= new Date() && <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ type: 'complete', appt: a })}>Заврши</button>}
              {a.isActive && <button type="button" className="btn btn-outline-danger btn-sm" onClick={() => setModal({ type: 'cancel', appt: a })}>Откажи</button>}
            </AppointmentCard>
          ))}
          <Pagination page={page} pages={data.pages} onChange={(n) => update('page', String(n))} />
        </>
      )}
      {modal?.type === 'cancel' && <CancelModal appt={modal.appt} onHide={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
      {modal?.type === 'complete' && <CompleteModal appt={modal.appt} onHide={() => setModal(null)} onDone={() => { setModal(null); reload(); }} />}
    </>
  );
}
