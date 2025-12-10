import React, { useState, useEffect } from 'react';
import './EnhancedVoucherManagement.css';

const EnhancedVoucherManagement = () => {
    const [activeTab, setActiveTab] = useState('postdated');
    const [loading, setLoading] = useState(false);

    // Post-dated vouchers state
    const [postDatedVouchers, setPostDatedVouchers] = useState([]);
    const [provisionalVouchers, setProvisionalVouchers] = useState([]);

    // Modals
    const [showPostDateModal, setShowPostDateModal] = useState(false);
    const [showProvisionalModal, setShowProvisionalModal] = useState(false);
    const [selectedVoucher, setSelectedVoucher] = useState(null);

    // Forms
    const [postDateForm, setPostDateForm] = useState({
        effectiveDate: '',
        reason: '',
        autoPost: false
    });

    const [provisionalForm, setProvisionalForm] = useState({
        reason: ''
    });

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        if (activeTab === 'postdated') {
            loadPostDatedVouchers();
        } else if (activeTab === 'provisional') {
            loadProvisionalVouchers();
        }
    }, [activeTab]);

    const loadPostDatedVouchers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/vouchers/postdated`);
            const data = await response.json();
            setPostDatedVouchers(data.vouchers || []);
        } catch (error) {
            console.error('Error loading post-dated vouchers:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadProvisionalVouchers = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/vouchers/provisional`);
            const data = await response.json();
            setProvisionalVouchers(data.vouchers || []);
        } catch (error) {
            console.error('Error loading provisional vouchers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSchedulePostDated = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/vouchers/${selectedVoucher._id}/schedule-postdated`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(postDateForm)
            });

            if (response.ok) {
                setShowPostDateModal(false);
                setSelectedVoucher(null);
                resetPostDateForm();
                loadPostDatedVouchers();
                alert('Voucher scheduled as post-dated successfully!');
            }
        } catch (error) {
            console.error('Error scheduling post-dated voucher:', error);
            alert('Error scheduling voucher');
        } finally {
            setLoading(false);
        }
    };

    const handleMarkProvisional = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${backendUrl}/api/vouchers/${selectedVoucher._id}/mark-provisional`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(provisionalForm)
            });

            if (response.ok) {
                setShowProvisionalModal(false);
                setSelectedVoucher(null);
                resetProvisionalForm();
                loadProvisionalVouchers();
                alert('Voucher marked as provisional successfully!');
            }
        } catch (error) {
            console.error('Error marking voucher as provisional:', error);
            alert('Error marking voucher as provisional');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmProvisional = async (voucherId) => {
        if (window.confirm('Are you sure you want to confirm this provisional voucher? This will post it to the ledger.')) {
            try {
                setLoading(true);
                const response = await fetch(`${backendUrl}/api/vouchers/${voucherId}/confirm-provisional`, {
                    method: 'POST'
                });

                if (response.ok) {
                    loadProvisionalVouchers();
                    alert('Provisional voucher confirmed and posted successfully!');
                }
            } catch (error) {
                console.error('Error confirming provisional voucher:', error);
                alert('Error confirming provisional voucher');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleProcessPostDated = async () => {
        if (window.confirm('Process all due post-dated vouchers? This will automatically post vouchers with effective date today or earlier.')) {
            try {
                setLoading(true);
                const response = await fetch(`${backendUrl}/api/vouchers/process-postdated`, {
                    method: 'POST'
                });

                if (response.ok) {
                    const data = await response.json();
                    loadPostDatedVouchers();
                    alert(`Processed ${data.processedCount} vouchers successfully. ${data.errorCount} errors.`);
                }
            } catch (error) {
                console.error('Error processing post-dated vouchers:', error);
                alert('Error processing post-dated vouchers');
            } finally {
                setLoading(false);
            }
        }
    };

    const resetPostDateForm = () => {
        setPostDateForm({
            effectiveDate: '',
            reason: '',
            autoPost: false
        });
    };

    const resetProvisionalForm = () => {
        setProvisionalForm({
            reason: ''
        });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount || 0);
    };

    const renderPostDatedTab = () => (
        <div className="postdated-section">
            <div className="section-header">
                <h3>📅 Post-dated Vouchers</h3>
                <button
                    className="btn btn-primary"
                    onClick={handleProcessPostDated}
                    disabled={loading}
                >
                    🔄 Process Due Vouchers
                </button>
            </div>

            <div className="vouchers-table">
                <table>
                    <thead>
                        <tr>
                            <th>Voucher No.</th>
                            <th>Type</th>
                            <th>Date Created</th>
                            <th>Effective Date</th>
                            <th>Amount</th>
                            <th>Reason</th>
                            <th>Auto Post</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {postDatedVouchers.map(voucher => (
                            <tr key={voucher._id}>
                                <td>{voucher.voucherNumber}</td>
                                <td>
                                    <span className={`voucher-type ${voucher.voucherType}`}>
                                        {voucher.voucherType}
                                    </span>
                                </td>
                                <td>{formatDate(voucher.voucherDate)}</td>
                                <td className={new Date(voucher.effectiveDate) <= new Date() ? 'due-date' : ''}>
                                    {formatDate(voucher.effectiveDate)}
                                </td>
                                <td>{formatCurrency(voucher.totalDebit)}</td>
                                <td>{voucher.postDateReason}</td>
                                <td>
                                    <span className={`auto-post ${voucher.autoPostEnabled ? 'enabled' : 'disabled'}`}>
                                        {voucher.autoPostEnabled ? 'Yes' : 'No'}
                                    </span>
                                </td>
                                <td>
                                    <span className="status-badge draft">
                                        {voucher.status}
                                    </span>
                                </td>
                                <td>
                                    <button className="btn btn-sm btn-secondary">View</button>
                                    <button className="btn btn-sm btn-primary">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {postDatedVouchers.length === 0 && !loading && (
                <div className="no-data">
                    <p>No post-dated vouchers found.</p>
                </div>
            )}
        </div>
    );

    const renderProvisionalTab = () => (
        <div className="provisional-section">
            <div className="section-header">
                <h3>📋 Provisional Vouchers</h3>
            </div>

            <div className="vouchers-table">
                <table>
                    <thead>
                        <tr>
                            <th>Voucher No.</th>
                            <th>Type</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Reason</th>
                            <th>Provisional Since</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {provisionalVouchers.map(voucher => (
                            <tr key={voucher._id}>
                                <td>{voucher.voucherNumber}</td>
                                <td>
                                    <span className={`voucher-type ${voucher.voucherType}`}>
                                        {voucher.voucherType}
                                    </span>
                                </td>
                                <td>{formatDate(voucher.voucherDate)}</td>
                                <td>{formatCurrency(voucher.totalDebit)}</td>
                                <td>{voucher.provisionalReason}</td>
                                <td>{formatDate(voucher.provisionalDate)}</td>
                                <td>
                                    <span className="status-badge provisional">
                                        {voucher.status}
                                    </span>
                                </td>
                                <td>
                                    <button
                                        className="btn btn-sm btn-success"
                                        onClick={() => handleConfirmProvisional(voucher._id)}
                                    >
                                        ✓ Confirm
                                    </button>
                                    <button className="btn btn-sm btn-secondary">View</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {provisionalVouchers.length === 0 && !loading && (
                <div className="no-data">
                    <p>No provisional vouchers found.</p>
                </div>
            )}
        </div>
    );

    return (
        <div className="enhanced-voucher-management">
            <div className="page-header">
                <h2>⚡ Enhanced Voucher Management</h2>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'postdated' ? 'active' : ''}`}
                    onClick={() => setActiveTab('postdated')}
                >
                    📅 Post-dated Vouchers
                </button>
                <button
                    className={`tab ${activeTab === 'provisional' ? 'active' : ''}`}
                    onClick={() => setActiveTab('provisional')}
                >
                    📋 Provisional Vouchers
                </button>
            </div>

            <div className="tab-content">
                {loading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    <>
                        {activeTab === 'postdated' && renderPostDatedTab()}
                        {activeTab === 'provisional' && renderProvisionalTab()}
                    </>
                )}
            </div>

            {/* Post-date Modal */}
            {showPostDateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Schedule Post-dated Voucher</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowPostDateModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Effective Date *</label>
                                <input
                                    type="date"
                                    value={postDateForm.effectiveDate}
                                    onChange={(e) => setPostDateForm({
                                        ...postDateForm,
                                        effectiveDate: e.target.value
                                    })}
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div className="form-group">
                                <label>Reason for Post-dating *</label>
                                <textarea
                                    value={postDateForm.reason}
                                    onChange={(e) => setPostDateForm({
                                        ...postDateForm,
                                        reason: e.target.value
                                    })}
                                    placeholder="Enter reason for post-dating this voucher"
                                    rows="3"
                                />
                            </div>
                            <div className="form-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={postDateForm.autoPost}
                                        onChange={(e) => setPostDateForm({
                                            ...postDateForm,
                                            autoPost: e.target.checked
                                        })}
                                    />
                                    Auto-post on effective date
                                </label>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowPostDateModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSchedulePostDated}
                                disabled={!postDateForm.effectiveDate || !postDateForm.reason}
                            >
                                Schedule Voucher
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Provisional Modal */}
            {showProvisionalModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Mark as Provisional</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowProvisionalModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Reason for Provisional Status *</label>
                                <textarea
                                    value={provisionalForm.reason}
                                    onChange={(e) => setProvisionalForm({
                                        ...provisionalForm,
                                        reason: e.target.value
                                    })}
                                    placeholder="Enter reason for keeping this voucher as provisional"
                                    rows="3"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowProvisionalModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleMarkProvisional}
                                disabled={!provisionalForm.reason}
                            >
                                Mark as Provisional
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EnhancedVoucherManagement;