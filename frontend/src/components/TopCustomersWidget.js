import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TopCustomersWidget.css';

function TopCustomersWidget() {
    const [topCustomers, setTopCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('month');
    const [refreshing, setRefreshing] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const fetchTopCustomers = async () => {
        try {
            setRefreshing(true);
            const response = await axios.get(`${backendUrl}/api/analytics/top-customers?period=${period}&limit=10`);
            setTopCustomers(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching top customers:', error);
            setError('Failed to load top customers');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchTopCustomers();
    }, [period]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="top-customers-widget loading">
                <div className="widget-header">
                    <h2>🏆 Top Customers</h2>
                </div>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading top customers...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="top-customers-widget error">
                <div className="widget-header">
                    <h2>🏆 Top Customers</h2>
                    <button onClick={fetchTopCustomers} className="refresh-btn">
                        🔄 Retry
                    </button>
                </div>
                <div className="error-message">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="top-customers-widget">
            <div className="widget-header">
                <h2>🏆 Top Customers by Revenue</h2>
                <div className="header-controls">
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                        className="period-selector"
                    >
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="all">All Time</option>
                    </select>
                    <button
                        onClick={fetchTopCustomers}
                        className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
                        disabled={refreshing}
                    >
                        🔄 {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            {topCustomers.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <p>No customer data available</p>
                </div>
            ) : (
                <div className="customers-list">
                    {topCustomers.map((customer, index) => (
                        <div key={customer._id} className={`customer-card rank-${index + 1}`}>
                            <div className="customer-rank">
                                <div className="rank-badge">
                                    {index === 0 && '🥇'}
                                    {index === 1 && '🥈'}
                                    {index === 2 && '🥉'}
                                    {index > 2 && `#${index + 1}`}
                                </div>
                            </div>

                            <div className="customer-info">
                                <div className="customer-name">{customer.customerName}</div>
                                <div className="customer-stats">
                                    <span className="stat">
                                        <strong>{customer.billCount}</strong> bills
                                    </span>
                                    <span className="stat-divider">•</span>
                                    <span className="stat">
                                        Avg: <strong>{formatCurrency(customer.avgBillValue)}</strong>
                                    </span>
                                </div>
                                {customer.lastBillDate && (
                                    <div className="last-bill">
                                        Last bill: {formatDate(customer.lastBillDate)}
                                    </div>
                                )}
                            </div>

                            <div className="customer-revenue">
                                <div className="revenue-amount">
                                    {formatCurrency(customer.totalRevenue)}
                                </div>
                                <div className="revenue-label">Total Revenue</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="widget-footer">
                <small>Last updated: {new Date().toLocaleTimeString('en-IN')}</small>
            </div>
        </div>
    );
}

export default TopCustomersWidget;
