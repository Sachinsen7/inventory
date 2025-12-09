import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './GSTR2Page.css';

function GSTR2Page() {
    const [activeTab, setActiveTab] = useState('upload');
    const [uploadFile, setUploadFile] = useState(null);
    const [period, setPeriod] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [summary, setSummary] = useState(null);
    const [entries, setEntries] = useState([]);
    const [filter, setFilter] = useState('all');

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        if (activeTab === 'summary') {
            fetchSummary();
        } else if (activeTab === 'entries') {
            fetchEntries();
        }
    }, [activeTab, filter]);

    const handleUpload = async () => {
        if (!uploadFile) {
            setMessage('❌ Please select a JSON file');
            return;
        }

        if (!startDate || !endDate) {
            setMessage('❌ Please select start and end dates');
            return;
        }

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('period', period);
        formData.append('startDate', startDate);
        formData.append('endDate', endDate);
        formData.append('uploadedBy', 'user');

        try {
            setLoading(true);
            const response = await axios.post(
                `${backendUrl}/api/gstr2/upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setMessage(`✅ ${response.data.message} - Processed: ${response.data.inserted}/${response.data.total}`);
            setTimeout(() => setMessage(''), 5000);
            setUploadFile(null);
            setPeriod('');
            setStartDate('');
            setEndDate('');
            setActiveTab('summary');
        } catch (error) {
            console.error('Error uploading GSTR-2:', error);
            setMessage('❌ Error uploading file: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/gstr2/summary`, {
                params: { period }
            });
            setSummary(response.data);
        } catch (error) {
            console.error('Error fetching summary:', error);
            setMessage('❌ Error loading summary');
        } finally {
            setLoading(false);
        }
    };

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const params = { period };
            if (filter !== 'all') {
                params.matchStatus = filter;
            }

            const response = await axios.get(`${backendUrl}/api/gstr2/entries`, { params });
            setEntries(response.data);
        } catch (error) {
            console.error('Error fetching entries:', error);
            setMessage('❌ Error loading entries');
        } finally {
            setLoading(false);
        }
    };

    const handleMatch = async () => {
        if (!window.confirm('Match GSTR-2 entries with purchase bills? This may take a moment.')) {
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post(`${backendUrl}/api/gstr2/match`);
            setMessage(`✅ Matching complete! Matched: ${response.data.matched}, Mismatched: ${response.data.mismatched}, Missing: ${response.data.missingInBooks}`);
            setTimeout(() => setMessage(''), 5000);
            fetchSummary();
        } catch (error) {
            console.error('Error matching:', error);
            setMessage('❌ Error matching entries');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="gstr2-page">
            <div className="page-header">
                <h1>📊 GSTR-2A / GSTR-2B Reconciliation</h1>
                <p>Upload and match supplier invoices from GST portal</p>
            </div>

            {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'upload' ? 'active' : ''}`}
                    onClick={() => setActiveTab('upload')}
                >
                    📤 Upload
                </button>
                <button
                    className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                >
                    📈 Summary
                </button>
                <button
                    className={`tab ${activeTab === 'entries' ? 'active' : ''}`}
                    onClick={() => setActiveTab('entries')}
                >
                    📋 Entries
                </button>
            </div>

            {/* Upload Tab */}
            {activeTab === 'upload' && (
                <div className="upload-container">
                    <div className="upload-card">
                        <h2>Upload GSTR-2A/2B JSON File</h2>

                        <div className="form-group">
                            <label>Period (MMYYYY) - Optional</label>
                            <input
                                type="text"
                                value={period}
                                onChange={(e) => setPeriod(e.target.value)}
                                placeholder="122024"
                                maxLength="6"
                            />
                            <small>Example: 122024 for December 2024</small>
                        </div>

                        <div className="date-range-group">
                            <div className="form-group">
                                <label>Start Date *</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>End Date *</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Select JSON File</label>
                            <input
                                type="file"
                                accept=".json"
                                onChange={(e) => setUploadFile(e.target.files[0])}
                                id="json-upload"
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="json-upload" className="file-upload-btn">
                                📁 Choose JSON File
                            </label>
                            {uploadFile && <div className="file-name">Selected: {uploadFile.name}</div>}
                        </div>

                        <button
                            className="btn-primary btn-large"
                            onClick={handleUpload}
                            disabled={!uploadFile || !startDate || !endDate || loading}
                        >
                            {loading ? '⏳ Uploading...' : '📤 Upload & Parse'}
                        </button>

                        <div className="info-box">
                            <h3>ℹ️ How to get GSTR-2A/2B JSON:</h3>
                            <ol>
                                <li>Login to <a href="https://www.gst.gov.in" target="_blank" rel="noopener noreferrer">GST Portal</a></li>
                                <li>Go to <strong>Returns → GSTR-2A/2B</strong></li>
                                <li>Select the period (month & year)</li>
                                <li>Click <strong>Download → JSON</strong></li>
                                <li>Upload the downloaded JSON file here</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
                <div className="summary-container">
                    {loading ? (
                        <div className="loading">⏳ Loading summary...</div>
                    ) : summary ? (
                        <>
                            <div className="summary-cards">
                                <div className="summary-card">
                                    <h3>Total Entries</h3>
                                    <div className="big-number">{summary.summary.totalEntries}</div>
                                </div>
                                <div className="summary-card success">
                                    <h3>✅ Matched</h3>
                                    <div className="big-number">{summary.summary.matched}</div>
                                </div>
                                <div className="summary-card warning">
                                    <h3>⚠️ Mismatched</h3>
                                    <div className="big-number">{summary.summary.mismatched}</div>
                                </div>
                                <div className="summary-card danger">
                                    <h3>❌ Missing in Books</h3>
                                    <div className="big-number">{summary.summary.missingInBooks}</div>
                                </div>
                            </div>

                            <div className="itc-summary">
                                <h2>💰 ITC Summary</h2>
                                <div className="itc-grid">
                                    <div className="itc-item">
                                        <span>Total ITC:</span>
                                        <strong>₹{summary.itcSummary.totalITC.toLocaleString()}</strong>
                                    </div>
                                    <div className="itc-item">
                                        <span>Eligible ITC:</span>
                                        <strong>₹{summary.itcSummary.eligibleITC.toLocaleString()}</strong>
                                    </div>
                                    <div className="itc-item">
                                        <span>Matched ITC:</span>
                                        <strong>₹{summary.itcSummary.matchedITC.toLocaleString()}</strong>
                                    </div>
                                    <div className="itc-item">
                                        <span>Mismatched ITC:</span>
                                        <strong>₹{summary.itcSummary.mismatchedITC.toLocaleString()}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="supplier-breakdown">
                                <h2>🏭 Supplier-wise Breakdown</h2>
                                <table className="data-table">
                                    <thead>
                                        <tr>
                                            <th>Supplier GSTIN</th>
                                            <th>Supplier Name</th>
                                            <th>Total Invoices</th>
                                            <th>Total Value</th>
                                            <th>Total ITC</th>
                                            <th>Matched</th>
                                            <th>Mismatched</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summary.supplierBreakdown.map((supplier, index) => (
                                            <tr key={index}>
                                                <td>{supplier._id}</td>
                                                <td>{supplier.supplierName || '-'}</td>
                                                <td>{supplier.totalInvoices}</td>
                                                <td className="amount">₹{supplier.totalValue.toLocaleString()}</td>
                                                <td className="amount">₹{supplier.totalITC.toLocaleString()}</td>
                                                <td><span className="badge success">{supplier.matched}</span></td>
                                                <td><span className="badge warning">{supplier.mismatched}</span></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="actions-bar">
                                <button className="btn-primary" onClick={handleMatch} disabled={loading}>
                                    🔄 Re-match All Entries
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <p>No data available. Please upload GSTR-2A/2B file first.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Entries Tab */}
            {activeTab === 'entries' && (
                <div className="entries-container">
                    <div className="filter-bar">
                        <label>Filter by Status:</label>
                        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="all">All</option>
                            <option value="matched">✅ Matched</option>
                            <option value="mismatched">⚠️ Mismatched</option>
                            <option value="missing_in_books">❌ Missing in Books</option>
                            <option value="pending">⏳ Pending</option>
                        </select>
                    </div>

                    {loading ? (
                        <div className="loading">⏳ Loading entries...</div>
                    ) : (
                        <div className="entries-table-container">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Supplier GSTIN</th>
                                        <th>Invoice No</th>
                                        <th>Invoice Date</th>
                                        <th>Invoice Value</th>
                                        <th>ITC Available</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {entries.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                                No entries found
                                            </td>
                                        </tr>
                                    ) : (
                                        entries.map((entry) => (
                                            <tr key={entry._id}>
                                                <td>{entry.supplierGSTIN}</td>
                                                <td>{entry.invoiceNumber}</td>
                                                <td>{new Date(entry.invoiceDate).toLocaleDateString()}</td>
                                                <td className="amount">₹{entry.invoiceValue.toLocaleString()}</td>
                                                <td className="amount">₹{entry.itcAvailable.toLocaleString()}</td>
                                                <td>
                                                    <span className={`badge ${entry.matchStatus === 'matched' ? 'success' :
                                                        entry.matchStatus === 'mismatched' ? 'warning' :
                                                            entry.matchStatus === 'missing_in_books' ? 'danger' : 'pending'
                                                        }`}>
                                                        {entry.matchStatus}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default GSTR2Page;
