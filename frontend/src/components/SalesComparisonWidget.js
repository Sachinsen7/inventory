import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SalesComparisonWidget.css';

function SalesComparisonWidget() {
    const [salesData, setSalesData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const fetchSalesComparison = async () => {
        try {
            setRefreshing(true);
            const response = await axios.get(`${backendUrl}/api/analytics/sales-comparison`);
            setSalesData(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching sales comparison:', error);
            setError('Failed to load sales comparison');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSalesComparison();

        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchSalesComparison, 5 * 60 * 1000);

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

    const getTrendIcon = (trend) => {
        switch (trend) {
            case 'up': return '📈';
            case 'down': return '📉';
            case 'stable': return '➡️';
            default: return '➡️';
        }
    };

    const getTrendColor = (trend) => {
        switch (trend) {
            case 'up': return '#28a745';
            case 'down': return '#dc3545';
            case 'stable': return '#ffc107';
            default: return '#6c757d';
        }
    };

    if (loading) {
        return (
            <div className="sales-comparison-widget loading">
                <div className="widget-header">
                    <h2>📊 Sales Comparison</h2>
                </div>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading sales data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="sales-comparison-widget error">
                <div className="widget-header">
                    <h2>📊 Sales Comparison</h2>
                    <button onClick={fetchSalesComparison} className="refresh-btn">
                        🔄 Retry
                    </button>
                </div>
                <div className="error-message">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!salesData) {
        return null;
    }

    const growthPercentage = Math.abs(salesData.growth);
    const isPositive = salesData.growth >= 0;

    return (
        <div className="sales-comparison-widget">
            <div className="widget-header">
                <h2>📊 Sales Comparison</h2>
                <button
                    onClick={fetchSalesComparison}
                    className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
                    disabled={refreshing}
                >
                    🔄 {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            <div className="comparison-container">
                {/* This Month */}
                <div className="period-card this-month">
                    <div className="period-header">
                        <div className="period-icon">📅</div>
                        <div className="period-title">This Month</div>
                    </div>
                    <div className="period-stats">
                        <div className="stat-value">{formatCurrency(salesData.thisMonth.total)}</div>
                        <div className="stat-label">{salesData.thisMonth.count} bills</div>
                        {salesData.thisMonth.count > 0 && (
                            <div className="stat-avg">
                                Avg: {formatCurrency(salesData.thisMonth.total / salesData.thisMonth.count)}
                            </div>
                        )}
                    </div>
                </div>

                {/* Growth Indicator */}
                <div className="growth-indicator">
                    <div
                        className={`growth-badge ${salesData.trend}`}
                        style={{ backgroundColor: getTrendColor(salesData.trend) }}
                    >
                        <div className="growth-icon">{getTrendIcon(salesData.trend)}</div>
                        <div className="growth-value">
                            {isPositive ? '+' : '-'}{growthPercentage.toFixed(1)}%
                        </div>
                    </div>
                    <div className="growth-label">
                        {isPositive ? 'Growth' : 'Decline'}
                    </div>
                </div>

                {/* Last Month */}
                <div className="period-card last-month">
                    <div className="period-header">
                        <div className="period-icon">📆</div>
                        <div className="period-title">Last Month</div>
                    </div>
                    <div className="period-stats">
                        <div className="stat-value">{formatCurrency(salesData.lastMonth.total)}</div>
                        <div className="stat-label">{salesData.lastMonth.count} bills</div>
                        {salesData.lastMonth.count > 0 && (
                            <div className="stat-avg">
                                Avg: {formatCurrency(salesData.lastMonth.total / salesData.lastMonth.count)}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detailed Comparison */}
            <div className="detailed-comparison">
                <h3>Detailed Breakdown</h3>
                <div className="comparison-grid">
                    <div className="comparison-item">
                        <div className="comparison-label">Revenue Difference</div>
                        <div className={`comparison-value ${isPositive ? 'positive' : 'negative'}`}>
                            {isPositive ? '+' : ''}{formatCurrency(salesData.thisMonth.total - salesData.lastMonth.total)}
                        </div>
                    </div>
                    <div className="comparison-item">
                        <div className="comparison-label">Bill Count Difference</div>
                        <div className={`comparison-value ${salesData.thisMonth.count >= salesData.lastMonth.count ? 'positive' : 'negative'}`}>
                            {salesData.thisMonth.count >= salesData.lastMonth.count ? '+' : ''}{salesData.thisMonth.count - salesData.lastMonth.count}
                        </div>
                    </div>
                    <div className="comparison-item">
                        <div className="comparison-label">Trend</div>
                        <div className="comparison-value" style={{ color: getTrendColor(salesData.trend) }}>
                            {getTrendIcon(salesData.trend)} {salesData.trend.toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>

            <div className="widget-footer">
                <small>Last updated: {new Date().toLocaleTimeString('en-IN')}</small>
            </div>
        </div>
    );
}

export default SalesComparisonWidget;
