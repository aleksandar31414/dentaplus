import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { PageHeader, Loader, ErrorAlert, EmptyState, Pagination } from '../components/common';
import { ConfirmModal } from '../components/Modals';
import { formatDate, timeAgo, telHref } from '../pipes';

const ACTIONS = {
  create: ['креирање', 'success'], update: ['измена', 'primary'], delete: ['бришење', 'danger'],
  login: ['најава', 'secondary'], register: ['регистрација', 'info'], book: ['закажување', 'primary'], cancel: ['откажување', 'warning'],
  confirm: ['потврда', 'success'], complete: ['завршен', 'success'], reply: ['одговор', 'info'],
};

/** History of activities (own for users, everyone's for admins). */
export function HistoryPage() {
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();
  const query = Object.fromEntries(params.entries());
  const page = Number(query.page) || 1;
  const users = useAsync(() => (isAdmin ? api.getUsers() : Promise.resolve([])), [isAdmin]);
  const { data, loading, error, reload } = useAsync(() => api.getActivities(query), [params.toString()]);
  const update = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== 'page') n.delete('page'); setParams(n); };

  return (
    <>
      <PageHeader kicker="Профил" title="Историја" subtitle={isAdmin ? 'Активности на сите корисници' : 'Твоите активности'} />
      <div className="d-flex flex-wrap gap-2 mb-3">
        <select className="form-select w-auto" value={query.action || ''} onChange={(e) => update('action', e.target.value)} aria-label="Акција">
          <option value="">Сите акции</option>
          {Object.entries(ACTIONS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select className="form-select w-auto" value={query.entityType || ''} onChange={(e) => update('entityType', e.target.value)} aria-label="Тип">
          <option value="">Сите типови</option>
          {[['Appointment', 'Термин'], ['Review', 'Рецензија'], ['Record', 'Картон'], ['Dentist', 'Стоматолог'], ['Service', 'Услуга'], ['User', 'Корисник']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        {isAdmin && (
          <select className="form-select w-auto" value={query.user || ''} onChange={(e) => update('user', e.target.value)} aria-label="Корисник">
            <option value="">Сите корисници</option>
            {(users.data || []).map((u) => <option key={u._id} value={u._id}>{u.username}</option>)}
          </select>
        )}
      </div>
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : !data ? null : data.items.length === 0 ? <EmptyState icon="bi-clock" text="Нема активности." /> : (
        <>
          <ul className="timeline list-unstyled">
            {data.items.map((a) => (
              <li key={a._id}>
                <span className={`badge text-bg-${ACTIONS[a.action]?.[1] || 'secondary'} me-2`}>{ACTIONS[a.action]?.[0] || a.action}</span>
                <strong>{a.user?.username || 'систем'}</strong>{' '}
                {a.link ? <Link to={a.link}>{a.description}</Link> : a.description}{' '}
                <small className="text-muted" title={formatDate(a.createdAt, 'long')}>{timeAgo(a.createdAt)}</small>
              </li>
            ))}
          </ul>
          <Pagination page={page} pages={data.pages} onChange={(n) => update('page', String(n))} />
        </>
      )}
    </>
  );
}

/** Admin: users and roles. */
export function UsersPage() {
  const { user: me } = useAuth();
  const { data, loading, error, reload, setData } = useAsync(() => api.getUsers(), []);
  const [toDelete, setToDelete] = useState(null);
  const [msg, setMsg] = useState(null);

  const changeRole = async (u, role) => {
    try {
      const updated = await api.updateUser(u._id, { role });
      setData((list) => list.map((x) => (x._id === u._id ? Object.assign(updated, { appointmentCount: u.appointmentCount, completedCount: u.completedCount }) : x)));
      setMsg({ type: 'success', text: `${u.username} сега е ${role}.` });
    } catch (err) {
      setMsg({ type: 'danger', text: err.message });
    }
  };

  return (
    <>
      <PageHeader kicker="Администрација" title="Пациенти и корисници" subtitle="Улоги, контакт и забен картон на секој пациент" />
      {msg && <div className={`alert alert-${msg.type} alert-dismissible`}>{msg.text}<button type="button" className="btn-close" onClick={() => setMsg(null)} aria-label="Затвори" /></div>}
      <ErrorAlert error={error} onRetry={reload} />
      {loading ? <Loader /> : data && (
        <div className="card table-responsive">
          <table className="table align-middle mb-0">
            <thead><tr><th>Корисник</th><th className="d-none d-md-table-cell">Е-пошта</th><th>Улога</th><th className="d-none d-lg-table-cell">Телефон</th><th>Термини</th><th>Завршени</th><th className="d-none d-md-table-cell">Регистриран</th><th /></tr></thead>
            <tbody>
              {data.map((u) => (
                <tr key={u._id}>
                  <td>{u.username}<br /><small className="text-muted">{u.fullName}</small></td>
                  <td className="d-none d-md-table-cell">{u.email}</td>
                  <td>
                    {u._id === me._id ? <span className="badge text-bg-danger">admin (вие)</span> : (
                      <select className="form-select form-select-sm w-auto" value={u.role} onChange={(e) => changeRole(u, e.target.value)} aria-label="Улога">
                        <option value="user">user</option><option value="admin">admin</option>
                      </select>
                    )}
                  </td>
                  <td className="d-none d-lg-table-cell">{u.phone ? <a href={telHref(u.phone)}>{u.phone}</a> : '–'}</td>
                  <td>{u.appointmentCount}</td>
                  <td>{u.completedCount}</td>
                  <td className="d-none d-md-table-cell">{formatDate(u.createdAt)}</td>
                  <td className="text-nowrap">
                    {u.role === 'user' && <Link to={`/admin/patients/${u._id}`} className="btn btn-sm btn-soft me-1"><i className="bi bi-clipboard2-pulse me-1" />Картон</Link>}
                    {u._id !== me._id && <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setToDelete(u)} aria-label="Избриши"><i className="bi bi-trash" /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal show={!!toDelete} title="Избриши корисник" confirmText="Избриши" onCancel={() => setToDelete(null)}
        onConfirm={async () => { await api.deleteUser(toDelete._id); setToDelete(null); reload(); }}>
        Ќе се избрише <strong>{toDelete?.username}</strong> заедно со неговите <strong>{toDelete?.appointmentCount}</strong> термини, рецензии и записи во картонот.
      </ConfirmModal>
    </>
  );
}

/** /db – test helper: delete everything or load the initial data. */
export function DbPage() {
  const { logout, isLoggedIn } = useAuth();
  const status = useAsync(() => api.dbStatus(), []);
  const [confirm, setConfirm] = useState(null); // 'clear' | 'seed'
  const [result, setResult] = useState(null);

  const run = async () => {
    const res = confirm === 'clear' ? await api.dbClear() : await api.dbSeed();
    setResult({ type: confirm === 'clear' ? 'warning' : 'success', text: res.message, data: res.deleted || res.inserted });
    setConfirm(null);
    if (isLoggedIn) logout(); // the logged-in user no longer exists / was re-created
    status.reload();
  };

  return (
    <>
      <PageHeader kicker="Администрација · /db" title="База на податоци" subtitle="Страница за тестирање и враќање на почетна состојба" />
      {result && (
        <div className={`alert alert-${result.type}`}>
          <strong>{result.text}</strong>
          <div className="small mt-1">{Object.entries(result.data || {}).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
        </div>
      )}
      <div className="row g-4">
        <div className="col-md-6">
          <div className="card h-100 border-danger">
            <div className="card-body">
              <h2 className="h5 text-danger"><i className="bi bi-trash3 me-2" />Избриши ги сите податоци</h2>
              <p>Ги брише сите документи од сите колекции (корисници, стоматолози, услуги, термини, рецензии, картони, активности).</p>
              <button type="button" className="btn btn-danger" onClick={() => setConfirm('clear')}>Избриши сè</button>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card h-100 border-success">
            <div className="card-body">
              <h2 className="h5 text-success"><i className="bi bi-database-add me-2" />Внеси иницијални податоци</h2>
              <p>Ја ресетира базата и внесува тест-податоци: 5 корисници (1 админ, 4 пациенти), 6 стоматолози, 12 услуги, минати и претстојни термини, рецензии и забни картони.</p>
              <p className="small text-muted mb-2">Сметки: admin@dentaplus.mk / Admin1234 · marija@dentaplus.mk / Pacient123</p>
              <button type="button" className="btn btn-success" onClick={() => setConfirm('seed')}>Внеси податоци</button>
            </div>
          </div>
        </div>
      </div>
      <div className="card mt-4">
        <div className="card-header">Моментална состојба {status.data && <small className="text-muted">({status.data.database} @ {status.data.host})</small>}</div>
        <div className="card-body">
          {status.loading ? <Loader /> : status.error ? <ErrorAlert error={status.error} onRetry={status.reload} /> : (
            <div className="row g-2 text-center">
              {Object.entries(status.data.counts).map(([k, v]) => (
                <div className="col-6 col-md" key={k}><div className="border rounded p-2"><div className="fs-4 fw-bold">{v}</div><small>{k}</small></div></div>
              ))}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal show={!!confirm} variant={confirm === 'clear' ? 'danger' : 'success'} title="Потврда"
        confirmText={confirm === 'clear' ? 'Избриши' : 'Внеси'} onCancel={() => setConfirm(null)} onConfirm={run}>
        {confirm === 'clear' ? 'Сите податоци ќе бидат трајно избришани.' : 'Постоечките податоци ќе бидат заменети со иницијалните.'} Ќе бидете одјавени.
      </ConfirmModal>
    </>
  );
}

export function NotFoundPage() {
  return (
    <EmptyState icon="bi-signpost-split" text="Страницата не постои (404).">
      <Link to="/" className="btn btn-primary">Почетна</Link>
    </EmptyState>
  );
}
