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

    const fetchInvoices = React.useCallback(async () => {
        try {
            setLoadingInvoices(true);
            // Fetch bills for the customer (bills are the invoices in this system)
            const response = await fetch(`${backendUrl}/api/bills/customer/${customerId}/bills`);
            const data = await response.json();
            setInvoices(data || []);
        } catch (error) {
            console.error('Error fetching invoices:', error);
            showToast.error('Failed to load invoices');
        } finally {
            setLoadingInvoices(false);
        }
    }, [customerId]);

    // Fetch invoices when customer is selected
    React.useEffect(() => {
        if (customerId) {
            fetchInvoices();
        }
    }, [customerId, fetchInvoices]);

    const handleInvoiceSelect = (selectedInvoiceId) => {
        setInvoiceId(selectedInvoiceId);
        const invoice = invoices.find(inv => inv.invoiceId === selectedInvoiceId);
        if (invoice) {
            // Calculate current outstanding amount
            const totalPaid = invoice.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
            const remainingAmount = invoice.totalAmount - totalPaid;

            // Set payment amount to remaining amount (for full payment)
            setPaymentAmount(remainingAmount.toString());
            setRemainingBalance('0.00');
            setIsFullPayment(true);

            // Clear notes
            setNotes('');
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
                                    {invoices.map((bill) => (
                                        <option key={bill._id} value={bill.invoiceId}>
                                            {bill.invoiceNumber} - {bill.billNumber} - ₹{bill.totalAmount.toLocaleString()} ({bill.paymentStatus})
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
                                    {(() => {
                                        const selectedInvoice = invoices.find(inv => inv.invoiceId === invoiceId);
                                        if (selectedInvoice) {
                                            const totalPaid = selectedInvoice.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
                                            const remainingAmount = selectedInvoice.totalAmount - totalPaid;
                                            const currentPayment = parseFloat(paymentAmount) || 0;
                                            const afterPaymentRemaining = remainingAmount - currentPayment;

                                            return (
                                                <>
                                                    <br />
                                                    <strong>Status:</strong> {selectedInvoice.paymentStatus}
                                                    <br />
                                                    <strong>Total Amount:</strong> ₹{selectedInvoice.totalAmount.toLocaleString()}
                                                    <br />
                                                    <strong>Total Paid:</strong> ₹{totalPaid.toLocaleString()}
                                                    <br />
                                                    <strong>Current Outstanding:</strong> ₹{remainingAmount.toLocaleString()}
                                                    {currentPayment > 0 && (
                                                        <>
                                                            <br />
                                                            <strong style={{ color: '#28a745' }}>After Payment (₹{currentPayment.toLocaleString()}):</strong> ₹{Math.max(0, afterPaymentRemaining).toLocaleString()}
                                                        </>
                                                    )}
                                                </>
                                            );
                                        }
                                        return null;
                                    })()}
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

                                            // Auto-calculate remaining balance
                                            if (invoiceId && value) {
                                                const selectedInvoice = invoices.find(inv => inv.invoiceId === invoiceId);
                                                if (selectedInvoice) {
                                                    const totalPaid = selectedInvoice.payments?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
                                                    const currentOutstanding = selectedInvoice.totalAmount - totalPaid;
                                                    const paymentAmountNum = parseFloat(value) || 0;
                                                    const newRemaining = Math.max(0, currentOutstanding - paymentAmountNum);
                                                    setRemainingBalance(newRemaining.toFixed(2));

                                                    // Auto-set full payment if payment covers full amount
                                                    if (paymentAmountNum >= currentOutstanding) {
                                                        setIsFullPayment(true);
                                                        setRemainingBalance('0.00');
                                                    } else {
                                                        setIsFullPayment(false);
                                                    }
                                                }
                                            }
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
