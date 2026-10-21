import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { PageHeader, Loader, ErrorAlert, EmptyState } from '../components/common';
import { ServiceCard, DentistCard } from '../components/Cards';
import { CATEGORY, SPECIALTY, DAYS, price, duration } from '../pipes';
import { DURATIONS } from '../utils/validators';

const MAX_PRICE = 30000;

/**
 * Advanced search over two collections. All criteria live in the URL (?tab=services&category=a,b&maxPrice=…),
 * so a search can be bookmarked or shared.
 */
export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = Object.fromEntries(params.entries());
  const tab = q.tab === 'dentists' ? 'dentists' : 'services';
  const cats = (q.category || '').split(',').filter(Boolean);
  const maxPrice = Number(q.maxPrice) || MAX_PRICE;

  const set = (changes) => {
    const n = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v === '' || v == null ? n.delete(k) : n.set(k, v)));
    setParams(n, { replace: true });
  };
  const toggleCat = (c) => set({ category: (cats.includes(c) ? cats.filter((x) => x !== c) : [...cats, c]).join(',') });

  const services = useAsync(
    () => (tab === 'services' ? api.getServices({ q: q.q, category: q.category, minPrice: q.minPrice, maxPrice: q.maxPrice, maxDuration: q.maxDuration, sort: q.sort }) : Promise.resolve(null)),
    [tab, q.q, q.category, q.minPrice, q.maxPrice, q.maxDuration, q.sort],
  );
  const dentists = useAsync(
    () => (tab === 'dentists' ? api.getDentists({ q: q.q, specialty: q.specialty, day: q.day, minRating: q.minRating }) : Promise.resolve(null)),
    [tab, q.q, q.specialty, q.day, q.minRating],
  );
  const result = tab === 'services' ? services : dentists;

  return (
    <>
      <PageHeader kicker="Напредно пребарување" title="Најдете услуга или стоматолог" subtitle="Комбинирајте повеќе критериуми. Резултатите се ажурираат веднаш." />
      <ul className="nav nav-pills mb-3">
        <li className="nav-item"><button type="button" className={`nav-link${tab === 'services' ? ' active' : ''}`} onClick={() => setParams({ tab: 'services' })}><i className="bi bi-clipboard2-pulse me-1" />Услуги</button></li>
        <li className="nav-item"><button type="button" className={`nav-link${tab === 'dentists' ? ' active' : ''}`} onClick={() => setParams({ tab: 'dentists' })}><i className="bi bi-person-badge me-1" />Стоматолози</button></li>
      </ul>
      <div className="row g-4">
        <aside className="col-lg-3">
          <div className="soft p-3 position-sticky" style={{ top: 90 }}>
            <label className="form-label fw-bold" htmlFor="sq">Клучен збор</label>
            <input id="sq" key={`${tab}-${q.q || ''}`} className="form-control mb-3" defaultValue={q.q || ''} placeholder={tab === 'services' ? 'пр. белење' : 'пр. Николовска'}
              onKeyDown={(e) => e.key === 'Enter' && set({ q: e.target.value.trim() })} onBlur={(e) => e.target.value.trim() !== (q.q || '') && set({ q: e.target.value.trim() })} />

            {tab === 'services' ? (
              <>
                <div className="fw-bold mb-2">Категории</div>
                {Object.entries(CATEGORY).map(([k, c]) => (
                  <div className="form-check" key={k}>
                    <input className="form-check-input" type="checkbox" id={`cat-${k}`} checked={cats.includes(k)} onChange={() => toggleCat(k)} />
                    <label className="form-check-label" htmlFor={`cat-${k}`}><i className={`bi ${c.icon} me-1`} style={{ color: c.color }} />{c.label}</label>
                  </div>
                ))}
                <label className="form-label fw-bold mt-3" htmlFor="maxp">Цена до: <span className="text-teal">{price(maxPrice)}</span></label>
                <input id="maxp" type="range" className="form-range" min="500" max={MAX_PRICE} step="500" value={maxPrice}
                  onChange={(e) => set({ maxPrice: Number(e.target.value) === MAX_PRICE ? '' : e.target.value })} />
                <label className="form-label fw-bold mt-2" htmlFor="maxd">Траење најмногу</label>
                <select id="maxd" className="form-select mb-3" value={q.maxDuration || ''} onChange={(e) => set({ maxDuration: e.target.value })}>
                  <option value="">Без ограничување</option>
                  {DURATIONS.map((d) => <option key={d} value={d}>{duration(d)}</option>)}
                </select>
                <label className="form-label fw-bold" htmlFor="srt">Подреди</label>
                <select id="srt" className="form-select" value={q.sort || 'name'} onChange={(e) => set({ sort: e.target.value })}>
                  <option value="name">Име</option><option value="price">Најевтино</option><option value="-price">Најскапо</option>
                  <option value="duration">Најкратко</option><option value="popular">Најбарано</option>
                </select>
              </>
            ) : (
              <>
                <label className="form-label fw-bold" htmlFor="spec">Специјалност</label>
                <select id="spec" className="form-select mb-3" value={q.specialty || ''} onChange={(e) => set({ specialty: e.target.value })}>
                  <option value="">Сите</option>
                  {Object.entries(SPECIALTY).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
                <div className="fw-bold mb-2">Работи во</div>
                <div className="d-flex flex-wrap gap-1 mb-3">
                  {[1, 2, 3, 4, 5, 6].map((d) => (
                    <button type="button" key={d} className={`btn btn-sm ${String(d) === q.day ? 'btn-primary' : 'btn-light'}`} onClick={() => set({ day: String(d) === q.day ? '' : String(d) })} title={DAYS[d]}>
                      {DAYS[d].slice(0, 3)}
                    </button>
                  ))}
                </div>
                <div className="fw-bold mb-2">Минимална оценка</div>
                {['', '4', '4.5'].map((r) => (
                  <div className="form-check" key={r || 'any'}>
                    <input className="form-check-input" type="radio" name="minr" id={`minr-${r || 'any'}`} checked={(q.minRating || '') === r} onChange={() => set({ minRating: r })} />
                    <label className="form-check-label" htmlFor={`minr-${r || 'any'}`}>{r ? `${r}+ ★` : 'Секоја'}</label>
                  </div>
                ))}
              </>
            )}
            <button type="button" className="btn btn-light w-100 mt-3" onClick={() => setParams({ tab })}><i className="bi bi-x-circle me-1" />Исчисти филтри</button>
          </div>
        </aside>
        <div className="col-lg-9">
          <ErrorAlert error={result.error} onRetry={result.reload} />
          {result.loading ? <Loader /> : result.data && (
            <>
              <p className="text-muted small">Пронајдени: <strong>{result.data.length}</strong></p>
              {result.data.length === 0 ? <EmptyState icon="bi-search" text="Нема резултати. Олабавете ги критериумите." /> : (
                <div className="row g-3">
                  {tab === 'services'
                    ? result.data.map((s) => <div className="col-md-6 col-xl-4" key={s._id}><ServiceCard service={s} /></div>)
                    : result.data.map((d) => <div className="col-md-6 col-xl-4" key={d._id}><DentistCard dentist={d} /></div>)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
