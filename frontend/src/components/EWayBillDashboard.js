import React, { useState, useEffect } from 'react';
import './EWayBillDashboard.css';

function EWayBillDashboard() {
    const [dashboardData, setDashboardData] = useState(null);
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: ''
    });

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

    useEffect(() => {
        fetchDashboardData();
        fetchTrendData();
    }, []);

    const fetchDashboardData = async (filters = {}) => {
        try {
            setLoading(true);
            const queryParams = new URLSearchParams(filters).toString();
            const response = await fetch(`${backendUrl}/api/bills/eway-dashboard?${queryParams}`);

            if (!response.ok) {
                throw new Error('Failed to fetch dashboard data');
            }

            const data = await response.json();
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching dashboard:', error);
            alert('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const fetchTrendData = async () => {
        try {
            const response = await fetch(`${backendUrl}/api/bills/eway-trend?months=6`);

            if (!response.ok) {
                throw new Error('Failed to fetch trend data');
            }

            const data = await response.json();
            setTrendData(data);
        } catch (error) {
            console.error('Error fetching trend:', error);
        }
    };

    const handleDateFilter = () => {
        if (dateRange.startDate && dateRange.endDate) {
            fetchDashboardData(dateRange);
        }
    };

    const handleClearFilter = () => {
        setDateRange({ startDate: '', endDate: '' });
        fetchDashboardData();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN');
    };

    const getMonthName = (month) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[month - 1];
    };

    const getTransportModeLabel = (mode) => {
        const modes = {
            'Road': '🚛 Road',
            'Rail': '🚂 Rail',
            'Air': '✈️ Air',
            'Ship': '🚢 Ship'
        };
        return modes[mode] || mode;
    };

    if (loading) {
        return (
            <div className="eway-dashboard">
                <div className="loading-spinner">Loading dashboard...</div>
            </div>
        );
    }

    if (!dashboardData) {
        return (
            <div className="eway-dashboard">
                <div className="error-message">Failed to load dashboard data</div>
            </div>
        );
    }

    const { stats, expiringSoon, recentEWayBills, transportModes, statusBreakdown } = dashboardData;

    return (
        <div className="eway-dashboard">
            <div className="dashboard-header">
                <h1>🚛 E-Way Bill Dashboard</h1>
                <div className="date-filter">
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        placeholder="Start Date"
                    />
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        placeholder="End Date"
                    />
                    <button onClick={handleDateFilter} className="btn-filter">Apply</button>
                    <button onClick={handleClearFilter} className="btn-clear">Clear</button>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="stats-grid">
                <div className="stat-card active">
                    <div className="stat-icon">✅</div>
                    <div className="stat-content">
                        <h3>{stats.totalActive}</h3>
                        <p>Active E-Way Bills</p>
                    </div>
                </div>

                <div className="stat-card expiring">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <h3>{stats.expiringSoonCount}</h3>
                        <p>Expiring Soon</p>
                    </div>
                </div>

                <div className="stat-card expired">
                    <div className="stat-icon">❌</div>
                    <div className="stat-content">
                        <h3>{stats.totalExpired}</h3>
                        <p>Expired</p>
                    </div>
                </div>

                <div className="stat-card json">
                    <div className="stat-icon">📥</div>
                    <div className="stat-content">
                        <h3>{stats.totalJsonGenerated}</h3>
                        <p>JSON Generated</p>
                    </div>
                </div>

                <div className="stat-card value">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <h3>{formatCurrency(stats.totalValue)}</h3>
                        <p>Total Value</p>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="charts-section">
                {/* Monthly Trend */}
                <div className="chart-card">
                    <h2>📊 Monthly Trend</h2>
                    <div className="trend-chart">
                        {trendData.length > 0 ? (
                            <div className="bar-chart">
                                {trendData.map((item, index) => {
                                    const maxCount = Math.max(...trendData.map(d => d.count));
                                    const height = (item.count / maxCount) * 100;

                                    return (
                                        <div key={index} className="bar-item">
                                            <div className="bar-container">
                                                <div
                                                    className="bar"
                                                    style={{ height: `${height}%` }}
                                                    title={`${item.count} E-Way Bills`}
                                                >
                                                    <span className="bar-value">{item.count}</span>
                                                </div>
                                            </div>
                                            <div className="bar-label">
                                                {getMonthName(item._id.month)} '{String(item._id.year).slice(-2)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="no-data">No trend data available</p>
                        )}
                    </div>
                </div>

                {/* Transport Mode Distribution */}
                <div className="chart-card">
                    <h2>🚛 Transport Modes</h2>
                    <div className="transport-modes">
                        {transportModes && transportModes.length > 0 ? (
                            transportModes.map((mode, index) => {
                                const total = transportModes.reduce((sum, m) => sum + m.count, 0);
                                const percentage = ((mode.count / total) * 100).toFixed(1);

                                return (
                                    <div key={index} className="mode-item">
                                        <div className="mode-header">
                                            <span className="mode-label">{getTransportModeLabel(mode._id)}</span>
                                            <span className="mode-count">{mode.count}</span>
                                        </div>
                                        <div className="mode-bar">
                                            <div
                                                className="mode-fill"
                                                style={{ width: `${percentage}%` }}
                                            ></div>
                                        </div>
                                        <div className="mode-percentage">{percentage}%</div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="no-data">No transport data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Tables Section */}
            <div className="tables-section">
                {/* Expiring Soon */}
                <div className="table-card">
                    <h2>⚠️ Expiring Soon (Next 7 Days)</h2>
                    {expiringSoon && expiringSoon.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Invoice</th>
                                        <th>Customer</th>
                                        <th>E-Way Bill</th>
                                        <th>Validity</th>
                                        <th>Days Left</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expiringSoon.map((bill) => {
                                        const daysLeft = Math.ceil(
                                            (new Date(bill.eWayBill.validityDate) - new Date()) / (1000 * 60 * 60 * 24)
                                        );

                                        return (
                                            <tr key={bill._id} className={daysLeft <= 3 ? 'urgent' : ''}>
                                                <td>{bill.invoiceNumber}</td>
                                                <td>{bill.customerId?.name || 'N/A'}</td>
                                                <td>{bill.eWayBill.number}</td>
                                                <td>{formatDate(bill.eWayBill.validityDate)}</td>
                                                <td>
                                                    <span className={`days-badge ${daysLeft <= 3 ? 'critical' : 'warning'}`}>
                                                        {daysLeft} days
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="no-data">No E-Way Bills expiring soon</p>
                    )}
                </div>

                {/* Recent E-Way Bills */}
                <div className="table-card">
                    <h2>📋 Recent E-Way Bills</h2>
                    {recentEWayBills && recentEWayBills.length > 0 ? (
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Invoice</th>
                                        <th>Customer</th>
                                        <th>E-Way Bill</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentEWayBills.map((bill) => (
                                        <tr key={bill._id}>
                                            <td>{bill.invoiceNumber}</td>
                                            <td>{bill.customerId?.name || 'N/A'}</td>
                                            <td>{bill.eWayBill.number}</td>
                                            <td>{formatCurrency(bill.totalAmount)}</td>
                                            <td>
                                                <span className={`status-badge ${bill.eWayBill.status}`}>
                                                    {bill.eWayBill.status === 'active' && '✅ Active'}
                                                    {bill.eWayBill.status === 'expired' && '❌ Expired'}
                                                    {bill.eWayBill.status === 'json_generated' && '📥 JSON Generated'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="no-data">No recent E-Way Bills</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default EWayBillDashboard;
