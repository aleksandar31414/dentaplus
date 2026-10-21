import api from '../services/api';
import useAsync from '../hooks/useAsync';
import { PageHeader, Loader, ErrorAlert, StatCard } from '../components/common';
import { BarChart, DoughnutChart, LineChart, COLORS } from '../components/Charts';
import { MONTHS_SHORT, CATEGORY, STATUS, price } from '../pipes';

const STATUS_COLORS = { pending: COLORS.yellow, confirmed: COLORS.blue, completed: COLORS.teal, cancelled: COLORS.gray };

/** /dashboard – admin statistics (all numbers come from GET /api/stats/overview). */
export default function DashboardPage() {
  const { data, loading, error, reload } = useAsync(() => api.getOverview(), []);
  if (loading) return <Loader />;
  if (error) return <ErrorAlert error={error} onRetry={reload} />;
  const c = data.counts;
  const monthLabel = (ym) => { const [y, m] = ym.split('-'); return `${MONTHS_SHORT[Number(m) - 1]} ${y.slice(2)}`; };
  const revenue = data.byMonth.reduce((s, m) => s + m.revenue, 0);
  const cancelled = data.byStatus.find((s) => s._id === 'cancelled')?.n || 0;

  return (
    <>
      <PageHeader kicker="Администрација" title="Статистика на ординацијата" subtitle="Термини, приходи, најбарани услуги и задоволство на пациентите (последни 12 месеци)." >
        <button type="button" className="btn btn-light" onClick={reload}><i className="bi bi-arrow-clockwise me-1" />Освежи</button>
      </PageHeader>

      <div className="row g-3 mb-4">
        <div className="col-6 col-lg-3"><StatCard value={c.appointments} label="вкупно термини" icon="bi-calendar3" /></div>
        <div className="col-6 col-lg-3"><StatCard value={c.upcoming} label="претстојни" icon="bi-calendar-event" /></div>
        <div className="col-6 col-lg-3"><StatCard value={c.patients} label="пациенти" icon="bi-people" /></div>
        <div className="col-6 col-lg-3"><StatCard value={c.avgRating ? `${c.avgRating} ★` : '–'} label={`просечна оценка (${c.reviews})`} icon="bi-star" /></div>
        <div className="col-6 col-lg-3"><StatCard value={c.completed} label="завршени прегледи" icon="bi-clipboard2-check" /></div>
        <div className="col-6 col-lg-3"><StatCard value={price(revenue)} label="приход (завршени)" icon="bi-cash-coin" /></div>
        <div className="col-6 col-lg-3"><StatCard value={c.appointments ? `${Math.round((cancelled / c.appointments) * 100)}%` : '–'} label="откажани" icon="bi-x-circle" /></div>
        <div className="col-6 col-lg-3"><StatCard value={`${c.dentists} / ${c.services}`} label="стоматолози / услуги" icon="bi-person-badge" /></div>
      </div>

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="card h-100"><div className="card-header">Термини по месеци</div><div className="card-body">
            <LineChart labels={data.byMonth.map((m) => monthLabel(m._id))}
              datasets={[{ label: 'Сите термини', data: data.byMonth.map((m) => m.total) }, { label: 'Завршени', data: data.byMonth.map((m) => m.completed) }]} />
          </div></div>
        </div>
        <div className="col-lg-4">
          <div className="card h-100"><div className="card-header">Статус на термините</div><div className="card-body">
            <DoughnutChart labels={data.byStatus.map((s) => STATUS[s._id]?.label || s._id)} values={data.byStatus.map((s) => s.n)}
              colors={data.byStatus.map((s) => STATUS_COLORS[s._id] || COLORS.gray)} />
          </div></div>
        </div>
        <div className="col-lg-6">
          <div className="card h-100"><div className="card-header">Најбарани услуги</div><div className="card-body">
            <BarChart horizontal labels={data.byService.map((s) => s.name)} values={data.byService.map((s) => s.n)} label="Термини" height={300} />
          </div></div>
        </div>
        <div className="col-lg-6">
          <div className="card h-100"><div className="card-header">Приход по месеци (ден.)</div><div className="card-body">
            <BarChart labels={data.byMonth.map((m) => monthLabel(m._id))} values={data.byMonth.map((m) => m.revenue)} label="Приход" color={COLORS.blue} height={300} />
          </div></div>
        </div>
        <div className="col-lg-4">
          <div className="card h-100"><div className="card-header">Термини по стоматолог</div><div className="card-body">
            <BarChart horizontal labels={data.byDentist.map((d) => d.name)} values={data.byDentist.map((d) => d.n)} label="Термини" color={COLORS.violet} />
          </div></div>
        </div>
        <div className="col-lg-4">
          <div className="card h-100"><div className="card-header">Просечна оценка по стоматолог</div><div className="card-body">
            <BarChart horizontal labels={data.ratingByDentist.map((d) => d.name)} values={data.ratingByDentist.map((d) => d.avg)} label="Оценка" color={COLORS.yellow} max={5} />
          </div></div>
        </div>
        <div className="col-lg-4">
          <div className="card h-100"><div className="card-header">По категорија</div><div className="card-body">
            <DoughnutChart labels={data.byCategory.map((x) => CATEGORY[x._id]?.label || x._id)} values={data.byCategory.map((x) => x.n)}
              colors={data.byCategory.map((x) => CATEGORY[x._id]?.color || COLORS.gray)} />
          </div></div>
        </div>
        <div className="col-12">
          <div className="card"><div className="card-header">Најпрометни часови</div><div className="card-body">
            <BarChart labels={data.busiestHours.map((h) => `${String(h._id).padStart(2, '0')}:00`)} values={data.busiestHours.map((h) => h.n)} label="Термини" color={COLORS.coral} height={220} />
          </div></div>
        </div>
      </div>
    </>
  );
}
