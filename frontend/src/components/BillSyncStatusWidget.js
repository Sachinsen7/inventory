import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './BillSyncStatusWidget.css';

const BillSyncStatusWidget = () => {
    const [syncData, setSyncData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDetails, setShowDetails] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [selectedBills, setSelectedBills] = useState([]);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const fetchSyncData = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${backendUrl}/api/analytics/unsynced-bills`);
            setSyncData(response.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching sync data:', err);
            setError('Failed to load sync status');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSyncData();
        // Auto-refresh every 2 minutes
        const interval = setInterval(fetchSyncData, 2 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleSyncBill = async (billId) => {
        try {
            setSyncing(true);
            await axios.post(`${backendUrl}/api/analytics/sync-bill/${billId}`, {
                system: 'manual'
            });
            await fetchSyncData();
            setSelectedBills(selectedBills.filter(id => id !== billId));
        } catch (err) {
            console.error('Error syncing bill:', err);
            alert('Failed to sync bill: ' + (err.response?.data?.error || err.message));
        } finally {
            setSyncing(false);
        }
    };

    const handleBulkSync = async () => {
        if (selectedBills.length === 0) {
            alert('Please select bills to sync');
            return;
        }

        if (!window.confirm(`Sync ${selectedBills.length} selected bills?`)) {
            return;
        }

        try {
            setSyncing(true);
            const response = await axios.post(`${backendUrl}/api/analytics/sync-bills-bulk`, {
                billIds: selectedBills,
                system: 'bulk'
            });

            alert(`Sync completed!\nSuccess: ${response.data.results.success.length}\nFailed: ${response.data.results.failed.length}`);

            await fetchSyncData();
            setSelectedBills([]);
        } catch (err) {
            console.error('Error in bulk sync:', err);
            alert('Bulk sync failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setSyncing(false);
        }
    };

    const toggleBillSelection = (billId) => {
        if (selectedBills.includes(billId)) {
            setSelectedBills(selectedBills.filter(id => id !== billId));
        } else {
            setSelectedBills([...selectedBills, billId]);
        }
    };

    const selectAllUnsynced = () => {
        if (syncData?.bills) {
            const allBillIds = syncData.bills.map(b => b._id);
            setSelectedBills(allBillIds);
        }
    };

    const deselectAll = () => {
        setSelectedBills([]);
    };

    if (loading) {
        return (
            <div className="bill-sync-widget loading">
                <div className="spinner"></div>
                <p>Loading sync status...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bill-sync-widget error">
                <span className="error-icon">⚠️</span>
                <p>{error}</p>
                <button onClick={fetchSyncData} className="retry-btn">Retry</button>
            </div>
        );
    }

    const { summary, bills, topErrors } = syncData || {};

    const getSyncStatusColor = (status) => {
        switch (status) {
            case 'synced': return '#10b981';
            case 'pending': return '#f59e0b';
            case 'failed': return '#ef4444';
            case 'partial': return '#eab308';
            default: return '#6b7280';
        }
    };

    const getSyncStatusIcon = (status) => {
        switch (status) {
            case 'synced': return '✅';
            case 'pending': return '⏳';
            case 'failed': return '❌';
            case 'partial': return '⚠️';
            default: return '❓';
        }
    };

    return (
        <div className="bill-sync-widget">
            {/* Header */}
            <div className="widget-header">
                <div className="header-left">
                    <span className="icon">🔄</span>
                    <h3>Bill Sync Status</h3>
                </div>
                <div className="header-actions">
                    {selectedBills.length > 0 && (
                        <button
                            className="bulk-sync-btn"
                            onClick={handleBulkSync}
                            disabled={syncing}
                        >
                            {syncing ? '⏳ Syncing...' : `🔄 Sync ${selectedBills.length} Bills`}
                        </button>
                    )}
                    <button
                        className="refresh-btn"
                        onClick={fetchSyncData}
                        title="Refresh"
                        disabled={syncing}
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="summary-cards">
                <div className="summary-card pending">
                    <div className="card-icon">⏳</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.pendingBills || 0}</div>
                        <div className="card-label">Pending Sync</div>
                        <div className="card-amount">₹{(summary?.pendingAmount || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div className="summary-card failed">
                    <div className="card-icon">❌</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.failedBills || 0}</div>
                        <div className="card-label">Failed Sync</div>
                        <div className="card-amount">₹{(summary?.failedAmount || 0).toLocaleString()}</div>
                    </div>
                </div>

                <div className="summary-card total">
                    <div className="card-icon">📊</div>
                    <div className="card-content">
                        <div className="card-value">{summary?.totalUnsynced || 0}</div>
                        <div className="card-label">Total Unsynced</div>
                        <div className="card-amount">₹{(summary?.totalUnsyncedAmount || 0).toLocaleString()}</div>
                    </div>
                </div>

                {summary?.oldestUnsyncedDays > 0 && (
                    <div className="summary-card warning">
                        <div className="card-icon">⚠️</div>
                        <div className="card-content">
                            <div className="card-value">{summary.oldestUnsyncedDays}</div>
                            <div className="card-label">Days Since Oldest</div>
                            <div className="card-sublabel">Unsynced Bill</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Toggle Details Button */}
            {bills && bills.length > 0 && (
                <div className="details-controls">
                    <button
                        className="toggle-details-btn"
                        onClick={() => setShowDetails(!showDetails)}
                    >
                        {showDetails ? '▼ Hide Details' : '▶ Show Details'}
                    </button>
                    {showDetails && (
                        <div className="selection-controls">
                            <button onClick={selectAllUnsynced} className="select-btn">
                                ✓ Select All
                            </button>
                            <button onClick={deselectAll} className="select-btn">
                                ✗ Deselect All
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Detailed View */}
            {showDetails && (
                <>
                    {/* Top Errors */}
                    {topErrors && topErrors.length > 0 && (
                        <div className="sync-section">
                            <h4>🔴 Common Sync Errors</h4>
                            <div className="error-list">
                                {topErrors.map((errorGroup, index) => (
                                    <div key={index} className="error-item">
                                        <div className="error-badge">{errorGroup.count}</div>
                                        <div className="error-info">
                                            <div className="error-message">{errorGroup.error}</div>
                                            <div className="error-bills">
                                                Affects {errorGroup.count} bill{errorGroup.count > 1 ? 's' : ''}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Unsynced Bills List */}
                    {bills && bills.length > 0 && (
                        <div className="sync-section">
                            <h4>📋 Unsynced Bills ({bills.length})</h4>
                            <div className="bills-list">
                                {bills.slice(0, 20).map((bill) => (
                                    <div key={bill._id} className="bill-item">
                                        <input
                                            type="checkbox"
                                            checked={selectedBills.includes(bill._id)}
                                            onChange={() => toggleBillSelection(bill._id)}
                                            className="bill-checkbox"
                                        />
                                        <div
                                            className="sync-status-indicator"
                                            style={{ backgroundColor: getSyncStatusColor(bill.syncStatus) }}
                                            title={bill.syncStatus}
                                        >
                                            {getSyncStatusIcon(bill.syncStatus)}
                                        </div>
                                        <div className="bill-info">
                                            <div className="bill-number">{bill.invoiceNumber}</div>
                                            <div className="bill-customer">{bill.customerName}</div>
                                            <div className="bill-meta">
                                                <span>Created: {new Date(bill.createdAt).toLocaleDateString()}</span>
                                                {bill.syncAttempts > 0 && (
                                                    <span className="attempts"> • {bill.syncAttempts} attempt{bill.syncAttempts > 1 ? 's' : ''}</span>
                                                )}
                                                {bill.daysSinceCreation > 0 && (
                                                    <span className="days-old"> • {bill.daysSinceCreation} days old</span>
                                                )}
                                            </div>
                                            {bill.syncError && (
                                                <div className="bill-error">⚠️ {bill.syncError}</div>
                                            )}
                                        </div>
                                        <div className="bill-actions">
                                            <div className="bill-amount">₹{bill.totalAmount.toLocaleString()}</div>
                                            <button
                                                className="sync-btn"
                                                onClick={() => handleSyncBill(bill._id)}
                                                disabled={syncing}
                                            >
                                                {syncing ? '⏳' : '🔄 Sync'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {bills.length > 20 && (
                                <div className="more-bills-notice">
                                    Showing 20 of {bills.length} unsynced bills
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* No Unsynced Message */}
            {(!bills || bills.length === 0) && (
                <div className="no-unsynced">
                    <span className="success-icon">✅</span>
                    <p>All bills are synced! No pending sync operations.</p>
                </div>
            )}

            {/* Last Updated */}
            <div className="widget-footer">
                <small>
                    Last updated: {syncData?.lastUpdated ? new Date(syncData.lastUpdated).toLocaleTimeString() : 'N/A'}
                </small>
            </div>
        </div>
    );
};

export default BillSyncStatusWidget;
