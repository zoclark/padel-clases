// Ej: src/components/LineChart.jsx
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

export default function LineChart({ sessions }) {
  const labels = sessions.map((s) => s.fecha);
  const data = {
    labels,
    datasets: [
      {
        label: "Progreso Físico",
        data: sessions.map((s) => s.fisico || 0),
        borderColor: "#3b82f6",
        backgroundColor: "#3b82f6",
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    animation: false, // 👈 Quita animaciones
    maintainAspectRatio: false, // Permite ajustar al contenedor
    scales: {
      y: { beginAtZero: true, max: 100 },
    },
    plugins: {
      legend: { display: false }, // quita la leyenda si quieres
    },
  };

  return (
    <div className="w-full h-full">
      <Line data={data} options={options} />
    </div>
  );
}
