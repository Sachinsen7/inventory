import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PendingOrdersWidget.css';

const PendingOrdersWidget = () => {
    const [ordersData, setOrdersData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('all');

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const fetchOrdersData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/orders/pending`);
            setOrdersData(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching orders:', err);
            setError('Failed to load pending orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrdersData();
        // Auto-refresh every 3 minutes
        const interval = setInterval(fetchOrdersData, 3 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'draft': return '#6b7280';
            case 'pending': return '#f59e0b';
            case 'confirmed': return '#3b82f6';
            case 'processing': return '#8b5cf6';
            case 'completed': return '#10b981';
            case 'cancelled': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'draft': return '📝';
            case 'pending': return '⏳';
            case 'confirmed': return '✅';
            case 'processing': return '🔄';
            case 'completed': return '✔️';
            case 'cancelled': return '❌';
            default: return '❓';
        }
    };

    const getPriorityBadge = (order) => {
        if (order.isOverdue) {
            return { text: 'OVERDUE', color: '#ef4444', icon: '🚨' };
        }
        if (order.daysPending > 7) {
            return { text: 'URGENT', color: '#f59e0b', icon: '⚠️' };
        }
        if (order.daysPending > 3) {
            return { text: 'HIGH', color: '#eab308', icon: '⏰' };
        }
        return { text: 'NORMAL', color: '#10b981', icon: '✓' };
    };

    const filterOrders = (orders) => {
        if (!orders) return [];
        if (selectedStatus === 'all') return orders;
        return orders.filter(order => order.status === selectedStatus);
    };

    if (loading) {
        return (
            <div className="pending-orders-widget loading">
                <div className="spinner"></div>
                <p>Loading pending orders...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="pending-orders-widget error">
                <span className="error-icon">⚠️</span>
                <p>{error}</p>
                <button onClick={fetchOrdersData} className="retry-btn">Retry</button>
            </div>
        );
    }

    const { summary, orders } = ordersData || {};
    const filteredOrders = filterOrders(orders);

    return (
        <div className="pending-orders-widget">
            {/* Header */}
            <div className="widget-header">
                <div className="header-left">
                    <span className="icon">📦</span>
                    <h3>Pending Orders</h3>
                </div>
                <button
                    className="refresh-btn"
                    onClick={fetchOrdersData}
                    title="Refresh"
                >
                    🔄
                </button>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card pending">
                    <div className="card-icon">⏳</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.pendingCount || 0}</div>
                        <div className="card-label">Pending</div>
                        <div className="card-amount">₹{(summary?.pendingAmount || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div className="summary-card confirmed">
                    <div className="card-icon">✅</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.confirmedCount || 0}</div>
                        <div className="card-label">Confirmed</div>
                        <div className="card-amount">₹{(summary?.confirmedAmount || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div className="summary-card processing">
                    <div className="card-icon">🔄</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.processingCount || 0}</div>
                        <div className="card-label">Processing</div>
                        <div className="card-amount">₹{(summary?.processingAmount || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div className="summary-card overdue">
                    <div className="card-icon">🚨</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.overdueCount || 0}</div>
                        <div className="card-label">Overdue</div>
                        <div className="card-amount">₹{(summary?.overdueAmount || 0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            {/* Status Filter */}
            {orders && orders.length > 0 && (
                <div className="status-filter">
                    <button
                        className={`filter-btn ${selectedStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('all')}
                    >
                        All ({orders.length})
                    </button>
                    <button
                        className={`filter-btn ${selectedStatus === 'pending' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('pending')}
                    >
                        ⏳ Pending
                    </button>
                    <button
                        className={`filter-btn ${selectedStatus === 'confirmed' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('confirmed')}
                    >
                        ✅ Confirmed
                    </button>
                    <button
                        className={`filter-btn ${selectedStatus === 'processing' ? 'active' : ''}`}
                        onClick={() => setSelectedStatus('processing')}
                    >
                        🔄 Processing
                    </button>
                </div>
            )}

            {/* Toggle Details Button */}
            {filteredOrders.length > 0 && (
                <button
                    className="toggle-details-btn"
                    onClick={() => setShowDetails(!showDetails)}
                >
                    {showDetails ? '▼ Hide Details' : '▶ Show Details'}
                </button>
            )}

            {/* Detailed View */}
            {showDetails && filteredOrders.length > 0 && (
                <div className="orders-section">
                    <h4>📋 Orders List ({filteredOrders.length})</h4>
                    <div className="orders-list">
                        {filteredOrders.slice(0, 20).map((order) => {
                            const priority = getPriorityBadge(order);
                            return (
                                <div key={order._id} className="order-item">
                                    <div
                                        className="status-indicator"
                                        style={{ backgroundColor: getStatusColor(order.status) }}
                                    >
                                        {getStatusIcon(order.status)}
                                    </div>
                                    <div className="order-info">
                                        <div className="order-header">
                                            <span className="order-number">{order.orderNumber}</span>
                                            <span
                                                className="priority-badge"
                                                style={{ backgroundColor: priority.color }}
                                            >
                                                {priority.icon} {priority.text}
                                            </span>
                                        </div>
                                        <div className="order-customer">{order.customerName}</div>
                                        <div className="order-meta">
                                            <span>📅 {new Date(order.orderDate).toLocaleDateString()}</span>
                                            {order.expectedDeliveryDate && (
                                                <span> • 🚚 Due: {new Date(order.expectedDeliveryDate).toLocaleDateString()}</span>
                                            )}
                                            <span> • ⏱️ {order.daysPending} days pending</span>
                                        </div>
                                        <div className="order-items">
                                            {order.items.length} item{order.items.length > 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <div className="order-actions">
                                        <div className="order-amount">₹{order.totalAmount.toLocaleString()}</div>
                                        <div className="action-buttons">
                                            <button className="view-btn" title="View Details">👁️</button>
                                            {!order.convertedToBill && (
                                                <button className="convert-btn" title="Convert to Bill">📄</button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {filteredOrders.length > 20 && (
                        <div className="more-orders-notice">
                            Showing 20 of {filteredOrders.length} orders
                        </div>
                    )}
                </div>
            )}

            {/* No Orders Message */}
            {(!orders || orders.length === 0) && (
                <div className="no-orders">
                    <span className="success-icon">✅</span>
                    <p>No pending orders! All orders are completed or cancelled.</p>
                </div>
            )}

            {/* Last Updated */}
            <div className="widget-footer">
                <small>
                    Last updated: {ordersData?.lastUpdated ? new Date(ordersData.lastUpdated).toLocaleTimeString() : 'N/A'}
                </small>
            </div>
        </div>
    );
};

export default PendingOrdersWidget;
