import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './FinancialReports.css';

function FinancialReports() {
    const [activeReport, setActiveReport] = useState('trial-balance');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Common filters
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        financialYear: '',
        asOnDate: new Date().toISOString().split('T')[0]
    });

    // Report data
    const [reportData, setReportData] = useState(null);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const reportTypes = [
        { key: 'trial-balance', label: '⚖️ Trial Balance', icon: '📊', description: 'Summary of all account balances' },
        { key: 'profit-loss', label: '💰 Profit & Loss', icon: '📈', description: 'Income vs expenses analysis' },
        { key: 'balance-sheet', label: '📋 Balance Sheet', icon: '🏦', description: 'Assets, liabilities, and equity' },
        { key: 'cash-flow', label: '💸 Cash Flow', icon: '💵', description: 'Cash movements and liquidity' },
        { key: 'voucher-wise', label: '📝 Voucher Reports', icon: '📄', description: 'Detailed voucher listings' },
        { key: 'account-ledger', label: '📚 Account Ledger', icon: '📖', description: 'Account-wise transaction history' }
    ];

    useEffect(() => {
        if (activeReport) {
            generateReport();
        }
    }, [activeReport]);

    const generateReport = async () => {
        try {
            setLoading(true);
            setMessage('');

            let endpoint = `/api/reports/${activeReport}`;
            const params = new URLSearchParams();

            // Add filters based on report type
            if (activeReport === 'balance-sheet') {
                if (filters.asOnDate) params.append('asOnDate', filters.asOnDate);
            } else {
                if (filters.fromDate) params.append('fromDate', filters.fromDate);
                if (filters.toDate) params.append('toDate', filters.toDate);
            }

            if (filters.financialYear) params.append('financialYear', filters.financialYear);

            if (params.toString()) {
                endpoint += `?${params.toString()}`;
            }

            const response = await axios.get(`${backendUrl}${endpoint}`);
            setReportData(response.data);
        } catch (error) {
            console.error('Error generating report:', error);
            setMessage('❌ Error generating report: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters({ ...filters, [field]: value });
    };

    const formatAmount = (amount) => {
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
        let csvContent = '';

        if (activeReport === 'trial-balance' && data.trialBalance) {
            csvContent = 'Account Name,Account Type,Debit Amount,Credit Amount\n';
            data.trialBalance.forEach(account => {
                const debit = account.balanceType === 'debit' ? account.balance : 0;
                const credit = account.balanceType === 'credit' ? account.balance : 0;
                csvContent += `"${account.accountName}","${account.accountType}",${debit},${credit}\n`;
            });
        }

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const printReport = () => {
        window.print();
    };

    return (
        <div className="financial-reports">
            <div className="page-header">
                <h1>📊 Financial Reports</h1>
                <p>Comprehensive financial analysis and reporting</p>
            </div>

            {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            {/* Report Type Selection */}
            <div className="report-types">
                {reportTypes.map(report => (
                    <div
                        key={report.key}
                        className={`report-type-card ${activeReport === report.key ? 'active' : ''}`}
                        onClick={() => setActiveReport(report.key)}
                    >
                        <div className="report-icon">{report.icon}</div>
                        <h3>{report.label}</h3>
                        <p>{report.description}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="report-filters">
                <div className="filters-row">
                    {activeReport === 'balance-sheet' ? (
                        <div className="filter-group">
                            <label>As On Date</label>
                            <input
                                type="date"
                                value={filters.asOnDate}
                                onChange={(e) => handleFilterChange('asOnDate', e.target.value)}
                                className="filter-input"
                            />
                        </div>
                    ) : (
                        <>
                            <div className="filter-group">
                                <label>From Date</label>
                                <input
                                    type="date"
                                    value={filters.fromDate}
                                    onChange={(e) => handleFilterChange('fromDate', e.target.value)}
                                    className="filter-input"
                                />
                            </div>
                            <div className="filter-group">
                                <label>To Date</label>
                                <input
                                    type="date"
                                    value={filters.toDate}
                                    onChange={(e) => handleFilterChange('toDate', e.target.value)}
                                    className="filter-input"
                                />
                            </div>
                        </>
                    )}

                    <div className="filter-group">
                        <label>Financial Year</label>
                        <select
                            value={filters.financialYear}
                            onChange={(e) => handleFilterChange('financialYear', e.target.value)}
                            className="filter-select"
                        >
                            <option value="">All Years</option>
                            <option value="2024-25">2024-25</option>
                            <option value="2023-24">2023-24</option>
                            <option value="2022-23">2022-23</option>
                        </select>
                    </div>

                    <div className="filter-actions">
                        <button className="btn-generate" onClick={generateReport} disabled={loading}>
                            {loading ? '⏳ Generating...' : '🔄 Generate Report'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Content */}
            <div className="report-content">
                {loading ? (
                    <div className="loading-container">
                        <div className="loading-spinner">⏳</div>
                        <p>Generating {reportTypes.find(r => r.key === activeReport)?.label}...</p>
                    </div>
                ) : reportData ? (
                    <div className="report-display">
                        {/* Report Header */}
                        <div className="report-header">
                            <div className="report-title">
                                <h2>{reportTypes.find(r => r.key === activeReport)?.label}</h2>
                                <div className="report-period">
                                    {activeReport === 'balance-sheet'
                                        ? `As on ${formatDate(filters.asOnDate)}`
                                        : filters.fromDate && filters.toDate
                                            ? `From ${formatDate(filters.fromDate)} to ${formatDate(filters.toDate)}`
                                            : 'All Periods'
                                    }
                                </div>
                            </div>
                            <div className="report-actions">
                                <button className="btn-export" onClick={() => exportToCSV(reportData, activeReport)}>
                                    📥 Export CSV
                                </button>
                                <button className="btn-print" onClick={printReport}>
                                    🖨️ Print
                                </button>
                            </div>
                        </div>

                        {/* Trial Balance */}
                        {activeReport === 'trial-balance' && reportData.trialBalance && (
                            <TrialBalanceReport data={reportData} formatAmount={formatAmount} />
                        )}

                        {/* Profit & Loss */}
                        {activeReport === 'profit-loss' && (
                            <ProfitLossReport data={reportData} formatAmount={formatAmount} />
                        )}

                        {/* Balance Sheet */}
                        {activeReport === 'balance-sheet' && (
                            <BalanceSheetReport data={reportData} formatAmount={formatAmount} />
                        )}

                        {/* Cash Flow */}
                        {activeReport === 'cash-flow' && (
                            <CashFlowReport data={reportData} formatAmount={formatAmount} formatDate={formatDate} />
                        )}

                        {/* Voucher-wise Reports */}
                        {activeReport === 'voucher-wise' && (
                            <VoucherWiseReport
                                data={reportData}
                                formatAmount={formatAmount}
                                formatDate={formatDate}
                                onFilterChange={handleFilterChange}
                                filters={filters}
                                onGenerate={generateReport}
                            />
                        )}

                        {/* Account Ledger */}
                        {activeReport === 'account-ledger' && (
                            <AccountLedgerReport
                                data={reportData}
                                formatAmount={formatAmount}
                                formatDate={formatDate}
                                onFilterChange={handleFilterChange}
                                filters={filters}
                                onGenerate={generateReport}
                            />
                        )}
                    </div>
                ) : (
                    <div className="no-data">
                        <div className="no-data-icon">📊</div>
                        <h3>No Report Generated</h3>
                        <p>Click "Generate Report" to view the {reportTypes.find(r => r.key === activeReport)?.label}</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// Trial Balance Component
function TrialBalanceReport({ data, formatAmount }) {
    // Provide default values to prevent undefined errors
    const trialBalance = data?.trialBalance || [];
    const totals = data?.totals || { totalDebit: 0, totalCredit: 0, difference: 0 };

    return (
        <div className="trial-balance-report">
            <table className="report-table">
                <thead>
                    <tr>
                        <th>Account Name</th>
                        <th>Account Type</th>
                        <th className="amount-col">Debit Amount</th>
                        <th className="amount-col">Credit Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {trialBalance.length > 0 ? (
                        trialBalance.map((account, index) => (
                            <tr key={index}>
                                <td>{account.accountName}</td>
                                <td>
                                    <span className={`account-type ${account.accountType?.toLowerCase() || 'default'}`}>
                                        {account.accountType}
                                    </span>
                                </td>
                                <td className="amount-col">
                                    {account.balanceType === 'debit' ? formatAmount(account.balance) : '-'}
                                </td>
                                <td className="amount-col">
                                    {account.balanceType === 'credit' ? formatAmount(account.balance) : '-'}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                No trial balance data found
                            </td>
                        </tr>
                    )}
                </tbody>
                <tfoot>
                    <tr className="total-row">
                        <td colSpan="2"><strong>Total</strong></td>
                        <td className="amount-col"><strong>{formatAmount(totals.totalDebit)}</strong></td>
                        <td className="amount-col"><strong>{formatAmount(totals.totalCredit)}</strong></td>
                    </tr>
                    {totals.difference !== 0 && (
                        <tr className="difference-row">
                            <td colSpan="2"><strong>Difference</strong></td>
                            <td colSpan="2" className="amount-col difference">
                                <strong>{formatAmount(Math.abs(totals.difference))}</strong>
                            </td>
                        </tr>
                    )}
                </tfoot>
            </table>
        </div>
    );
}

// Profit & Loss Component
function ProfitLossReport({ data, formatAmount }) {
    // Provide default values to prevent undefined errors
    const income = data?.income || { accounts: [], total: 0 };
    const expenses = data?.expenses || { accounts: [], total: 0 };
    const netProfit = data?.netProfit || 0;

    return (
        <div className="profit-loss-report">
            <div className="pl-sections">
                <div className="pl-section income-section">
                    <h3>💰 Income</h3>
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Account</th>
                                <th className="amount-col">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {income.accounts.length > 0 ? (
                                income.accounts.map((account, index) => (
                                    <tr key={index}>
                                        <td>{account.accountName}</td>
                                        <td className="amount-col">{formatAmount(account.amount)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                        No income accounts found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="total-row">
                                <td><strong>Total Income</strong></td>
                                <td className="amount-col"><strong>{formatAmount(income.total)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="pl-section expense-section">
                    <h3>💸 Expenses</h3>
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Account</th>
                                <th className="amount-col">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.accounts.length > 0 ? (
                                expenses.accounts.map((account, index) => (
                                    <tr key={index}>
                                        <td>{account.accountName}</td>
                                        <td className="amount-col">{formatAmount(account.amount)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                        No expense accounts found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="total-row">
                                <td><strong>Total Expenses</strong></td>
                                <td className="amount-col"><strong>{formatAmount(expenses.total)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="net-profit-section">
                <div className={`net-profit ${netProfit >= 0 ? 'profit' : 'loss'}`}>
                    <h3>{netProfit >= 0 ? '📈 Net Profit' : '📉 Net Loss'}</h3>
                    <div className="net-amount">{formatAmount(Math.abs(netProfit))}</div>
                </div>
            </div>
        </div>
    );
}

// Balance Sheet Component
function BalanceSheetReport({ data, formatAmount }) {
    // Provide default values to prevent undefined errors
    const assets = data?.assets || { accounts: [], total: 0 };
    const liabilities = data?.liabilities || { accounts: [], total: 0 };
    const equity = data?.equity || { accounts: [], total: 0 };
    const totals = data?.totals || { liabilitiesAndEquityTotal: 0 };

    return (
        <div className="balance-sheet-report">
            <div className="bs-sections">
                <div className="bs-section assets-section">
                    <h3>🏦 Assets</h3>
                    <table className="report-table">
                        <thead>
                            <tr>
                                <th>Account</th>
                                <th className="amount-col">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.accounts.length > 0 ? (
                                assets.accounts.map((account, index) => (
                                    <tr key={index}>
                                        <td>{account.accountName}</td>
                                        <td className="amount-col">{formatAmount(account.amount)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                        No asset accounts found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="total-row">
                                <td><strong>Total Assets</strong></td>
                                <td className="amount-col"><strong>{formatAmount(assets.total)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="bs-section liabilities-section">
                    <h3>📋 Liabilities & Equity</h3>

                    <h4>Liabilities</h4>
                    <table className="report-table">
                        <tbody>
                            {liabilities.accounts.length > 0 ? (
                                liabilities.accounts.map((account, index) => (
                                    <tr key={index}>
                                        <td>{account.accountName}</td>
                                        <td className="amount-col">{formatAmount(account.amount)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                        No liability accounts found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="subtotal-row">
                                <td><strong>Total Liabilities</strong></td>
                                <td className="amount-col"><strong>{formatAmount(liabilities.total)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>

                    <h4>Equity</h4>
                    <table className="report-table">
                        <tbody>
                            {equity.accounts.length > 0 ? (
                                equity.accounts.map((account, index) => (
                                    <tr key={index}>
                                        <td>{account.accountName}</td>
                                        <td className="amount-col">{formatAmount(account.amount)}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="2" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                        No equity accounts found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot>
                            <tr className="subtotal-row">
                                <td><strong>Total Equity</strong></td>
                                <td className="amount-col"><strong>{formatAmount(equity.total)}</strong></td>
                            </tr>
                            <tr className="total-row">
                                <td><strong>Total Liabilities & Equity</strong></td>
                                <td className="amount-col"><strong>{formatAmount(totals.liabilitiesAndEquityTotal)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

// Cash Flow Component
function CashFlowReport({ data, formatAmount, formatDate }) {
    // Provide default values to prevent undefined errors
    const summary = data?.summary || { totalInflow: 0, totalOutflow: 0, netCashFlow: 0 };
    const operatingActivities = data?.operatingActivities || { activities: [], netCashFlow: 0 };

    return (
        <div className="cash-flow-report">
            <div className="cash-flow-summary">
                <div className="summary-cards">
                    <div className="summary-card inflow">
                        <h4>� Tottal Inflow</h4>
                        <div className="amount">{formatAmount(summary.totalInflow)}</div>
                    </div>
                    <div className="summary-card outflow">
                        <h4>� Tottal Outflow</h4>
                        <div className="amount">{formatAmount(summary.totalOutflow)}</div>
                    </div>
                    <div className={`summary-card net ${summary.netCashFlow >= 0 ? 'positive' : 'negative'}`}>
                        <h4>📊 Net Cash Flow</h4>
                        <div className="amount">{formatAmount(summary.netCashFlow)}</div>
                    </div>
                </div>
            </div>

            <div className="cash-flow-activities">
                <h3>💼 Operating Activities</h3>
                <table className="report-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Voucher No.</th>
                            <th className="amount-col">Inflow</th>
                            <th className="amount-col">Outflow</th>
                        </tr>
                    </thead>
                    <tbody>
                        {operatingActivities.activities.length > 0 ? (
                            operatingActivities.activities.map((activity, index) => (
                                <tr key={index}>
                                    <td>{formatDate(activity.date)}</td>
                                    <td>{activity.description}</td>
                                    <td>{activity.voucherNumber}</td>
                                    <td className="amount-col">{activity.inflow > 0 ? formatAmount(activity.inflow) : '-'}</td>
                                    <td className="amount-col">{activity.outflow > 0 ? formatAmount(activity.outflow) : '-'}</td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                                    No cash flow activities found
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="total-row">
                            <td colSpan="3"><strong>Net Operating Cash Flow</strong></td>
                            <td colSpan="2" className="amount-col">
                                <strong>{formatAmount(operatingActivities.netCashFlow)}</strong>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
}

// Voucher-wise Report Component (Placeholder - would need additional implementation)
function VoucherWiseReport({ data, formatAmount, formatDate }) {
    return (
        <div className="voucher-wise-report">
            <p>Voucher-wise report implementation would go here...</p>
        </div>
    );
}

// Account Ledger Component (Placeholder - would need additional implementation)
function AccountLedgerReport({ data, formatAmount, formatDate }) {
    return (
        <div className="account-ledger-report">
            <p>Account ledger report implementation would go here...</p>
        </div>
    );
}

export default FinancialReports;