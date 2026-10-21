import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Service } from '../models';
import { PageHeader, Loader, ErrorAlert, EmptyState } from '../components/common';
import { ServiceCard } from '../components/Cards';
import { FormModal, ConfirmModal } from '../components/Modals';
import FormField from '../components/FormField';
import { CATEGORY, price, duration, categoryLabel } from '../pipes';
import { validate, serviceSchema, CATEGORIES, DURATIONS } from '../utils/validators';

/** Admin popup: add / edit a service */
export function ServiceFormModal({ service, onHide, onSaved }) {
  const [v, setV] = useState(service);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const change = (k, val) => { setV((s) => Object.assign(new Service(), s, { [k]: val })); setErrors((e) => ({ ...e, [k]: undefined })); };
  const submit = async () => {
    const errs = validate(v, serviceSchema);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { onSaved(await api.saveService(v)); } catch (err) { setErrors({ ...(err.errors || {}), _: err.message }); } finally { setBusy(false); }
  };
  return (
    <FormModal show title={service._id ? `Уреди: ${service.name}` : 'Нова услуга'} onHide={onHide} onSubmit={submit} busy={busy}>
      {errors._ && <div className="col-12"><div className="alert alert-danger mb-0">{errors._}</div></div>}
      <FormField label="Име на услугата" name="name" value={v.name} onChange={change} error={errors.name} required />
      <FormField className="col-md-6" label="Категорија" name="category" type="select" value={v.category} onChange={change} error={errors.category} required
        options={[['', '– избери –'], ...CATEGORIES.map((c) => [c, categoryLabel(c)])]} />
      <FormField className="col-md-3" label="Цена (ден.)" name="price" type="number" min="0" step="100" value={v.price} onChange={change} error={errors.price} required />
      <FormField className="col-md-3" label="Траење" name="durationMin" type="select" value={String(v.durationMin)} onChange={change} error={errors.durationMin} required
        options={DURATIONS.map((d) => [String(d), duration(d)])} />
      <FormField label="Опис" name="description" type="textarea" value={v.description} onChange={change} error={errors.description} help={`${v.description.length}/800`} />
      <div className="col-12 form-check form-switch ms-2">
        <input className="form-check-input" type="checkbox" id="svc-active" checked={v.active} onChange={(e) => change('active', e.target.checked)} />
        <label className="form-check-label" htmlFor="svc-active">Активна (може да се закажува)</label>
      </div>
    </FormModal>
  );
}

