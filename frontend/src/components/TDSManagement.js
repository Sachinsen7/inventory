import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './TDSManagement.css';

function TDSManagement() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Dashboard data
    const [dashboardData, setDashboardData] = useState({
        currentQuarterSummary: [],
        challanSummary: {},
        complianceStatus: [],
        topDeductees: [],
        sectionWiseAnalysis: []
    });

    // TDS data
    const [tdsEntries, setTdsEntries] = useState([]);
    const [tdsChallans, setTdsChallans] = useState([]);
    const [tdsRates, setTdsRates] = useState({});

    // Filters
    const [filters, setFilters] = useState({
        quarter: 'Q3', // Current quarter
        financialYear: '2024-25',
        sectionCode: '',
        status: '',
        deducteePAN: ''
    });

    // Form states
    const [showTDSForm, setShowTDSForm] = useState(false);
    const [showChallanForm, setShowChallanForm] = useState(false);
    const [selectedEntries, setSelectedEntries] = useState([]);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const tdsTabs = [
        { key: 'dashboard', label: '📊 TDS Dashboard', icon: '📈', description: 'Overview and analytics' },
        { key: 'entries', label: '📋 TDS Entries', icon: '📄', description: 'Manage TDS deductions' },
        { key: 'challans', label: '💰 Challans', icon: '🏦', description: 'Payment challans' },
        { key: 'certificates', label: '📜 Certificates', icon: '🎖️', description: 'Form 16A generation' },
        { key: 'returns', label: '📊 Returns', icon: '📋', description: 'Quarterly returns' }
    ];

    useEffect(() => {
        fetchTDSRates();
        if (activeTab === 'dashboard') {
            fetchDashboardData();
        } else if (activeTab === 'entries') {
            fetchTDSEntries();
        } else if (activeTab === 'challans') {
            fetchTDSChallans();
        }
    }, [activeTab, filters]);

    const fetchTDSRates = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/tds/rates`);
            setTdsRates(response.data);
        } catch (error) {
            console.error('Error fetching TDS rates:', error);
        }
    };
    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/tds/dashboard`, {
                params: { quarter: filters.quarter, financialYear: filters.financialYear }
            });
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setMessage('❌ Error loading dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const fetchTDSEntries = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/tds/entries`, {
                params: filters
            });
            setTdsEntries(response.data.entries || []);
        } catch (error) {
            console.error('Error fetching TDS entries:', error);
            setMessage('❌ Error loading TDS entries');
        } finally {
            setLoading(false);
        }
    };

    const fetchTDSChallans = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/tds/challans`, {
                params: { quarter: filters.quarter, financialYear: filters.financialYear }
            });
            setTdsChallans(response.data.challans || []);
        } catch (error) {
            console.error('Error fetching TDS challans:', error);
            setMessage('❌ Error loading TDS challans');
        } finally {
            setLoading(false);
        }
    };

    const generateTDSFromVouchers = async () => {
        if (!window.confirm(`Generate TDS entries from vouchers for ${filters.quarter} ${filters.financialYear}?`)) {
            return;
        }

        try {
            setLoading(true);
            await axios.post(`${backendUrl}/api/tds/generate-from-vouchers`, {
                quarter: filters.quarter,
                financialYear: filters.financialYear
            });
            setMessage('✅ TDS entries generated successfully!');
            setTimeout(() => setMessage(''), 3000);
            fetchTDSEntries();
        } catch (error) {
            console.error('Error generating TDS entries:', error);
            setMessage('❌ Error generating TDS entries: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const createChallan = async (challanDetails) => {
        if (selectedEntries.length === 0) {
            setMessage('❌ Please select TDS entries to create challan');
            return;
        }

        try {
            setLoading(true);
            await axios.post(`${backendUrl}/api/tds/challans`, {
                tdsEntryIds: selectedEntries,
                challanDetails
            });
            setMessage('✅ TDS challan created successfully!');
            setTimeout(() => setMessage(''), 3000);
            setShowChallanForm(false);
            setSelectedEntries([]);
            fetchTDSChallans();
            fetchTDSEntries();
        } catch (error) {
            console.error('Error creating TDS challan:', error);
            setMessage('❌ Error creating TDS challan: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount || 0);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN');
    };

    const getStatusBadge = (status) => {
        const statusConfig = {
            pending: { label: 'Pending', color: '#f39c12', icon: '⏳' },
            deposited: { label: 'Deposited', color: '#3498db', icon: '💰' },
            filed: { label: 'Filed', color: '#27ae60', icon: '✅' },
            completed: { label: 'Completed', color: '#2ecc71', icon: '🎯' }
        };

        const config = statusConfig[status] || statusConfig.pending;
        return (
            <span className="status-badge" style={{ backgroundColor: config.color }}>
                {config.icon} {config.label}
            </span>
        );
    };

    return (
        <div className="tds-management">
            <div className="page-header">
                <h1>💼 TDS Management</h1>
                <p>Comprehensive TDS compliance and certificate management</p>
            </div>

            {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="tds-tabs">
                {tdsTabs.map(tab => (
                    <div
                        key={tab.key}
                        className={`tds-tab ${activeTab === tab.key ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <div className="tab-icon">{tab.icon}</div>
                        <div className="tab-content">
                            <h3>{tab.label}</h3>
                            <p>{tab.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="tds-filters">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>Quarter</label>
                        <select
                            value={filters.quarter}
                            onChange={(e) => setFilters({ ...filters, quarter: e.target.value })}
                            className="filter-select"
                        >
                            <option value="Q1">Q1 (Apr-Jun)</option>
                            <option value="Q2">Q2 (Jul-Sep)</option>
                            <option value="Q3">Q3 (Oct-Dec)</option>
                            <option value="Q4">Q4 (Jan-Mar)</option>
                        </select>
                    </div>

                    <div className="filter-group">
                        <label>Financial Year</label>
                        <select
                            value={filters.financialYear}
                            onChange={(e) => setFilters({ ...filters, financialYear: e.target.value })}
                            className="filter-select"
                        >
                            <option value="2024-25">2024-25</option>
                            <option value="2023-24">2023-24</option>
                            <option value="2022-23">2022-23</option>
                        </select>
                    </div>

                    {activeTab === 'entries' && (
                        <>
                            <div className="filter-group">
                                <label>Section Code</label>
                                <select
                                    value={filters.sectionCode}
                                    onChange={(e) => setFilters({ ...filters, sectionCode: e.target.value })}
                                    className="filter-select"
                                >
                                    <option value="">All Sections</option>
                                    {Object.keys(tdsRates).map(section => (
                                        <option key={section} value={section}>{section}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="filter-group">
                                <label>Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className="filter-select"
                                >
                                    <option value="">All Status</option>
                                    <option value="pending">Pending</option>
                                    <option value="deposited">Deposited</option>
                                    <option value="filed">Filed</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="tds-content">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner">⏳</div>
                        <p>Loading TDS data...</p>
                    </div>
                ) : (
                    <>
                        {/* Dashboard Tab */}
                        {activeTab === 'dashboard' && (
                            <TDSDashboard
                                data={dashboardData}
                                formatAmount={formatAmount}
                                quarter={filters.quarter}
                                financialYear={filters.financialYear}
                            />
                        )}

                        {/* TDS Entries Tab */}
                        {activeTab === 'entries' && (
                            <TDSEntriesManagement
                                entries={tdsEntries}
                                formatAmount={formatAmount}
                                formatDate={formatDate}
                                getStatusBadge={getStatusBadge}
                                onGenerate={generateTDSFromVouchers}
                                loading={loading}
                                selectedEntries={selectedEntries}
                                setSelectedEntries={setSelectedEntries}
                                onCreateChallan={() => setShowChallanForm(true)}
                            />
                        )}

                        {/* Challans Tab */}
                        {activeTab === 'challans' && (
                            <TDSChallansManagement
                                challans={tdsChallans}
                                formatAmount={formatAmount}
                                formatDate={formatDate}
                                getStatusBadge={getStatusBadge}
                                loading={loading}
                            />
                        )}

                        {/* Certificates Tab */}
                        {activeTab === 'certificates' && (
                            <TDSCertificatesManagement
                                entries={tdsEntries}
                                formatAmount={formatAmount}
                                formatDate={formatDate}
                                loading={loading}
                            />
                        )}

                        {/* Returns Tab */}
                        {activeTab === 'returns' && (
                            <TDSReturnsManagement
                                quarter={filters.quarter}
                                financialYear={filters.financialYear}
                                formatAmount={formatAmount}
                                loading={loading}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Challan Form Modal */}
            {showChallanForm && (
                <ChallanForm
                    onClose={() => setShowChallanForm(false)}
                    onSave={createChallan}
                    selectedEntries={selectedEntries}
                    formatAmount={formatAmount}
                />
            )}
        </div>
    );
}

// TDS Dashboard Component
function TDSDashboard({ data, formatAmount, quarter, financialYear }) {
    return (
        <div className="tds-dashboard">
            <div className="dashboard-header">
                <h2>📊 TDS Dashboard - {quarter} {financialYear}</h2>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card entries">
                    <div className="card-header">
                        <h3>📋 TDS Entries</h3>
                        <div className="card-icon">📄</div>
                    </div>
                    <div className="card-stats">
                        <div className="stat">
                            <span className="stat-label">Total Entries</span>
                            <span className="stat-value">
                                {data.currentQuarterSummary.reduce((sum, item) => sum + item.totalEntries, 0)}
                            </span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Total TDS Amount</span>
                            <span className="stat-value">
                                {formatAmount(data.currentQuarterSummary.reduce((sum, item) => sum + item.totalTDSAmount, 0))}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="summary-card challans">
                    <div className="card-header">
                        <h3>💰 Challans</h3>
                        <div className="card-icon">🏦</div>
                    </div>
                    <div className="card-stats">
                        <div className="stat">
                            <span className="stat-label">Total Challans</span>
                            <span className="stat-value">{data.challanSummary.total?.totalChallans || 0}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Paid Amount</span>
                            <span className="stat-value">{formatAmount(data.challanSummary.total?.paidAmount || 0)}</span>
                        </div>
                    </div>
                </div>

                <div className="summary-card compliance">
                    <div className="card-header">
                        <h3>✅ Compliance</h3>
                        <div className="card-icon">📊</div>
                    </div>
                    <div className="card-stats">
                        <div className="stat">
                            <span className="stat-label">Filed Entries</span>
                            <span className="stat-value">
                                {data.currentQuarterSummary.reduce((sum, item) => sum + item.filedEntries, 0)}
                            </span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Pending Entries</span>
                            <span className="stat-value">
                                {data.currentQuarterSummary.reduce((sum, item) => sum + item.pendingEntries, 0)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section-wise Analysis */}
            {data.sectionWiseAnalysis && data.sectionWiseAnalysis.length > 0 && (
                <div className="section-analysis">
                    <h3>📊 Section-wise TDS Analysis</h3>
                    <div className="analysis-grid">
                        {data.sectionWiseAnalysis.map((section, index) => (
                            <div key={index} className="analysis-item">
                                <div className="section-code">{section._id}</div>
                                <div className="section-stats">
                                    <div className="section-amount">{formatAmount(section.totalTDSAmount)}</div>
                                    <div className="section-details">
                                        {section.totalEntries} entries • {section.averageRate.toFixed(1)}% avg rate
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Deductees */}
            {data.topDeductees && data.topDeductees.length > 0 && (
                <div className="top-deductees">
                    <h3>🏆 Top Deductees</h3>
                    <div className="deductees-list">
                        {data.topDeductees.slice(0, 5).map((deductee, index) => (
                            <div key={index} className="deductee-item">
                                <div className="deductee-rank">#{index + 1}</div>
                                <div className="deductee-info">
                                    <div className="deductee-name">{deductee.deducteeName}</div>
                                    <div className="deductee-pan">{deductee._id}</div>
                                </div>
                                <div className="deductee-stats">
                                    <div className="deductee-tds">{formatAmount(deductee.totalTDSAmount)}</div>
                                    <div className="deductee-entries">{deductee.entryCount} entries</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// TDS Entries Management Component
function TDSEntriesManagement({
    entries, formatAmount, formatDate, getStatusBadge, onGenerate, loading,
    selectedEntries, setSelectedEntries, onCreateChallan
}) {
    const handleSelectEntry = (entryId) => {
        if (selectedEntries.includes(entryId)) {
            setSelectedEntries(selectedEntries.filter(id => id !== entryId));
        } else {
            setSelectedEntries([...selectedEntries, entryId]);
        }
    };

    const handleSelectAll = () => {
        if (selectedEntries.length === entries.length) {
            setSelectedEntries([]);
        } else {
            setSelectedEntries(entries.map(entry => entry._id));
        }
    };

    return (
        <div className="tds-entries-management">
            <div className="section-header">
                <h2>📋 TDS Entries Management</h2>
                <div className="section-actions">
                    <button className="btn-generate" onClick={onGenerate} disabled={loading}>
                        🔄 Generate from Vouchers
                    </button>
                    {selectedEntries.length > 0 && (
                        <button className="btn-challan" onClick={onCreateChallan}>
                            💰 Create Challan ({selectedEntries.length})
                        </button>
                    )}
                </div>
            </div>

            <div className="entries-table-container">
                <table className="entries-table">
                    <thead>
                        <tr>
                            <th>
                                <input
                                    type="checkbox"
                                    checked={selectedEntries.length === entries.length && entries.length > 0}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            <th>Deductee Name</th>
                            <th>PAN</th>
                            <th>Section</th>
                            <th>Payment Date</th>
                            <th>Payment Amount</th>
                            <th>TDS Rate</th>
                            <th>TDS Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length > 0 ? (
                            entries.map((entry) => (
                                <tr key={entry._id}>
                                    <td>
                                        <input
                                            type="checkbox"
                                            checked={selectedEntries.includes(entry._id)}
                                            onChange={() => handleSelectEntry(entry._id)}
                                        />
                                    </td>
                                    <td>{entry.deducteeName}</td>
                                    <td>{entry.deducteePAN}</td>
                                    <td>
                                        <span className="section-badge">{entry.sectionCode}</span>
                                    </td>
                                    <td>{formatDate(entry.paymentDate)}</td>
                                    <td className="amount">{formatAmount(entry.paymentAmount)}</td>
                                    <td>{entry.tdsRate}%</td>
                                    <td className="amount">{formatAmount(entry.tdsAmount)}</td>
                                    <td>{getStatusBadge(entry.status)}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-small btn-view" title="View Details">
                                                👁️
                                            </button>
                                            {entry.status === 'filed' && (
                                                <button className="btn-small btn-certificate" title="Generate Certificate">
                                                    📜
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '40px' }}>
                                    No TDS entries found. Click "Generate from Vouchers" to create entries.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// TDS Challans Management Component
function TDSChallansManagement({ challans, formatAmount, formatDate, getStatusBadge, loading }) {
    return (
        <div className="tds-challans-management">
            <div className="section-header">
                <h2>💰 TDS Challans Management</h2>
            </div>

            <div className="challans-table-container">
                <table className="challans-table">
                    <thead>
                        <tr>
                            <th>Challan Number</th>
                            <th>Challan Date</th>
                            <th>Total Amount</th>
                            <th>Bank Name</th>
                            <th>Quarter</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {challans.length > 0 ? (
                            challans.map((challan) => (
                                <tr key={challan._id}>
                                    <td><strong>{challan.challanNumber}</strong></td>
                                    <td>{formatDate(challan.challanDate)}</td>
                                    <td className="amount">{formatAmount(challan.totalAmount)}</td>
                                    <td>{challan.bankName}</td>
                                    <td>{challan.quarter} {challan.financialYear}</td>
                                    <td>{getStatusBadge(challan.status)}</td>
                                    <td>
                                        <div className="action-buttons">
                                            <button className="btn-small btn-view" title="View Details">
                                                👁️
                                            </button>
                                            {challan.status === 'pending' && (
                                                <button className="btn-small btn-verify" title="Verify Payment">
                                                    ✅
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                                    No TDS challans found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// TDS Certificates Management Component
function TDSCertificatesManagement({ entries, formatAmount, formatDate, loading }) {
    const filedEntries = entries.filter(entry => entry.status === 'filed' || entry.status === 'completed');

    return (
        <div className="tds-certificates-management">
            <div className="section-header">
                <h2>📜 TDS Certificates (Form 16A)</h2>
            </div>

            <div className="certificates-grid">
                {filedEntries.length > 0 ? (
                    filedEntries.map((entry) => (
                        <div key={entry._id} className="certificate-card">
                            <div className="certificate-header">
                                <h3>Form 16A</h3>
                                {entry.certificateGenerated && (
                                    <span className="certificate-badge">Generated</span>
                                )}
                            </div>
                            <div className="certificate-details">
                                <div className="detail-row">
                                    <span className="label">Deductee:</span>
                                    <span className="value">{entry.deducteeName}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">PAN:</span>
                                    <span className="value">{entry.deducteePAN}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">TDS Amount:</span>
                                    <span className="value">{formatAmount(entry.tdsAmount)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Payment Date:</span>
                                    <span className="value">{formatDate(entry.paymentDate)}</span>
                                </div>
                            </div>
                            <div className="certificate-actions">
                                <button className="btn-generate-cert">
                                    📜 Generate Certificate
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-data">
                        <div className="no-data-icon">📜</div>
                        <h3>No Filed Entries</h3>
                        <p>TDS certificates can be generated only for filed entries</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// TDS Returns Management Component
function TDSReturnsManagement({ quarter, financialYear, formatAmount, loading }) {
    return (
        <div className="tds-returns-management">
            <div className="section-header">
                <h2>📊 TDS Returns - {quarter} {financialYear}</h2>
                <div className="section-actions">
                    <button className="btn-generate">
                        📋 Generate Form 26Q
                    </button>
                </div>
            </div>

            <div className="returns-info">
                <div className="info-card">
                    <h3>Form 26Q</h3>
                    <p>Quarterly TDS return for salary payments</p>
                    <div className="info-stats">
                        <div className="stat">
                            <span className="stat-label">Due Date:</span>
                            <span className="stat-value">31st of following month</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Status:</span>
                            <span className="stat-value status-pending">Not Filed</span>
                        </div>
                    </div>
                </div>

                <div className="info-card">
                    <h3>Form 24Q</h3>
                    <p>Quarterly TDS return for non-salary payments</p>
                    <div className="info-stats">
                        <div className="stat">
                            <span className="stat-label">Due Date:</span>
                            <span className="stat-value">31st of following month</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Status:</span>
                            <span className="stat-value status-pending">Not Filed</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Challan Form Component
function ChallanForm({ onClose, onSave, selectedEntries, formatAmount }) {
    const [formData, setFormData] = useState({
        challanDate: new Date().toISOString().split('T')[0],
        bankName: '',
        bankCode: '',
        branchName: '',
        paymentMode: 'online',
        transactionId: '',
        utr: '',
        remarks: ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="challan-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>💰 Create TDS Challan</h3>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body">
                    <div className="form-section">
                        <h4>Selected Entries: {selectedEntries.length}</h4>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Challan Date *</label>
                            <input
                                type="date"
                                value={formData.challanDate}
                                onChange={(e) => setFormData({ ...formData, challanDate: e.target.value })}
                                className="form-input"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Payment Mode *</label>
                            <select
                                value={formData.paymentMode}
                                onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                className="form-select"
                                required
                            >
                                <option value="online">Online</option>
                                <option value="challan">Challan</option>
                                <option value="cheque">Cheque</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Bank Name *</label>
                            <input
                                type="text"
                                value={formData.bankName}
                                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                                className="form-input"
                                placeholder="Enter bank name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Branch Name</label>
                            <input
                                type="text"
                                value={formData.branchName}
                                onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                                className="form-input"
                                placeholder="Enter branch name"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Transaction ID</label>
                            <input
                                type="text"
                                value={formData.transactionId}
                                onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                                className="form-input"
                                placeholder="Enter transaction ID"
                            />
                        </div>
                        <div className="form-group">
                            <label>UTR Number</label>
                            <input
                                type="text"
                                value={formData.utr}
                                onChange={(e) => setFormData({ ...formData, utr: e.target.value })}
                                className="form-input"
                                placeholder="Enter UTR number"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Remarks</label>
                        <textarea
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            className="form-textarea"
                            placeholder="Enter any remarks"
                            rows="3"
                        />
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            💰 Create Challan
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default TDSManagement;