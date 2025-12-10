import React, { useState, useEffect } from 'react';
import './BankReconciliation.css';

const BankReconciliation = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [reconciliations, setReconciliations] = useState([]);
    const [selectedReconciliation, setSelectedReconciliation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dashboardData, setDashboardData] = useState({});
    const [bankAccounts, setBankAccounts] = useState([]);

    // New reconciliation form
    const [showNewModal, setShowNewModal] = useState(false);
    const [newReconciliation, setNewReconciliation] = useState({
        bankAccount: '',
        accountNumber: '',
        statementPeriod: {
            fromDate: '',
            toDate: ''
        },
        openingBalance: 0,
        closingBalance: 0
    });

    // File upload
    const [uploadingStatement, setUploadingStatement] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        if (activeTab === 'dashboard') {
            loadDashboardData();
        } else if (activeTab === 'reconciliations') {
            loadReconciliations();
        }
        loadBankAccounts();
    }, [activeTab]);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/bank-reconciliation/dashboard/summary`);
            const data = await response.json();
            setDashboardData(data);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadReconciliations = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/bank-reconciliation`);
            const data = await response.json();
            setReconciliations(data.reconciliations || []);
        } catch (error) {
            console.error('Error loading reconciliations:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadBankAccounts = async () => {
        try {
            const response = await fetch(`${backendUrl}/api/bank-reconciliation/accounts/list`);
            const data = await response.json();
            setBankAccounts(data);
        } catch (error) {
            console.error('Error loading bank accounts:', error);
        }
    };

    const handleCreateReconciliation = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/bank-reconciliation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newReconciliation)
            });

            if (response.ok) {
                const data = await response.json();
                setShowNewModal(false);
                setSelectedReconciliation(data);
                setActiveTab('reconcile');
                resetNewReconciliationForm();
                loadReconciliations();
            }
        } catch (error) {
            console.error('Error creating reconciliation:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetNewReconciliationForm = () => {
        setNewReconciliation({
            bankAccount: '',
            accountNumber: '',
            statementPeriod: { fromDate: '', toDate: '' },
            openingBalance: 0,
            closingBalance: 0
        });
    };

    const handleFileUpload = async (reconciliationId, file) => {
        try {
            setUploadingStatement(true);
            const formData = new FormData();
            formData.append('csvFile', file);

            const response = await fetch(`${backendUrl}/api/bank-reconciliation/${reconciliationId}/import-statement`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedReconciliation(data.reconciliation);
                alert(`Bank statement imported successfully! ${data.entriesCount} entries processed.`);
            }
        } catch (error) {
            console.error('Error uploading statement:', error);
            alert('Error uploading bank statement');
        } finally {
            setUploadingStatement(false);
        }
    };

    const handleAutoMatch = async (reconciliationId) => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/bank-reconciliation/${reconciliationId}/auto-match`, {
                method: 'POST'
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedReconciliation(data.reconciliation);
                alert(`Auto-matched ${data.matchCount} entries successfully!`);
            }
        } catch (error) {
            console.error('Error auto-matching:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleManualMatch = async (reconciliationId, bankEntryId, bookEntryId) => {
        try {
            const response = await fetch(`${backendUrl}/api/bank-reconciliation/${reconciliationId}/manual-match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bankEntryId, bookEntryId })
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedReconciliation(data.reconciliation);
            }
        } catch (error) {
            console.error('Error manual matching:', error);
        }
    };

    const renderDashboard = () => (
        <div className="reconciliation-dashboard">
            <div className="dashboard-header">
                <h3>Bank Reconciliation Dashboard</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowNewModal(true)}
                >
                    + New Reconciliation
                </button>
            </div>

            <div className="summary-cards">
                <div className="summary-card">
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                        <h4>{dashboardData.summary?.total || 0}</h4>
                        <p>Total Reconciliations</p>
                    </div>
                </div>
                <div className="summary-card pending">
                    <div className="card-icon">⏳</div>
                    <div className="card-content">
                        <h4>{dashboardData.summary?.pending || 0}</h4>
                        <p>Pending</p>
                    </div>
                </div>
                <div className="summary-card completed">
                    <div className="card-icon">✅</div>
                    <div className="card-content">
                        <h4>{dashboardData.summary?.completed || 0}</h4>
                        <p>Completed</p>
                    </div>
                </div>
                <div className="summary-card approved">
                    <div className="card-icon">🎯</div>
                    <div className="card-content">
                        <h4>{dashboardData.summary?.approved || 0}</h4>
                        <p>Approved</p>
                    </div>
                </div>
            </div>

            <div className="dashboard-sections">
                <div className="recent-reconciliations">
                    <h4>Recent Reconciliations</h4>
                    <div className="reconciliation-list">
                        {dashboardData.recentReconciliations?.map(reconciliation => (
                            <div key={reconciliation._id} className="reconciliation-item">
                                <div className="reconciliation-info">
                                    <h5>{reconciliation.bankAccount}</h5>
                                    <p>{new Date(reconciliation.statementPeriod.fromDate).toLocaleDateString()} - {new Date(reconciliation.statementPeriod.toDate).toLocaleDateString()}</p>
                                </div>
                                <div className="reconciliation-status">
                                    <span className={`status-badge ${reconciliation.status.toLowerCase()}`}>
                                        {reconciliation.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bank-account-summary">
                    <h4>Bank Account Summary</h4>
                    <div className="account-list">
                        {dashboardData.bankAccountSummary?.map(account => (
                            <div key={account._id} className="account-item">
                                <div className="account-info">
                                    <h5>{account._id}</h5>
                                    <p>{account.count} reconciliations</p>
                                </div>
                                <div className="account-stats">
                                    <span className="difference">
                                        ₹{account.totalDifference?.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderReconciliationsList = () => (
        <div className="reconciliations-list">
            <div className="list-header">
                <h3>Bank Reconciliations</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowNewModal(true)}
                >
                    + New Reconciliation
                </button>
            </div>

            <div className="reconciliations-table">
                <table>
                    <thead>
                        <tr>
                            <th>Bank Account</th>
                            <th>Period</th>
                            <th>Status</th>
                            <th>Matched Entries</th>
                            <th>Difference</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reconciliations.map(reconciliation => (
                            <tr key={reconciliation._id}>
                                <td>{reconciliation.bankAccount}</td>
                                <td>
                                    {new Date(reconciliation.statementPeriod.fromDate).toLocaleDateString()} -
                                    {new Date(reconciliation.statementPeriod.toDate).toLocaleDateString()}
                                </td>
                                <td>
                                    <span className={`status-badge ${reconciliation.status.toLowerCase()}`}>
                                        {reconciliation.status}
                                    </span>
                                </td>
                                <td>{reconciliation.summary?.matchedEntries || 0}</td>
                                <td>₹{reconciliation.summary?.reconciliationDifference?.toLocaleString() || 0}</td>
                                <td>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={() => {
                                            setSelectedReconciliation(reconciliation);
                                            setActiveTab('reconcile');
                                        }}
                                    >
                                        Open
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="bank-reconciliation">
            <div className="page-header">
                <h2>🏦 Bank Reconciliation</h2>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                >
                    📊 Dashboard
                </button>
                <button
                    className={`tab ${activeTab === 'reconciliations' ? 'active' : ''}`}
                    onClick={() => setActiveTab('reconciliations')}
                >
                    📋 Reconciliations
                </button>
                {selectedReconciliation && (
                    <button
                        className={`tab ${activeTab === 'reconcile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reconcile')}
                    >
                        🔄 Reconcile
                    </button>
                )}
            </div>

            <div className="tab-content">
                {loading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    <>
                        {activeTab === 'dashboard' && renderDashboard()}
                        {activeTab === 'reconciliations' && renderReconciliationsList()}
                        {activeTab === 'reconcile' && selectedReconciliation && (
                            <div className="reconciliation-workspace">
                                <h3>Reconciling: {selectedReconciliation.bankAccount}</h3>
                                {/* Reconciliation interface will be implemented here */}
                                <p>Reconciliation interface coming soon...</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* New Reconciliation Modal */}
            {showNewModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create New Bank Reconciliation</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowNewModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Bank Account</label>
                                <select
                                    value={newReconciliation.bankAccount}
                                    onChange={(e) => setNewReconciliation({
                                        ...newReconciliation,
                                        bankAccount: e.target.value
                                    })}
                                >
                                    <option value="">Select Bank Account</option>
                                    {bankAccounts.map(account => (
                                        <option key={account} value={account}>
                                            {account}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Account Number</label>
                                <input
                                    type="text"
                                    value={newReconciliation.accountNumber}
                                    onChange={(e) => setNewReconciliation({
                                        ...newReconciliation,
                                        accountNumber: e.target.value
                                    })}
                                />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>From Date</label>
                                    <input
                                        type="date"
                                        value={newReconciliation.statementPeriod.fromDate}
                                        onChange={(e) => setNewReconciliation({
                                            ...newReconciliation,
                                            statementPeriod: {
                                                ...newReconciliation.statementPeriod,
                                                fromDate: e.target.value
                                            }
                                        })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>To Date</label>
                                    <input
                                        type="date"
                                        value={newReconciliation.statementPeriod.toDate}
                                        onChange={(e) => setNewReconciliation({
                                            ...newReconciliation,
                                            statementPeriod: {
                                                ...newReconciliation.statementPeriod,
                                                toDate: e.target.value
                                            }
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Opening Balance</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newReconciliation.openingBalance}
                                        onChange={(e) => setNewReconciliation({
                                            ...newReconciliation,
                                            openingBalance: parseFloat(e.target.value) || 0
                                        })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Closing Balance</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newReconciliation.closingBalance}
                                        onChange={(e) => setNewReconciliation({
                                            ...newReconciliation,
                                            closingBalance: parseFloat(e.target.value) || 0
                                        })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowNewModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleCreateReconciliation}
                                disabled={loading}
                            >
                                Create Reconciliation
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankReconciliation;