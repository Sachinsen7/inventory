import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { showToast } from '../utils/toastNotifications';
import './PaymentTracker.css';

function PaymentTracker({ onClose }) {
    const [invoices, setInvoices] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [newStatus, setNewStatus] = useState('');

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchInvoices();
    }, [filterStatus, sortBy, sortOrder]);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/invoices`, {
                params: {
                    status: filterStatus,
                    sortBy,
                    order: sortOrder
                }
            });
            setInvoices(response.data.invoices);
            setSummary(response.data.summary);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            showToast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async () => {
        if (!selectedInvoice || !newStatus) return;

        try {
            await axios.put(`${backendUrl}/api/invoices/${selectedInvoice.invoiceId}/status`, {
                paymentStatus: newStatus
            });
            showToast.success('Payment status updated successfully!');
            setShowStatusModal(false);
            setSelectedInvoice(null);
            setNewStatus('');
            fetchInvoices();
        } catch (error) {
            console.error('Error updating status:', error);
            showToast.error('Failed to update payment status');
        }
    };

    const openStatusModal = (invoice) => {
        setSelectedInvoice(invoice);
        setNewStatus(invoice.paymentStatus);
        setShowStatusModal(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return '#10b981';
            case 'Processing': return '#f59e0b';
            case 'Failed': return '#ef4444';
            case 'Pending':
            default: return '#6b7280';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'Completed': return '✅';
            case 'Processing': return '🔄';
            case 'Failed': return '❌';
            case 'Pending':
            default: return '⏳';
        }
    };

    const filteredInvoices = invoices.filter(invoice => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
            invoice.invoiceId?.toLowerCase().includes(search) ||
            invoice.billNumber?.toLowerCase().includes(search) ||
            invoice.customerName?.toLowerCase().includes(search) ||
            invoice.totalAmount?.toString().includes(search)
        );
    });

    if (loading) {
        return (
            <div className="payment-tracker-modal">
                <div className="payment-tracker-content">
                    <div className="loading-spinner">Loading payment data...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-tracker-modal" onClick={onClose}>
            <div className="payment-tracker-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="tracker-header">
                    <div>
                        <h2>💳 Payment Tracker</h2>
                        <p className="subtitle">Track and manage all invoice payments</p>
                    </div>
                    <button onClick={onClose} className="btn-close-x">✕</button>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div className="summary-cards">
                        <div className="summary-card total">
                            <div className="card-icon">📊</div>
                            <div className="card-content">
                                <div className="card-label">Total Invoices</div>
                                <div className="card-value">{summary.total}</div>
                                <div className="card-amount">₹{summary.totalAmount.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="summary-card pending">
                            <div className="card-icon">⏳</div>
                            <div className="card-content">
                                <div className="card-label">Pending</div>
                                <div className="card-value">{summary.pending}</div>
                                <div className="card-amount">₹{summary.pendingAmount.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="summary-card processing">
                            <div className="card-icon">🔄</div>
                            <div className="card-content">
                                <div className="card-label">Processing</div>
                                <div className="card-value">{summary.processing}</div>
                            </div>
                        </div>

                        <div className="summary-card completed">
                            <div className="card-icon">✅</div>
                            <div className="card-content">
                                <div className="card-label">Completed</div>
                                <div className="card-value">{summary.completed}</div>
                                <div className="card-amount">₹{summary.completedAmount.toLocaleString()}</div>
                            </div>
                        </div>

                        <div className="summary-card failed">
                            <div className="card-icon">❌</div>
                            <div className="card-content">
                                <div className="card-label">Failed</div>
                                <div className="card-value">{summary.failed}</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filters and Search */}
                <div className="tracker-controls">
                    <div className="search-box">
                        <input
                            type="text"
                            placeholder="🔍 Search by Invoice ID, Customer, Amount..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="filter-controls">
                        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="Pending">⏳ Pending</option>
                            <option value="Processing">🔄 Processing</option>
                            <option value="Completed">✅ Completed</option>
                            <option value="Failed">❌ Failed</option>
                        </select>

                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="createdAt">Sort by Date</option>
                            <option value="totalAmount">Sort by Amount</option>
                            <option value="customerName">Sort by Customer</option>
                            <option value="paymentStatus">Sort by Status</option>
                        </select>

                        <button
                            className="sort-order-btn"
                            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                        >
                            {sortOrder === 'asc' ? '↑' : '↓'}
                        </button>

                        <button className="refresh-btn" onClick={fetchInvoices}>
                            🔄 Refresh
                        </button>
                    </div>
                </div>

                {/* Invoice Table */}
                <div className="invoice-table-container">
                    <table className="invoice-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Invoice ID</th>
                                <th>Bill Number</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                        No invoices found
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice._id}>
                                        <td>
                                            <div className="status-cell">
                                                {invoice.paymentStatus !== 'Completed' && (
                                                    <span className="status-dot"></span>
                                                )}
                                                <span
                                                    className="status-badge"
                                                    style={{ backgroundColor: getStatusColor(invoice.paymentStatus) }}
                                                >
                                                    {getStatusIcon(invoice.paymentStatus)} {invoice.paymentStatus}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="invoice-id">{invoice.invoiceId}</td>
                                        <td>{invoice.billNumber}</td>
                                        <td>{invoice.customerName}</td>
                                        <td>{new Date(invoice.createdAt).toLocaleDateString()}</td>
                                        <td className="amount">₹{invoice.totalAmount.toLocaleString()}</td>
                                        <td>
                                            <button
                                                className="btn-update-status"
                                                onClick={() => openStatusModal(invoice)}
                                            >
                                                Update Status
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Status Update Modal */}
                {showStatusModal && selectedInvoice && (
                    <div className="status-modal-overlay" onClick={() => setShowStatusModal(false)}>
                        <div className="status-modal" onClick={(e) => e.stopPropagation()}>
                            <h3>Update Payment Status</h3>
                            <div className="modal-invoice-info">
                                <p><strong>Invoice:</strong> {selectedInvoice.invoiceId}</p>
                                <p><strong>Customer:</strong> {selectedInvoice.customerName}</p>
                                <p><strong>Amount:</strong> ₹{selectedInvoice.totalAmount.toLocaleString()}</p>
                                <p><strong>Current Status:</strong> {selectedInvoice.paymentStatus}</p>
                            </div>

                            <div className="status-options">
                                <label>Select New Status:</label>
                                <div className="status-buttons">
                                    <button
                                        className={`status-option ${newStatus === 'Pending' ? 'active' : ''}`}
                                        onClick={() => setNewStatus('Pending')}
                                    >
                                        ⏳ Pending
                                    </button>
                                    <button
                                        className={`status-option ${newStatus === 'Processing' ? 'active' : ''}`}
                                        onClick={() => setNewStatus('Processing')}
                                    >
                                        🔄 Processing
                                    </button>
                                    <button
                                        className={`status-option ${newStatus === 'Completed' ? 'active' : ''}`}
                                        onClick={() => setNewStatus('Completed')}
                                    >
                                        ✅ Completed
                                    </button>
                                    <button
                                        className={`status-option ${newStatus === 'Failed' ? 'active' : ''}`}
                                        onClick={() => setNewStatus('Failed')}
                                    >
                                        ❌ Failed
                                    </button>
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button className="btn-cancel" onClick={() => setShowStatusModal(false)}>
                                    Cancel
                                </button>
                                <button className="btn-confirm" onClick={handleStatusUpdate}>
                                    Update Status
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PaymentTracker;
