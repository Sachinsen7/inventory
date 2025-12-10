import React, { useState, useEffect } from 'react';
import './DayBook.css';

const DayBook = () => {
    const [activeTab, setActiveTab] = useState('daybook');
    const [loading, setLoading] = useState(false);

    // Day Book State
    const [dayBookData, setDayBookData] = useState({
        dayBookEntries: [],
        summary: {},
        pagination: {}
    });

    // Cash Book State
    const [cashBookData, setCashBookData] = useState({
        cashBookEntries: [],
        summary: {},
        pagination: {}
    });

    // Bank Book State
    const [bankBookData, setBankBookData] = useState({
        bankBookEntries: [],
        summary: {},
        pagination: {}
    });

    const [cashBankAccounts, setCashBankAccounts] = useState({
        cashAccounts: [],
        bankAccounts: []
    });

    // Filters
    const [dayBookFilters, setDayBookFilters] = useState({
        date: new Date().toISOString().split('T')[0],
        fromDate: '',
        toDate: '',
        voucherType: 'all',
        page: 1,
        limit: 50
    });

    const [cashBookFilters, setCashBookFilters] = useState({
        fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        cashAccount: 'Cash',
        page: 1,
        limit: 100
    });

    const [bankBookFilters, setBankBookFilters] = useState({
        fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        toDate: new Date().toISOString().split('T')[0],
        bankAccount: '',
        page: 1,
        limit: 100
    });

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const voucherTypes = [
        { value: 'all', label: 'All Vouchers' },
        { value: 'sales', label: 'Sales' },
        { value: 'purchase', label: 'Purchase' },
        { value: 'receipt', label: 'Receipt' },
        { value: 'payment', label: 'Payment' },
        { value: 'journal', label: 'Journal' },
        { value: 'contra', label: 'Contra' },
        { value: 'debit_note', label: 'Debit Note' },
        { value: 'credit_note', label: 'Credit Note' }
    ];

    useEffect(() => {
        loadCashBankAccounts();
    }, []);

    useEffect(() => {
        if (activeTab === 'daybook') {
            loadDayBook();
        } else if (activeTab === 'cashbook') {
            loadCashBook();
        } else if (activeTab === 'bankbook') {
            loadBankBook();
        }
    }, [activeTab, dayBookFilters, cashBookFilters, bankBookFilters]);

    const loadCashBankAccounts = async () => {
        try {
            const response = await fetch(`${backendUrl}/api/reports/cash-bank-accounts`);
            const data = await response.json();
            setCashBankAccounts(data);

            // Set default bank account if available
            if (data.bankAccounts.length > 0 && !bankBookFilters.bankAccount) {
                setBankBookFilters(prev => ({
                    ...prev,
                    bankAccount: data.bankAccounts[0]
                }));
            }
        } catch (error) {
            console.error('Error loading cash/bank accounts:', error);
        }
    };

    const loadDayBook = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            Object.entries(dayBookFilters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await fetch(`${backendUrl}/api/reports/day-book?${params}`);
            const data = await response.json();
            setDayBookData(data);
        } catch (error) {
            console.error('Error loading day book:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadCashBook = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            Object.entries(cashBookFilters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await fetch(`${backendUrl}/api/reports/cash-book?${params}`);
            const data = await response.json();
            setCashBookData(data);
        } catch (error) {
            console.error('Error loading cash book:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadBankBook = async () => {
        try {
            if (!bankBookFilters.bankAccount) return;

            setLoading(true);
            const params = new URLSearchParams();

            Object.entries(bankBookFilters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await fetch(`${backendUrl}/api/reports/bank-book?${params}`);
            const data = await response.json();
            setBankBookData(data);
        } catch (error) {
            console.error('Error loading bank book:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount || 0);
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-IN');
    };

    const exportToCSV = (data, filename) => {
        // Simple CSV export functionality
        const csvContent = "data:text/csv;charset=utf-8,"
            + data.map(row => Object.values(row).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${filename}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderDayBook = () => (
        <div className="daybook-section">
            <div className="section-header">
                <h3>📅 Day Book / Transaction Register</h3>
                <button
                    className="btn btn-secondary"
                    onClick={() => exportToCSV(dayBookData.dayBookEntries, 'daybook')}
                >
                    📥 Export CSV
                </button>
            </div>

            <div className="filters-section">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>Specific Date</label>
                        <input
                            type="date"
                            value={dayBookFilters.date}
                            onChange={(e) => setDayBookFilters({
                                ...dayBookFilters,
                                date: e.target.value,
                                fromDate: '',
                                toDate: ''
                            })}
                        />
                    </div>
                    <div className="filter-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            value={dayBookFilters.fromDate}
                            onChange={(e) => setDayBookFilters({
                                ...dayBookFilters,
                                fromDate: e.target.value,
                                date: ''
                            })}
                        />
                    </div>
                    <div className="filter-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            value={dayBookFilters.toDate}
                            onChange={(e) => setDayBookFilters({
                                ...dayBookFilters,
                                toDate: e.target.value,
                                date: ''
                            })}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Voucher Type</label>
                        <select
                            value={dayBookFilters.voucherType}
                            onChange={(e) => setDayBookFilters({
                                ...dayBookFilters,
                                voucherType: e.target.value
                            })}
                        >
                            {voucherTypes.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {dayBookData.summary && (
                <div className="summary-cards">
                    <div className="summary-card">
                        <h4>{dayBookData.summary.totalVouchers || 0}</h4>
                        <p>Total Vouchers</p>
                    </div>
                    <div className="summary-card">
                        <h4>{formatCurrency(dayBookData.summary.totalDebits)}</h4>
                        <p>Total Debits</p>
                    </div>
                    <div className="summary-card">
                        <h4>{formatCurrency(dayBookData.summary.totalCredits)}</h4>
                        <p>Total Credits</p>
                    </div>
                    <div className="summary-card">
                        <h4>{formatCurrency(dayBookData.summary.totalAmount)}</h4>
                        <p>Total Amount</p>
                    </div>
                </div>
            )}

            <div className="daybook-table">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Voucher No.</th>
                            <th>Type</th>
                            <th>Particulars</th>
                            <th>Debit</th>
                            <th>Credit</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dayBookData.dayBookEntries?.map(entry => (
                            <React.Fragment key={entry._id}>
                                <tr className="voucher-header">
                                    <td>{formatDate(entry.date)}</td>
                                    <td>{entry.voucherNumber}</td>
                                    <td>
                                        <span className={`voucher-type ${entry.voucherType}`}>
                                            {entry.voucherType}
                                        </span>
                                    </td>
                                    <td>{entry.narration}</td>
                                    <td className="amount">{formatCurrency(entry.totalDebits)}</td>
                                    <td className="amount">{formatCurrency(entry.totalCredits)}</td>
                                    <td>
                                        <button className="btn btn-sm btn-secondary">View</button>
                                    </td>
                                </tr>
                                {entry.entries?.map((ledgerEntry, index) => (
                                    <tr key={`${entry._id}-${index}`} className="ledger-entry">
                                        <td></td>
                                        <td></td>
                                        <td></td>
                                        <td className="account-name">
                                            &nbsp;&nbsp;&nbsp;&nbsp;{ledgerEntry.accountName}
                                            {ledgerEntry.narration && (
                                                <div className="entry-narration">
                                                    {ledgerEntry.narration}
                                                </div>
                                            )}
                                        </td>
                                        <td className="amount">
                                            {ledgerEntry.debitAmount > 0 ? formatCurrency(ledgerEntry.debitAmount) : ''}
                                        </td>
                                        <td className="amount">
                                            {ledgerEntry.creditAmount > 0 ? formatCurrency(ledgerEntry.creditAmount) : ''}
                                        </td>
                                        <td></td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {dayBookData.pagination && (
                <div className="pagination">
                    <span>
                        Page {dayBookData.pagination.currentPage} of {dayBookData.pagination.totalPages}
                        ({dayBookData.pagination.totalRecords} records)
                    </span>
                </div>
            )}
        </div>
    );

    const renderCashBook = () => (
        <div className="cashbook-section">
            <div className="section-header">
                <h3>💰 Cash Book</h3>
                <button
                    className="btn btn-secondary"
                    onClick={() => exportToCSV(cashBookData.cashBookEntries, 'cashbook')}
                >
                    📥 Export CSV
                </button>
            </div>

            <div className="filters-section">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>Cash Account</label>
                        <select
                            value={cashBookFilters.cashAccount}
                            onChange={(e) => setCashBookFilters({
                                ...cashBookFilters,
                                cashAccount: e.target.value
                            })}
                        >
                            {cashBankAccounts.cashAccounts.map(account => (
                                <option key={account} value={account}>
                                    {account}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            value={cashBookFilters.fromDate}
                            onChange={(e) => setCashBookFilters({
                                ...cashBookFilters,
                                fromDate: e.target.value
                            })}
                        />
                    </div>
                    <div className="filter-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            value={cashBookFilters.toDate}
                            onChange={(e) => setCashBookFilters({
                                ...cashBookFilters,
                                toDate: e.target.value
                            })}
                        />
                    </div>
                </div>
            </div>

            {cashBookData.summary && (
                <div className="summary-cards">
                    <div className="summary-card">
                        <h4>{formatCurrency(cashBookData.summary.openingBalance)}</h4>
                        <p>Opening Balance</p>
                    </div>
                    <div className="summary-card">
                        <h4>{formatCurrency(cashBookData.summary.totalReceipts)}</h4>
                        <p>Total Receipts</p>
                    </div>
                    <div className="summary-card">
                        <h4>{formatCurrency(cashBookData.summary.totalPayments)}</h4>
                        <p>Total Payments</p>
                    </div>
                    <div className="summary-card">
                        <h4>{formatCurrency(cashBookData.summary.closingBalance)}</h4>
                        <p>Closing Balance</p>
                    </div>
                </div>
            )}

            <div className="cashbook-table">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Voucher No.</th>
                            <th>Particulars</th>
                            <th>Receipts</th>
                            <th>Payments</th>
                            <th>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cashBookData.cashBookEntries?.map(entry => (
                            <tr key={entry._id}>
                                <td>{formatDate(entry.date)}</td>
                                <td>{entry.voucherNumber}</td>
                                <td>{entry.particulars}</td>
                                <td className="amount">
                                    {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : ''}
                                </td>
                                <td className="amount">
                                    {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : ''}
                                </td>
                                <td className="amount balance">
                                    {formatCurrency(entry.balance)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderBankBook = () => (
        <div className="bankbook-section">
            <div className="section-header">
                <h3>🏦 Bank Book</h3>
                <button
                    className="btn btn-secondary"
                    onClick={() => exportToCSV(bankBookData.bankBookEntries, 'bankbook')}
                >
                    📥 Export CSV
                </button>
            </div>

            <div className="filters-section">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>Bank Account</label>
                        <select
                            value={bankBookFilters.bankAccount}
                            onChange={(e) => setBankBookFilters({
                                ...bankBookFilters,
                                bankAccount: e.target.value
                            })}
                        >
                            <option value="">Select Bank Account</option>
                            {cashBankAccounts.bankAccounts.map(account => (
                                <option key={account} value={account}>
                                    {account}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="filter-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            value={bankBookFilters.fromDate}
                            onChange={(e) => setBankBookFilters({
                                ...bankBookFilters,
                                fromDate: e.target.value
                            })}
                        />
                    </div>
                    <div className="filter-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            value={bankBookFilters.toDate}
                            onChange={(e) => setBankBookFilters({
                                ...bankBookFilters,
                                toDate: e.target.value
                            })}
                        />
                    </div>
                </div>
            </div>

            {bankBookData.summary && (
                <div className="summary-cards">
                    <div className="summary-card">
                        <h4>{formatCurrency(bankBookData.summary.openingBalance)}</h4>
                        <p>Opening Balance</p>
                    </div>
                    <div className="summary-card">
                        <h4>{formatCurrency(bankBookData.summary.totalDeposits)}</h4>
                        <p>Total Deposits</p>
                    </div>
                    <div className="summary-card">
                        <h4>{formatCurrency(bankBookData.summary.totalWithdrawals)}</h4>
                        <p>Total Withdrawals</p>
                    </div>
                    <div className="summary-card">
                        <h4>{formatCurrency(bankBookData.summary.closingBalance)}</h4>
                        <p>Closing Balance</p>
                    </div>
                </div>
            )}

            <div className="bankbook-table">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Voucher No.</th>
                            <th>Particulars</th>
                            <th>Cheque No.</th>
                            <th>Deposits</th>
                            <th>Withdrawals</th>
                            <th>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bankBookData.bankBookEntries?.map(entry => (
                            <tr key={entry._id}>
                                <td>{formatDate(entry.date)}</td>
                                <td>{entry.voucherNumber}</td>
                                <td>{entry.particulars}</td>
                                <td>{entry.chequeNumber || ''}</td>
                                <td className="amount">
                                    {entry.debitAmount > 0 ? formatCurrency(entry.debitAmount) : ''}
                                </td>
                                <td className="amount">
                                    {entry.creditAmount > 0 ? formatCurrency(entry.creditAmount) : ''}
                                </td>
                                <td className="amount balance">
                                    {formatCurrency(entry.balance)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="daybook-management">
            <div className="page-header">
                <h2>📚 Day Book & Cash/Bank Books</h2>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'daybook' ? 'active' : ''}`}
                    onClick={() => setActiveTab('daybook')}
                >
                    📅 Day Book
                </button>
                <button
                    className={`tab ${activeTab === 'cashbook' ? 'active' : ''}`}
                    onClick={() => setActiveTab('cashbook')}
                >
                    💰 Cash Book
                </button>
                <button
                    className={`tab ${activeTab === 'bankbook' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bankbook')}
                >
                    🏦 Bank Book
                </button>
            </div>

            <div className="tab-content">
                {loading ? (
                    <div className="loading">Loading...</div>
                ) : (
                    <>
                        {activeTab === 'daybook' && renderDayBook()}
                        {activeTab === 'cashbook' && renderCashBook()}
                        {activeTab === 'bankbook' && renderBankBook()}
                    </>
                )}
            </div>
        </div>
    );
};

export default DayBook;