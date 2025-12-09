import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Barcode from 'react-barcode';
import { showToast } from '../utils/toastNotifications';
import './StockCheckingPage.css';

const StockCheckingPage = () => {
    const navigate = useNavigate();
    const [godowns, setGodowns] = useState([]);
    const [selectedGodown, setSelectedGodown] = useState(null);
    const [productTypes, setProductTypes] = useState([]);
    const [selectedProductType, setSelectedProductType] = useState(null);
    const [expectedItems, setExpectedItems] = useState([]);
    const [scannedItems, setScannedItems] = useState([]);
    const [missingItems, setMissingItems] = useState([]);
    const [wrongScans, setWrongScans] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [loading, setLoading] = useState(false);
    const inputRef = useRef(null);

    const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchGodowns();
    }, []);

    useEffect(() => {
        if (isScanning && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isScanning]);

    // Auto-scan when barcode is entered
    useEffect(() => {
        if (isScanning && barcodeInput.trim()) {
            const timer = setTimeout(() => {
                handleBarcodeScan(barcodeInput.trim());
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [barcodeInput, isScanning]);

    const fetchGodowns = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/godowns`);
            setGodowns(response.data);
        } catch (error) {
            console.error('Error fetching godowns:', error);
            showToast.error('Failed to load godowns');
        }
    };

    const handleGodownSelect = async (godown) => {
        setSelectedGodown(godown);
        setLoading(true);
        try {
            const response = await axios.get(`${backendUrl}/api/stock-check/godown/${godown._id}/product-types`);
            setProductTypes(response.data.productTypes);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching product types:', error);
            showToast.error('Failed to load product types');
            setLoading(false);
        }
    };

    const handleProductTypeSelect = async (productType) => {
        setSelectedProductType(productType);
        setLoading(true);
        try {
            const response = await axios.get(
                `${backendUrl}/api/stock-check/godown/${selectedGodown._id}/product-type/${productType.prefix}`
            );
            setExpectedItems(response.data.items);
            setMissingItems(response.data.items);
            setScannedItems([]);
            setWrongScans([]);
            setLoading(false);
            showToast.success(`Loaded ${response.data.items.length} ${productType.name} items`);
        } catch (error) {
            console.error('Error fetching items:', error);
            showToast.error('Failed to load items');
            setLoading(false);
        }
    };

    const handleStartScanning = () => {
        if (!selectedProductType) {
            showToast.warning('Please select a product type first');
            return;
        }
        setIsScanning(true);
        showToast.success('📷 Scanner activated! Start scanning barcodes.');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const handleStopScanning = () => {
        setIsScanning(false);
        setBarcodeInput('');
        showToast.info('Scanner stopped');
    };

    const handleBarcodeInput = (e) => {
        setBarcodeInput(e.target.value);
    };

    const handleBarcodeKeyDown = (e) => {
        if (e.key === 'Enter' && barcodeInput.trim()) {
            handleBarcodeScan(barcodeInput.trim());
        }
    };

    const handleBarcodeScan = async (barcode) => {
        if (!barcode) return;

        // Check if already scanned
        if (scannedItems.some(item => item.barcode === barcode)) {
            showToast.warning(`⚠️ Already scanned: ${barcode}`);
            setBarcodeInput('');
            inputRef.current?.focus();
            return;
        }

        // Check if barcode matches expected product type
        const barcodePrefix = barcode.substring(0, 3);
        if (barcodePrefix !== selectedProductType.prefix) {
            setWrongScans(prev => [...prev, {
                barcode,
                expectedPrefix: selectedProductType.prefix,
                actualPrefix: barcodePrefix,
                time: new Date().toLocaleTimeString()
            }]);
            showToast.error(`❌ Wrong box! Expected ${selectedProductType.name} (${selectedProductType.prefix}), got ${barcodePrefix}`);
            setBarcodeInput('');
            inputRef.current?.focus();
            return;
        }

        // Check if barcode is in expected items
        const expectedItem = expectedItems.find(item => item.barcode === barcode);
        if (!expectedItem) {
            showToast.warning(`⚠️ Barcode ${barcode} not in expected list`);
            setBarcodeInput('');
            inputRef.current?.focus();
            return;
        }

        // Valid scan
        setScannedItems(prev => [...prev, {
            ...expectedItem,
            scanTime: new Date().toLocaleTimeString()
        }]);
        setMissingItems(prev => prev.filter(item => item.barcode !== barcode));

        const progress = scannedItems.length + 1;
        const total = expectedItems.length;
        showToast.success(`✅ ${progress} out of ${total} - ${barcode}`);

        setBarcodeInput('');
        inputRef.current?.focus();
    };

    const handleClickToScan = (barcode) => {
        if (isScanning) {
            setBarcodeInput(barcode);
            // Trigger scan immediately
            setTimeout(() => handleBarcodeScan(barcode), 100);
        }
    };

    const handleManualMarkAsFound = (barcode) => {
        const item = missingItems.find(i => i.barcode === barcode);
        if (item) {
            setScannedItems(prev => [...prev, {
                ...item,
                scanTime: new Date().toLocaleTimeString(),
                manuallyMarked: true
            }]);
            setMissingItems(prev => prev.filter(i => i.barcode !== barcode));
            showToast.success(`✓ Marked as found: ${barcode}`);
        }
    };

    const handleSubmitReport = async () => {
        if (scannedItems.length === 0) {
            showToast.warning('No items scanned yet');
            return;
        }

        try {
            const report = {
                godownId: selectedGodown._id,
                godownName: selectedGodown.name,
                productType: selectedProductType.name,
                productPrefix: selectedProductType.prefix,
                expectedCount: expectedItems.length,
                scannedCount: scannedItems.length,
                missingCount: missingItems.length,
                wrongScansCount: wrongScans.length,
                scannedItems: scannedItems.map(item => ({
                    barcode: item.barcode,
                    scanTime: item.scanTime,
                    manuallyMarked: item.manuallyMarked || false
                })),
                missingItems: missingItems.map(item => ({
                    barcode: item.barcode,
                    itemCode: item.itemCode
                })),
                wrongScans: wrongScans,
                submittedAt: new Date(),
                submittedBy: 'User'
            };

            await axios.post(`${backendUrl}/api/stock-check/submit-report`, report);
            showToast.success('✅ Stock check report submitted successfully!');

            // Reset
            setSelectedProductType(null);
            setExpectedItems([]);
            setScannedItems([]);
            setMissingItems([]);
            setWrongScans([]);
            setIsScanning(false);
        } catch (error) {
            console.error('Error submitting report:', error);
            showToast.error('Failed to submit report');
        }
    };

    const handleReset = () => {
        setSelectedProductType(null);
        setExpectedItems([]);
        setScannedItems([]);
        setMissingItems([]);
        setWrongScans([]);
        setIsScanning(false);
        setBarcodeInput('');
    };

    const progress = expectedItems.length > 0
        ? Math.round((scannedItems.length / expectedItems.length) * 100)
        : 0;

    return (
        <div className="stock-checking-container">
            <div className="stock-checking-content">
                <h1 className="page-title">📦 Stock Checking - Barcode Scanner</h1>

                {/* Step 1: Select Godown */}
                {!selectedGodown && (
                    <div className="selection-section">
                        <h2>Step 1: Select Godown</h2>
                        <div className="godown-grid">
                            {godowns.map(godown => (
                                <div
                                    key={godown._id}
                                    className="godown-card"
                                    onClick={() => handleGodownSelect(godown)}
                                >
                                    <h3>{godown.name}</h3>
                                    <p>{godown.city}, {godown.state}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Select Product Type */}
                {selectedGodown && !selectedProductType && (
                    <div className="selection-section">
                        <div className="section-header">
                            <h2>Step 2: Select Product Type</h2>
                            <button className="btn-secondary" onClick={() => setSelectedGodown(null)}>
                                ← Change Godown
                            </button>
                        </div>
                        <p className="godown-info">Godown: <strong>{selectedGodown.name}</strong></p>

                        {loading ? (
                            <div className="loading">Loading product types...</div>
                        ) : (
                            <div className="product-type-grid">
                                {productTypes.map(type => (
                                    <div
                                        key={type.prefix}
                                        className="product-type-card"
                                        onClick={() => handleProductTypeSelect(type)}
                                    >
                                        <div className="product-type-icon">📦</div>
                                        <h3>{type.name}</h3>
                                        <p className="product-type-prefix">Code: {type.prefix}</p>
                                        <p className="product-type-count">{type.count} items</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Scan Items */}
                {selectedProductType && (
                    <div className="scanning-section">
                        <div className="section-header">
                            <h2>Step 3: Scan Items</h2>
                            <button className="btn-secondary" onClick={handleReset}>
                                ← Start Over
                            </button>
                        </div>

                        {/* Product Info */}
                        <div className="product-info-card">
                            <h3>{selectedProductType.name}</h3>
                            <p>Godown: {selectedGodown.name} | Code: {selectedProductType.prefix}</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="progress-section">
                            <div className="progress-stats">
                                <div className="stat-item stat-total">
                                    <span className="stat-label">Total</span>
                                    <span className="stat-value">{expectedItems.length}</span>
                                </div>
                                <div className="stat-item stat-scanned">
                                    <span className="stat-label">Scanned</span>
                                    <span className="stat-value">{scannedItems.length}</span>
                                </div>
                                <div className="stat-item stat-missing">
                                    <span className="stat-label">Missing</span>
                                    <span className="stat-value">{missingItems.length}</span>
                                </div>
                                <div className="stat-item stat-wrong">
                                    <span className="stat-label">Wrong Scans</span>
                                    <span className="stat-value">{wrongScans.length}</span>
                                </div>
                            </div>

                            <div className="progress-bar-container">
                                <div className="progress-bar" style={{ width: `${progress}%` }}>
                                    <span className="progress-text">{progress}%</span>
                                </div>
                            </div>

                            <div className="progress-label">
                                {scannedItems.length} out of {expectedItems.length} items scanned
                            </div>
                        </div>

                        {/* Scanner Controls */}
                        <div className="scanner-controls">
                            {!isScanning ? (
                                <button className="btn-primary btn-large" onClick={handleStartScanning}>
                                    ▶️ Start Scanning
                                </button>
                            ) : (
                                <>
                                    <button className="btn-danger" onClick={handleStopScanning}>
                                        ⏹️ Stop Scanning
                                    </button>
                                    <div className="scanner-status">
                                        <span className="status-indicator"></span>
                                        Scanner Active - Click barcodes below or use scanner gun
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Hidden input for IoT scanner */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={barcodeInput}
                            onChange={handleBarcodeInput}
                            onKeyDown={handleBarcodeKeyDown}
                            style={{
                                position: 'absolute',
                                left: '-9999px',
                                width: '1px',
                                height: '1px',
                            }}
                            autoFocus={isScanning}
                        />

                        {/* Missing Items with Barcodes */}
                        {missingItems.length > 0 && (
                            <div className="items-section missing-section">
                                <h3>⚠️ Items to Scan ({missingItems.length})</h3>
                                <p style={{ marginBottom: '15px', color: '#666' }}>
                                    {isScanning ? 'Click any barcode below to scan it, or use your scanner gun' : 'Start scanning to begin'}
                                </p>
                                <div className="barcode-grid">
                                    {missingItems.slice(0, 50).map((item, index) => (
                                        <div
                                            key={index}
                                            className={`barcode-card ${isScanning ? 'clickable' : ''}`}
                                            onClick={() => handleClickToScan(item.barcode)}
                                        >
                                            <div className="barcode-visual">
                                                <Barcode
                                                    value={item.barcode}
                                                    width={1.5}
                                                    height={50}
                                                    fontSize={12}
                                                    margin={5}
                                                />
                                            </div>
                                            <div className="barcode-info">
                                                <strong>{item.itemCode}</strong>
                                                {isScanning && <span className="click-hint">← Click to scan</span>}
                                            </div>
                                            <button
                                                className="btn-small btn-success"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleManualMarkAsFound(item.barcode);
                                                }}
                                            >
                                                ✓ Found
                                            </button>
                                        </div>
                                    ))}
                                    {missingItems.length > 50 && (
                                        <p className="more-items">... and {missingItems.length - 50} more</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Scanned Items with Barcodes */}
                        {scannedItems.length > 0 && (
                            <div className="items-section scanned-section">
                                <h3>✅ Scanned Items ({scannedItems.length})</h3>
                                <div className="barcode-grid">
                                    {scannedItems.slice(-20).reverse().map((item, index) => (
                                        <div key={index} className="barcode-card scanned-card">
                                            <div className="barcode-visual">
                                                <Barcode
                                                    value={item.barcode}
                                                    width={1.5}
                                                    height={50}
                                                    fontSize={12}
                                                    margin={5}
                                                />
                                            </div>
                                            <div className="barcode-info">
                                                <strong>{item.itemCode}</strong>
                                                <span className="scan-time">{item.scanTime}</span>
                                                {item.manuallyMarked && <span className="manual-badge">Manual</span>}
                                            </div>
                                        </div>
                                    ))}
                                    {scannedItems.length > 20 && (
                                        <p className="more-items">... and {scannedItems.length - 20} more</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Wrong Scans */}
                        {wrongScans.length > 0 && (
                            <div className="items-section wrong-section">
                                <h3>❌ Wrong Scans ({wrongScans.length})</h3>
                                <div className="items-list">
                                    {wrongScans.map((scan, index) => (
                                        <div key={index} className="item-card wrong-item">
                                            <div className="item-info">
                                                <strong>{scan.barcode}</strong>
                                                <span>Expected: {scan.expectedPrefix}, Got: {scan.actualPrefix}</span>
                                                <span>{scan.time}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completion Status */}
                        {missingItems.length === 0 && scannedItems.length > 0 && (
                            <div className="completion-card">
                                <div className="completion-icon">🎉</div>
                                <h3>Stock Check Complete!</h3>
                                <p>All {expectedItems.length} items have been verified</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        {scannedItems.length > 0 && (
                            <div className="submit-section">
                                <button className="btn-primary btn-large" onClick={handleSubmitReport}>
                                    📊 Submit Report to Admin
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockCheckingPage;
