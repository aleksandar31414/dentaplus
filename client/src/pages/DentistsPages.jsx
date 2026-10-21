import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Dentist } from '../models';
import { PageHeader, Loader, ErrorAlert, EmptyState, Stars, StatCard, Pagination } from '../components/common';
import { DentistCard, ReviewCard } from '../components/Cards';
import { ConfirmModal, ImageZoomModal } from '../components/Modals';
import { BarChart, COLORS } from '../components/Charts';
import FormField from '../components/FormField';
import { SPECIALTY, specialtyLabel, DAYS, DAYS_SHORT } from '../pipes';
import { validate, dentistSchema, SPECIALTIES } from '../utils/validators';

export function DentistsPage() {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const specialty = params.get('specialty') || '';
  const { data, loading, error, reload } = useAsync(() => api.getDentists({ specialty, all: isAdmin ? 'true' : undefined }), [specialty, isAdmin]);
  return (
    <>
      <PageHeader kicker="Нашиот тим" title="Стоматолози" subtitle="Изберете специјалист и закажете термин во неговото работно време.">
        {isAdmin && <Link to="/dentists/new" className="btn btn-primary"><i className="bi bi-person-plus me-1" />Нов стоматолог</Link>}
      </PageHeader>
      <div className="d-flex flex-wrap gap-2 mb-4">
        <button type="button" className={`btn btn-sm ${!specialty ? 'btn-primary' : 'btn-light'}`} onClick={() => setParams({})}>Сите</button>
        {Object.entries(SPECIALTY).map(([k, l]) => (
          <button type="button" key={k} className={`btn btn-sm ${specialty === k ? 'btn-primary' : 'btn-light'}`} onClick={() => setParams({ specialty: k })}>{l}</button>
        ))}
      </div>
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : data && data.length === 0 ? <EmptyState icon="bi-person-x" text="Нема стоматолози со оваа специјалност." /> : data && (
        <div className="row g-3">
          {data.map((d) => (
            <div className="col-sm-6 col-lg-4 col-xl-3" key={d._id}>
              <DentistCard dentist={d} />
              {!d.active && <div className="small text-danger mt-1"><i className="bi bi-pause-circle me-1" />не прима пациенти</div>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/** Reviews of one dentist with the clinic's reply (admin) */
function DentistReviews({ dentistId }) {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState(1);
  const { data, loading, error, reload } = useAsync(() => api.getReviews({ dentist: dentistId, page, limit: 6 }), [dentistId, page]);
  const [replying, setReplying] = useState(null); // { id, text }
  const [replyError, setReplyError] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const sendReply = async () => {
    if (!replying.text.trim() || replying.text.trim().length < 2) return setReplyError('Внесете одговор (мин. 2 знаци)');
    try { await api.replyReview(replying.id, replying.text.trim()); setReplying(null); setReplyError(null); reload(); } catch (err) { setReplyError(err.message); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  if (data.items.length === 0) return <EmptyState icon="bi-chat-heart" text="Сè уште нема рецензии." />;
  return (
    <>
      <div className="row g-3">
        {data.items.map((r) => (
          <div className="col-md-6" key={r._id}>
            <ReviewCard review={r}>
              {isAdmin && (
                <div className="mt-3 d-print-none">
                  {replying?.id === r._id ? (
                    <>
                      <textarea className={`form-control form-control-sm mb-2${replyError ? ' is-invalid' : ''}`} rows={2} value={replying.text} maxLength={500}
                        onChange={(e) => setReplying({ ...replying, text: e.target.value })} aria-label="Одговор" />
                      {replyError && <div className="invalid-feedback d-block mb-2">{replyError}</div>}
                      <button type="button" className="btn btn-primary btn-sm me-1" onClick={sendReply}>Испрати</button>
                      <button type="button" className="btn btn-link btn-sm" onClick={() => { setReplying(null); setReplyError(null); }}>Откажи</button>
                    </>
                  ) : (
                    <>
                      <button type="button" className="btn btn-soft btn-sm me-1" onClick={() => setReplying({ id: r._id, text: r.reply })}><i className="bi bi-reply me-1" />{r.reply ? 'Измени одговор' : 'Одговори'}</button>
                      <button type="button" className="btn btn-link btn-sm text-danger" onClick={() => setToDelete(r)}>Избриши</button>
                    </>
                  )}
                </div>
              )}
            </ReviewCard>
          </div>
        ))}
      </div>
      <Pagination page={page} pages={data.pages} onChange={setPage} />
      <ConfirmModal show={!!toDelete} title="Избриши рецензија" confirmText="Избриши" onCancel={() => setToDelete(null)}
        onConfirm={async () => { await api.deleteReview(toDelete._id); setToDelete(null); reload(); }}>
        Дали сте сигурни дека сакате да ја избришете рецензијата?
      </ConfirmModal>
    </>
  );
}

export function DentistDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: d, loading, error, reload } = useAsync(() => api.getDentist(id), [id]);
  const [zoom, setZoom] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (loading) return <Loader />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader kicker={specialtyLabel(d.specialty)} title={d.title} breadcrumbs={[['Стоматолози', '/dentists'], [d.title]]}>
        {isAdmin ? (
          <>
            <Link to={`/dentists/${id}/edit`} className="btn btn-light"><i className="bi bi-pencil me-1" />Уреди</Link>
            <button type="button" className="btn btn-outline-danger" onClick={() => setConfirm(true)}><i className="bi bi-trash me-1" />Избриши</button>
          </>
        ) : d.active && <Link to={`/book?dentist=${id}`} className="btn btn-primary"><i className="bi bi-calendar-plus me-1" />Закажи кај {d.firstName}</Link>}
      </PageHeader>

      <div className="row g-4 mb-4">
        <div className="col-lg-4">
          <button type="button" className="btn p-0 border-0 zoomable w-100" onClick={() => setZoom(true)} title="Зумирај">
            <img src={d.photo} alt={d.title} className="doc-photo-lg" />
          </button>
          <div className="card mt-3"><div className="card-body">
            <h2 className="h6">Работно време</h2>
            <div className="mb-2">{[1, 2, 3, 4, 5, 6].map((n) => <span key={n} className={`day-pill${d.workDays.includes(n) ? ' on' : ''}`} title={DAYS[n]}>{DAYS_SHORT[n].slice(0, 2)}</span>)}</div>
            <div className="small text-muted"><i className="bi bi-clock me-1" />{d.hours}</div>
            {!d.active && <div className="alert alert-warning small mt-3 mb-0">Моментално не прима нови пациенти.</div>}
          </div></div>
        </div>
        <div className="col-lg-8">
          <div className="row g-3 mb-3">
            <div className="col-6 col-md-3"><StatCard value={d.avgRating ?? '–'} label="просечна оценка" icon="bi-star" /></div>
            <div className="col-6 col-md-3"><StatCard value={d.reviewCount} label="рецензии" icon="bi-chat-heart" /></div>
            <div className="col-6 col-md-3"><StatCard value={d.completed} label="третмани" icon="bi-clipboard2-check" /></div>
            <div className="col-6 col-md-3"><StatCard value={`${d.yearsExperience} г.`} label="искуство" icon="bi-award" /></div>
          </div>
          <div className="card mb-3"><div className="card-body">
            <h2 className="h6">За стоматологот</h2>
            <p className="mb-0">{d.bio || 'Нема биографија.'}</p>
          </div></div>
          <div className="card"><div className="card-header d-flex justify-content-between"><span>Распределба на оценките</span><Stars value={d.avgRating} count={d.reviewCount} /></div>
            <div className="card-body">
              {d.reviewCount
                ? <BarChart labels={['1 ★', '2 ★', '3 ★', '4 ★', '5 ★']} values={d.ratingDistribution} label="Рецензии" color={COLORS.yellow} height={180} />
                : <EmptyState icon="bi-bar-chart" text="Нема оценки." />}
            </div>
          </div>
        </div>
      </div>

      <h2 className="h4 mb-3">Рецензии од пациенти</h2>
      <DentistReviews dentistId={id} />

      <ImageZoomModal show={zoom} src={d.photo} alt={d.title} onHide={() => setZoom(false)} />
      <ConfirmModal show={confirm} title="Избриши стоматолог" confirmText="Избриши" onCancel={() => setConfirm(false)}
        onConfirm={async () => { await api.deleteDentist(id); navigate('/dentists', { replace: true }); }}>
        <p>Дали сте сигурни дека сакате да го избришете <strong>{d.title}</strong>?</p>
        <div className="alert alert-warning small mb-0">Ќе се избришат и неговите <strong>{d.reviewCount}</strong> рецензии. Ако има закажани термини ({d.upcoming}), бришењето не е дозволено – деактивирајте го.</div>
      </ConfirmModal>
    </>
  );
}

/** One component for both "add dentist" and "edit dentist" (admin). */
export function DentistFormPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const existing = useAsync(() => (editing ? api.getDentist(id) : Promise.resolve(new Dentist({ specialty: 'general' }))), [id]);
  const [d, setD] = useState(null);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (existing.data) setD(existing.data); }, [existing.data]);
  if (existing.loading || !d) return existing.error ? <ErrorAlert error={existing.error} /> : <Loader />;

  const change = (k, v) => { setD((x) => Object.assign(new Dentist(), x, { [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const toggleDay = (n) => change('workDays', d.workDays.includes(n) ? d.workDays.filter((x) => x !== n) : [...d.workDays, n]);

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(d, dentistSchema);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setServerError(null);
    try {
      const saved = await api.saveDentist(d);
      navigate(`/dentists/${saved._id}`, { replace: editing });
    } catch (err) {
      setServerError(err.message);
      setErrors(err.errors || {});
    } finally {
      setBusy(false);
    }
  };

  const hours = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => [String(from + i), `${String(from + i).padStart(2, '0')}:00`]);
  return (
    <>
      <PageHeader kicker="Ординација" title={editing ? `Уреди: ${existing.data.title}` : 'Нов стоматолог'}
        breadcrumbs={[['Стоматолози', '/dentists'], [editing ? existing.data.title : 'Нов']]} />
      <div className="card"><div className="card-body p-4">
        {serverError && <div className="alert alert-danger">{serverError}</div>}
        <form className="row g-3" onSubmit={submit} noValidate>
          <FormField className="col-md-6" label="Име" name="firstName" value={d.firstName} onChange={change} error={errors.firstName} required />
          <FormField className="col-md-6" label="Презиме" name="lastName" value={d.lastName} onChange={change} error={errors.lastName} required />
          <FormField className="col-md-6" label="Специјалност" name="specialty" type="select" value={d.specialty} onChange={change} error={errors.specialty} required
            options={SPECIALTIES.map((s) => [s, specialtyLabel(s)])} />
          <FormField className="col-md-6" label="Години искуство" name="yearsExperience" type="number" min="0" max="50" value={d.yearsExperience} onChange={change} error={errors.yearsExperience} />
          <div className="col-md-6">
            <span className="form-label d-block">Работни денови <span className="text-danger">*</span></span>
            <div className="btn-group flex-wrap" role="group" aria-label="Работни денови">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <span key={n}>
                  <input type="checkbox" className="btn-check" id={`day-${n}`} checked={d.workDays.includes(n)} onChange={() => toggleDay(n)} />
                  <label className="btn btn-outline-primary btn-sm" htmlFor={`day-${n}`}>{DAYS_SHORT[n]}</label>
                </span>
              ))}
            </div>
            {errors.workDays && <div className="invalid-feedback d-block">{errors.workDays}</div>}
          </div>
          <FormField className="col-6 col-md-3" label="Почеток" name="startHour" type="select" value={String(d.startHour)} onChange={change} error={errors.startHour} options={hours(7, 14)} />
          <FormField className="col-6 col-md-3" label="Крај" name="endHour" type="select" value={String(d.endHour)} onChange={change} error={errors.endHour} options={hours(12, 21)} />
          <FormField label="URL на фотографија" name="photoUrl" type="url" value={d.photoUrl} onChange={change} error={errors.photoUrl} placeholder="https://... (празно = нацртан портрет)" />
          <FormField label="Биографија" name="bio" type="textarea" value={d.bio} onChange={change} error={errors.bio} help={`${d.bio.length}/1000`} />
          <div className="col-12 form-check form-switch ms-2">
            <input className="form-check-input" type="checkbox" id="active" checked={d.active} onChange={(e) => change('active', e.target.checked)} />
            <label className="form-check-label" htmlFor="active">Прима пациенти (активен)</label>
          </div>
          <div className="col-12 d-flex gap-2">
            <button type="submit" className="btn btn-primary" disabled={busy}>{busy && <span className="spinner-border spinner-border-sm me-2" />}{editing ? 'Зачувај промени' : 'Додај стоматолог'}</button>
            <Link to={editing ? `/dentists/${id}` : '/dentists'} className="btn btn-light">Откажи</Link>
          </div>
        </form>
      </div></div>
    </>
  );
}
