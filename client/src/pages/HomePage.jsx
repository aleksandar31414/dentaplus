import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { useAuth } from '../context/AuthContext';
import { Loader, ErrorAlert, EmptyState, Stars } from '../components/common';
import { ServiceCard, DentistCard } from '../components/Cards';
import { CATEGORY, doctor } from '../pipes';
import { Review } from '../models';

export default function HomePage() {
  const { isLoggedIn, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const overview = useAsync(() => api.getOverview(), []);
  const services = useAsync(() => api.getServices({ sort: 'popular' }), []);
  const dentists = useAsync(() => api.getDentists(), []);
  const c = overview.data?.counts || {};
  const reviews = (overview.data?.latestReviews || []).map((r) => new Review(r));

  return (
    <>
      <section className="hero mb-5">
        <div className="row align-items-center g-4">
          <div className="col-lg-6">
            <span className="kicker"><i className="bi bi-heart-pulse" />{isLoggedIn ? `Добредојдовте, ${user.username}` : 'Стоматолошка ординација во Скопје'}</span>
            <h1 className="mt-3 mb-3">Здрава насмевка,<br /><span>без чекање.</span></h1>
            <p className="lead text-muted mb-4">
              Изберете услуга, стоматолог и слободен термин – онлајн, за помалку од една минута.
              Добивате потврда по е-пошта, а целата историја е во вашиот дигитален забен картон.
            </p>
            <div className="d-flex flex-wrap gap-2">
              {isAdmin
                ? <Link to="/admin/appointments" className="btn btn-primary btn-lg"><i className="bi bi-calendar2-check me-2" />Денешни термини</Link>
                : <Link to="/book" className="btn btn-primary btn-lg"><i className="bi bi-calendar-plus me-2" />Закажи термин</Link>}
              <Link to="/services" className="btn btn-light btn-lg">Ценовник</Link>
            </div>
            <div className="trust">
              <div><b>{c.dentists ?? '–'}</b><small>стоматолози</small></div>
              <div><b>{c.completed ?? '–'}</b><small>завршени третмани</small></div>
              <div><b>{c.avgRating ?? '–'} <span className="stars" style={{ fontSize: '1rem' }}>★</span></b><small>од {c.reviews ?? 0} рецензии</small></div>
            </div>
          </div>
          <div className="col-lg-6 text-center">
            <img src="/img/hero.svg" alt="Илустрација: стоматолошки стол и насмеан заб" className="hero-img" />
          </div>
        </div>
      </section>

      <section className="mb-5">
        <div className="text-center mb-4">
          <span className="kicker">Што нудиме</span>
          <h2 className="mt-2">Сè за вашата насмевка на едно место</h2>
        </div>
        <div className="row g-3 justify-content-center">
          {Object.entries(CATEGORY).map(([key, cat]) => (
            <div className="col-6 col-md-4 col-lg-2" key={key}>
              <Link to={`/services?category=${key}`} className="card text-center h-100 svc-card text-reset">
                <div className="card-body">
                  <span className="svc-icon mb-2" style={{ background: cat.bg, color: cat.color }}><i className={`bi ${cat.icon}`} /></span>
                  <div className="fw-bold small">{cat.label}</div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-end mb-3">
          <div><span className="kicker">Најбарани</span><h2 className="mt-2 mb-0">Популарни услуги</h2></div>
          <Link to="/services" className="fw-bold">Сите услуги <i className="bi bi-arrow-right" /></Link>
        </div>
        {services.loading ? <Loader /> : services.error ? <ErrorAlert error={services.error} onRetry={services.reload} /> : (
          <div className="row g-3">
            {services.data.slice(0, 4).map((s) => (
              <div className="col-md-6 col-lg-3" key={s._id}><ServiceCard service={s} onBook={isAdmin ? undefined : (svc) => navigate(`/book?service=${svc._id}`)} /></div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-5">
        <div className="d-flex justify-content-between align-items-end mb-3">
          <div><span className="kicker">Тимот</span><h2 className="mt-2 mb-0">Нашите стоматолози</h2></div>
          <Link to="/dentists" className="fw-bold">Целиот тим <i className="bi bi-arrow-right" /></Link>
        </div>
        {dentists.loading ? <Loader /> : dentists.error ? <ErrorAlert error={dentists.error} /> : (
          <div className="row g-3">
            {dentists.data.slice(0, 4).map((d) => <div className="col-sm-6 col-lg-3" key={d._id}><DentistCard dentist={d} /></div>)}
          </div>
        )}
      </section>

      <section className="mb-5">
        <div className="soft p-4 p-lg-5">
          <div className="row g-4 align-items-center">
            <div className="col-lg-4">
              <span className="kicker">Како функционира</span>
              <h2 className="mt-2">Закажување во 3 чекори</h2>
              <p className="text-muted mb-0">Нема чекање на телефон. Терминот е ваш штом ординацијата ќе го потврди.</p>
            </div>
            {[['1', 'bi-list-check', 'Изберете услуга', 'од ценовникот, со јасна цена и траење'],
              ['2', 'bi-person-badge', 'Изберете стоматолог', 'и слободен термин во неговото работно време'],
              ['3', 'bi-envelope-check', 'Добијте потврда', 'по е-пошта – и потсетник во „Мои термини“']].map(([n, icon, t, d]) => (
              <div className="col-md-4 col-lg" key={n}>
                <span className="tile-icon mb-2"><i className={`bi ${icon}`} /></span>
                <div className="fw-bold">{n}. {t}</div>
                <div className="small text-muted">{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="d-flex justify-content-between align-items-end mb-3">
          <div><span className="kicker">Искуства</span><h2 className="mt-2 mb-0">Што велат пациентите</h2></div>
          <Link to="/reviews" className="fw-bold">Сите рецензии <i className="bi bi-arrow-right" /></Link>
        </div>
        {overview.loading ? <Loader /> : reviews.length === 0 ? <EmptyState icon="bi-chat-heart" text="Сè уште нема рецензии." /> : (
          <div className="row g-3">
            {reviews.map((r) => (
              <div className="col-md-4" key={r._id}>
                <div className="card h-100"><div className="card-body">
                  <Stars value={r.rating} />
                  <p className="review-quote my-2">{r.text}</p>
                  <div className="small text-muted">— {r.patient?.fullName || r.patient?.username}, кај {doctor(r.dentist)}</div>
                </div></div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
