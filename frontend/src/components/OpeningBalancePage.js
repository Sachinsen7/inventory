import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './OpeningBalancePage.css';

function OpeningBalancePage() {
    const [activeTab, setActiveTab] = useState('customers');
    const [customers, setCustomers] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [uploadFile, setUploadFile] = useState(null);

    // Enhanced states for better functionality
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // all, debit, credit, zero
    const [showModal, setShowModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState(null);
    const [balanceForm, setBalanceForm] = useState({
        openingBalance: '',
        balanceType: 'debit',
        date: new Date().toISOString().split('T')[0],
        narration: ''
    });

    // Summary states
    const [summary, setSummary] = useState({
        totalDebit: 0,
        totalCredit: 0,
        netBalance: 0,
        count: 0
    });

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        try {
            setLoading(true);
            if (activeTab === 'customers') {
                const response = await axios.get(`${backendUrl}/api/ledger/customers`);
                setCustomers(response.data);
                calculateSummary(response.data);
            } else if (activeTab === 'suppliers') {
                const response = await axios.get(`${backendUrl}/api/ledger/suppliers`);
                setSuppliers(response.data);
                calculateSummary(response.data);
            } else if (activeTab === 'accounts') {
                // Fetch general ledger accounts
                const response = await axios.get(`${backendUrl}/api/ledger/accounts`);
                setAccounts(response.data);
                calculateSummary(response.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
            setMessage('❌ Error loading data');
        } finally {
            setLoading(false);
        }
    };

    const calculateSummary = (data) => {
        const totalDebit = data
            .filter(item => item.openingBalanceType === 'debit')
            .reduce((sum, item) => sum + (item.openingBalance || 0), 0);

        const totalCredit = data
            .filter(item => item.openingBalanceType === 'credit')
            .reduce((sum, item) => sum + (item.openingBalance || 0), 0);

        setSummary({
            totalDebit,
            totalCredit,
            netBalance: totalDebit - totalCredit,
            count: data.length
        });
    };

    const handleSaveBalance = async () => {
        if (!balanceForm.openingBalance || !balanceForm.date) {
            setMessage('❌ Please fill all required fields');
            return;
        }

        try {
            setLoading(true);
            const endpoint = selectedItem
                ? `${backendUrl}/api/ledger/${activeTab}/${selectedItem._id}/opening-balance`
                : `${backendUrl}/api/ledger/${activeTab}/opening-balance`;

            const payload = {
                openingBalance: parseFloat(balanceForm.openingBalance),
                openingBalanceType: balanceForm.balanceType,
                openingBalanceDate: balanceForm.date,
                narration: balanceForm.narration
            };

            if (!selectedItem) {
                // If creating new entry, we need additional fields
                payload.name = prompt('Enter name:');
                if (!payload.name) return;
            }

            await axios.post(endpoint, payload);

            setMessage('✅ Opening balance saved successfully!');
            setTimeout(() => setMessage(''), 3000);
            setShowModal(false);
            fetchData();
        } catch (error) {
            console.error('Error saving opening balance:', error);
            setMessage('❌ Error saving opening balance: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSetOpeningBalance = async (id, type) => {
        const balance = prompt('Enter opening balance amount:');
        if (!balance) return;

        const balanceType = prompt('Enter balance type (debit/credit):', type === 'customer' ? 'debit' : 'credit');
        if (!balanceType) return;

        const date = prompt('Enter opening balance date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
        if (!date) return;

        try {
            setLoading(true);
            const endpoint = type === 'customer'
                ? `${backendUrl}/api/ledger/customers/${id}/opening-balance`
                : `${backendUrl}/api/ledger/suppliers/${id}/opening-balance`;

            await axios.post(endpoint, {
                openingBalance: parseFloat(balance),
                openingBalanceType: balanceType.toLowerCase(),
                openingBalanceDate: date
            });

            setMessage('✅ Opening balance set successfully!');
            setTimeout(() => setMessage(''), 3000);
            fetchData();
        } catch (error) {
            console.error('Error setting opening balance:', error);
            setMessage('❌ Error setting opening balance');
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async () => {
        if (!uploadFile) {
            setMessage('❌ Please select a file');
            return;
        }

        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('type', activeTab === 'customers' ? 'customer' : 'supplier');

        try {
            setLoading(true);
            const response = await axios.post(
                `${backendUrl}/api/ledger/opening-balances/upload`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );

            setMessage(`✅ ${response.data.message}`);
            if (response.data.errors) {
                console.log('Errors:', response.data.errors);
            }
            setTimeout(() => setMessage(''), 5000);
            setUploadFile(null);
            fetchData();
        } catch (error) {
            console.error('Error uploading file:', error);
            setMessage('❌ Error uploading file');
        } finally {
            setLoading(false);
        }
    };

    const handleRecalculateBalances = async () => {
        if (!window.confirm('Recalculate all closing balances? This may take a moment.')) {
            return;
        }

        try {
            setLoading(true);
            const response = await axios.post(`${backendUrl}/api/ledger/recalculate-balances`);
            setMessage(`✅ ${response.data.message}`);
            setTimeout(() => setMessage(''), 3000);
            fetchData();
        } catch (error) {
            console.error('Error recalculating balances:', error);
            setMessage('❌ Error recalculating balances');
        } finally {
            setLoading(false);
        }
    };

    const downloadSampleCSV = () => {
        const csvContent = activeTab === 'customers'
            ? 'name,openingBalance,balanceType,date\nCustomer Name,10000,debit,2024-04-01\n'
            : 'name,openingBalance,balanceType,date\nSupplier Name,5000,credit,2024-04-01\n';

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `opening-balance-${activeTab}-sample.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    // Filter and search data
    const getFilteredData = () => {
        let data = activeTab === 'customers' ? customers :
            activeTab === 'suppliers' ? suppliers : accounts;

        // Apply search filter
        if (searchTerm) {
            data = data.filter(item =>
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.gstNo && item.gstNo.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Apply balance type filter
        switch (filterType) {
            case 'debit':
                data = data.filter(item => item.openingBalanceType === 'debit');
                break;
            case 'credit':
                data = data.filter(item => item.openingBalanceType === 'credit');
                break;
            case 'zero':
                data = data.filter(item => !item.openingBalance || item.openingBalance === 0);
                break;
            case 'non-zero':
                data = data.filter(item => item.openingBalance && item.openingBalance !== 0);
                break;
            default:
                // 'all' - no additional filtering
                break;
        }

        return data;
    };

    const filteredData = getFilteredData();

    return (
        <div className="opening-balance-page">
            <div className="page-header">
                <h1>💰 Opening & Closing Balances</h1>
                <p>Manage opening balances for customers and suppliers</p>
            </div>

            {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'customers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('customers')}
                >
                    👥 Customers ({customers.length})
                </button>
                <button
                    className={`tab ${activeTab === 'suppliers' ? 'active' : ''}`}
                    onClick={() => setActiveTab('suppliers')}
                >
                    🏭 Suppliers ({suppliers.length})
                </button>
                <button
                    className={`tab ${activeTab === 'accounts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('accounts')}
                >
                    🏦 Accounts ({accounts.length})
                </button>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card debit">
                    <div className="summary-icon">📈</div>
                    <div className="summary-content">
                        <div className="summary-label">Total Debit</div>
                        <div className="summary-value">₹{summary.totalDebit.toLocaleString()}</div>
                    </div>
                </div>
                <div className="summary-card credit">
                    <div className="summary-icon">📉</div>
                    <div className="summary-content">
                        <div className="summary-label">Total Credit</div>
                        <div className="summary-value">₹{summary.totalCredit.toLocaleString()}</div>
                    </div>
                </div>
                <div className="summary-card net">
                    <div className="summary-icon">⚖️</div>
                    <div className="summary-content">
                        <div className="summary-label">Net Balance</div>
                        <div className="summary-value">₹{summary.netBalance.toLocaleString()}</div>
                    </div>
                </div>
                <div className="summary-card count">
                    <div className="summary-icon">📊</div>
                    <div className="summary-content">
                        <div className="summary-label">Total Entries</div>
                        <div className="summary-value">{summary.count}</div>
                    </div>
                </div>
            </div>

            {/* Search and Filter Bar */}
            <div className="search-filter-bar">
                <div className="search-box">
                    <input
                        type="text"
                        placeholder={`🔍 Search ${activeTab}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="search-input"
                    />
                </div>
                <div className="filter-box">
                    <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="filter-select"
                    >
                        <option value="all">All Balances</option>
                        <option value="debit">Debit Only</option>
                        <option value="credit">Credit Only</option>
                        <option value="zero">Zero Balance</option>
                        <option value="non-zero">Non-Zero Balance</option>
                    </select>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => {
                        setSelectedItem(null);
                        setBalanceForm({
                            openingBalance: '',
                            balanceType: activeTab === 'customers' ? 'debit' : 'credit',
                            date: new Date().toISOString().split('T')[0],
                            narration: ''
                        });
                        setShowModal(true);
                    }}
                >
                    ➕ Add Opening Balance
                </button>
            </div>

            <div className="actions-bar">
                <div className="upload-section">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={(e) => setUploadFile(e.target.files[0])}
                        id="csv-upload"
                        style={{ display: 'none' }}
                    />
                    <label htmlFor="csv-upload" className="btn-secondary">
                        📁 Choose CSV File
                    </label>
                    {uploadFile && <span className="file-name">{uploadFile.name}</span>}
                    <button
                        className="btn-primary"
                        onClick={handleFileUpload}
                        disabled={!uploadFile || loading}
                    >
                        📤 Upload CSV
                    </button>
                    <button className="btn-link" onClick={downloadSampleCSV}>
                        📥 Download Sample CSV
                    </button>
                </div>

                <button className="btn-warning" onClick={handleRecalculateBalances} disabled={loading}>
                    🔄 Recalculate All Balances
                </button>
            </div>

            <div className="data-table-container">
                {loading ? (
                    <div className="loading">⏳ Loading...</div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>GSTIN</th>
                                <th>Opening Balance</th>
                                <th>Type</th>
                                <th>Closing Balance</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                                        {searchTerm || filterType !== 'all'
                                            ? `No ${activeTab} found matching your criteria`
                                            : `No ${activeTab} found`
                                        }
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item._id} className={item.openingBalance ? 'has-balance' : 'no-balance'}>
                                        <td>
                                            <div className="item-name">
                                                {item.name}
                                                {item.openingBalance > 0 && (
                                                    <span className="balance-indicator">💰</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>{item.gstNo || item.gstin || '-'}</td>
                                        <td className="amount">
                                            <span className={`amount-value ${item.openingBalanceType}`}>
                                                ₹{(item.openingBalance || 0).toLocaleString()}
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge ${item.openingBalanceType === 'debit' ? 'debit' : 'credit'}`}>
                                                {item.openingBalanceType === 'debit' ? '📈 Debit' :
                                                    item.openingBalanceType === 'credit' ? '📉 Credit' : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="amount">
                                            <span className={`amount-value ${(item.closingBalance || 0) >= 0 ? 'positive' : 'negative'}`}>
                                                ₹{Math.abs(item.closingBalance || 0).toLocaleString()}
                                                {(item.closingBalance || 0) < 0 && ' (CR)'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="btn-small btn-edit"
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setBalanceForm({
                                                            openingBalance: item.openingBalance || '',
                                                            balanceType: item.openingBalanceType || 'debit',
                                                            date: item.openingBalanceDate ?
                                                                new Date(item.openingBalanceDate).toISOString().split('T')[0] :
                                                                new Date().toISOString().split('T')[0],
                                                            narration: item.narration || ''
                                                        });
                                                        setShowModal(true);
                                                    }}
                                                    title="Edit Opening Balance"
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    className="btn-small btn-view"
                                                    onClick={() => window.open(`/customer/${item._id}`, '_blank')}
                                                    title="View Details"
                                                >
                                                    👁️ View
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Enhanced Modal for Opening Balance */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>💰 {selectedItem ? 'Edit' : 'Set'} Opening Balance</h3>
                            <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            {selectedItem && (
                                <div className="selected-item-info">
                                    <strong>{selectedItem.name}</strong>
                                    {selectedItem.gstNo && <span> | GST: {selectedItem.gstNo}</span>}
                                </div>
                            )}

                            <div className="form-group">
                                <label>Opening Balance Amount *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={balanceForm.openingBalance}
                                    onChange={(e) => setBalanceForm({ ...balanceForm, openingBalance: e.target.value })}
                                    placeholder="Enter amount"
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Balance Type *</label>
                                <div className="radio-group">
                                    <label className="radio-label">
                                        <input
                                            type="radio"
                                            value="debit"
                                            checked={balanceForm.balanceType === 'debit'}
                                            onChange={(e) => setBalanceForm({ ...balanceForm, balanceType: e.target.value })}
                                        />
                                        <span className="radio-text">📈 Debit (They owe you)</span>
                                    </label>
                                    <label className="radio-label">
                                        <input
                                            type="radio"
                                            value="credit"
                                            checked={balanceForm.balanceType === 'credit'}
                                            onChange={(e) => setBalanceForm({ ...balanceForm, balanceType: e.target.value })}
                                        />
                                        <span className="radio-text">📉 Credit (You owe them)</span>
                                    </label>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Opening Balance Date *</label>
                                <input
                                    type="date"
                                    value={balanceForm.date}
                                    onChange={(e) => setBalanceForm({ ...balanceForm, date: e.target.value })}
                                    className="form-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Narration (Optional)</label>
                                <textarea
                                    value={balanceForm.narration}
                                    onChange={(e) => setBalanceForm({ ...balanceForm, narration: e.target.value })}
                                    placeholder="Enter description or reason for opening balance"
                                    className="form-textarea"
                                    rows="3"
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={handleSaveBalance}
                                disabled={!balanceForm.openingBalance || !balanceForm.date}
                            >
                                💾 Save Balance
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="info-box">
                <h3>ℹ️ Enhanced Features:</h3>
                <div className="info-grid">
                    <div className="info-section">
                        <h4>📊 Summary Dashboard</h4>
                        <ul>
                            <li>Real-time balance summaries</li>
                            <li>Total debit and credit amounts</li>
                            <li>Net balance calculation</li>
                            <li>Entry count tracking</li>
                        </ul>
                    </div>
                    <div className="info-section">
                        <h4>🔍 Search & Filter</h4>
                        <ul>
                            <li>Search by name or GST number</li>
                            <li>Filter by balance type</li>
                            <li>Show zero/non-zero balances</li>
                            <li>Quick access to entries</li>
                        </ul>
                    </div>
                    <div className="info-section">
                        <h4>💰 Balance Management</h4>
                        <ul>
                            <li>Enhanced modal for data entry</li>
                            <li>Narration support</li>
                            <li>Date validation</li>
                            <li>Bulk CSV upload</li>
                        </ul>
                    </div>
                    <div className="info-section">
                        <h4>📈 Accounting Integration</h4>
                        <ul>
                            <li>Auto-calculated closing balances</li>
                            <li>Ledger integration</li>
                            <li>Financial year support</li>
                            <li>Audit trail maintenance</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OpeningBalancePage;
