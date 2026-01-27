import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Props: data = [{ metodo: 'Efectivo', monto: 100 }, ...]
const MetodoPagoBarChart = ({ data }) => {
  const labels = data.map(item => item.metodo);
  const montos = data.map(item => item.monto);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Dinero por método de pago',
        data: montos,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Dinero por Método de Pago' },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Dinero ($)' },
      },
      x: {
        title: { display: true, text: 'Método de Pago' },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
};

export default MetodoPagoBarChart;
