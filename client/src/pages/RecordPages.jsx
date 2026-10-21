import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { PageHeader, Loader, ErrorAlert, EmptyState } from '../components/common';
import { ConfirmModal } from '../components/Modals';
import FormField from '../components/FormField';
import ToothChart from '../components/ToothChart';
import { formatDate, doctor, telHref } from '../pipes';
import { validate, recordSchema, TEETH } from '../utils/validators';

/** Tooth chart + list of interventions, filtered by the selected tooth. */
function RecordView({ records, onDelete }) {
  const [tooth, setTooth] = useState(null);
  const shown = tooth ? records.filter((r) => r.tooth === tooth) : records;
  const treated = new Set(records.filter((r) => r.tooth).map((r) => r.tooth)).size;
  return (
    <div className="row g-4">
      <div className="col-lg-7">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <span>Забен статус</span>
            <small className="text-muted">{treated} третирани заби · {records.length} записи</small>
          </div>
          <div className="card-body">
            <ToothChart records={records} selected={tooth} onSelect={setTooth} />
            <p className="small text-muted mb-0 mt-2">
              <span className="badge me-1" style={{ background: '#0fa3a3' }}>&nbsp;</span>заб со интервенција ·
              кликнете на заб за да ги видите само неговите записи.
            </p>
          </div>
        </div>
      </div>
      <div className="col-lg-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <span>{tooth ? `Заб ${tooth}` : 'Сите интервенции'}</span>
            {tooth && <button type="button" className="btn btn-sm btn-light" onClick={() => setTooth(null)}>Прикажи сите</button>}
          </div>
          <div className="card-body">
            {shown.length === 0 ? <EmptyState icon="bi-clipboard2" text={tooth ? 'Нема записи за овој заб.' : 'Картонот е празен.'} /> : (
              <ul className="timeline list-unstyled mb-0">
                {shown.map((r) => (
                  <li key={r._id}>
                    <div className="d-flex justify-content-between gap-2">
                      <strong>{r.procedure}{r.tooth && <span className="badge bg-mint text-teal ms-2">заб {r.tooth}</span>}</strong>
                      {onDelete && <button type="button" className="btn btn-sm btn-link text-danger p-0" onClick={() => onDelete(r)} aria-label="Избриши запис"><i className="bi bi-trash" /></button>}
                    </div>
                    <div className="small text-muted">
                      {formatDate(r.date)}{r.dentist && <> · {doctor(r.dentist)}</>}
                      {r.appointment?._id && <> · <Link to={`/appointments/${r.appointment._id}`}>{r.appointment.service?.name || 'термин'}</Link></>}
                    </div>
                    {r.notes && <div className="small mt-1">{r.notes}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** /my-record – the logged-in patient's dental record (read only). */
export function MyRecordPage() {
  const { data, loading, error, reload } = useAsync(() => api.getRecords(), []);
  return (
    <>
      <PageHeader kicker="Мој профил" title="Мој забен картон" subtitle="Сите интервенции направени во DentaPlus, по заби. Записите ги внесува стоматологот по секој завршен термин." />
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : data && <RecordView records={data} />}
      <div className="d-print-none mt-3">
        <button type="button" className="btn btn-light" onClick={() => window.print()}><i className="bi bi-printer me-1" />Печати картон</button>
      </div>
    </>
  );
}

/** /admin/patients/:id – admin sees and edits any patient's record. */
export function PatientRecordPage() {
  const { id } = useParams();
  const users = useAsync(() => api.getUsers(), []);
  const records = useAsync(() => api.getRecords(id), [id]);
  const [form, setForm] = useState({ tooth: '', procedure: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const change = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const patient = users.data?.find((u) => u._id === id);

  const add = async (e) => {
    e.preventDefault();
    const errs = validate(form, recordSchema);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await api.addRecord({ patient: id, tooth: form.tooth === '' ? null : Number(form.tooth), procedure: form.procedure.trim(), notes: form.notes.trim() });
      setForm({ tooth: '', procedure: '', notes: '' });
      records.reload();
    } catch (err) {
      setErrors({ ...(err.errors || {}), _: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (users.loading) return <Loader />;
  if (users.error) return <ErrorAlert error={users.error} onRetry={users.reload} />;
  if (!patient) return <EmptyState icon="bi-person-x" text="Пациентот не постои."><Link to="/admin/users" className="btn btn-primary">Пациенти</Link></EmptyState>;

  return (
    <>
      <PageHeader kicker="Картон на пациент" title={patient.displayName} breadcrumbs={[['Пациенти', '/admin/users'], [patient.displayName]]}
        subtitle={<>{patient.email}{patient.phone && <> · <a href={telHref(patient.phone)}>{patient.phone}</a></>} · {patient.appointmentCount} термини</>}>
        <Link to={`/admin/appointments?patient=${id}`} className="btn btn-light"><i className="bi bi-calendar3 me-1" />Термини</Link>
      </PageHeader>

      <div className="card mb-4">
        <div className="card-header">Нов запис</div>
        <div className="card-body">
          {errors._ && <div className="alert alert-danger">{errors._}</div>}
          <form className="row g-3" onSubmit={add} noValidate>
            <FormField className="col-md-2" label="Заб (FDI)" name="tooth" type="select" value={String(form.tooth)} onChange={change} error={errors.tooth}
              options={[['', '– нема –'], ...TEETH.map((t) => [String(t), String(t)])]} />
            <FormField className="col-md-4" label="Интервенција" name="procedure" value={form.procedure} onChange={change} error={errors.procedure} placeholder="пр. Композитна пломба" required />
            <FormField className="col-md-4" label="Белешка" name="notes" value={form.notes} onChange={change} error={errors.notes} />
            <div className="col-md-2 d-flex align-items-end">
              <button type="submit" className="btn btn-primary w-100" disabled={busy}>{busy && <span className="spinner-border spinner-border-sm me-1" />}Додади</button>
            </div>
          </form>
        </div>
      </div>

      <ErrorAlert error={records.error} onRetry={records.reload} />
      {records.loading ? <Loader /> : records.data && <RecordView records={records.data} onDelete={setToDelete} />}

      <ConfirmModal show={!!toDelete} title="Избриши запис" confirmText="Избриши" onCancel={() => setToDelete(null)}
        onConfirm={async () => { await api.deleteRecord(toDelete._id); setToDelete(null); records.reload(); }}>
        Да се избрише записот <strong>{toDelete?.procedure}</strong>{toDelete?.tooth ? ` (заб ${toDelete.tooth})` : ''}?
      </ConfirmModal>
    </>
  );
}
