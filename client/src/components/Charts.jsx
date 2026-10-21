/** Data visualisation components (Chart.js via react-chartjs-2). */
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend);
ChartJS.defaults.font.family = "'Manrope', system-ui, sans-serif";
ChartJS.defaults.color = '#6b7a93';
ChartJS.defaults.borderColor = '#eef2f6';
ChartJS.defaults.plugins.legend.labels.usePointStyle = true;

export const COLORS = {
  teal: '#0fa3a3', navy: '#10264a', blue: '#2f5bd3', violet: '#7a4fd6', coral: '#ff8a65', yellow: '#ffd166', pink: '#e0679a', gray: '#b6c0cf',
  palette: ['#0fa3a3', '#2f5bd3', '#ff8a65', '#7a4fd6', '#ffd166', '#e0679a', '#10264a', '#7fd6cf'],
};

export function BarChart({ labels, values, label, color = COLORS.teal, horizontal = false, height = 260, max, datasets }) {
  const data = {
    labels,
    datasets: datasets
      ? datasets.map((d, i) => ({ backgroundColor: COLORS.palette[i], borderRadius: 8, ...d }))
      : [{ label, data: values, backgroundColor: color, borderRadius: 8 }],
  };
  return (
    <div style={{ height }}>
      <Bar data={data} options={{
        maintainAspectRatio: false,
        indexAxis: horizontal ? 'y' : 'x',
        plugins: { legend: { display: !!datasets, position: 'bottom' } },
        scales: { [horizontal ? 'x' : 'y']: { beginAtZero: true, ...(max ? { max } : {}), ticks: { precision: 0 } } },
      }} />
    </div>
  );
}

export function DoughnutChart({ labels, values, colors = COLORS.palette, height = 260 }) {
  return (
    <div style={{ height }}>
      <Doughnut data={{ labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 3, borderColor: '#fff' }] }}
        options={{ maintainAspectRatio: false, cutout: '65%', plugins: { legend: { position: 'bottom' } } }} />
    </div>
  );
}

export function LineChart({ labels, datasets, height = 260 }) {
  return (
    <div style={{ height }}>
      <Line
        data={{
          labels,
          datasets: datasets.map((d, i) => ({
            borderColor: COLORS.palette[i], backgroundColor: `${COLORS.palette[i]}22`, tension: 0.35, fill: i === 0, borderWidth: 3, pointRadius: 3, ...d,
          })),
        }}
        options={{ maintainAspectRatio: false, scales: { y: { beginAtZero: true } }, plugins: { legend: { position: 'bottom' } } }}
      />
    </div>
  );
}
