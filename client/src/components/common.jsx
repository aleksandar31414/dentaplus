/** Small reusable UI building blocks used across all pages. */
import { Link } from 'react-router-dom';
import { STATUS, initials, starParts } from '../pipes';

export function PageHeader({ title, kicker, icon, subtitle, children, breadcrumbs }) {
  return (
    <div className="page-head">
      {breadcrumbs && (
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb small mb-2">
            {breadcrumbs.map(([label, to]) => (
              <li key={label} className={`breadcrumb-item${to ? '' : ' active'}`}>{to ? <Link to={to}>{label}</Link> : label}</li>
            ))}
          </ol>
        </nav>
      )}
      <div className="d-flex flex-wrap justify-content-between align-items-end gap-3">
        <div className="min-w-0">
          {(kicker || icon) && <span className="kicker">{icon && <i className={`bi ${icon}`} />}{kicker}</span>}
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {children && <div className="d-flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}

export function Loader({ text = 'Се вчитува...' }) {
  return (
    <div className="text-center py-5 text-muted">
      <div className="spinner-border text-primary mb-2" role="status" style={{ color: '#0fa3a3' }} />
      <div className="small">{text}</div>
    </div>
  );
}

export function ErrorAlert({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="alert alert-danger d-flex justify-content-between align-items-center gap-2" role="alert">
      <span><i className="bi bi-exclamation-circle me-2" />{error.message || String(error)}</span>
      {onRetry && <button type="button" className="btn btn-sm btn-light" onClick={onRetry}>Обиди се повторно</button>}
    </div>
  );
}

export function EmptyState({ icon = 'bi-inbox', text, children }) {
  return (
    <div className="empty">
      <i className={`bi ${icon}`} />
      <p>{text}</p>
      {children}
    </div>
  );
}

/** ★★★★☆ (rating 1–5); with `count` shows the number of reviews */
export function Stars({ value, count, size }) {
  if (value == null) return <span className="text-muted small">без оценки</span>;
  const [on, off] = starParts(value);
  return (
    <span className="stars" style={size ? { fontSize: size } : undefined} title={`${value} од 5`}>
      {on}<span className="off">{off}</span>
      {count != null && <span className="text-muted small ms-1">{value} ({count})</span>}
    </span>
  );
}

/** Interactive star picker for the review form */
export function StarInput({ value, onChange }) {
  return (
    <div className="d-flex gap-1" role="radiogroup" aria-label="Оценка">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} ѕвезди`}
          className="btn btn-link p-0 fs-2" style={{ color: n <= value ? '#f5b301' : '#d6dde7', textDecoration: 'none' }} onClick={() => onChange(n)}>★</button>
      ))}
    </div>
  );
}

export function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, icon: 'bi-circle' };
  return <span className={`status-pill status-${status}`}><i className={`bi ${s.icon}`} />{s.label}</span>;
}

export function Avatar({ name, admin = false, small = false }) {
  return <span className={`avatar${small ? ' avatar-sm' : ''}`} style={admin ? { background: '#10264a', color: '#fff' } : undefined} title={name}>{initials(name)}</span>;
}

/** Stat tile: icon, big number and a label */
export function StatCard({ value, label, icon = 'bi-bar-chart' }) {
  return (
    <div className="tile">
      <span className="tile-icon"><i className={`bi ${icon}`} /></span>
      <div><div className="value">{value ?? '–'}</div><div className="label">{label}</div></div>
    </div>
  );
}

/** Pagination that works with ?page= in the URL */
export function Pagination({ page, pages, onChange }) {
  if (!pages || pages <= 1) return null;
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 2);
  return (
    <nav aria-label="Страници" className="mt-4">
      <ul className="pagination justify-content-center">
        <li className={`page-item${page <= 1 ? ' disabled' : ''}`}><button type="button" className="page-link" onClick={() => onChange(page - 1)} aria-label="Претходна">‹</button></li>
        {nums.map((n, i) => (
          <li key={n} className={`page-item${n === page ? ' active' : ''}`}>
            {i > 0 && n - nums[i - 1] > 1 && <span className="page-link disabled d-inline-block">…</span>}
            <button type="button" className="page-link d-inline-block" onClick={() => onChange(n)}>{n}</button>
          </li>
        ))}
        <li className={`page-item${page >= pages ? ' disabled' : ''}`}><button type="button" className="page-link" onClick={() => onChange(page + 1)} aria-label="Следна">›</button></li>
      </ul>
    </nav>
  );
}
