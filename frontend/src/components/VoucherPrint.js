import React, { useState, useEffect } from 'react';
import './VoucherPrint.css';

const VoucherPrint = ({ voucher, onClose }) => {
    const [companySettings, setCompanySettings] = useState({});
    const [printSettings, setPrintSettings] = useState({
        includeHeader: true,
        includeFooter: true,
        showSignatures: true,
        copies: 1,
        paperSize: 'A4'
    });

    useEffect(() => {
        loadCompanySettings();
    }, []);

    const loadCompanySettings = async () => {
        try {
            const response = await fetch('/api/settings');
            const data = await response.json();
            setCompanySettings(data);
        } catch (error) {
            console.error('Error loading company settings:', error);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getTotalDebit = () => {
        return voucher.entries?.reduce((sum, entry) =>
            entry.debitAmount ? sum + entry.debitAmount : sum, 0) || 0;
    };

    const getTotalCredit = () => {
        return voucher.entries?.reduce((sum, entry) =>
            entry.creditAmount ? sum + entry.creditAmount : sum, 0) || 0;
    };

    return (
        <div className="voucher-print-container">
            <div className="print-controls no-print">
                <div className="print-settings">
                    <div className="setting-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={printSettings.includeHeader}
                                onChange={(e) => setPrintSettings({
                                    ...printSettings,
                                    includeHeader: e.target.checked
                                })}
                            />
                            Include Header
                        </label>
                    </div>
                    <div className="setting-group">
                        <label>
                            <input
                                type="checkbox"
                                checked={printSettings.showSignatures}
                                onChange={(e) => setPrintSettings({
                                    ...printSettings,
                                    showSignatures: e.target.checked
                                })}
                            />
                            Show Signatures
                        </label>
                    </div>
                    <div className="setting-group">
                        <label>Paper Size:</label>
                        <select
                            value={printSettings.paperSize}
                            onChange={(e) => setPrintSettings({
                                ...printSettings,
                                paperSize: e.target.value
                            })}
                        >
                            <option value="A4">A4</option>
                            <option value="A5">A5</option>
                            <option value="Letter">Letter</option>
                        </select>
                    </div>
                </div>
                <div className="print-actions">
                    <button className="btn btn-primary" onClick={handlePrint}>
                        Print Voucher
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>

            <div className={`voucher-print-content ${printSettings.paperSize.toLowerCase()}`}>
                {printSettings.includeHeader && (
                    <div className="voucher-header">
                        <div className="company-info">
                            <h1>{companySettings.companyName || 'Company Name'}</h1>
                            <div className="company-details">
                                <p>{companySettings.address}</p>
                                <p>Phone: {companySettings.phone} | Email: {companySettings.email}</p>
                                {companySettings.gstin && <p>GSTIN: {companySettings.gstin}</p>}
                            </div>
                        </div>
                        <div className="voucher-title">
                            <h2>{voucher.type} VOUCHER</h2>
                        </div>
                    </div>
                )}

                <div className="voucher-info">
                    <div className="voucher-details">
                        <table className="info-table">
                            <tr>
                                <td><strong>Voucher No:</strong></td>
                                <td>{voucher.voucherNumber}</td>
                                <td><strong>Date:</strong></td>
                                <td>{formatDate(voucher.date)}</td>
                            </tr>
                            <tr>
                                <td><strong>Type:</strong></td>
                                <td>{voucher.type}</td>
                                <td><strong>Reference:</strong></td>
                                <td>{voucher.referenceNumber || 'N/A'}</td>
                            </tr>
                        </table>
                    </div>
                </div>

                <div className="voucher-entries">
                    <table className="entries-table">
                        <thead>
                            <tr>
                                <th>Particulars</th>
                                <th>Debit Amount</th>
                                <th>Credit Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {voucher.entries?.map((entry, index) => (
                                <tr key={index}>
                                    <td>
                                        <div className="account-name">{entry.accountName}</div>
                                        {entry.narration && (
                                            <div className="narration">({entry.narration})</div>
                                        )}
                                    </td>
                                    <td className="amount">
                                        {entry.debitAmount ? formatCurrency(entry.debitAmount) : '-'}
                                    </td>
                                    <td className="amount">
                                        {entry.creditAmount ? formatCurrency(entry.creditAmount) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="total-row">
                                <td><strong>Total</strong></td>
                                <td className="amount"><strong>{formatCurrency(getTotalDebit())}</strong></td>
                                <td className="amount"><strong>{formatCurrency(getTotalCredit())}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {voucher.narration && (
                    <div className="voucher-narration">
                        <p><strong>Narration:</strong> {voucher.narration}</p>
                    </div>
                )}

                {printSettings.showSignatures && (
                    <div className="signatures">
                        <div className="signature-section">
                            <div className="signature-box">
                                <div className="signature-line"></div>
                                <p>Prepared By</p>
                                <p>{voucher.createdBy?.name}</p>
                                <p>Date: {formatDate(voucher.createdAt)}</p>
                            </div>
                            <div className="signature-box">
                                <div className="signature-line"></div>
                                <p>Checked By</p>
                                <p>_________________</p>
                                <p>Date: ___________</p>
                            </div>
                            <div className="signature-box">
                                <div className="signature-line"></div>
                                <p>Authorized By</p>
                                <p>_________________</p>
                                <p>Date: ___________</p>
                            </div>
                        </div>
                    </div>
                )}

                {printSettings.includeFooter && (
                    <div className="voucher-footer">
                        <div className="footer-info">
                            <p>This is a computer generated voucher and does not require signature.</p>
                            <p>Generated on: {new Date().toLocaleString()}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VoucherPrint;