/** Price list with category chips, search and sorting (all in the URL). */
export function ServicesPage() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const { data, loading, error, reload } = useAsync(() => api.getServices({ ...query, all: isAdmin ? 'true' : undefined }), [params.toString(), isAdmin]);
  const [editing, setEditing] = useState(null);
  const update = (k, val) => { const n = new URLSearchParams(params); val ? n.set(k, val) : n.delete(k); setParams(n); };

  return (
    <>
      <PageHeader kicker="Ценовник" title="Услуги и цени" subtitle="Сите цени се во денари и вклучуваат анестезија каде што е потребна.">
        {isAdmin && <button type="button" className="btn btn-primary" onClick={() => setEditing(new Service({ category: 'preventive' }))}><i className="bi bi-plus-lg me-1" />Нова услуга</button>}
      </PageHeader>
      <div className="soft p-3 mb-4">
        <div className="d-flex flex-wrap gap-2 mb-3">
          <button type="button" className={`btn btn-sm ${!query.category ? 'btn-primary' : 'btn-light'}`} onClick={() => update('category', '')}>Сите</button>
          {Object.entries(CATEGORY).map(([k, c]) => (
            <button type="button" key={k} className={`btn btn-sm ${query.category === k ? 'btn-primary' : 'btn-light'}`} onClick={() => update('category', query.category === k ? '' : k)}>
              <i className={`bi ${c.icon} me-1`} />{c.label}
            </button>
          ))}
        </div>
        <div className="row g-2">
          <div className="col-md-6">
            <input key={query.q || ''} className="form-control" placeholder="Пребарај услуга + Enter (пр. пломба, белење)" defaultValue={query.q || ''}
              onKeyDown={(e) => e.key === 'Enter' && update('q', e.target.value.trim())} onBlur={(e) => e.target.value.trim() !== (query.q || '') && update('q', e.target.value.trim())} aria-label="Пребарување" />
          </div>
          <div className="col-md-3">
            <select className="form-select" value={query.maxPrice || ''} onChange={(e) => update('maxPrice', e.target.value)} aria-label="Максимална цена">
              <option value="">Секоја цена</option>
              <option value="1000">до 1.000 ден.</option>
              <option value="3000">до 3.000 ден.</option>
              <option value="7000">до 7.000 ден.</option>
            </select>
          </div>
          <div className="col-md-3">
            <select className="form-select" value={query.sort || 'name'} onChange={(e) => update('sort', e.target.value)} aria-label="Подредување">
              <option value="name">Подреди: име</option>
              <option value="price">Подреди: најевтино</option>
              <option value="-price">Подреди: најскапо</option>
              <option value="duration">Подреди: најкратко</option>
              <option value="popular">Подреди: најбарано</option>
            </select>
          </div>
        </div>
      </div>
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : data && data.length === 0 ? <EmptyState icon="bi-search" text="Нема услуги за избраните филтри." /> : data && (
        <div className="row g-3">
          {data.map((s) => (
            <div className="col-md-6 col-lg-4 col-xl-3" key={s._id}>
              <ServiceCard service={s} onBook={isAdmin ? undefined : (svc) => navigate(`/book?service=${svc._id}`)} />
              {isAdmin && !s.active && <div className="small text-danger mt-1"><i className="bi bi-eye-slash me-1" />неактивна</div>}
            </div>
          ))}
        </div>
      )}
      {editing && <ServiceFormModal service={editing} onHide={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </>
  );
}

export function ServiceDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const { data: s, loading, error, reload } = useAsync(() => api.getService(id), [id]);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (loading) return <Loader />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const c = CATEGORY[s.category] || {};
  return (
    <>
      <PageHeader kicker={c.label} title={s.name} breadcrumbs={[['Услуги', '/services'], [s.name]]}>
        {isAdmin && (
          <>
            <button type="button" className="btn btn-light" onClick={() => setEditing(true)}><i className="bi bi-pencil me-1" />Уреди</button>
            <button type="button" className="btn btn-outline-danger" onClick={() => setConfirm(true)}><i className="bi bi-trash me-1" />Избриши</button>
          </>
        )}
      </PageHeader>
      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card"><div className="card-body p-4">
            <span className="svc-icon mb-3" style={{ background: c.bg, color: c.color }}><i className={`bi ${c.icon}`} /></span>
            <p className="lead">{s.description || 'Без опис.'}</p>
            {!s.active && <div className="alert alert-warning mb-0">Оваа услуга моментално не може да се закаже.</div>}
          </div></div>
        </div>
        <div className="col-lg-4">
          <div className="card"><div className="card-body p-4">
            <div className="text-muted small">Цена</div>
            <div className="price fs-2 mb-3">{price(s.price)}</div>
            <div className="d-flex justify-content-between border-top py-2"><span className="text-muted">Траење</span><strong>{duration(s.durationMin)}</strong></div>
            <div className="d-flex justify-content-between border-top py-2"><span className="text-muted">Закажана</span><strong>{s.bookings} пати</strong></div>
            {!isAdmin && s.active && <Link to={`/book?service=${s._id}`} className="btn btn-primary w-100 mt-3"><i className="bi bi-calendar-plus me-1" />Закажи термин</Link>}
          </div></div>
        </div>
      </div>
      {editing && <ServiceFormModal service={s} onHide={() => setEditing(false)} onSaved={() => { setEditing(false); reload(); }} />}
      <ConfirmModal show={confirm} title="Избриши услуга" confirmText="Избриши" onCancel={() => setConfirm(false)}
        onConfirm={async () => { await api.deleteService(id); navigate('/services', { replace: true }); }}>
        Дали сте сигурни дека сакате да ја избришете услугата <strong>{s.name}</strong>? Ако е веќе закажувана, наместо бришење деактивирајте ја.
      </ConfirmModal>
    </>
  );
}
