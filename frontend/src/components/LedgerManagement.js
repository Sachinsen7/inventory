import React, { useState } from 'react';
import { ledgerService } from '../services/ledgerService';
import { showToast } from '../utils/toastNotifications';
import './LedgerManagement.css';

function LedgerManagement({ customerId: propCustomerId, customerName: propCustomerName, onClose }) {
    const [invoiceId, setInvoiceId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [isFullPayment, setIsFullPayment] = useState(true);
    const [remainingBalance, setRemainingBalance] = useState('');
    const [notes, setNotes] = useState('');
    const [customerId, setCustomerId] = useState(propCustomerId || '');
    const [customerName, setCustomerName] = useState(propCustomerName || '');
    const [loading, setLoading] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    // Fetch invoices when customer is selected
    React.useEffect(() => {
        if (customerId) {
            fetchInvoices();
        }
    }, [customerId]);

    const fetchInvoices = async () => {
        try {
            setLoadingInvoices(true);
            const response = await fetch(`${backendUrl}/api/invoices?customerId=${customerId}`);
            const data = await response.json();
            setInvoices(data.invoices || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            showToast.error('Failed to load invoices');
        } finally {
            setLoadingInvoices(false);
        }
    };

    const handleInvoiceSelect = (selectedInvoiceId) => {
        setInvoiceId(selectedInvoiceId);
        const invoice = invoices.find(inv => inv.invoiceId === selectedInvoiceId);
        if (invoice) {
            setPaymentAmount(invoice.totalAmount.toString());
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!invoiceId || !paymentAmount || !customerId || !customerName) {
            showToast.error('Please fill in all required fields');
            return;
        }

        // Validate payment amount is a valid number
        if (isNaN(paymentAmount) || parseFloat(paymentAmount) <= 0) {
            showToast.error('Please enter a valid payment amount greater than 0');
            return;
        }

        // Validate remaining balance if partial payment
        if (!isFullPayment && remainingBalance) {
            if (isNaN(remainingBalance) || parseFloat(remainingBalance) < 0) {
                showToast.error('Please enter a valid remaining balance');
                return;
            }
        }

        try {
            setLoading(true);

            const paymentAmountNum = parseFloat(paymentAmount);
            const remainingBalanceNum = isFullPayment ? 0 : parseFloat(remainingBalance || 0);

            await ledgerService.recordPayment({
                invoiceId,
                paymentAmount: paymentAmountNum,
                paymentMethod,
                isFullPayment,
                remainingBalance: remainingBalanceNum,
                notes,
                customerId,
                customerName
            });

            showToast.success(`Payment of ₹${paymentAmountNum.toFixed(2)} recorded successfully!`);

            // Reset form
            setInvoiceId('');
            setPaymentAmount('');
            setPaymentMethod('Cash');
            setIsFullPayment(true);
            setRemainingBalance('');
            setNotes('');
            if (!propCustomerId) {
                setCustomerId('');
                setCustomerName('');
            }

            // Refresh invoices
            if (customerId) {
                fetchInvoices();
            }

        } catch (error) {
            console.error('Error recording payment:', error);
            showToast.error('Failed to record payment');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ledger-management-modal" onClick={onClose}>
            <div className="ledger-management-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="ledger-header">
                    <h2>💰 Manage Ledger & Payments</h2>
                    <button onClick={onClose} className="btn-close-x">✕</button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="payment-form">
                    <div className="form-section">
                        <h3>Customer Information</h3>
                        {propCustomerId && propCustomerName ? (
                            <div className="customer-info-display" style={{
                                padding: '15px',
                                background: '#f0f9ff',
                                borderRadius: '8px',
                                border: '2px solid #3b82f6'
                            }}>
                                <p style={{ margin: '5px 0', color: '#1e40af' }}>
                                    <strong>Customer:</strong> {customerName}
                                </p>
                                <p style={{ margin: '5px 0', color: '#64748b', fontSize: '0.9rem' }}>
                                    <strong>ID:</strong> {customerId}
                                </p>
                            </div>
                        ) : (
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Customer ID *</label>
                                    <input
                                        type="text"
                                        value={customerId}
                                        onChange={(e) => setCustomerId(e.target.value)}
                                        placeholder="Enter customer ID"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Customer Name *</label>
                                    <input
                                        type="text"
                                        value={customerName}
                                        onChange={(e) => setCustomerName(e.target.value)}
                                        placeholder="Enter customer name"
                                        required
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="form-section">
                        <h3>Invoice Information</h3>
                        <div className="form-group">
                            <label>Select Invoice *</label>
                            {loadingInvoices ? (
                                <div style={{ padding: '10px', color: '#666' }}>Loading invoices...</div>
                            ) : invoices.length > 0 ? (
                                <select
                                    value={invoiceId}
                                    onChange={(e) => handleInvoiceSelect(e.target.value)}
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid #ddd',
                                        fontSize: '1rem'
                                    }}
                                >
                                    <option value="">-- Select an Invoice --</option>
                                    {invoices.map((invoice) => (
                                        <option key={invoice._id} value={invoice.invoiceId}>
                                            {invoice.invoiceId} - {invoice.billNumber} - ₹{invoice.totalAmount.toLocaleString()} ({invoice.paymentStatus})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <div style={{
                                    padding: '15px',
                                    background: '#fff3cd',
                                    border: '1px solid #ffc107',
                                    borderRadius: '8px',
                                    color: '#856404'
                                }}>
                                    {customerId ? 'No invoices found for this customer' : 'Please select a customer first'}
                                </div>
                            )}

                            {invoiceId && (
                                <div style={{
                                    marginTop: '10px',
                                    padding: '10px',
                                    background: '#e7f3ff',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    color: '#004085'
                                }}>
                                    <strong>Selected Invoice:</strong> {invoiceId}
                                    {invoices.find(inv => inv.invoiceId === invoiceId) && (
                                        <>
                                            <br />
                                            <strong>Status:</strong> {invoices.find(inv => inv.invoiceId === invoiceId).paymentStatus}
                                            <br />
                                            <strong>Amount:</strong> ₹{invoices.find(inv => inv.invoiceId === invoiceId).totalAmount.toLocaleString()}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Payment Details</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Payment Amount (₹) *</label>
                                <input
                                    type="text"
                                    value={paymentAmount}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Allow only numbers and decimal point
                                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                            setPaymentAmount(value);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // Format to 2 decimal places on blur if valid number
                                        const value = e.target.value;
                                        if (value && !isNaN(value)) {
                                            setPaymentAmount(parseFloat(value).toFixed(2));
                                        }
                                    }}
                                    placeholder="0.00"
                                    required
                                    style={{
                                        borderColor: paymentAmount && isNaN(paymentAmount) ? '#dc3545' : ''
                                    }}
                                />
                                {paymentAmount && isNaN(paymentAmount) && (
                                    <small style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '4px', display: 'block' }}>
                                        Please enter a valid number
                                    </small>
                                )}
                            </div>
                            <div className="form-group">
                                <label>Payment Method *</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    required
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Card">Card</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cheque">Cheque</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={isFullPayment}
                                    onChange={(e) => setIsFullPayment(e.target.checked)}
                                />
                                <span>Full Payment</span>
                            </label>
                        </div>

                        {!isFullPayment && (
                            <div className="form-group">
                                <label>Remaining Balance (₹)</label>
                                <input
                                    type="text"
                                    value={remainingBalance}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        // Allow only numbers and decimal point
                                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                                            setRemainingBalance(value);
                                        }
                                    }}
                                    onBlur={(e) => {
                                        // Format to 2 decimal places on blur if valid number
                                        const value = e.target.value;
                                        if (value && !isNaN(value)) {
                                            setRemainingBalance(parseFloat(value).toFixed(2));
                                        }
                                    }}
                                    placeholder="0.00"
                                    style={{
                                        borderColor: remainingBalance && isNaN(remainingBalance) ? '#dc3545' : ''
                                    }}
                                />
                                {remainingBalance && isNaN(remainingBalance) && (
                                    <small style={{ color: '#dc3545', fontSize: '0.875rem', marginTop: '4px', display: 'block' }}>
                                        Please enter a valid number
                                    </small>
                                )}
                            </div>
                        )}

                        <div className="form-group">
                            <label>Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any additional notes..."
                                rows="3"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="ledger-footer">
                        <button type="button" onClick={onClose} className="btn-cancel">
                            Cancel
                        </button>
                        <button type="submit" className="btn-submit" disabled={loading}>
                            {loading ? 'Recording...' : '💾 Record Payment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default LedgerManagement;
