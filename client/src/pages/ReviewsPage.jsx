import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, EmptyState, Pagination, StarInput, Stars } from '../components/common';
import { ReviewCard } from '../components/Cards';
import { FormModal, ConfirmModal } from '../components/Modals';
import FormField from '../components/FormField';
import { validate, reviewSchema } from '../utils/validators';

function EditReviewModal({ review, onHide, onSaved }) {
  const [v, setV] = useState({ rating: review.rating, text: review.text });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    const errs = validate(v, reviewSchema);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { onSaved(await api.updateReview(review._id, { rating: v.rating, text: v.text.trim() })); } catch (err) { setErrors({ ...(err.errors || {}), _: err.message }); } finally { setBusy(false); }
  };
  return (
    <FormModal show title="Уреди рецензија" onHide={onHide} onSubmit={submit} busy={busy}>
      {errors._ && <div className="col-12"><div className="alert alert-danger mb-0">{errors._}</div></div>}
      <div className="col-12"><label className="form-label">Оценка</label><StarInput value={v.rating} onChange={(n) => setV((s) => ({ ...s, rating: n }))} /></div>
      <FormField label="Коментар" name="text" type="textarea" value={v.text} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} error={errors.text} help={`${v.text.length}/500`} required />
    </FormModal>
  );
}

function ReplyModal({ review, onHide, onSaved }) {
  const [reply, setReply] = useState(review.reply || '');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (reply.trim().length < 2) { setError('Најмалку 2 знаци'); return; }
    setBusy(true);
    try { onSaved(await api.replyReview(review._id, reply.trim())); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return (
    <FormModal show title="Одговор од ординацијата" onHide={onHide} onSubmit={submit} busy={busy} submitText="Објави одговор">
      <p className="col-12 small text-muted mb-0">„{review.text}“</p>
      <FormField label="Одговор" name="reply" type="textarea" value={reply} onChange={(_, val) => { setReply(val); setError(null); }} error={error} help={`${reply.length}/500`} required />
    </FormModal>
  );
}

/** /reviews – all patient reviews; tab "мои" for the logged-in patient; admin replies / deletes. */
export default function ReviewsPage() {
  const { isLoggedIn, isAdmin, user } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const page = Number(query.page) || 1;
  const dentists = useAsync(() => api.getDentists(), []);
  const { data, loading, error, reload } = useAsync(() => api.getReviews({ ...query, limit: 9 }), [params.toString()]);
  const [editing, setEditing] = useState(null);
  const [replying, setReplying] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const update = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setParams(n); };

  const mine = query.mine === 'true';
  return (
    <>
      <PageHeader kicker="Искуства" title="Рецензии од пациенти" subtitle="Рецензија може да остави само пациент кој навистина бил на преглед – по завршен термин." />
      <div className="soft p-3 mb-4 d-flex flex-wrap gap-2 align-items-center">
        {isLoggedIn && !isAdmin && (
          <div className="btn-group me-2">
            <button type="button" className={`btn btn-sm ${!mine ? 'btn-primary' : 'btn-light'}`} onClick={() => update('mine', '')}>Сите</button>
            <button type="button" className={`btn btn-sm ${mine ? 'btn-primary' : 'btn-light'}`} onClick={() => update('mine', 'true')}>Мои рецензии</button>
          </div>
        )}
        <select className="form-select form-select-sm w-auto" value={query.dentist || ''} onChange={(e) => update('dentist', e.target.value)} aria-label="Стоматолог">
          <option value="">Сите стоматолози</option>
          {(dentists.data || []).map((d) => <option key={d._id} value={d._id}>{d.title}</option>)}
        </select>
        <select className="form-select form-select-sm w-auto" value={query.minRating || ''} onChange={(e) => update('minRating', e.target.value)} aria-label="Оценка">
          <option value="">Секоја оценка</option>
          {[5, 4, 3].map((n) => <option key={n} value={n}>{n === 5 ? '★★★★★' : `${n}+ ѕвезди`}</option>)}
        </select>
        {data && <span className="ms-auto small text-muted">{data.total} рецензии</span>}
      </div>
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : data && data.items.length === 0 ? <EmptyState icon="bi-chat-heart" text={mine ? 'Сè уште немате рецензии. Оценете завршен термин од „Мои термини“.' : 'Нема рецензии за избраните филтри.'} /> : data && (
        <>
          <div className="row g-3">
            {data.items.map((r) => {
              const own = user && r.patient?._id === user._id;
              return (
                <div className="col-md-6 col-lg-4" key={r._id}>
                  <ReviewCard review={r}>
                    {(own || isAdmin) && (
                      <div className="d-flex gap-2 mt-3 pt-2 border-top">
                        {own && <button type="button" className="btn btn-sm btn-light" onClick={() => setEditing(r)}><i className="bi bi-pencil me-1" />Уреди</button>}
                        {isAdmin && <button type="button" className="btn btn-sm btn-soft" onClick={() => setReplying(r)}><i className="bi bi-reply me-1" />{r.reply ? 'Измени одговор' : 'Одговори'}</button>}
                        <button type="button" className="btn btn-sm btn-outline-danger ms-auto" onClick={() => setToDelete(r)} aria-label="Избриши"><i className="bi bi-trash" /></button>
                      </div>
                    )}
                  </ReviewCard>
                </div>
              );
            })}
          </div>
          <Pagination page={page} pages={data.pages} onChange={(n) => update('page', String(n))} />
        </>
      )}
      {editing && <EditReviewModal review={editing} onHide={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
      {replying && <ReplyModal review={replying} onHide={() => setReplying(null)} onSaved={() => { setReplying(null); reload(); }} />}
      <ConfirmModal show={!!toDelete} title="Избриши рецензија" confirmText="Избриши" onCancel={() => setToDelete(null)}
        onConfirm={async () => { await api.deleteReview(toDelete._id); setToDelete(null); reload(); }}>
        Да се избрише рецензијата <Stars value={toDelete?.rating} />?
      </ConfirmModal>
    </>
  );
}
