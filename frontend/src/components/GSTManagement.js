import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GSTManagement.css';

function GSTManagement() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Dashboard data
    const [dashboardData, setDashboardData] = useState({
        gstr1Summary: {},
        gstr2Summary: {},
        gstr3bSummary: {},
        taxLiability: {},
        monthlyTrend: [],
        topCustomers: []
    });

    // GSTR data
    const [gstr1Data, setGstr1Data] = useState({ entries: [], summary: {} });
    const [gstr3bData, setGstr3bData] = useState(null);
    const [hsnCodes, setHsnCodes] = useState([]);
    const [complianceStatus, setComplianceStatus] = useState([]);

    // Filters
    const [filters, setFilters] = useState({
        period: new Date().getMonth() < 3
            ? `${String(new Date().getMonth() + 1).padStart(2, '0')}${new Date().getFullYear()}`
            : `${String(new Date().getMonth() + 1).padStart(2, '0')}${new Date().getFullYear()}`,
        financialYear: new Date().getMonth() < 3
            ? `${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(-2)}`
            : `${new Date().getFullYear()}-${String(new Date().getFullYear() + 1).slice(-2)}`,
        invoiceType: '',
        search: ''
    });

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const gstTabs = [
        { key: 'dashboard', label: '📊 GST Dashboard', icon: '📈', description: 'Overview and analytics' },
        { key: 'gstr1', label: '📤 GSTR-1', icon: '📋', description: 'Outward supplies' },
        { key: 'gstr3b', label: '📝 GSTR-3B', icon: '📄', description: 'Monthly return' },
        { key: 'hsn', label: '🏷️ HSN/SAC Codes', icon: '🔢', description: 'Product classification' },
        { key: 'compliance', label: '✅ Compliance', icon: '📅', description: 'Filing status' }
    ];

    useEffect(() => {
        if (activeTab === 'dashboard') {
            fetchDashboardData();
        } else if (activeTab === 'gstr1') {
            fetchGSTR1Data();
        } else if (activeTab === 'gstr3b') {
            fetchGSTR3BData();
        } else if (activeTab === 'hsn') {
            fetchHSNCodes();
        } else if (activeTab === 'compliance') {
            fetchComplianceStatus();
        }
    }, [activeTab, filters]);

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/gst/dashboard`, {
                params: { period: filters.period, financialYear: filters.financialYear }
            });
            setDashboardData(response.data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setMessage('❌ Error loading dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const fetchGSTR1Data = async () => {
        try {
            setLoading(true);
            const [entriesResponse, summaryResponse] = await Promise.all([
                axios.get(`${backendUrl}/api/gst/gstr1/entries`, {
                    params: {
                        period: filters.period,
                        financialYear: filters.financialYear,
                        invoiceType: filters.invoiceType
                    }
                }),
                axios.get(`${backendUrl}/api/gst/gstr1/summary`, {
                    params: { period: filters.period, financialYear: filters.financialYear }
                })
            ]);

            setGstr1Data({
                entries: entriesResponse.data.entries,
                summary: summaryResponse.data
            });
        } catch (error) {
            console.error('Error fetching GSTR-1 data:', error);
            setMessage('❌ Error loading GSTR-1 data');
        } finally {
            setLoading(false);
        }
    };

    const fetchGSTR3BData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/gst/gstr3b/${filters.period}/${filters.financialYear}`);
            setGstr3bData(response.data);
        } catch (error) {
            if (error.response?.status === 404) {
                setGstr3bData(null);
            } else {
                console.error('Error fetching GSTR-3B data:', error);
                setMessage('❌ Error loading GSTR-3B data');
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchHSNCodes = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/gst/hsn`, {
                params: { search: filters.search }
            });
            setHsnCodes(response.data.codes);
        } catch (error) {
            console.error('Error fetching HSN codes:', error);
            setMessage('❌ Error loading HSN codes');
        } finally {
            setLoading(false);
        }
    };

    const fetchComplianceStatus = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/gst/compliance-status`, {
                params: { financialYear: filters.financialYear }
            });
            setComplianceStatus(response.data);
        } catch (error) {
            console.error('Error fetching compliance status:', error);
            setMessage('❌ Error loading compliance status');
        } finally {
            setLoading(false);
        }
    };

    const generateGSTR1 = async () => {
        if (!window.confirm(`Generate GSTR-1 for ${filters.period}? This will overwrite existing data.`)) {
            return;
        }

        try {
            setLoading(true);
            await axios.post(`${backendUrl}/api/gst/gstr1/generate`, {
                period: filters.period,
                financialYear: filters.financialYear
            });
            setMessage('✅ GSTR-1 generated successfully!');
            setTimeout(() => setMessage(''), 3000);
            fetchGSTR1Data();
        } catch (error) {
            console.error('Error generating GSTR-1:', error);
            setMessage('❌ Error generating GSTR-1: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const generateGSTR3B = async () => {
        if (!window.confirm(`Generate GSTR-3B for ${filters.period}? This will calculate tax liability.`)) {
            return;
        }

        try {
            setLoading(true);
            await axios.post(`${backendUrl}/api/gst/gstr3b/generate`, {
                period: filters.period,
                financialYear: filters.financialYear
            });
            setMessage('✅ GSTR-3B generated successfully!');
            setTimeout(() => setMessage(''), 3000);
            fetchGSTR3BData();
        } catch (error) {
            console.error('Error generating GSTR-3B:', error);
            setMessage('❌ Error generating GSTR-3B: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const exportGSTR1JSON = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/gst/gstr1/export/${filters.period}/${filters.financialYear}`);

            // Download JSON file
            const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `GSTR1_${filters.period}_${filters.financialYear}.json`;
            link.click();
            URL.revokeObjectURL(url);

            setMessage('✅ GSTR-1 JSON exported successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Error exporting GSTR-1:', error);
            setMessage('❌ Error exporting GSTR-1');
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

    const getPeriodLabel = (period) => {
        const month = period.slice(0, 2);
        const year = period.slice(2);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    };

    return (
        <div className="gst-management">
            <div className="page-header">
                <h1>🧾 GST Management</h1>
                <p>Comprehensive GST compliance and reporting system</p>
            </div>

            {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="gst-tabs">
                {gstTabs.map(tab => (
                    <div
                        key={tab.key}
                        className={`gst-tab ${activeTab === tab.key ? 'active' : ''}`}
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
            <div className="gst-filters">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>Period</label>
                        <select
                            value={filters.period}
                            onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                            className="filter-select"
                        >
                            <option value="122024">Dec 2024</option>
                            <option value="112024">Nov 2024</option>
                            <option value="102024">Oct 2024</option>
                            <option value="092024">Sep 2024</option>
                            <option value="082024">Aug 2024</option>
                            <option value="072024">Jul 2024</option>
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

                    {activeTab === 'gstr1' && (
                        <div className="filter-group">
                            <label>Invoice Type</label>
                            <select
                                value={filters.invoiceType}
                                onChange={(e) => setFilters({ ...filters, invoiceType: e.target.value })}
                                className="filter-select"
                            >
                                <option value="">All Types</option>
                                <option value="B2B">B2B</option>
                                <option value="B2C">B2C</option>
                                <option value="B2CL">B2CL</option>
                                <option value="EXP">Export</option>
                            </select>
                        </div>
                    )}

                    {activeTab === 'hsn' && (
                        <div className="filter-group">
                            <label>Search HSN/SAC</label>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                className="filter-input"
                                placeholder="Search codes..."
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="gst-content">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner">⏳</div>
                        <p>Loading GST data...</p>
                    </div>
                ) : (
                    <>
                        {/* Dashboard Tab */}
                        {activeTab === 'dashboard' && (
                            <GSTDashboard
                                data={dashboardData}
                                formatAmount={formatAmount}
                                period={filters.period}
                                getPeriodLabel={getPeriodLabel}
                            />
                        )}

                        {/* GSTR-1 Tab */}
                        {activeTab === 'gstr1' && (
                            <GSTR1Management
                                data={gstr1Data}
                                formatAmount={formatAmount}
                                formatDate={formatDate}
                                onGenerate={generateGSTR1}
                                onExport={exportGSTR1JSON}
                                loading={loading}
                                period={filters.period}
                                getPeriodLabel={getPeriodLabel}
                            />
                        )}

                        {/* GSTR-3B Tab */}
                        {activeTab === 'gstr3b' && (
                            <GSTR3BManagement
                                data={gstr3bData}
                                formatAmount={formatAmount}
                                onGenerate={generateGSTR3B}
                                loading={loading}
                                period={filters.period}
                                getPeriodLabel={getPeriodLabel}
                            />
                        )}

                        {/* HSN/SAC Tab */}
                        {activeTab === 'hsn' && (
                            <HSNManagement
                                codes={hsnCodes}
                                formatAmount={formatAmount}
                                loading={loading}
                            />
                        )}

                        {/* Compliance Tab */}
                        {activeTab === 'compliance' && (
                            <ComplianceStatus
                                status={complianceStatus}
                                getPeriodLabel={getPeriodLabel}
                                loading={loading}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// GST Dashboard Component
function GSTDashboard({ data, formatAmount, period, getPeriodLabel }) {
    return (
        <div className="gst-dashboard">
            <div className="dashboard-header">
                <h2>📊 GST Dashboard - {getPeriodLabel(period)}</h2>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card gstr1">
                    <div className="card-header">
                        <h3>📤 GSTR-1 Summary</h3>
                        <div className="card-icon">📋</div>
                    </div>
                    <div className="card-stats">
                        <div className="stat">
                            <span className="stat-label">Total Invoices</span>
                            <span className="stat-value">{data.gstr1Summary.totalInvoices || 0}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Taxable Value</span>
                            <span className="stat-value">{formatAmount(data.gstr1Summary.totalTaxableValue)}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Total Tax</span>
                            <span className="stat-value">{formatAmount(data.gstr1Summary.totalTax)}</span>
                        </div>
                    </div>
                </div>

                <div className="summary-card gstr3b">
                    <div className="card-header">
                        <h3>📝 Tax Liability</h3>
                        <div className="card-icon">💰</div>
                    </div>
                    <div className="card-stats">
                        <div className="stat">
                            <span className="stat-label">Tax Payable</span>
                            <span className="stat-value">{formatAmount(data.taxLiability.totalTaxPayable)}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">ITC Available</span>
                            <span className="stat-value">{formatAmount(data.taxLiability.totalITCAvailable)}</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">Net Payable</span>
                            <span className="stat-value">{formatAmount(data.taxLiability.netTaxPayable)}</span>
                        </div>
                    </div>
                </div>

                <div className="summary-card compliance">
                    <div className="card-header">
                        <h3>✅ Compliance</h3>
                        <div className="card-icon">📅</div>
                    </div>
                    <div className="card-stats">
                        <div className="stat">
                            <span className="stat-label">GSTR-1 Status</span>
                            <span className="stat-value status-badge generated">Generated</span>
                        </div>
                        <div className="stat">
                            <span className="stat-label">GSTR-3B Status</span>
                            <span className="stat-value status-badge pending">Pending</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Monthly Trend */}
            {data.monthlyTrend && data.monthlyTrend.length > 0 && (
                <div className="monthly-trend">
                    <h3>📈 Monthly Sales Trend</h3>
                    <div className="trend-chart">
                        {data.monthlyTrend.map((month, index) => (
                            <div key={index} className="trend-item">
                                <div className="trend-period">{getPeriodLabel(month._id)}</div>
                                <div className="trend-amount">{formatAmount(month.totalSales)}</div>
                                <div className="trend-tax">{formatAmount(month.totalTax)} tax</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Top Customers */}
            {data.topCustomers && data.topCustomers.length > 0 && (
                <div className="top-customers">
                    <h3>🏆 Top Customers by Tax</h3>
                    <div className="customers-list">
                        {data.topCustomers.slice(0, 5).map((customer, index) => (
                            <div key={index} className="customer-item">
                                <div className="customer-rank">#{index + 1}</div>
                                <div className="customer-info">
                                    <div className="customer-name">{customer.customerName}</div>
                                    <div className="customer-gstin">{customer._id}</div>
                                </div>
                                <div className="customer-stats">
                                    <div className="customer-tax">{formatAmount(customer.totalTax)}</div>
                                    <div className="customer-invoices">{customer.totalInvoices} invoices</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// GSTR-1 Management Component
function GSTR1Management({ data, formatAmount, formatDate, onGenerate, onExport, loading, period, getPeriodLabel }) {
    return (
        <div className="gstr1-management">
            <div className="section-header">
                <h2>📤 GSTR-1 Management - {getPeriodLabel(period)}</h2>
                <div className="section-actions">
                    <button className="btn-generate" onClick={onGenerate} disabled={loading}>
                        🔄 Generate GSTR-1
                    </button>
                    <button className="btn-export" onClick={onExport} disabled={loading}>
                        📥 Export JSON
                    </button>
                </div>
            </div>

            {/* Summary */}
            {data.summary && data.summary.totals && (
                <div className="gstr1-summary">
                    <h3>📊 Summary</h3>
                    <div className="summary-grid">
                        <div className="summary-item">
                            <span className="label">Total Invoices</span>
                            <span className="value">{data.summary.totals.totalInvoices}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Taxable Value</span>
                            <span className="value">{formatAmount(data.summary.totals.totalTaxableValue)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Total Tax</span>
                            <span className="value">{formatAmount(data.summary.totals.totalTax)}</span>
                        </div>
                        <div className="summary-item">
                            <span className="label">Invoice Value</span>
                            <span className="value">{formatAmount(data.summary.totals.totalInvoiceValue)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Entries Table */}
            <div className="gstr1-entries">
                <h3>📋 Invoice Entries</h3>
                <div className="entries-table-container">
                    <table className="entries-table">
                        <thead>
                            <tr>
                                <th>Invoice No.</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>GSTIN</th>
                                <th>Type</th>
                                <th>Taxable Value</th>
                                <th>Tax Amount</th>
                                <th>Total Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.entries && data.entries.length > 0 ? (
                                data.entries.map((entry, index) => (
                                    <tr key={index}>
                                        <td>{entry.invoiceNumber}</td>
                                        <td>{formatDate(entry.invoiceDate)}</td>
                                        <td>{entry.customerName}</td>
                                        <td>{entry.customerGSTIN || 'N/A'}</td>
                                        <td>
                                            <span className={`type-badge ${entry.invoiceType.toLowerCase()}`}>
                                                {entry.invoiceType}
                                            </span>
                                        </td>
                                        <td className="amount">{formatAmount(entry.taxableValue)}</td>
                                        <td className="amount">
                                            {formatAmount((entry.cgstAmount || 0) + (entry.sgstAmount || 0) + (entry.igstAmount || 0))}
                                        </td>
                                        <td className="amount">{formatAmount(entry.invoiceValue)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px' }}>
                                        No GSTR-1 entries found. Click "Generate GSTR-1" to create entries from your invoices.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

// GSTR-3B Management Component
function GSTR3BManagement({ data, formatAmount, onGenerate, loading, period, getPeriodLabel }) {
    return (
        <div className="gstr3b-management">
            <div className="section-header">
                <h2>📝 GSTR-3B Management - {getPeriodLabel(period)}</h2>
                <div className="section-actions">
                    <button className="btn-generate" onClick={onGenerate} disabled={loading}>
                        🔄 Generate GSTR-3B
                    </button>
                </div>
            </div>

            {data ? (
                <div className="gstr3b-content">
                    <div className="gstr3b-sections">
                        {/* Tax Payable Section */}
                        <div className="gstr3b-section">
                            <h3>💰 Tax Payable</h3>
                            <div className="tax-grid">
                                <div className="tax-item">
                                    <span className="tax-label">CGST</span>
                                    <span className="tax-value">{formatAmount(data.taxPayment?.taxPayable?.cgstAmount || 0)}</span>
                                </div>
                                <div className="tax-item">
                                    <span className="tax-label">SGST</span>
                                    <span className="tax-value">{formatAmount(data.taxPayment?.taxPayable?.sgstAmount || 0)}</span>
                                </div>
                                <div className="tax-item">
                                    <span className="tax-label">IGST</span>
                                    <span className="tax-value">{formatAmount(data.taxPayment?.taxPayable?.igstAmount || 0)}</span>
                                </div>
                                <div className="tax-item">
                                    <span className="tax-label">Cess</span>
                                    <span className="tax-value">{formatAmount(data.taxPayment?.taxPayable?.cessAmount || 0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* ITC Available Section */}
                        <div className="gstr3b-section">
                            <h3>🎯 ITC Available</h3>
                            <div className="tax-grid">
                                <div className="tax-item">
                                    <span className="tax-label">CGST</span>
                                    <span className="tax-value">{formatAmount(data.eligibleITC?.netITC?.cgstAmount || 0)}</span>
                                </div>
                                <div className="tax-item">
                                    <span className="tax-label">SGST</span>
                                    <span className="tax-value">{formatAmount(data.eligibleITC?.netITC?.sgstAmount || 0)}</span>
                                </div>
                                <div className="tax-item">
                                    <span className="tax-label">IGST</span>
                                    <span className="tax-value">{formatAmount(data.eligibleITC?.netITC?.igstAmount || 0)}</span>
                                </div>
                                <div className="tax-item">
                                    <span className="tax-label">Cess</span>
                                    <span className="tax-value">{formatAmount(data.eligibleITC?.netITC?.cessAmount || 0)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Net Tax Liability */}
                        <div className="gstr3b-section net-liability">
                            <h3>⚖️ Net Tax Liability</h3>
                            <div className="net-amount">
                                {formatAmount(
                                    (data.taxPayment?.taxPayable?.cgstAmount || 0) +
                                    (data.taxPayment?.taxPayable?.sgstAmount || 0) +
                                    (data.taxPayment?.taxPayable?.igstAmount || 0) +
                                    (data.taxPayment?.taxPayable?.cessAmount || 0) -
                                    (data.eligibleITC?.netITC?.cgstAmount || 0) -
                                    (data.eligibleITC?.netITC?.sgstAmount || 0) -
                                    (data.eligibleITC?.netITC?.igstAmount || 0) -
                                    (data.eligibleITC?.netITC?.cessAmount || 0)
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="no-data">
                    <div className="no-data-icon">📝</div>
                    <h3>No GSTR-3B Generated</h3>
                    <p>Click "Generate GSTR-3B" to calculate tax liability for {getPeriodLabel(period)}</p>
                </div>
            )}
        </div>
    );
}

// HSN Management Component
function HSNManagement({ codes, formatAmount, loading }) {
    return (
        <div className="hsn-management">
            <div className="section-header">
                <h2>🏷️ HSN/SAC Code Management</h2>
            </div>

            <div className="hsn-table-container">
                <table className="hsn-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Type</th>
                            <th>Description</th>
                            <th>Tax Rate</th>
                            <th>Category</th>
                            <th>Usage Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {codes && codes.length > 0 ? (
                            codes.map((code, index) => (
                                <tr key={index}>
                                    <td><strong>{code.code}</strong></td>
                                    <td>
                                        <span className={`type-badge ${code.type.toLowerCase()}`}>
                                            {code.type}
                                        </span>
                                    </td>
                                    <td>{code.description}</td>
                                    <td>{code.gstRate}%</td>
                                    <td>{code.category}</td>
                                    <td>{code.usageCount || 0}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                    No HSN/SAC codes found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// Compliance Status Component
function ComplianceStatus({ status, getPeriodLabel, loading }) {
    return (
        <div className="compliance-status">
            <div className="section-header">
                <h2>✅ GST Compliance Status</h2>
            </div>

            <div className="compliance-grid">
                {status && status.length > 0 ? (
                    status.map((period, index) => (
                        <div key={index} className="compliance-card">
                            <div className="period-header">
                                <h3>{getPeriodLabel(period.period)}</h3>
                            </div>
                            <div className="compliance-items">
                                <div className="compliance-item">
                                    <span className="item-label">GSTR-1</span>
                                    <span className={`status-badge ${period.gstr1.status}`}>
                                        {period.gstr1.status === 'completed' ? '✅' : '⏳'} {period.gstr1.status}
                                    </span>
                                    <span className="item-count">{period.gstr1.count} entries</span>
                                </div>
                                <div className="compliance-item">
                                    <span className="item-label">GSTR-2</span>
                                    <span className={`status-badge ${period.gstr2.status}`}>
                                        {period.gstr2.status === 'completed' ? '✅' : '⏳'} {period.gstr2.status}
                                    </span>
                                    <span className="item-count">{period.gstr2.count} entries</span>
                                </div>
                                <div className="compliance-item">
                                    <span className="item-label">GSTR-3B</span>
                                    <span className={`status-badge ${period.gstr3b.status}`}>
                                        {period.gstr3b.status === 'filed' ? '✅' : '⏳'} {period.gstr3b.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="no-data">
                        <div className="no-data-icon">📅</div>
                        <h3>No Compliance Data</h3>
                        <p>Compliance status will appear here once GST returns are generated</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default GSTManagement;