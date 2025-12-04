import React, { useState } from 'react';
import { ledgerService } from '../services/ledgerService';
import { showToast } from '../utils/toastNotifications';
import './LedgerManagement.css';

function LedgerManagement({ onClose }) {
    const [invoiceId, setInvoiceId] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Cash');
    const [isFullPayment, setIsFullPayment] = useState(true);
    const [remainingBalance, setRemainingBalance] = useState('');
    const [notes, setNotes] = useState('');
    const [customerId, setCustomerId] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!invoiceId || !paymentAmount || !customerId || !customerName) {
            showToast.error('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);

            await ledgerService.recordPayment({
                invoiceId,
                paymentAmount: parseFloat(paymentAmount),
                paymentMethod,
                isFullPayment,
                remainingBalance: isFullPayment ? 0 : parseFloat(remainingBalance || 0),
                notes,
                customerId,
                customerName
            });

            showToast.success(`Payment of ₹${paymentAmount} recorded successfully!`);

            // Reset form
            setInvoiceId('');
            setPaymentAmount('');
            setPaymentMethod('Cash');
            setIsFullPayment(true);
            setRemainingBalance('');
            setNotes('');
            setCustomerId('');
            setCustomerName('');

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
                    </div>

                    <div className="form-section">
                        <h3>Invoice Information</h3>
                        <div className="form-group">
                            <label>Invoice ID *</label>
                            <input
                                type="text"
                                value={invoiceId}
                                onChange={(e) => setInvoiceId(e.target.value)}
                                placeholder="Enter invoice ID"
                                required
                            />
                        </div>
                    </div>

                    <div className="form-section">
                        <h3>Payment Details</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Payment Amount (₹) *</label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    required
                                />
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
                                    type="number"
                                    value={remainingBalance}
                                    onChange={(e) => setRemainingBalance(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                />
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
