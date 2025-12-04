import React, { useState, useEffect } from 'react';
import { ledgerService } from '../services/ledgerService';
import './CustomerHistory.css';

function CustomerHistory({ customerId, onClose }) {
    const [history, setHistory] = useState([]);
    const [customerData, setCustomerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('ALL'); // ALL, INVOICES, PAYMENTS, CHANGES

    useEffect(() => {
        loadHistory();
    }, [customerId]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await ledgerService.getCustomerHistory(customerId);

            if (response.success) {
                setCustomerData(response.data.customer);
                setHistory(response.data.history);
            }
        } catch (err) {
            console.error('Error loading customer history:', err);
            setError('Failed to load customer history');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatAction = (action) => {
        const actionMap = {
            'INVOICE_CREATED': '📄 Invoice Created',
            'INVOICE_UPDATED': '✏️ Invoice Updated',
            'INVOICE_DELETED': '🗑️ Invoice Deleted',
            'ITEM_WEIGHT_CHANGED': '⚖️ Weight Changed',
            'BARCODE_REMOVED': '🔖 Barcode Removed',
            'ITEM_ADDED': '➕ Item Added',
            'ITEM_REMOVED': '➖ Item Removed',
            'QUANTITY_CHANGED': '🔢 Quantity Changed',
            'PRICE_CHANGED': '💰 Price Changed',
            'PAYMENT_RECEIVED': '✅ Payment Received',
            'PARTIAL_PAYMENT': '💵 Partial Payment',
            'PAYMENT_STATUS_UPDATED': '📊 Payment Status Updated'
        };
        return actionMap[action] || action;
    };

    const getActionColor = (action) => {
        if (action.includes('PAYMENT')) return '#10b981';
        if (action.includes('DELETED') || action.includes('REMOVED')) return '#ef4444';
        if (action.includes('CREATED') || action.includes('ADDED')) return '#3b82f6';
        return '#6b7280';
    };

    const filteredHistory = history.filter(entry => {
        if (filter === 'ALL') return true;
        if (filter === 'INVOICES') return entry.action.includes('INVOICE');
        if (filter === 'PAYMENTS') return entry.action.includes('PAYMENT');
        if (filter === 'CHANGES') return !entry.action.includes('INVOICE') && !entry.action.includes('PAYMENT');
        return true;
    });

    if (loading) {
        return (
            <div className="customer-history-modal">
                <div className="customer-history-content">
                    <div className="loading-spinner">Loading history...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="customer-history-modal">
                <div className="customer-history-content">
                    <div className="error-message">{error}</div>
                    <button onClick={onClose} className="btn-close">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="customer-history-modal" onClick={onClose}>
            <div className="customer-history-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="history-header">
                    <div>
                        <h2>📜 Customer History</h2>
                        <p className="customer-name">{customerData?.name}</p>
                    </div>
                    <button onClick={onClose} className="btn-close-x">✕</button>
                </div>

                {/* Stats Summary */}
                <div className="history-stats">
                    <div className="stat-card">
                        <div className="stat-label">Total Invoices</div>
                        <div className="stat-value">{history.filter(e => e.action === 'INVOICE_CREATED').length}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Total Paid</div>
                        <div className="stat-value">₹{history.filter(e => e.action === 'PAYMENT_RECEIVED' || e.action === 'PARTIAL_PAYMENT')
                            .reduce((sum, e) => sum + (e.metadata?.paymentAmount || 0), 0).toLocaleString()}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Total Actions</div>
                        <div className="stat-value">{history.length}</div>
                    </div>
                </div>

                {/* Filter Buttons */}
                <div className="history-filters">
                    <button
                        className={`filter-btn ${filter === 'ALL' ? 'active' : ''}`}
                        onClick={() => setFilter('ALL')}
                    >
                        All
                    </button>
                    <button
                        className={`filter-btn ${filter === 'INVOICES' ? 'active' : ''}`}
                        onClick={() => setFilter('INVOICES')}
                    >
                        Invoices
                    </button>
                    <button
                        className={`filter-btn ${filter === 'PAYMENTS' ? 'active' : ''}`}
                        onClick={() => setFilter('PAYMENTS')}
                    >
                        Payments
                    </button>
                    <button
                        className={`filter-btn ${filter === 'CHANGES' ? 'active' : ''}`}
                        onClick={() => setFilter('CHANGES')}
                    >
                        Changes
                    </button>
                </div>

                {/* Timeline */}
                <div className="history-timeline">
                    {filteredHistory.length === 0 ? (
                        <div className="no-history">No history found</div>
                    ) : (
                        filteredHistory.map((entry, index) => (
                            <div key={index} className="timeline-entry">
                                <div
                                    className="timeline-marker"
                                    style={{ backgroundColor: getActionColor(entry.action) }}
                                ></div>
                                <div className="timeline-content">
                                    <div className="timeline-header">
                                        <span className="action-name">{formatAction(entry.action)}</span>
                                        <span className="action-time">{formatDate(entry.timestamp)}</span>
                                    </div>

                                    {entry.metadata?.paymentAmount && (
                                        <div className="payment-info">
                                            <strong>Amount:</strong> ₹{entry.metadata.paymentAmount.toLocaleString()}
                                            {entry.metadata.paymentMethod && (
                                                <span> via {entry.metadata.paymentMethod}</span>
                                            )}
                                            {entry.metadata.remainingBalance > 0 && (
                                                <span className="remaining"> (Balance: ₹{entry.metadata.remainingBalance.toLocaleString()})</span>
                                            )}
                                        </div>
                                    )}

                                    {entry.metadata?.notes && (
                                        <div className="entry-notes">
                                            <em>{entry.metadata.notes}</em>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="history-footer">
                    <button onClick={onClose} className="btn-close-footer">Close</button>
                </div>
            </div>
        </div>
    );
}

export default CustomerHistory;
