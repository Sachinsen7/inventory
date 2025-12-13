import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VoucherManagement.css';

function VoucherManagementFixed() {
    const [activeTab, setActiveTab] = useState('vouchers'); // Start with vouchers tab
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

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://inventory.works';

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
        console.log('VoucherManagement: useEffect triggered', { activeTab, filters });
        if (activeTab === 'dashboard') {
            fetchDashboardData();
        } else if (activeTab === 'vouchers') {
            fetchVouchers();
        }
    }, [activeTab, filters]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            console.log('Fetching dashboard data...');
            const response = await axios.get(`${backendUrl}/api/vouchers/dashboard/summary`);
            console.log('Dashboard data received:', response.data);
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
            setMessage('');
            console.log('Fetching vouchers with filters:', filters);

            const params = new URLSearchParams();
            Object.keys(filters).forEach(key => {
                if (filters[key]) params.append(key, filters[key]);
            });

            const url = `${backendUrl}/api/vouchers?${params}`;
            console.log('Fetching from URL:', url);

            const response = await axios.get(url);
            console.log('Vouchers API response:', response.data);

            if (response.data && response.data.vouchers) {
                setVouchers(response.data.vouchers);
                console.log('Set vouchers state:', response.data.vouchers.length, 'vouchers');
            } else {
                console.error('Unexpected response structure:', response.data);
                setVouchers([]);
                setMessage('❌ Unexpected response format');
            }
        } catch (error) {
            console.error('Error fetching vouchers:', error);
            setMessage('❌ Error loading vouchers: ' + (error.response?.data?.message || error.message));
            setVouchers([]);
        } finally {
            setLoading(false);
        }
    };

    const getVoucherTypeInfo = (type) => {
        return voucherTypes.find(vt => vt.key === type) || { label: type, icon: '📄', color: '#666' };
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            draft: { label: 'Draft', color: '#f39c12', icon: '📝' },
            posted: { label: 'Posted', color: '#27ae60', icon: '✅' },
            cancelled: { label: 'Cancelled', color: '#e74c3c', icon: '❌' },
            provisional: { label: 'Provisional', color: '#9b59b6', icon: '⏳' }
        };

        const config = statusConfig[status] || { label: status, color: '#666', icon: '❓' };
        return (
            <span className="status-badge" style={{ backgroundColor: config.color }}>
                {config.icon} {config.label}
            </span>
        );
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('en-IN');
        } catch (error) {
            return dateString;
        }
    };

    console.log('Render state:', { activeTab, loading, vouchersCount: vouchers.length, message });

    return (
        <div className="voucher-management">
            <div className="voucher-header">
                <h1>📋 Voucher Management</h1>
                <p>Manage all your financial vouchers and transactions</p>
            </div>

            {message && (
                <div className="message-banner" style={{
                    padding: '10px',
                    margin: '10px 0',
                    backgroundColor: message.includes('❌') ? '#ffebee' : '#e8f5e8',
                    border: '1px solid ' + (message.includes('❌') ? '#f44336' : '#4caf50'),
                    borderRadius: '4px'
                }}>
                    {message}
                </div>
            )}

            <div className="voucher-tabs">
                <button
                    className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => {
                        console.log('Switching to dashboard tab');
                        setActiveTab('dashboard');
                    }}
                >
                    📊 Dashboard
                </button>
                <button
                    className={`tab ${activeTab === 'vouchers' ? 'active' : ''}`}
                    onClick={() => {
                        console.log('Switching to vouchers tab');
                        setActiveTab('vouchers');
                    }}
                >
                    📋 All Vouchers ({vouchers.length})
                </button>
                <button
                    className={`tab ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => {
                        console.log('Switching to create tab');
                        setActiveTab('create');
                    }}
                >
                    ➕ Create Voucher
                </button>
            </div>

            {/* Debug Info */}
            <div style={{
                padding: '10px',
                margin: '10px 0',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '12px'
            }}>
                <strong>Debug Info:</strong> Active Tab: {activeTab} | Loading: {loading ? 'Yes' : 'No'} | Vouchers: {vouchers.length} | Backend URL: {backendUrl}
            </div>

            {/* All Vouchers Tab */}
            {activeTab === 'vouchers' && (
                <div className="vouchers-content">
                    <div className="vouchers-filters">
                        <div className="filter-row">
                            <select
                                value={filters.voucherType}
                                onChange={(e) => {
                                    console.log('Filter changed - voucherType:', e.target.value);
                                    setFilters({ ...filters, voucherType: e.target.value, page: 1 });
                                }}
                                className="filter-select"
                            >
                                <option value="">All Voucher Types</option>
                                {voucherTypes.map(type => (
                                    <option key={type.key} value={type.key}>{type.label}</option>
                                ))}
                            </select>

                            <select
                                value={filters.status}
                                onChange={(e) => {
                                    console.log('Filter changed - status:', e.target.value);
                                    setFilters({ ...filters, status: e.target.value, page: 1 });
                                }}
                                className="filter-select"
                            >
                                <option value="">All Status</option>
                                <option value="draft">Draft</option>
                                <option value="posted">Posted</option>
                                <option value="cancelled">Cancelled</option>
                            </select>

                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => {
                                    console.log('Filter changed - search:', e.target.value);
                                    setFilters({ ...filters, search: e.target.value, page: 1 });
                                }}
                                className="filter-input"
                                placeholder="🔍 Search vouchers..."
                            />

                            <button
                                onClick={() => {
                                    console.log('Refresh button clicked');
                                    fetchVouchers();
                                }}
                                className="btn-primary"
                                style={{ marginLeft: '10px' }}
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>

                    <div className="vouchers-table-container">
                        {loading ? (
                            <div className="loading" style={{ textAlign: 'center', padding: '40px' }}>
                                ⏳ Loading vouchers...
                            </div>
                        ) : vouchers.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <h3>No vouchers found</h3>
                                <p>Try adjusting your filters or create a new voucher.</p>
                                <button
                                    onClick={() => {
                                        console.log('Load sample data clicked');
                                        fetchVouchers();
                                    }}
                                    className="btn-primary"
                                >
                                    🔄 Load Data
                                </button>
                            </div>
                        ) : (
                            <>
                                <div style={{ marginBottom: '10px', fontSize: '14px', color: '#666' }}>
                                    Showing {vouchers.length} vouchers
                                </div>
                                <table className="vouchers-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f8f9fa' }}>
                                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Voucher No.</th>
                                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Type</th>
                                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Date</th>
                                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'left' }}>Narration</th>
                                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right' }}>Amount</th>
                                            <th style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vouchers.map((voucher, index) => {
                                            const typeInfo = getVoucherTypeInfo(voucher.voucherType);
                                            return (
                                                <tr key={voucher._id || index} style={{ borderBottom: '1px solid #dee2e6' }}>
                                                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                                        <strong>{voucher.voucherNumber}</strong>
                                                    </td>
                                                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                                        <span style={{
                                                            backgroundColor: typeInfo.color,
                                                            color: 'white',
                                                            padding: '4px 8px',
                                                            borderRadius: '4px',
                                                            fontSize: '12px'
                                                        }}>
                                                            {typeInfo.icon} {voucher.voucherType}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                                        {formatDate(voucher.voucherDate)}
                                                    </td>
                                                    <td style={{ padding: '12px', border: '1px solid #dee2e6' }}>
                                                        <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {voucher.narration || 'No description'}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'right' }}>
                                                        <strong>{formatAmount(voucher.totalDebit)}</strong>
                                                    </td>
                                                    <td style={{ padding: '12px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                                                        {getStatusBadge(voucher.status)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Dashboard Tab */}
            {activeTab === 'dashboard' && (
                <div className="dashboard-content">
                    <h2>📊 Voucher Dashboard</h2>
                    <p>Dashboard functionality will be implemented here.</p>
                    <button onClick={fetchDashboardData} className="btn-primary">
                        🔄 Refresh Dashboard
                    </button>
                </div>
            )}

            {/* Create Tab */}
            {activeTab === 'create' && (
                <div className="create-voucher-content">
                    <h2>➕ Create New Voucher</h2>
                    <p>Voucher creation functionality will be implemented here.</p>
                </div>
            )}
        </div>
    );
}

export default VoucherManagementFixed;