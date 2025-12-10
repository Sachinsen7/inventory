import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './LowStockAlertWidget.css';

const LowStockAlertWidget = () => {
    const [stockData, setStockData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedTab, setSelectedTab] = useState('all');

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const fetchStockData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/analytics/low-stock-items`);
            setStockData(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching low stock data:', err);
            setError('Failed to load low stock items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStockData();
        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchStockData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="low-stock-widget loading">
                <div className="spinner"></div>
                <p>Loading stock levels...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="low-stock-widget error">
                <span className="error-icon">⚠️</span>
                <p>{error}</p>
                <button onClick={fetchStockData} className="retry-btn">Retry</button>
            </div>
        );
    }

    const { summary, outOfStockItems, criticalStockItems, lowStockItems, godownSummary } = stockData || {};

    const getStatusColor = (status) => {
        switch (status) {
            case 'OUT_OF_STOCK':
                return '#dc2626'; // Red
            case 'CRITICAL':
                return '#f59e0b'; // Orange
            case 'LOW':
                return '#eab308'; // Yellow
            default:
                return '#6b7280'; // Gray
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'OUT_OF_STOCK':
                return '🚫';
            case 'CRITICAL':
                return '⚠️';
            case 'LOW':
                return '📉';
            default:
                return '📦';
        }
    };

    const getDisplayItems = () => {
        switch (selectedTab) {
            case 'outOfStock':
                return outOfStockItems || [];
            case 'critical':
                return criticalStockItems || [];
            case 'low':
                return lowStockItems || [];
            default:
                return [
                    ...(outOfStockItems || []),
                    ...(criticalStockItems || []),
                    ...(lowStockItems || [])
                ];
        }
    };

    const displayItems = getDisplayItems();

    return (
        <div className="low-stock-widget">
            {/* Header */}
            <div className="widget-header">
                <div className="header-left">
                    <span className="icon">📦</span>
                    <h3>Low Stock Alerts</h3>
                </div>
                <button
                    className="refresh-btn"
                    onClick={fetchStockData}
                    title="Refresh"
                >
                    🔄
                </button>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card out-of-stock">
                    <div className="card-icon">🚫</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.outOfStockCount || 0}</div>
                        <div className="card-label">Out of Stock</div>
                        <div className="card-sublabel">Immediate action required</div>
                    </div>
                </div>

                <div className="summary-card critical">
                    <div className="card-icon">⚠️</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.criticalCount || 0}</div>
                        <div className="card-label">Critical Stock</div>
                        <div className="card-sublabel">Below 25% threshold</div>
                    </div>
                </div>

                <div className="summary-card low">
                    <div className="card-icon">📉</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.lowCount || 0}</div>
                        <div className="card-label">Low Stock</div>
                        <div className="card-sublabel">Below minimum level</div>
                    </div>
                </div>

                <div className="summary-card total">
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.totalLowStockItems || 0}</div>
                        <div className="card-label">Total Alerts</div>
                        <div className="card-sublabel">Requires attention</div>
                    </div>
                </div>
            </div>

            {/* Toggle Details Button */}
            {displayItems && displayItems.length > 0 && (
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
                    {/* Tab Navigation */}
                    <div className="tab-navigation">
                        <button
                            className={`tab-btn ${selectedTab === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedTab('all')}
                        >
                            All ({summary?.totalLowStockItems || 0})
                        </button>
                        <button
                            className={`tab-btn ${selectedTab === 'outOfStock' ? 'active' : ''}`}
                            onClick={() => setSelectedTab('outOfStock')}
                        >
                            🚫 Out of Stock ({summary?.outOfStockCount || 0})
                        </button>
                        <button
                            className={`tab-btn ${selectedTab === 'critical' ? 'active' : ''}`}
                            onClick={() => setSelectedTab('critical')}
                        >
                            ⚠️ Critical ({summary?.criticalCount || 0})
                        </button>
                        <button
                            className={`tab-btn ${selectedTab === 'low' ? 'active' : ''}`}
                            onClick={() => setSelectedTab('low')}
                        >
                            📉 Low ({summary?.lowCount || 0})
                        </button>
                    </div>

                    {/* Items List */}
                    {displayItems.length > 0 ? (
                        <div className="stock-section">
                            <div className="items-list">
                                {displayItems.slice(0, 20).map((item, index) => (
                                    <div key={`${item.prefix}-${item.godownName}-${index}`} className="stock-item">
                                        <div
                                            className="status-indicator"
                                            style={{ backgroundColor: getStatusColor(item.status) }}
                                        >
                                            {getStatusIcon(item.status)}
                                        </div>
                                        <div className="item-info">
                                            <div className="item-name">{item.itemName || item.prefix}</div>
                                            <div className="item-godown">📍 {item.godownName}</div>
                                            <div className="item-stats">
                                                Current: {item.currentStock} | Min: {item.minStockLevel} |
                                                Shortage: {item.shortage}
                                            </div>
                                        </div>
                                        <div className="item-progress">
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width: `${Math.min(item.stockPercentage, 100)}%`,
                                                        backgroundColor: getStatusColor(item.status)
                                                    }}
                                                ></div>
                                            </div>
                                            <div className="progress-label">{item.stockPercentage}%</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="no-items">
                            <span className="success-icon">✅</span>
                            <p>No items in this category</p>
                        </div>
                    )}

                    {/* Godown Summary */}
                    {godownSummary && godownSummary.length > 0 && (
                        <div className="stock-section">
                            <h4>📍 Godown-wise Summary</h4>
                            <div className="godown-list">
                                {godownSummary.map((godown, index) => (
                                    <div key={index} className="godown-item">
                                        <div className="godown-name">{godown.godownName}</div>
                                        <div className="godown-stats">
                                            <span className="stat out-of-stock">
                                                🚫 {godown.outOfStock}
                                            </span>
                                            <span className="stat critical">
                                                ⚠️ {godown.critical}
                                            </span>
                                            <span className="stat low">
                                                📉 {godown.low}
                                            </span>
                                            <span className="stat total">
                                                Total: {godown.total}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* No Low Stock Message */}
            {(!displayItems || displayItems.length === 0) && !showDetails && (
                <div className="no-low-stock">
                    <span className="success-icon">✅</span>
                    <p>All items are well stocked! No alerts at this time.</p>
                </div>
            )}

            {/* Last Updated */}
            <div className="widget-footer">
                <small>
                    Last updated: {stockData?.lastUpdated ? new Date(stockData.lastUpdated).toLocaleTimeString() : 'N/A'}
                </small>
            </div>
        </div>
    );
};

export default LowStockAlertWidget;
