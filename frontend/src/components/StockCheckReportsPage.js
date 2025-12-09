import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { showToast } from '../utils/toastNotifications';
import './StockCheckReportsPage.css';

const StockCheckReportsPage = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchStatistics();
        fetchReports();
    }, [filterStatus]);

    const fetchStatistics = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/stock-check/statistics`);
            setStatistics(response.data);
        } catch (error) {
            console.error('Error fetching statistics:', error);
        }
    };

    const fetchReports = async () => {
        try {
            setLoading(true);
            const url = filterStatus === 'all'
                ? `${backendUrl}/api/stock-check/reports`
                : `${backendUrl}/api/stock-check/reports?status=${filterStatus}`;
            const response = await axios.get(url);
            setReports(response.data.reports);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching reports:', error);
            showToast.error('Failed to load reports');
            setLoading(false);
        }
    };

    const handleViewReport = async (reportId) => {
        try {
            const response = await axios.get(`${backendUrl}/api/stock-check/reports/${reportId}`);
            setSelectedReport(response.data.report);
        } catch (error) {
            console.error('Error fetching report details:', error);
            showToast.error('Failed to load report details');
        }
    };

    const handleUpdateStatus = async (reportId, newStatus) => {
        try {
            await axios.put(`${backendUrl}/api/stock-check/reports/${reportId}/status`, {
                status: newStatus
            });
            showToast.success(`Report marked as ${newStatus}`);
            fetchReports();
            fetchStatistics();
            if (selectedReport && selectedReport._id === reportId) {
                setSelectedReport({ ...selectedReport, status: newStatus });
            }
        } catch (error) {
            console.error('Error updating report status:', error);
            showToast.error('Failed to update status');
        }
    };

    const handleAddMissingItems = async (reportId, barcodes) => {
        try {
            await axios.post(`${backendUrl}/api/stock-check/reports/${reportId}/add-missing-items`, {
                barcodes
            });
            showToast.success('Missing items added back to inventory');
            fetchReports();
            handleViewReport(reportId);
        } catch (error) {
            console.error('Error adding missing items:', error);
            showToast.error('Failed to add items');
        }
    };

    const closeModal = () => {
        setSelectedReport(null);
    };

    return (
        <div className="stock-reports-container">
            <div className="stock-reports-content">
                <div className="reports-header">
                    <h1>📊 Stock Check Reports - Admin Dashboard</h1>
                    <button className="btn-primary" onClick={() => navigate('/stock-checking')}>
                        + New Stock Check
                    </button>
                </div>

                {/* Statistics Cards */}
                {statistics && (
                    <div className="stats-grid">
                        <div className="stat-card stat-total">
                            <div className="stat-icon">📋</div>
                            <div className="stat-info">
                                <div className="stat-value">{statistics.totalReports}</div>
                                <div className="stat-label">Total Reports</div>
                            </div>
                        </div>

                        <div className="stat-card stat-pending">
                            <div className="stat-icon">⏳</div>
                            <div className="stat-info">
                                <div className="stat-value">{statistics.pendingReports}</div>
                                <div className="stat-label">Pending Review</div>
                            </div>
                        </div>

                        <div className="stat-card stat-resolved">
                            <div className="stat-icon">✅</div>
                            <div className="stat-info">
                                <div className="stat-value">{statistics.resolvedReports}</div>
                                <div className="stat-label">Resolved</div>
                            </div>
                        </div>

                        <div className="stat-card stat-missing">
                            <div className="stat-icon">⚠️</div>
                            <div className="stat-info">
                                <div className="stat-value">{statistics.totalMissingItems}</div>
                                <div className="stat-label">Missing Items</div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filter Tabs */}
                <div className="filter-tabs">
                    <button
                        className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('all')}
                    >
                        All Reports
                    </button>
                    <button
                        className={`filter-tab ${filterStatus === 'pending' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('pending')}
                    >
                        Pending
                    </button>
                    <button
                        className={`filter-tab ${filterStatus === 'reviewed' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('reviewed')}
                    >
                        Reviewed
                    </button>
                    <button
                        className={`filter-tab ${filterStatus === 'resolved' ? 'active' : ''}`}
                        onClick={() => setFilterStatus('resolved')}
                    >
                        Resolved
                    </button>
                </div>

                {/* Reports Table */}
                {loading ? (
                    <div className="loading">Loading reports...</div>
                ) : reports.length === 0 ? (
                    <div className="no-reports">
                        <p>No reports found</p>
                    </div>
                ) : (
                    <div className="reports-table-container">
                        <table className="reports-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Godown</th>
                                    <th>Product Type</th>
                                    <th>Expected</th>
                                    <th>Scanned</th>
                                    <th>Missing</th>
                                    <th>Wrong Scans</th>
                                    <th>Accuracy</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reports.map(report => {
                                    const accuracy = report.expectedCount > 0
                                        ? Math.round((report.scannedCount / report.expectedCount) * 100)
                                        : 0;

                                    return (
                                        <tr key={report._id}>
                                            <td>{new Date(report.submittedAt).toLocaleDateString()}</td>
                                            <td>{report.godownName}</td>
                                            <td>{report.productType}</td>
                                            <td>{report.expectedCount}</td>
                                            <td className="text-success">{report.scannedCount}</td>
                                            <td className="text-danger">{report.missingCount}</td>
                                            <td className="text-warning">{report.wrongScansCount}</td>
                                            <td>
                                                <span className={`accuracy-badge ${accuracy >= 90 ? 'high' : accuracy >= 70 ? 'medium' : 'low'}`}>
                                                    {accuracy}%
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`status-badge status-${report.status}`}>
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="btn-small btn-view"
                                                    onClick={() => handleViewReport(report._id)}
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Report Details Modal */}
            {selectedReport && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Stock Check Report Details</h2>
                            <button className="modal-close" onClick={closeModal}>×</button>
                        </div>

                        <div className="modal-body">
                            {/* Report Summary */}
                            <div className="report-summary">
                                <div className="summary-row">
                                    <span className="summary-label">Godown:</span>
                                    <span className="summary-value">{selectedReport.godownName}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Product Type:</span>
                                    <span className="summary-value">{selectedReport.productType} ({selectedReport.productPrefix})</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Date:</span>
                                    <span className="summary-value">{new Date(selectedReport.submittedAt).toLocaleString()}</span>
                                </div>
                                <div className="summary-row">
                                    <span className="summary-label">Status:</span>
                                    <span className={`status-badge status-${selectedReport.status}`}>
                                        {selectedReport.status}
                                    </span>
                                </div>
                            </div>

                            {/* Progress Stats */}
                            <div className="modal-stats">
                                <div className="modal-stat">
                                    <div className="modal-stat-value">{selectedReport.expectedCount}</div>
                                    <div className="modal-stat-label">Expected</div>
                                </div>
                                <div className="modal-stat">
                                    <div className="modal-stat-value text-success">{selectedReport.scannedCount}</div>
                                    <div className="modal-stat-label">Scanned</div>
                                </div>
                                <div className="modal-stat">
                                    <div className="modal-stat-value text-danger">{selectedReport.missingCount}</div>
                                    <div className="modal-stat-label">Missing</div>
                                </div>
                                <div className="modal-stat">
                                    <div className="modal-stat-value text-warning">{selectedReport.wrongScansCount}</div>
                                    <div className="modal-stat-label">Wrong Scans</div>
                                </div>
                            </div>

                            {/* Missing Items */}
                            {selectedReport.missingItems && selectedReport.missingItems.length > 0 && (
                                <div className="modal-section">
                                    <h3>⚠️ Missing Items ({selectedReport.missingItems.length})</h3>
                                    <div className="items-list-modal">
                                        {selectedReport.missingItems.map((item, index) => (
                                            <div key={index} className="item-row">
                                                <span><strong>{item.barcode}</strong> - {item.itemCode}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        className="btn-primary"
                                        onClick={() => handleAddMissingItems(
                                            selectedReport._id,
                                            selectedReport.missingItems.map(item => item.barcode)
                                        )}
                                    >
                                        ✓ Add All Missing Items Back to Inventory
                                    </button>
                                </div>
                            )}

                            {/* Wrong Scans */}
                            {selectedReport.wrongScans && selectedReport.wrongScans.length > 0 && (
                                <div className="modal-section">
                                    <h3>❌ Wrong Scans ({selectedReport.wrongScans.length})</h3>
                                    <div className="items-list-modal">
                                        {selectedReport.wrongScans.map((scan, index) => (
                                            <div key={index} className="item-row">
                                                <span>
                                                    <strong>{scan.barcode}</strong> -
                                                    Expected: {scan.expectedPrefix}, Got: {scan.actualPrefix}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Status Actions */}
                            <div className="modal-actions">
                                {selectedReport.status === 'pending' && (
                                    <button
                                        className="btn-success"
                                        onClick={() => handleUpdateStatus(selectedReport._id, 'reviewed')}
                                    >
                                        Mark as Reviewed
                                    </button>
                                )}
                                {selectedReport.status === 'reviewed' && (
                                    <button
                                        className="btn-success"
                                        onClick={() => handleUpdateStatus(selectedReport._id, 'resolved')}
                                    >
                                        Mark as Resolved
                                    </button>
                                )}
                                <button className="btn-secondary" onClick={closeModal}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockCheckReportsPage;
