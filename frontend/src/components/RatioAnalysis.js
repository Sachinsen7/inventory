import React, { useState, useEffect } from 'react';
import './RatioAnalysis.css';

const RatioAnalysis = () => {
    const [loading, setLoading] = useState(false);
    const [ratioData, setRatioData] = useState(null);
    const [filters, setFilters] = useState({
        fromDate: new Date(new Date().getFullYear(), 3, 1).toISOString().split('T')[0], // Financial year start
        toDate: new Date().toISOString().split('T')[0],
        financialYear: '2024-25'
    });

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'https://inventory.works';

    useEffect(() => {
        generateRatioAnalysis();
    }, []);

    const generateRatioAnalysis = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const response = await fetch(`${backendUrl}/api/reports/ratio-analysis?${params}`);
            const data = await response.json();
            setRatioData(data);
        } catch (error) {
            console.error('Error generating ratio analysis:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRatioStatus = (ratio, type) => {
        const value = parseFloat(ratio);
        if (isNaN(value)) return 'unknown';

        switch (type) {
            case 'liquidity':
                return value >= 2 ? 'excellent' : value >= 1.5 ? 'good' : value >= 1 ? 'fair' : 'poor';
            case 'profitability':
                return value >= 15 ? 'excellent' : value >= 10 ? 'good' : value >= 5 ? 'fair' : 'poor';
            case 'leverage':
                return value <= 30 ? 'excellent' : value <= 50 ? 'good' : value <= 70 ? 'fair' : 'poor';
            default:
                return 'unknown';
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount || 0);
    };

    const renderRatioCard = (title, value, benchmark, interpretation, type) => {
        const status = getRatioStatus(value, type);

        return (
            <div className={`ratio-card ${status}`}>
                <div className="ratio-header">
                    <h4>{title}</h4>
                    <span className={`ratio-status ${status}`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                </div>
                <div className="ratio-value">
                    <span className="value">{value}</span>
                </div>
                <div className="ratio-benchmark">
                    <small>Benchmark: {benchmark}</small>
                </div>
                <div className="ratio-interpretation">
                    <p>{interpretation}</p>
                </div>
            </div>
        );
    };

    const renderFinancialSummary = () => {
        if (!ratioData?.summary) return null;

        const equity = ratioData.summary.totalAssets - ratioData.summary.totalLiabilities;

        return (
            <div className="financial-summary">
                <h3>📊 Financial Summary</h3>
                <div className="summary-grid">
                    <div className="summary-item">
                        <label>Total Assets</label>
                        <span>{formatCurrency(ratioData.summary.totalAssets)}</span>
                    </div>
                    <div className="summary-item">
                        <label>Current Assets</label>
                        <span>{formatCurrency(ratioData.summary.currentAssets)}</span>
                    </div>
                    <div className="summary-item">
                        <label>Total Liabilities</label>
                        <span>{formatCurrency(ratioData.summary.totalLiabilities)}</span>
                    </div>
                    <div className="summary-item">
                        <label>Current Liabilities</label>
                        <span>{formatCurrency(ratioData.summary.currentLiabilities)}</span>
                    </div>
                    <div className="summary-item">
                        <label>Equity</label>
                        <span>{formatCurrency(equity)}</span>
                    </div>
                    <div className="summary-item">
                        <label>Total Income</label>
                        <span>{formatCurrency(ratioData.summary.totalIncome)}</span>
                    </div>
                    <div className="summary-item">
                        <label>Total Expenses</label>
                        <span>{formatCurrency(ratioData.summary.totalExpenses)}</span>
                    </div>
                    <div className="summary-item">
                        <label>Net Profit</label>
                        <span className={ratioData.summary.netProfit >= 0 ? 'positive' : 'negative'}>
                            {formatCurrency(ratioData.summary.netProfit)}
                        </span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="ratio-analysis">
            <div className="page-header">
                <h2>📊 Financial Ratio Analysis</h2>
            </div>

            <div className="filters-section">
                <div className="filters-row">
                    <div className="filter-group">
                        <label>From Date</label>
                        <input
                            type="date"
                            value={filters.fromDate}
                            onChange={(e) => setFilters({
                                ...filters,
                                fromDate: e.target.value
                            })}
                        />
                    </div>
                    <div className="filter-group">
                        <label>To Date</label>
                        <input
                            type="date"
                            value={filters.toDate}
                            onChange={(e) => setFilters({
                                ...filters,
                                toDate: e.target.value
                            })}
                        />
                    </div>
                    <div className="filter-group">
                        <label>Financial Year</label>
                        <select
                            value={filters.financialYear}
                            onChange={(e) => setFilters({
                                ...filters,
                                financialYear: e.target.value
                            })}
                        >
                            <option value="2024-25">2024-25</option>
                            <option value="2023-24">2023-24</option>
                            <option value="2022-23">2022-23</option>
                        </select>
                    </div>
                    <div className="filter-group">
                        <button
                            className="btn btn-primary"
                            onClick={generateRatioAnalysis}
                            disabled={loading}
                        >
                            Generate Analysis
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading">Generating ratio analysis...</div>
            ) : ratioData ? (
                <div className="analysis-content">
                    {renderFinancialSummary()}

                    <div className="ratios-section">
                        <h3>📈 Liquidity Ratios</h3>
                        <div className="ratios-grid">
                            {renderRatioCard(
                                'Current Ratio',
                                ratioData.ratios?.liquidityRatios?.currentRatio,
                                '> 2.0',
                                'Measures ability to pay short-term obligations',
                                'liquidity'
                            )}
                            {renderRatioCard(
                                'Quick Ratio',
                                ratioData.ratios?.liquidityRatios?.quickRatio,
                                '> 1.0',
                                'Measures immediate liquidity without inventory',
                                'liquidity'
                            )}
                            {renderRatioCard(
                                'Cash Ratio',
                                'N/A',
                                '> 0.2',
                                'Measures ability to pay with cash and equivalents',
                                'liquidity'
                            )}
                        </div>
                    </div>

                    <div className="ratios-section">
                        <h3>💰 Profitability Ratios</h3>
                        <div className="ratios-grid">
                            {renderRatioCard(
                                'Gross Profit Margin',
                                ratioData.ratios?.profitabilityRatios?.grossProfitMargin,
                                '> 20%',
                                'Percentage of revenue after cost of goods sold',
                                'profitability'
                            )}
                            {renderRatioCard(
                                'Net Profit Margin',
                                ratioData.ratios?.profitabilityRatios?.netProfitMargin,
                                '> 10%',
                                'Percentage of revenue remaining as profit',
                                'profitability'
                            )}
                            {renderRatioCard(
                                'Return on Assets',
                                ratioData.ratios?.profitabilityRatios?.returnOnAssets,
                                '> 5%',
                                'How efficiently assets generate profit',
                                'profitability'
                            )}
                            {renderRatioCard(
                                'Return on Equity',
                                'N/A',
                                '> 15%',
                                'Return generated on shareholders equity',
                                'profitability'
                            )}
                        </div>
                    </div>

                    <div className="ratios-section">
                        <h3>⚡ Efficiency Ratios</h3>
                        <div className="ratios-grid">
                            {renderRatioCard(
                                'Asset Turnover',
                                'N/A',
                                '> 1.0',
                                'How efficiently assets generate revenue',
                                'efficiency'
                            )}
                            {renderRatioCard(
                                'Inventory Turnover',
                                'N/A',
                                '> 6.0',
                                'How quickly inventory is sold',
                                'efficiency'
                            )}
                            {renderRatioCard(
                                'Receivables Turnover',
                                'N/A',
                                '> 8.0',
                                'How quickly receivables are collected',
                                'efficiency'
                            )}
                        </div>
                    </div>

                    <div className="ratios-section">
                        <h3>🏦 Leverage Ratios</h3>
                        <div className="ratios-grid">
                            {renderRatioCard(
                                'Debt to Assets',
                                ratioData.ratios?.leverageRatios?.debtToAssetRatio,
                                '< 50%',
                                'Percentage of assets financed by debt',
                                'leverage'
                            )}
                            {renderRatioCard(
                                'Debt to Equity',
                                ratioData.ratios?.leverageRatios?.debtToEquityRatio,
                                '< 100%',
                                'Amount of debt relative to equity',
                                'leverage'
                            )}
                            {renderRatioCard(
                                'Equity Ratio',
                                'N/A',
                                '> 50%',
                                'Percentage of assets financed by equity',
                                'leverage'
                            )}
                        </div>
                    </div>

                    <div className="ratios-section">
                        <h3>📅 Activity Ratios</h3>
                        <div className="ratios-grid">
                            <div className="ratio-card">
                                <div className="ratio-header">
                                    <h4>Working Capital</h4>
                                </div>
                                <div className="ratio-value">
                                    <span className="value">{formatCurrency((ratioData.summary?.currentAssets || 0) - (ratioData.summary?.currentLiabilities || 0))}</span>
                                </div>
                                <div className="ratio-interpretation">
                                    <p>Available short-term liquidity</p>
                                </div>
                            </div>
                            <div className="ratio-card">
                                <div className="ratio-header">
                                    <h4>Days in Inventory</h4>
                                </div>
                                <div className="ratio-value">
                                    <span className="value">N/A</span>
                                </div>
                                <div className="ratio-interpretation">
                                    <p>Average days to sell inventory</p>
                                </div>
                            </div>
                            <div className="ratio-card">
                                <div className="ratio-header">
                                    <h4>Days in Receivables</h4>
                                </div>
                                <div className="ratio-value">
                                    <span className="value">N/A</span>
                                </div>
                                <div className="ratio-interpretation">
                                    <p>Average days to collect receivables</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {ratioData.analysis && (
                        <div className="analysis-summary">
                            <h3>📋 Analysis Summary</h3>
                            <div className="analysis-cards">
                                <div className={`analysis-card ${ratioData.analysis.liquidity.status.toLowerCase()}`}>
                                    <h4>Liquidity Position</h4>
                                    <p className="status">{ratioData.analysis.liquidity.status}</p>
                                    <p>{ratioData.analysis.liquidity.interpretation}</p>
                                </div>
                                <div className={`analysis-card ${ratioData.analysis.profitability.status.toLowerCase()}`}>
                                    <h4>Profitability</h4>
                                    <p className="status">{ratioData.analysis.profitability.status}</p>
                                    <p>{ratioData.analysis.profitability.interpretation}</p>
                                </div>
                                <div className={`analysis-card ${ratioData.analysis.leverage.status.toLowerCase()}`}>
                                    <h4>Leverage</h4>
                                    <p className="status">{ratioData.analysis.leverage.status}</p>
                                    <p>{ratioData.analysis.leverage.interpretation}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="no-data">
                    <p>Click "Generate Analysis" to view financial ratios</p>
                </div>
            )}
        </div>
    );
};

export default RatioAnalysis;