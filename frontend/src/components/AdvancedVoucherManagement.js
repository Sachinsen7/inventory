import React, { useState, useEffect } from 'react';
import './AdvancedVoucherManagement.css';

const AdvancedVoucherManagement = () => {
    const [activeTab, setActiveTab] = useState('templates');
    const [templates, setTemplates] = useState([]);
    const [recurringVouchers, setRecurringVouchers] = useState([]);
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loading, setLoading] = useState(false);

    // Template Management State
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateForm, setTemplateForm] = useState({
        name: '',
        description: '',
        voucherType: 'Payment',
        templateData: {
            accounts: [],
            defaultNarration: ''
        }
    });

    // Recurring Voucher State
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [recurringForm, setRecurringForm] = useState({
        templateId: '',
        frequency: 'monthly',
        startDate: '',
        endDate: '',
        dayOfMonth: 1,
        isActive: true
    });

    useEffect(() => {
        loadData();
    }, [activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'templates') {
                await loadTemplates();
            } else if (activeTab === 'recurring') {
                await loadRecurringVouchers();
            } else if (activeTab === 'approvals') {
                await loadPendingApprovals();
            }
        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTemplates = async () => {
        const response = await fetch('/api/advanced-vouchers/templates');
        const data = await response.json();
        setTemplates(data);
    };

    const loadRecurringVouchers = async () => {
        const response = await fetch('/api/advanced-vouchers/recurring');
        const data = await response.json();
        setRecurringVouchers(data);
    };

    const loadPendingApprovals = async () => {
        const response = await fetch('/api/advanced-vouchers/approvals/pending');
        const data = await response.json();
        setPendingApprovals(data);
    };

    const handleSaveTemplate = async () => {
        try {
            const url = editingTemplate
                ? `/api/advanced-vouchers/templates/${editingTemplate._id}`
                : '/api/advanced-vouchers/templates';

            const method = editingTemplate ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(templateForm)
            });

            if (response.ok) {
                setShowTemplateModal(false);
                setEditingTemplate(null);
                resetTemplateForm();
                loadTemplates();
            }
        } catch (error) {
            console.error('Error saving template:', error);
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (window.confirm('Are you sure you want to delete this template?')) {
            try {
                await fetch(`/api/advanced-vouchers/templates/${id}`, {
                    method: 'DELETE'
                });
                loadTemplates();
            } catch (error) {
                console.error('Error deleting template:', error);
            }
        }
    };

    const resetTemplateForm = () => {
        setTemplateForm({
            name: '',
            description: '',
            voucherType: 'Payment',
            templateData: {
                accounts: [],
                defaultNarration: ''
            }
        });
    };

    const handleSaveRecurring = async () => {
        try {
            const response = await fetch('/api/advanced-vouchers/recurring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(recurringForm)
            });

            if (response.ok) {
                setShowRecurringModal(false);
                resetRecurringForm();
                loadRecurringVouchers();
            }
        } catch (error) {
            console.error('Error saving recurring voucher:', error);
        }
    };

    const resetRecurringForm = () => {
        setRecurringForm({
            templateId: '',
            frequency: 'monthly',
            startDate: '',
            endDate: '',
            dayOfMonth: 1,
            isActive: true
        });
    };

    const handleApproveVoucher = async (voucherId, action) => {
        try {
            await fetch(`/api/advanced-vouchers/approvals/${voucherId}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comments: '' })
            });
            loadPendingApprovals();
        } catch (error) {
            console.error('Error processing approval:', error);
        }
    };

    const renderTemplatesTab = () => (
        <div className="templates-section">
            <div className="section-header">
                <h3>Voucher Templates</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        resetTemplateForm();
                        setEditingTemplate(null);
                        setShowTemplateModal(true);
                    }}
                >
                    Create Template
                </button>
            </div>

            <div className="templates-grid">
                {templates.map(template => (
                    <div key={template._id} className="template-card">
                        <div className="template-header">
                            <h4>{template.name}</h4>
                            <span className="template-type">{template.voucherType}</span>
                        </div>
                        <p className="template-description">{template.description}</p>
                        <div className="template-actions">
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                    setTemplateForm(template);
                                    setEditingTemplate(template);
                                    setShowTemplateModal(true);
                                }}
                            >
                                Edit
                            </button>
                            <button
                                className="btn btn-sm btn-danger"
                                onClick={() => handleDeleteTemplate(template._id)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderRecurringTab = () => (
        <div className="recurring-section">
            <div className="section-header">
                <h3>Recurring Vouchers</h3>
                <button
                    className="btn btn-primary"
                    onClick={() => {
                        resetRecurringForm();
                        setShowRecurringModal(true);
                    }}
                >
                    Create Recurring Voucher
                </button>
            </div>

            <div className="recurring-table">
                <table>
                    <thead>
                        <tr>
                            <th>Template</th>
                            <th>Frequency</th>
                            <th>Start Date</th>
                            <th>End Date</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recurringVouchers.map(recurring => (
                            <tr key={recurring._id}>
                                <td>{recurring.templateId?.name || 'N/A'}</td>
                                <td>{recurring.frequency}</td>
                                <td>{new Date(recurring.startDate).toLocaleDateString()}</td>
                                <td>{recurring.endDate ? new Date(recurring.endDate).toLocaleDateString() : 'Ongoing'}</td>
                                <td>
                                    <span className={`status-badge ${recurring.isActive ? 'active' : 'inactive'}`}>
                                        {recurring.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <button className="btn btn-sm btn-secondary">Edit</button>
                                    <button className="btn btn-sm btn-danger">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderApprovalsTab = () => (
        <div className="approvals-section">
            <div className="section-header">
                <h3>Pending Approvals</h3>
            </div>

            {pendingApprovals.map(approval => (
                <div key={approval._id} className="approval-card">
                    <div className="approval-header">
                        <h4>Voucher #{approval.voucherId?.voucherNumber}</h4>
                        <span className="template-type">{approval.voucherId?.type}</span>
                    </div>

                    <div className="approval-info">
                        <div className="approval-info-item">
                            <label>Amount</label>
                            <span>₹{approval.voucherId?.totalAmount?.toLocaleString()}</span>
                        </div>
                        <div className="approval-info-item">
                            <label>Created By</label>
                            <span>{approval.voucherId?.createdBy?.name}</span>
                        </div>
                        <div className="approval-info-item">
                            <label>Date</label>
                            <span>{new Date(approval.voucherId?.date).toLocaleDateString()}</span>
                        </div>
                        <div className="approval-info-item">
                            <label>Status</label>
                            <span>{approval.status}</span>
                        </div>
                    </div>

                    <div className="approval-actions">
                        <button
                            className="btn btn-success"
                            onClick={() => handleApproveVoucher(approval._id, 'approve')}
                        >
                            Approve
                        </button>
                        <button
                            className="btn btn-danger"
                            onClick={() => handleApproveVoucher(approval._id, 'reject')}
                        >
                            Reject
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderBulkTab = () => (
        <div className="bulk-section">
            <div className="section-header">
                <h3>Bulk Operations</h3>
            </div>

            <div className="bulk-operations">
                <div className="bulk-operation-card">
                    <h4>Bulk Import</h4>
                    <p>Import multiple vouchers from Excel/CSV file</p>
                    <button className="btn btn-primary">Import Vouchers</button>
                </div>

                <div className="bulk-operation-card">
                    <h4>Bulk Export</h4>
                    <p>Export vouchers to Excel/PDF format</p>
                    <button className="btn btn-primary">Export Vouchers</button>
                </div>

                <div className="bulk-operation-card">
                    <h4>Bulk Approval</h4>
                    <p>Approve multiple vouchers at once</p>
                    <button className="btn btn-primary">Bulk Approve</button>
                </div>

                <div className="bulk-operation-card">
                    <h4>Bulk Delete</h4>
                    <p>Delete multiple vouchers by criteria</p>
                    <button className="btn btn-danger">Bulk Delete</button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="advanced-voucher-management">
            <div className="page-header">
                <h2>Advanced Voucher Management</h2>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'templates' ? 'active' : ''}`}
                    onClick={() => setActiveTab('templates')}
                >
                    Templates
                </button>
                <button
                    className={`tab ${activeTab === 'recurring' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recurring')}
                >
                    Recurring Vouchers
                </button>
                <button
                    className={`tab ${activeTab === 'approvals' ? 'active' : ''}`}
                    onClick={() => setActiveTab('approvals')}
                >
                    Approvals
                </button>
                <button
                    className={`tab ${activeTab === 'bulk' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bulk')}
                >
                    Bulk Operations
                </button>
            </div>

            <div className="tab-content">
                {loading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    <>
                        {activeTab === 'templates' && renderTemplatesTab()}
                        {activeTab === 'recurring' && renderRecurringTab()}
                        {activeTab === 'approvals' && renderApprovalsTab()}
                        {activeTab === 'bulk' && renderBulkTab()}
                    </>
                )}
            </div>

            {/* Template Modal */}
            {showTemplateModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>{editingTemplate ? 'Edit Template' : 'Create Template'}</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowTemplateModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Template Name</label>
                                <input
                                    type="text"
                                    value={templateForm.name}
                                    onChange={(e) => setTemplateForm({
                                        ...templateForm,
                                        name: e.target.value
                                    })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Description</label>
                                <textarea
                                    value={templateForm.description}
                                    onChange={(e) => setTemplateForm({
                                        ...templateForm,
                                        description: e.target.value
                                    })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Voucher Type</label>
                                <select
                                    value={templateForm.voucherType}
                                    onChange={(e) => setTemplateForm({
                                        ...templateForm,
                                        voucherType: e.target.value
                                    })}
                                >
                                    <option value="Payment">Payment</option>
                                    <option value="Receipt">Receipt</option>
                                    <option value="Journal">Journal</option>
                                    <option value="Contra">Contra</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowTemplateModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveTemplate}
                            >
                                Save Template
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recurring Voucher Modal */}
            {showRecurringModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Create Recurring Voucher</h3>
                            <button
                                className="close-btn"
                                onClick={() => setShowRecurringModal(false)}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Template</label>
                                <select
                                    value={recurringForm.templateId}
                                    onChange={(e) => setRecurringForm({
                                        ...recurringForm,
                                        templateId: e.target.value
                                    })}
                                >
                                    <option value="">Select Template</option>
                                    {templates.map(template => (
                                        <option key={template._id} value={template._id}>
                                            {template.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Frequency</label>
                                <select
                                    value={recurringForm.frequency}
                                    onChange={(e) => setRecurringForm({
                                        ...recurringForm,
                                        frequency: e.target.value
                                    })}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="quarterly">Quarterly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Start Date</label>
                                <input
                                    type="date"
                                    value={recurringForm.startDate}
                                    onChange={(e) => setRecurringForm({
                                        ...recurringForm,
                                        startDate: e.target.value
                                    })}
                                />
                            </div>
                            <div className="form-group">
                                <label>End Date (Optional)</label>
                                <input
                                    type="date"
                                    value={recurringForm.endDate}
                                    onChange={(e) => setRecurringForm({
                                        ...recurringForm,
                                        endDate: e.target.value
                                    })}
                                />
                            </div>
                            {recurringForm.frequency === 'monthly' && (
                                <div className="form-group">
                                    <label>Day of Month</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        value={recurringForm.dayOfMonth}
                                        onChange={(e) => setRecurringForm({
                                            ...recurringForm,
                                            dayOfMonth: parseInt(e.target.value)
                                        })}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowRecurringModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveRecurring}
                            >
                                Create Recurring Voucher
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedVoucherManagement;