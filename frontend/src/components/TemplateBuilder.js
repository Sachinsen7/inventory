import React, { useState, useEffect } from 'react';
import './TemplateBuilder.css';

const TemplateBuilder = ({ template, onSave, onCancel }) => {
    const [templateData, setTemplateData] = useState({
        name: '',
        description: '',
        voucherType: 'Payment',
        templateData: {
            accounts: [],
            defaultNarration: '',
            autoCalculate: true
        }
    });

    const [accounts, setAccounts] = useState([]);
    const [selectedAccount, setSelectedAccount] = useState('');

    useEffect(() => {
        if (template) {
            setTemplateData(template);
        }
        loadAccounts();
    }, [template]);

    const loadAccounts = async () => {
        try {
            const response = await fetch('/api/ledger/accounts');
            const data = await response.json();
            setAccounts(data);
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    };

    const addAccountToTemplate = () => {
        if (!selectedAccount) return;

        const account = accounts.find(acc => acc._id === selectedAccount);
        if (!account) return;

        const newAccount = {
            accountId: account._id,
            accountName: account.name,
            debitCredit: 'Debit',
            amount: 0,
            isFixed: false
        };

        setTemplateData({
            ...templateData,
            templateData: {
                ...templateData.templateData,
                accounts: [...templateData.templateData.accounts, newAccount]
            }
        });

        setSelectedAccount('');
    };

    const removeAccountFromTemplate = (index) => {
        const updatedAccounts = templateData.templateData.accounts.filter((_, i) => i !== index);
        setTemplateData({
            ...templateData,
            templateData: {
                ...templateData.templateData,
                accounts: updatedAccounts
            }
        });
    };

    const updateAccountInTemplate = (index, field, value) => {
        const updatedAccounts = [...templateData.templateData.accounts];
        updatedAccounts[index] = {
            ...updatedAccounts[index],
            [field]: value
        };

        setTemplateData({
            ...templateData,
            templateData: {
                ...templateData.templateData,
                accounts: updatedAccounts
            }
        });
    };

    const handleSave = () => {
        if (!templateData.name.trim()) {
            alert('Please enter a template name');
            return;
        }

        if (templateData.templateData.accounts.length === 0) {
            alert('Please add at least one account to the template');
            return;
        }

        onSave(templateData);
    };

    return (
        <div className="template-builder">
            <div className="template-builder-header">
                <h3>{template ? 'Edit Template' : 'Create New Template'}</h3>
            </div>

            <div className="template-builder-content">
                <div className="template-basic-info">
                    <div className="form-group">
                        <label>Template Name *</label>
                        <input
                            type="text"
                            value={templateData.name}
                            onChange={(e) => setTemplateData({
                                ...templateData,
                                name: e.target.value
                            })}
                            placeholder="Enter template name"
                        />
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            value={templateData.description}
                            onChange={(e) => setTemplateData({
                                ...templateData,
                                description: e.target.value
                            })}
                            placeholder="Enter template description"
                            rows="3"
                        />
                    </div>

                    <div className="form-group">
                        <label>Voucher Type *</label>
                        <select
                            value={templateData.voucherType}
                            onChange={(e) => setTemplateData({
                                ...templateData,
                                voucherType: e.target.value
                            })}
                        >
                            <option value="Payment">Payment</option>
                            <option value="Receipt">Receipt</option>
                            <option value="Journal">Journal</option>
                            <option value="Contra">Contra</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label>Default Narration</label>
                        <textarea
                            value={templateData.templateData.defaultNarration}
                            onChange={(e) => setTemplateData({
                                ...templateData,
                                templateData: {
                                    ...templateData.templateData,
                                    defaultNarration: e.target.value
                                }
                            })}
                            placeholder="Enter default narration for vouchers created from this template"
                            rows="2"
                        />
                    </div>
                </div>

                <div className="template-accounts-section">
                    <h4>Account Configuration</h4>

                    <div className="add-account-section">
                        <div className="form-group">
                            <label>Add Account</label>
                            <div className="add-account-controls">
                                <select
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                >
                                    <option value="">Select an account</option>
                                    {accounts.map(account => (
                                        <option key={account._id} value={account._id}>
                                            {account.name} ({account.type})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={addAccountToTemplate}
                                    disabled={!selectedAccount}
                                >
                                    Add Account
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="template-accounts-list">
                        {templateData.templateData.accounts.length === 0 ? (
                            <div className="no-accounts">
                                <p>No accounts added to template yet. Add accounts to define the voucher structure.</p>
                            </div>
                        ) : (
                            <div className="accounts-table">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Account</th>
                                            <th>Debit/Credit</th>
                                            <th>Fixed Amount</th>
                                            <th>Is Fixed</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {templateData.templateData.accounts.map((account, index) => (
                                            <tr key={index}>
                                                <td>{account.accountName}</td>
                                                <td>
                                                    <select
                                                        value={account.debitCredit}
                                                        onChange={(e) => updateAccountInTemplate(index, 'debitCredit', e.target.value)}
                                                    >
                                                        <option value="Debit">Debit</option>
                                                        <option value="Credit">Credit</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        value={account.amount}
                                                        onChange={(e) => updateAccountInTemplate(index, 'amount', parseFloat(e.target.value) || 0)}
                                                        placeholder="0.00"
                                                        step="0.01"
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="checkbox"
                                                        checked={account.isFixed}
                                                        onChange={(e) => updateAccountInTemplate(index, 'isFixed', e.target.checked)}
                                                    />
                                                </td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => removeAccountFromTemplate(index)}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="template-settings">
                    <h4>Template Settings</h4>
                    <div className="form-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={templateData.templateData.autoCalculate}
                                onChange={(e) => setTemplateData({
                                    ...templateData,
                                    templateData: {
                                        ...templateData.templateData,
                                        autoCalculate: e.target.checked
                                    }
                                })}
                            />
                            Auto-calculate balancing entries
                        </label>
                        <small>When enabled, the system will automatically calculate balancing entries for the voucher</small>
                    </div>
                </div>
            </div>

            <div className="template-builder-footer">
                <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={onCancel}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                >
                    {template ? 'Update Template' : 'Create Template'}
                </button>
            </div>
        </div>
    );
};

export default TemplateBuilder;