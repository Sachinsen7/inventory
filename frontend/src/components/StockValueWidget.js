import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './StockValueWidget.css';

function StockValueWidget() {
    const [stockData, setStockData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    const fetchStockValue = async () => {
        try {
            setRefreshing(true);
            const response = await axios.get(`${backendUrl}/api/analytics/stock-value`);
            setStockData(response.data);
            setError(null);
        } catch (error) {
            console.error('Error fetching stock value:', error);
            setError('Failed to load stock value');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStockValue();

        // Auto-refresh every 5 minutes
        const interval = setInterval(fetchStockValue, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className="stock-value-widget loading">
                <div className="widget-header">
                    <h2>📦 Stock Value</h2>
                </div>
                <div className="loading-spinner">
                    <div className="spinner"></div>
                    <p>Loading stock data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="stock-value-widget error">
                <div className="widget-header">
                    <h2>📦 Stock Value</h2>
                    <button onClick={fetchStockValue} className="refresh-btn">
                        🔄 Retry
                    </button>
                </div>
                <div className="error-message">
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!stockData) {
        return null;
    }

    return (
        <div className="stock-value-widget">
            <div className="widget-header">
                <h2>📦 Stock Value & Inventory</h2>
                <button
                    onClick={fetchStockValue}
                    className={`refresh-btn ${refreshing ? 'refreshing' : ''}`}
                    disabled={refreshing}
                >
                    🔄 {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {/* Summary Cards */}
            <div className="stock-summary">
                <div className="summary-card total">
                    <div className="card-icon">📦</div>
                    <div className="card-content">
                        <div className="card-label">Total Items</div>
                        <div className="card-value">{stockData.totalItems}</div>
                        <div className="card-sublabel">In Inventory</div>
                    </div>
                </div>

                <div className="summary-card godown">
                    <div className="card-icon">🏭</div>
                    <div className="card-content">
                        <div className="card-label">In Godown</div>
                        <div className="card-value">{stockData.inGodown}</div>
                        <div className="card-sublabel">Stored Items</div>
                    </div>
                </div>

                <div className="summary-card delivery">
                    <div className="card-icon">🚚</div>
                    <div className="card-content">
                        <div className="card-label">Ready for Delivery</div>
                        <div className="card-value">{stockData.readyForDelivery}</div>
                        <div className="card-sublabel">Pending Dispatch</div>
                    </div>
                </div>

                <div className="summary-card barcodes">
                    <div className="card-icon">🏷️</div>
                    <div className="card-content">
                        <div className="card-label">Total Barcodes</div>
                        <div className="card-value">{stockData.totalBarcodes}</div>
                        <div className="card-sublabel">Generated</div>
                    </div>
                </div>
            </div>

            {/* Barcode Statistics */}
            <div className="barcode-stats">
                <h3>🏷️ Barcode Statistics</h3>
                <div className="stats-grid">
                    <div className="stat-item scanned">
                        <div className="stat-icon">✅</div>
                        <div className="stat-info">
                            <div className="stat-value">{stockData.scannedBarcodes}</div>
                            <div className="stat-label">Scanned</div>
                        </div>
                    </div>
                    <div className="stat-item unscanned">
                        <div className="stat-icon">⏳</div>
                        <div className="stat-info">
                            <div className="stat-value">{stockData.unscannedBarcodes}</div>
                            <div className="stat-label">Unscanned</div>
                        </div>
                    </div>
                    <div className="stat-item percentage">
                        <div className="stat-icon">📊</div>
                        <div className="stat-info">
                            <div className="stat-value">
                                {stockData.totalBarcodes > 0
                                    ? Math.round((stockData.scannedBarcodes / stockData.totalBarcodes) * 100)
                                    : 0}%
                            </div>
                            <div className="stat-label">Scan Rate</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Weight Statistics */}
            {(stockData.totalGrossWeight > 0 || stockData.totalNetWeight > 0) && (
                <div className="weight-stats">
                    <h3>⚖️ Weight Statistics</h3>
                    <div className="weight-grid">
                        <div className="weight-item">
                            <div className="weight-label">Gross Weight</div>
                            <div className="weight-value">{stockData.totalGrossWeight.toFixed(2)} kg</div>
                        </div>
                        <div className="weight-item">
                            <div className="weight-label">Net Weight</div>
                            <div className="weight-value">{stockData.totalNetWeight.toFixed(2)} kg</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Godown Breakdown */}
            {stockData.byGodown && stockData.byGodown.length > 0 && (
                <div className="godown-breakdown">
                    <h3>🏭 Stock by Godown</h3>
                    <div className="godown-list">
                        {stockData.byGodown.map((godown, index) => (
                            <div key={index} className="godown-item">
                                <div className="godown-name">{godown._id || 'Unknown'}</div>
                                <div className="godown-count">
                                    <span className="count-value">{godown.count}</span>
                                    <span className="count-label">items</span>
                                </div>
                                <div className="godown-bar">
                                    <div
                                        className="godown-bar-fill"
                                        style={{
                                            width: `${(godown.count / stockData.inGodown) * 100}%`
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="widget-footer">
                <small>Last updated: {new Date().toLocaleTimeString('en-IN')}</small>
            </div>
        </div>
    );
}

export default StockValueWidget;
