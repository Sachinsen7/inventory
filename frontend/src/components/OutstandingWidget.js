import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OutstandingWidget.css';

function OutstandingWidget() {
    const [outstandingData, setOutstandingData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const fetchOutstandingData = async () => {
        try {
            setRefreshing(true);
            const response = await axios.get(`${backendUrl}/api/analytics/outstanding`);
            setOutstandingData(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching outstanding data:', error);
            setError('Failed to load outstanding data');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchOutstandingData();

        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchOutstandingData, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

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

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return '#28a745';
            case 'Processing': return '#ffc107';
            case 'Pending': return '#dc3545';
            case 'Failed': return '#6c757d';
            default: return '#17a2b8';
        }
    };

    if (loading) {
        return (
            <div className="outstanding-widget loading">
                <div className="widget-header">
                    <h2>💰 Today's Outstanding</h2>
                </div>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading outstanding data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="outstanding-widget error">
                <div className="widget-header">
                    <h2>💰 Today's Outstanding</h2>
                    <button onClick={fetchOutstandingData} className="refresh-btn">
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
        <div className="outstanding-widget">
            <div className="widget-header">
                <h2>💰 Outstanding Amounts</h2>
                <button
                    onClick={fetchOutstandingData}
                    className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
                    disabled={refreshing}
                >
                    🔄 {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Outstanding Summary Cards */}
            <div className="outstanding-summary">
                <div className="summary-card today">
                    <div className="card-icon">📅</div>
                    <div className="card-content">
                        <h3>Today</h3>
                        <div className="amount">{formatCurrency(outstandingData.today.amount)}</div>
                        <div className="count">{outstandingData.today.count} bills</div>
                    </div>
                </div>

                <div className="summary-card week">
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                        <h3>This Week</h3>
                        <div className="amount">{formatCurrency(outstandingData.thisWeek.amount)}</div>
                        <div className="count">{outstandingData.thisWeek.count} bills</div>
                    </div>
                </div>

                <div className="summary-card month">
                    <div className="card-icon">📈</div>
                    <div className="card-content">
                        <h3>This Month</h3>
                        <div className="amount">{formatCurrency(outstandingData.thisMonth.amount)}</div>
                        <div className="count">{outstandingData.thisMonth.count} bills</div>
                    </div>
                </div>

                <div className="summary-card overdue">
                    <div className="card-icon">⚠️</div>
                    <div className="card-content">
                        <h3>Overdue (30+ days)</h3>
                        <div className="amount danger">{formatCurrency(outstandingData.overdue.amount)}</div>
                        <div className="count">{outstandingData.overdue.count} bills</div>
                    </div>
                </div>
            </div>

            {/* Total Outstanding */}
            <div className="total-outstanding">
                <div className="total-card">
                    <h3>💳 Total Outstanding</h3>
                    <div className="total-amount">{formatCurrency(outstandingData.total.amount)}</div>
                    <div className="total-count">Across {outstandingData.total.count} unpaid bills</div>
                </div>
            </div>

            {/* Top Outstanding Customers */}
            {outstandingData.topCustomers && outstandingData.topCustomers.length > 0 && (
                <div className="top-customers">
                    <h3>🏆 Top Outstanding Customers</h3>
                    <div className="customers-list">
                        {outstandingData.topCustomers.slice(0, 5).map((customer, index) => (
                            <div key={customer._id} className="customer-item">
                                <div className="customer-rank">#{index + 1}</div>
                                <div className="customer-info">
                                    <div className="customer-name">{customer.customerName}</div>
                                    <div className="customer-details">
                                        {customer.billCount} bills • Oldest: {formatDate(customer.oldestBill)}
                                    </div>
                                </div>
                                <div className="customer-amount">
                                    {formatCurrency(customer.totalOutstanding)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Payment Status Breakdown */}
            {outstandingData.paymentBreakdown && outstandingData.paymentBreakdown.length > 0 && (
                <div className="payment-breakdown">
                    <h3>📊 Payment Status Breakdown</h3>
                    <div className="status-list">
                        {outstandingData.paymentBreakdown.map((status) => (
                            <div key={status._id} className="status-item">
                                <div
                                    className="status-indicator"
                                    style={{ backgroundColor: getStatusColor(status._id) }}
                                ></div>
                                <div className="status-info">
                                    <div className="status-name">{status._id || 'Unknown'}</div>
                                    <div className="status-details">
                                        {status.count} bills • {formatCurrency(status.amount)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Last Updated */}
            <div className="widget-footer">
                <small>Last updated: {new Date().toLocaleTimeString('en-IN')}</small>
            </div>
        </div>
    );
}

export default OutstandingWidget;
