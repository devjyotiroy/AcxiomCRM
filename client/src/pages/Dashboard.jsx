import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { dashboardService } from '../services/api';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    cards: {
      totalCustomers: 0,
      totalLeads: 0,
      openLeads: 0,
      totalOpportunities: 0,
      openOpportunities: 0,
      wonOpportunities: 0,
      lostOpportunities: 0,
      totalPipelineValue: 0
    },
    charts: {
      leadStatus: { labels: [], counts: [] },
      opportunityPipeline: { labels: [], counts: [], values: [] },
      monthlySales: { labels: [], amounts: [] }
    }
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await dashboardService.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const leadChartData = {
    labels: stats.charts.leadStatus.labels,
    datasets: [
      {
        label: 'Leads by Status',
        data: stats.charts.leadStatus.counts,
        backgroundColor: [
          '#3b82f6',
          '#06b6d4',
          '#10b981',
          '#6b7280',
          '#8b5cf6',
          '#ef4444'
        ],
        borderWidth: 1
      }
    ]
  };

  const pipelineChartData = {
    labels: stats.charts.opportunityPipeline.labels,
    datasets: [
      {
        label: 'Deal Value (₹)',
        data: stats.charts.opportunityPipeline.values,
        backgroundColor: '#2563eb',
        borderRadius: 4
      }
    ]
  };

  const salesChartData = {
    labels: stats.charts.monthlySales.labels,
    datasets: [
      {
        label: 'Won Revenue (₹)',
        data: stats.charts.monthlySales.amounts,
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        fill: true,
        tension: 0.3
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      }
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-wrapper">
        <Navbar pageTitle="Dashboard" />

        <main className="content-area">
          <div className="page-header">
            <div>
              <h1 className="page-title">Executive Dashboard</h1>
              <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '4px' }}>
                Role scope: <strong>{user?.role}</strong> | Logged in as {user?.name}
              </p>
            </div>
            <button onClick={fetchStats} className="btn btn-secondary btn-sm">
              Refresh Data
            </button>
          </div>

          <div className="kpi-grid">
            <div className="kpi-card">
              <span className="kpi-label">Total Customers</span>
              <span className="kpi-value">{stats.cards.totalCustomers}</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Total Leads</span>
              <span className="kpi-value">{stats.cards.totalLeads}</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Open Leads</span>
              <span className="kpi-value" style={{ color: '#0284c7' }}>
                {stats.cards.openLeads}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Total Opportunities</span>
              <span className="kpi-value">{stats.cards.totalOpportunities}</span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Open Deals</span>
              <span className="kpi-value" style={{ color: '#2563eb' }}>
                {stats.cards.openOpportunities}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Won Deals</span>
              <span className="kpi-value" style={{ color: '#16a34a' }}>
                {stats.cards.wonOpportunities}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Lost Deals</span>
              <span className="kpi-value" style={{ color: '#dc2626' }}>
                {stats.cards.lostOpportunities}
              </span>
            </div>

            <div className="kpi-card">
              <span className="kpi-label">Pipeline Value</span>
              <span className="kpi-value" style={{ color: '#d97706', fontSize: '1.5rem' }}>
                ₹{Number(stats.cards.totalPipelineValue).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3 className="chart-title">Lead Status Distribution</h3>
              <div style={{ height: '240px', position: 'relative' }}>
                {loading ? (
                  <div className="empty-state">Loading chart...</div>
                ) : (
                  <Doughnut data={leadChartData} options={chartOptions} />
                )}
              </div>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">Opportunity Pipeline by Stage (₹)</h3>
              <div style={{ height: '240px', position: 'relative' }}>
                {loading ? (
                  <div className="empty-state">Loading chart...</div>
                ) : (
                  <Bar data={pipelineChartData} options={chartOptions} />
                )}
              </div>
            </div>

            <div className="chart-card">
              <h3 className="chart-title">Monthly Sales Trend (Won Deals)</h3>
              <div style={{ height: '240px', position: 'relative' }}>
                {loading ? (
                  <div className="empty-state">Loading chart...</div>
                ) : (
                  <Line data={salesChartData} options={chartOptions} />
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
