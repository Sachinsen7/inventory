import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VoucherManagement.css';

function VoucherManagement() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Dashboard data
    const [dashboardData, setDashboardData] = useState({
        summary: [],
        statusCounts: [],
        recentVouchers: []
    });

    // Filters
    const [filters, setFilters] = useState({
        voucherType: '',
        status: '',
        fromDate: '',
        toDate: '',
        search: '',
        page: 1,
        limit: 20
    });

    // Voucher form
    const [showVoucherForm, setShowVoucherForm] = useState(false);
    const [selectedVoucherType, setSelectedVoucherType] = useState('');
    const [editingVoucher, setEditingVoucher] = useState(null);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const voucherTypes = [
        { key: 'sales', label: '💰 Sales Voucher', icon: '📈', color: '#27ae60' },
        { key: 'purchase', label: '🛒 Purchase Voucher', icon: '📉', color: '#e74c3c' },
        { key: 'receipt', label: '💵 Receipt Voucher', icon: '💰', color: '#3498db' },
        { key: 'payment', label: '💸 Payment Voucher', icon: '💳', color: '#f39c12' },
        { key: 'journal', label: '📝 Journal Entry', icon: '📋', color: '#9b59b6' },
        { key: 'contra', label: '🔄 Contra Entry', icon: '🔀', color: '#1abc9c' },
        { key: 'debit_note', label: '📤 Debit Note', icon: '📊', color: '#e67e22' },
        { key: 'credit_note', label: '📥 Credit Note', icon: '📉', color: '#34495e' }
    ];

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchDashboardData();
        } else {
            fetchVouchers();
        }
    }, [activeTab, filters]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/vouchers/dashboard/summary`);
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setMessage('❌ Error loading dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) params.append(key, filters[key]);
            });

            const response = await axios.get(`${backendUrl}/api/vouchers?${params}`);
            setVouchers(response.data.vouchers || []);
        } catch (error) {
            console.error('Error fetching vouchers:', error);
            setMessage('❌ Error loading vouchers');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateVoucher = (voucherType) => {
        setSelectedVoucherType(voucherType);
        setEditingVoucher(null);
        setShowVoucherForm(true);
    };

    const handleEditVoucher = (voucher) => {
        setSelectedVoucherType(voucher.voucherType);
        setEditingVoucher(voucher);
        setShowVoucherForm(true);
    };

    const handlePostVoucher = async (voucherId) => {
        if (!window.confirm('Are you sure you want to post this voucher? This action cannot be undone.')) {
            return;
        }

        try {
            setLoading(true);
            await axios.post(`${backendUrl}/api/vouchers/${voucherId}/post`);
            setMessage('✅ Voucher posted successfully!');
            setTimeout(() => setMessage(''), 3000);
            fetchVouchers();
        } catch (error) {
            console.error('Error posting voucher:', error);
            setMessage('❌ Error posting voucher: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelVoucher = async (voucherId) => {
        const reason = prompt('Enter reason for cancellation:');
        if (!reason) return;

        try {
            setLoading(true);
            await axios.post(`${backendUrl}/api/vouchers/${voucherId}/cancel`, { reason });
            setMessage('✅ Voucher cancelled successfully!');
            setTimeout(() => setMessage(''), 3000);
            fetchVouchers();
        } catch (error) {
            console.error('Error cancelling voucher:', error);
            setMessage('❌ Error cancelling voucher: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteVoucher = async (voucherId) => {
        if (!window.confirm('Are you sure you want to delete this voucher?')) {
            return;
        }

        try {
            setLoading(true);
            await axios.delete(`${backendUrl}/api/vouchers/${voucherId}`);
            setMessage('✅ Voucher deleted successfully!');
            setTimeout(() => setMessage(''), 3000);
            fetchVouchers();
        } catch (error) {
            console.error('Error deleting voucher:', error);
            setMessage('❌ Error deleting voucher: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const getVoucherTypeInfo = (type) => {
        return voucherTypes.find(vt => vt.key === type) || { label: type, icon: '📄', color: '#666' };
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount || 0);
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { label: 'Draft', color: '#f39c12', icon: '📝' },
            posted: { label: 'Posted', color: '#27ae60', icon: '✅' },
            cancelled: { label: 'Cancelled', color: '#e74c3c', icon: '❌' }
        };

        const config = statusConfig[status] || statusConfig.draft;
        return (
            <span className="status-badge" style={{ backgroundColor: config.color }}>
                {config.icon} {config.label}
            </span>
        );
    };

    return (
        <div className="voucher-management">
            <div className="page-header">
                <h1>📋 Voucher Management</h1>
                <p>Create, manage, and track all accounting vouchers</p>
            </div>

            {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    📊 Dashboard
                </button>
                <button
                    className={`tab ${activeTab === 'vouchers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('vouchers')}
                >
                    📋 All Vouchers
                </button>
                <button
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    ➕ Create Voucher
                </button>
                <button
                    className="tab advanced-tab"
                    onClick={() => window.location.href = '/advanced-vouchers'}
                >
                    ⚙️ Advanced Features
                </button>
            </div>

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
                <div className="dashboard-content">
                    <div className="voucher-type-cards">
                        {voucherTypes.map(voucherType => {
                            const summaryData = dashboardData.summary.find(s => s._id === voucherType.key);
                            return (
                                <div key={voucherType.key} className="voucher-type-card" style={{ borderLeftColor: voucherType.color }}>
                                    <div className="card-header">
                                        <span className="card-icon" style={{ color: voucherType.color }}>
                                            {voucherType.icon}
                                        </span>
                                        <h3>{voucherType.label}</h3>
                                    </div>
                                    <div className="card-stats">
                                        <div className="stat">
                                            <span className="stat-label">Count</span>
                                            <span className="stat-value">{summaryData?.count || 0}</span>
                                        </div>
                                        <div className="stat">
                                            <span className="stat-label">Total Amount</span>
                                            <span className="stat-value">{formatAmount(summaryData?.totalDebit || 0)}</span>
                                        </div>
                                    </div>
                                    <button
                                        className="create-voucher-btn"
                                        onClick={() => handleCreateVoucher(voucherType.key)}
                                        style={{ backgroundColor: voucherType.color }}
                                    >
                                        ➕ Create {voucherType.key}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="dashboard-summary">
                        <div className="summary-section">
                            <h3>📈 Status Summary</h3>
                            <div className="status-cards">
                                {dashboardData.statusCounts.map(status => (
                                    <div key={status._id} className="status-card">
                                        {getStatusBadge(status._id)}
                                        <span className="status-count">{status.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="recent-vouchers-section">
                            <h3>🕒 Recent Vouchers</h3>
                            <div className="recent-vouchers-list">
                                {dashboardData.recentVouchers.map(voucher => {
                                    const typeInfo = getVoucherTypeInfo(voucher.voucherType);
                                    return (
                                        <div key={voucher._id} className="recent-voucher-item">
                                            <div className="voucher-info">
                                                <span className="voucher-icon" style={{ color: typeInfo.color }}>
                                                    {typeInfo.icon}
                                                </span>
                                                <div className="voucher-details">
                                                    <strong>{voucher.voucherNumber}</strong>
                                                    <span className="voucher-type">{typeInfo.label}</span>
                                                </div>
                                            </div>
                                            <div className="voucher-amount">
                                                {formatAmount(voucher.totalDebit)}
                                            </div>
                                            <div className="voucher-status">
                                                {getStatusBadge(voucher.status)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Voucher Tab */}
            {activeTab === 'create' && (
                <div className="create-voucher-content">
                    <h2>➕ Create New Voucher</h2>
                    <div className="voucher-type-grid">
                        {voucherTypes.map(voucherType => (
                            <div
                                key={voucherType.key}
                                className="voucher-type-option"
                                onClick={() => handleCreateVoucher(voucherType.key)}
                                style={{ borderColor: voucherType.color }}
                            >
                                <div className="option-icon" style={{ color: voucherType.color }}>
                                    {voucherType.icon}
                                </div>
                                <h3>{voucherType.label}</h3>
                                <p>Create a new {voucherType.key} voucher</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* All Vouchers Tab */}
            {activeTab === 'vouchers' && (
                <div className="vouchers-content">
                    <div className="vouchers-filters">
                        <div className="filter-row">
                            <select
                                value={filters.voucherType}
                                onChange={(e) => setFilters({ ...filters, voucherType: e.target.value, page: 1 })}
                                className="filter-select"
                            >
                                <option value="">All Voucher Types</option>
                                {voucherTypes.map(type => (
                                    <option key={type.key} value={type.key}>{type.label}</option>
                                ))}
                            </select>

                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
                                className="filter-select"
                            >
                                <option value="">All Status</option>
                                <option value="draft">Draft</option>
                                <option value="posted">Posted</option>
                                <option value="cancelled">Cancelled</option>
                            </select>

                            <input
                                type="date"
                                value={filters.fromDate}
                                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value, page: 1 })}
                                className="filter-input"
                                placeholder="From Date"
                            />

                            <input
                                type="date"
                                value={filters.toDate}
                                onChange={(e) => setFilters({ ...filters, toDate: e.target.value, page: 1 })}
                                className="filter-input"
                                placeholder="To Date"
                            />

                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
                                className="filter-input"
                                placeholder="🔍 Search vouchers..."
                            />
                        </div>
                    </div>

                    <div className="vouchers-table-container">
                        {loading ? (
                            <div className="loading">⏳ Loading vouchers...</div>
                        ) : (
                            <table className="vouchers-table">
                                <thead>
                                    <tr>
                                        <th>Voucher No.</th>
                                        <th>Type</th>
                                        <th>Date</th>
                                        <th>Narration</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vouchers.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                                No vouchers found
                                            </td>
                                        </tr>
                                    ) : (
                                        vouchers.map(voucher => {
                                            const typeInfo = getVoucherTypeInfo(voucher.voucherType);
                                            return (
                                                <tr key={voucher._id}>
                                                    <td>
                                                        <strong>{voucher.voucherNumber}</strong>
                                                    </td>
                                                    <td>
                                                        <span className="voucher-type-badge" style={{ backgroundColor: typeInfo.color }}>
                                                            {typeInfo.icon} {typeInfo.label}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {new Date(voucher.voucherDate).toLocaleDateString()}
                                                    </td>
                                                    <td>
                                                        <div className="narration-cell">
                                                            {voucher.narration}
                                                        </div>
                                                    </td>
                                                    <td className="amount-cell">
                                                        {formatAmount(voucher.totalDebit)}
                                                    </td>
                                                    <td>
                                                        {getStatusBadge(voucher.status)}
                                                    </td>
                                                    <td>
                                                        <div className="action-buttons">
                                                            <button
                                                                className="btn-small btn-view"
                                                                onClick={() => handleEditVoucher(voucher)}
                                                                title="View/Edit"
                                                            >
                                                                👁️
                                                            </button>
                                                            {voucher.status === 'draft' && (
                                                                <>
                                                                    <button
                                                                        className="btn-small btn-post"
                                                                        onClick={() => handlePostVoucher(voucher._id)}
                                                                        title="Post Voucher"
                                                                    >
                                                                        ✅
                                                                    </button>
                                                                    <button
                                                                        className="btn-small btn-delete"
                                                                        onClick={() => handleDeleteVoucher(voucher._id)}
                                                                        title="Delete"
                                                                    >
                                                                        🗑️
                                                                    </button>
                                                                </>
                                                            )}
                                                            {voucher.status === 'posted' && (
                                                                <button
                                                                    className="btn-small btn-cancel"
                                                                    onClick={() => handleCancelVoucher(voucher._id)}
                                                                    title="Cancel Voucher"
                                                                >
                                                                    ❌
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* Voucher Form Modal */}
            {showVoucherForm && (
                <VoucherForm
                    voucherType={selectedVoucherType}
                    voucher={editingVoucher}
                    onClose={() => setShowVoucherForm(false)}
                    onSave={() => {
                        setShowVoucherForm(false);
                        if (activeTab === 'vouchers') fetchVouchers();
                        if (activeTab === 'dashboard') fetchDashboardData();
                    }}
                />
            )}
        </div>
    );
}

// Voucher Form Component
function VoucherForm({ voucherType, voucher, onClose, onSave }) {
    const [formData, setFormData] = useState({
        voucherDate: new Date().toISOString().split('T')[0],
        referenceNumber: '',
        referenceDate: '',
        narration: '',
        items: [{ account: '', accountModel: '', accountName: '', description: '', debitAmount: '', creditAmount: '' }],
        partyDetails: { name: '', address: '', gstin: '', pan: '', contactNumber: '' },
        bankDetails: { bankName: '', accountNumber: '', chequeNumber: '', chequeDate: '' },
        invoiceDetails: { invoiceNumber: '', invoiceDate: '', dueDate: '', terms: '' }
    });

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        if (voucher) {
            setFormData({
                voucherDate: new Date(voucher.voucherDate).toISOString().split('T')[0],
                referenceNumber: voucher.referenceNumber || '',
                referenceDate: voucher.referenceDate ? new Date(voucher.referenceDate).toISOString().split('T')[0] : '',
                narration: voucher.narration || '',
                items: voucher.items || [{ account: '', accountModel: '', accountName: '', description: '', debitAmount: '', creditAmount: '' }],
                partyDetails: voucher.partyDetails || { name: '', address: '', gstin: '', pan: '', contactNumber: '' },
                bankDetails: voucher.bankDetails || { bankName: '', accountNumber: '', chequeNumber: '', chequeDate: '' },
                invoiceDetails: voucher.invoiceDetails || { invoiceNumber: '', invoiceDate: '', dueDate: '', terms: '' }
            });
        }
    }, [voucher]);

    const searchAccounts = async (searchTerm) => {
        if (!searchTerm) {
            setAccounts([]);
            return;
        }

        try {
            const response = await axios.get(`${backendUrl}/api/vouchers/accounts/search?search=${searchTerm}`);
            setAccounts(response.data);
        } catch (error) {
            console.error('Error searching accounts:', error);
        }
    };

    const addItem = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { account: '', accountModel: '', accountName: '', description: '', debitAmount: '', creditAmount: '' }]
        });
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    const updateItem = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index][field] = value;
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotals = () => {
        const totalDebit = formData.items.reduce((sum, item) => sum + (parseFloat(item.debitAmount) || 0), 0);
        const totalCredit = formData.items.reduce((sum, item) => sum + (parseFloat(item.creditAmount) || 0), 0);
        return { totalDebit, totalCredit, difference: totalDebit - totalCredit };
    };

    const handleSave = async () => {
        try {
            setLoading(true);

            const payload = {
                ...formData,
                voucherType
            };

            if (voucher) {
                await axios.put(`${backendUrl}/api/vouchers/${voucher._id}`, payload);
                setMessage('✅ Voucher updated successfully!');
            } else {
                await axios.post(`${backendUrl}/api/vouchers`, payload);
                setMessage('✅ Voucher created successfully!');
            }

            setTimeout(() => {
                onSave();
            }, 1000);
        } catch (error) {
            console.error('Error saving voucher:', error);
            setMessage('❌ Error saving voucher: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const totals = calculateTotals();
    const isBalanced = Math.abs(totals.difference) < 0.01;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="voucher-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>📝 {voucher ? 'Edit' : 'Create'} {voucherType} Voucher</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                {message && (
                    <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                        {message}
                    </div>
                )}

                <div className="modal-body">
                    <div className="form-section">
                        <h4>📋 Basic Details</h4>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Voucher Date *</label>
                                <input
                                    type="date"
                                    value={formData.voucherDate}
                                    onChange={(e) => setFormData({ ...formData, voucherDate: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                            <div className="form-group">
                                <label>Reference Number</label>
                                <input
                                    type="text"
                                    value={formData.referenceNumber}
                                    onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                                    className="form-input"
                                    placeholder="Enter reference number"
                                />
                            </div>
                            <div className="form-group">
                                <label>Reference Date</label>
                                <input
                                    type="date"
                                    value={formData.referenceDate}
                                    onChange={(e) => setFormData({ ...formData, referenceDate: e.target.value })}
                                    className="form-input"
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label>Narration *</label>
                            <textarea
                                value={formData.narration}
                                onChange={(e) => setFormData({ ...formData, narration: e.target.value })}
                                className="form-textarea"
                                placeholder="Enter voucher description"
                                rows="2"
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <div className="section-header">
                            <h4>💰 Voucher Items</h4>
                            <button className="btn-add-item" onClick={addItem}>
                                ➕ Add Item
                            </button>
                        </div>

                        <div className="voucher-items">
                            {formData.items.map((item, index) => (
                                <div key={index} className="voucher-item">
                                    <div className="item-header">
                                        <span>Item {index + 1}</span>
                                        {formData.items.length > 1 && (
                                            <button
                                                className="btn-remove-item"
                                                onClick={() => removeItem(index)}
                                            >
                                                🗑️
                                            </button>
                                        )}
                                    </div>

                                    <div className="item-form">
                                        <div className="form-group">
                                            <label>Account *</label>
                                            <input
                                                type="text"
                                                value={item.accountName}
                                                onChange={(e) => {
                                                    updateItem(index, 'accountName', e.target.value);
                                                    searchAccounts(e.target.value);
                                                }}
                                                className="form-input"
                                                placeholder="Search and select account"
                                            />
                                            {accounts.length > 0 && (
                                                <div className="account-suggestions">
                                                    {accounts.map(account => (
                                                        <div
                                                            key={account._id}
                                                            className="account-suggestion"
                                                            onClick={() => {
                                                                updateItem(index, 'account', account._id);
                                                                updateItem(index, 'accountModel', account.model);
                                                                updateItem(index, 'accountName', account.name);
                                                                setAccounts([]);
                                                            }}
                                                        >
                                                            <strong>{account.name}</strong>
                                                            <span className="account-type">{account.type}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="form-group">
                                            <label>Description</label>
                                            <input
                                                type="text"
                                                value={item.description}
                                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                className="form-input"
                                                placeholder="Item description"
                                            />
                                        </div>

                                        <div className="amount-inputs">
                                            <div className="form-group">
                                                <label>Debit Amount</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.debitAmount}
                                                    onChange={(e) => updateItem(index, 'debitAmount', e.target.value)}
                                                    className="form-input amount-input"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div className="form-group">
                                                <label>Credit Amount</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.creditAmount}
                                                    onChange={(e) => updateItem(index, 'creditAmount', e.target.value)}
                                                    className="form-input amount-input"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="voucher-totals">
                            <div className="totals-row">
                                <span>Total Debit: <strong>₹{totals.totalDebit.toFixed(2)}</strong></span>
                                <span>Total Credit: <strong>₹{totals.totalCredit.toFixed(2)}</strong></span>
                                <span className={`difference ${isBalanced ? 'balanced' : 'unbalanced'}`}>
                                    Difference: <strong>₹{Math.abs(totals.difference).toFixed(2)}</strong>
                                    {isBalanced ? ' ✅' : ' ❌'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn-primary"
                        onClick={handleSave}
                        disabled={loading || !formData.narration || formData.items.length === 0}
                    >
                        {loading ? '⏳ Saving...' : '💾 Save Voucher'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default VoucherManagement;