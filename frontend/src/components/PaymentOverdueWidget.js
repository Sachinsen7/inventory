import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PaymentOverdueWidget.css';

const PaymentOverdueWidget = () => {
    const [overdueData, setOverdueData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetails, setShowDetails] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const fetchOverdueData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/analytics/overdue-bills`);
            setOverdueData(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching overdue data:', err);
            setError('Failed to load overdue bills');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOverdueData();
        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchOverdueData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="payment-overdue-widget loading">
                <div className="spinner"></div>
                <p>Loading overdue bills...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="payment-overdue-widget error">
                <span className="error-icon">⚠️</span>
                <p>{error}</p>
                <button onClick={fetchOverdueData} className="retry-btn">Retry</button>
            </div>
        );
    }

    const { summary, overdueBills, dueSoonBills, topOverdueCustomers } = overdueData || {};

    const getSeverityColor = (overdueBy) => {
        if (overdueBy > 60) return '#dc2626'; // Red - Critical
        if (overdueBy > 30) return '#f59e0b'; // Orange - Warning
        if (overdueBy > 7) return '#eab308'; // Yellow - Attention
        return '#6b7280'; // Gray - Recent
    };

    return (
        <div className="payment-overdue-widget">
            {/* Header */}
            <div className="widget-header">
                <div className="header-left">
                    <span className="icon">⏰</span>
                    <h3>Payment Overdue Alerts</h3>
                </div>
                <button
                    className="refresh-btn"
                    onClick={fetchOverdueData}
                    title="Refresh"
                >
                    🔄
                </button>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card critical">
                    <div className="card-icon">🚨</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.totalOverdueBills || 0}</div>
                        <div className="card-label">Overdue Bills</div>
                        <div className="card-amount">₹{(summary?.totalOverdueAmount || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div className="summary-card warning">
                    <div className="card-icon">⚠️</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.totalDueSoonBills || 0}</div>
                        <div className="card-label">Due Soon (7 days)</div>
                        <div className="card-amount">₹{(summary?.totalDueSoonAmount || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div className="summary-card info">
                    <div className="card-icon">📋</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.totalUnpaidBills || 0}</div>
                        <div className="card-label">Total Unpaid</div>
                        <div className="card-amount">₹{(summary?.totalUnpaidAmount || 0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Toggle Details Button */}
            {overdueBills && overdueBills.length > 0 && (
                <button
                    className="toggle-details-btn"
                    onClick={() => setShowDetails(!showDetails)}
                >
                    {showDetails ? '▼ Hide Details' : '▶ Show Details'}
                </button>
            )}

            {/* Detailed View */}
            {showDetails && (
                <>
                    {/* Top Overdue Customers */}
                    {topOverdueCustomers && topOverdueCustomers.length > 0 && (
                        <div className="overdue-section">
                            <h4>🏆 Top Overdue Customers</h4>
                            <div className="customer-list">
                                {topOverdueCustomers.slice(0, 5).map((customer, index) => (
                                    <div key={customer.customerId} className="customer-item">
                                        <div className="customer-rank">{index + 1}</div>
                                        <div className="customer-info">
                                            <div className="customer-name">{customer.customerName}</div>
                                            <div className="customer-stats">
                                                {customer.billCount} bills • {customer.oldestOverdueBy} days overdue
                                            </div>
                                        </div>
                                        <div className="customer-amount">
                                            ₹{customer.totalAmount.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Overdue Bills List */}
                    {overdueBills && overdueBills.length > 0 && (
                        <div className="overdue-section">
                            <h4>🚨 Overdue Bills (Top 10)</h4>
                            <div className="bills-list">
                                {overdueBills.slice(0, 10).map((bill) => (
                                    <div key={bill._id} className="bill-item">
                                        <div
                                            className="overdue-indicator"
                                            style={{ backgroundColor: getSeverityColor(bill.overdueBy) }}
                                        >
                                            {bill.overdueBy}d
                                        </div>
                                        <div className="bill-info">
                                            <div className="bill-number">{bill.invoiceNumber}</div>
                                            <div className="bill-customer">{bill.customerName}</div>
                                            <div className="bill-date">
                                                Due: {new Date(bill.dueDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="bill-amount">
                                            ₹{bill.totalAmount.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Due Soon Bills */}
                    {dueSoonBills && dueSoonBills.length > 0 && (
                        <div className="overdue-section">
                            <h4>⚠️ Due Soon (Next 7 Days)</h4>
                            <div className="bills-list">
                                {dueSoonBills.slice(0, 5).map((bill) => (
                                    <div key={bill._id} className="bill-item due-soon">
                                        <div className="due-indicator">
                                            {bill.dueIn}d
                                        </div>
                                        <div className="bill-info">
                                            <div className="bill-number">{bill.invoiceNumber}</div>
                                            <div className="bill-customer">{bill.customerName}</div>
                                            <div className="bill-date">
                                                Due: {new Date(bill.dueDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="bill-amount">
                                            ₹{bill.totalAmount.toLocaleString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* No Overdue Message */}
            {(!overdueBills || overdueBills.length === 0) && (
                <div className="no-overdue">
                    <span className="success-icon">✅</span>
                    <p>No overdue payments! All bills are on track.</p>
                </div>
            )}

            {/* Last Updated */}
            <div className="widget-footer">
                <small>
                    Last updated: {overdueData?.lastUpdated ? new Date(overdueData.lastUpdated).toLocaleTimeString() : 'N/A'}
                </small>
            </div>
        </div>
    );
};

export default PaymentOverdueWidget;
