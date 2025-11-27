import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Barcode from "react-barcode";
import { showToast } from "../utils/toastNotifications";

const SelectForm = () => {
  const [inputValue, setInputValue] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBarcodes, setScannedBarcodes] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const [barcodeMap, setBarcodeMap] = useState({});
  const inputRef = useRef(null);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  // Fetch available products on mount
  useEffect(() => {
    fetchAvailableProducts();
  }, []);

  const fetchAvailableProducts = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/barcodes`);
      const products = [];
      const mapping = {};

      response.data.forEach((barcode) => {
        const productName = barcode.product || "Unknown Product";
        const skuName = barcode.skun || "";
        const packed = barcode.packed || "";
        const batch = barcode.batch || "";

        if (barcode.batchNumbers && Array.isArray(barcode.batchNumbers)) {
          barcode.batchNumbers.forEach((bn) => {
            if (barcode.skuc && bn) {
              const skuCode = String(barcode.skuc) + String(bn);
              products.push({
                sku: skuCode,
                product: productName,
                skuName: skuName,
                packed: packed,
                batch: batch,
              });
              mapping[skuCode] = {
                product: productName,
                skuName: skuName,
                packed: packed,
                batch: batch,
              };
            }
          });
        }
      });

      setAvailableProducts(products);
      setBarcodeMap(mapping);
    } catch (error) {
      console.error("Error fetching products:", error);
      showToast.error("Could not load products");
    }
  };

  // Auto-save when barcode is entered
  useEffect(() => {
    if (isScanning && inputValue.trim()) {
      const timer = setTimeout(() => {
        handleSaveBarcode(inputValue.trim());
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [inputValue, isScanning]);

  const handleSaveBarcode = async (barcode) => {
    // Check if already scanned
    if (scannedBarcodes.some((item) => item.sku === barcode)) {
      showToast.warning(`⚠️ Already scanned: ${barcode}`);
      setInputValue("");
      inputRef.current?.focus();
      return;
    }

    try {
      await axios.post(`${backendUrl}/api/save`, { inputValue: barcode });

      const productInfo = barcodeMap[barcode] || {
        product: "Unknown Product",
        skuName: "",
        packed: "",
        batch: "",
      };

      setScannedBarcodes((prev) => [
        { sku: barcode, ...productInfo, time: new Date().toLocaleTimeString() },
        ...prev,
      ]);

      setAvailableProducts((prev) => prev.filter((p) => p.sku !== barcode));
      setInputValue("");
      showToast.success(`✓ Scanned: ${barcode}`);
      inputRef.current?.focus();
    } catch (error) {
      console.error("Error saving barcode:", error);
      showToast.error("Error saving barcode");
    }
  };

  const handleStartScanning = () => {
    setIsScanning(true);
    showToast.success("📷 Scanner activated! Scan barcodes now.");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    setScannedBarcodes([]);
    setInputValue("");
    showToast.info("Scanner stopped. Session cleared.");
    fetchAvailableProducts(); // Refresh product list
  };

  const toggleProductList = () => {
    setShowAllProducts(!showAllProducts);
  };

  const styles = {
    container: {
      background: "linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)",
      backgroundSize: "400% 400%",
      animation: "gradientAnimation 12s ease infinite",
      minHeight: "100vh",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "'Roboto', sans-serif",
    },
    card: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      padding: "30px",
      borderRadius: "20px",
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
      width: "90%",
      maxWidth: "800px",
      marginBottom: "20px",
    },
    title: {
      fontSize: "2.5rem",
      color: "#9900ef",
      textAlign: "center",
      marginBottom: "10px",
      fontWeight: "bold",
    },
    subtitle: {
      fontSize: "1.1rem",
      color: "#666",
      textAlign: "center",
      marginBottom: "20px",
    },
    input: {
      width: "100%",
      padding: "18px",
      fontSize: "20px",
      border: "3px solid #ddd",
      borderRadius: "12px",
      textAlign: "center",
      fontWeight: "bold",
      marginBottom: "20px",
      transition: "all 0.3s ease",
    },
    inputActive: {
      border: "3px solid #4CAF50",
      boxShadow: "0 0 15px rgba(76, 175, 80, 0.4)",
      backgroundColor: "#f0fff0",
    },
    buttonContainer: {
      display: "flex",
      gap: "15px",
      justifyContent: "center",
      flexWrap: "wrap",
      marginBottom: "20px",
    },
    button: {
      padding: "15px 30px",
      fontSize: "18px",
      fontWeight: "bold",
      border: "none",
      borderRadius: "12px",
      cursor: "pointer",
      transition: "all 0.3s ease",
      minWidth: "150px",
    },
    startButton: {
      background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
      color: "white",
    },
    stopButton: {
      background: "linear-gradient(135deg, #f44336 0%, #da190b 100%)",
      color: "white",
    },
    showProductsButton: {
      background: "linear-gradient(135deg, #FF9800 0%, #F57C00 100%)",
      color: "white",
    },
    statsCard: {
      display: "flex",
      justifyContent: "space-around",
      padding: "20px",
      backgroundColor: "#f5f5f5",
      borderRadius: "12px",
      marginBottom: "20px",
    },
    stat: {
      textAlign: "center",
    },
    statLabel: {
      fontSize: "14px",
      color: "#666",
      marginBottom: "5px",
      textTransform: "uppercase",
    },
    statValue: {
      fontSize: "32px",
      fontWeight: "bold",
      color: "#9900ef",
    },
    productList: {
      maxHeight: "400px",
      overflowY: "auto",
      backgroundColor: "#f9f9f9",
      borderRadius: "12px",
      padding: "15px",
    },
    productItem: {
      padding: "12px",
      marginBottom: "8px",
      backgroundColor: "white",
      borderRadius: "8px",
      borderLeft: "4px solid #9900ef",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    scannedItem: {
      padding: "12px",
      marginBottom: "8px",
      backgroundColor: "#e8f5e9",
      borderRadius: "8px",
      borderLeft: "4px solid #4CAF50",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    productName: {
      fontWeight: "bold",
      color: "#333",
      marginBottom: "4px",
    },
    productDetails: {
      fontSize: "14px",
      color: "#666",
    },
    emptyState: {
      textAlign: "center",
      padding: "40px",
      color: "#999",
      fontSize: "18px",
    },
  };

  const globalStyles = `
    @keyframes gradientAnimation {
      0% { background-position: 0% 50%; }
      25% { background-position: 50% 100%; }
      50% { background-position: 100% 50%; }
      75% { background-position: 50% 0%; }
      100% { background-position: 0% 50%; }
    }
  `;

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>

      {/* Main Card */}
      <div style={styles.card}>
        <h1 style={styles.title}>📦 Barcode Scanner</h1>
        <p style={styles.subtitle}>
          {isScanning
            ? "Scan barcodes with your scanner device"
            : "Click 'Start Scanning' to begin"}
        </p>

        {/* Product Selector Dropdown */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold", color: "#666" }}>
            Select Product:
          </label>
          <select
            style={{
              width: "100%",
              padding: "15px",
              fontSize: "16px",
              border: "2px solid #ddd",
              borderRadius: "12px",
              backgroundColor: "white",
              cursor: "pointer",
            }}
            onChange={(e) => {
              if (e.target.value && isScanning) {
                setInputValue(e.target.value);
              }
            }}
            disabled={!isScanning}
            value=""
          >
            <option value="">-- Select a product to scan --</option>
            {availableProducts.map((product, index) => (
              <option key={index} value={product.sku}>
                {product.product} - SKU: {product.sku}
              </option>
            ))}
          </select>
        </div>

        {/* Manual Input Field (for scanner devices) */}
        <div style={{ marginBottom: "10px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold", color: "#666" }}>
            Or Scan Barcode:
          </label>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isScanning ? "📷 Scan with device..." : "Click Start to begin"}
            disabled={!isScanning}
            style={{
              ...styles.input,
              ...(isScanning ? styles.inputActive : {}),
            }}
            autoFocus={isScanning}
          />
        </div>

        {/* Buttons */}
        <div style={styles.buttonContainer}>
          {!isScanning ? (
            <button
              style={{ ...styles.button, ...styles.startButton }}
              onClick={handleStartScanning}
            >
              ▶️ Start Scanning
            </button>
          ) : (
            <button
              style={{ ...styles.button, ...styles.stopButton }}
              onClick={handleStopScanning}
            >
              ⏹️ Stop & Clear
            </button>
          )}

          <button
            style={{ ...styles.button, ...styles.showProductsButton }}
            onClick={toggleProductList}
          >
            {showAllProducts ? "Hide Products" : "📋 Show All Products"}
          </button>
        </div>

        {/* Statistics */}
        {isScanning && (
          <div style={styles.statsCard}>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Scanned</div>
              <div style={styles.statValue}>{scannedBarcodes.length}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Remaining</div>
              <div style={styles.statValue}>{availableProducts.length}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Status</div>
              <div style={{ ...styles.statValue, color: "#4CAF50" }}>✓ ACTIVE</div>
            </div>
          </div>
        )}
      </div>

      {/* Scanned Barcodes List */}
      {scannedBarcodes.length > 0 && (
        <div style={styles.card}>
          <h3 style={{ color: "#4CAF50", marginBottom: "15px" }}>
            ✓ Scanned Barcodes ({scannedBarcodes.length})
          </h3>
          <div style={styles.productList}>
            {scannedBarcodes.map((item, index) => (
              <div key={index} style={styles.scannedItem}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "15px" }}>
                  <div style={{ flex: 1, minWidth: "250px" }}>
                    <div style={styles.productName}>
                      #{scannedBarcodes.length - index}: {item.product}
                    </div>
                    <div style={styles.productDetails}>
                      SKU: {item.sku} | Time: {item.time}
                      {item.packed && ` | Packed: ${item.packed}`}
                      {item.batch && ` | Batch: ${item.batch}`}
                    </div>
                  </div>
                  <div style={{
                    backgroundColor: "white",
                    padding: "8px",
                    borderRadius: "8px",
                    border: "2px solid #4CAF50",
                    textAlign: "center"
                  }}>
                    <Barcode
                      value={item.sku}
                      width={1.5}
                      height={40}
                      fontSize={12}
                      margin={3}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Products List */}
      {showAllProducts && (
        <div style={styles.card}>
          <h3 style={{ color: "#9900ef", marginBottom: "15px" }}>
            📋 Available Products ({availableProducts.length})
          </h3>
          {availableProducts.length > 0 ? (
            <div style={styles.productList}>
              {availableProducts.map((item, index) => (
                <div
                  key={index}
                  style={{
                    ...styles.productItem,
                    cursor: isScanning ? "pointer" : "default",
                  }}
                  onClick={() => {
                    if (isScanning) {
                      setInputValue(item.sku);
                    }
                  }}
                  onMouseEnter={(e) => {
                    if (isScanning) {
                      e.currentTarget.style.backgroundColor = "#f0e6ff";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "white";
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "15px" }}>
                    <div style={{ flex: 1, minWidth: "250px" }}>
                      <div style={styles.productName}>
                        {item.product}
                        {isScanning && <span style={{ color: "#4CAF50", marginLeft: "10px", fontSize: "14px" }}>← Click to scan</span>}
                      </div>
                      <div style={styles.productDetails}>
                        <strong style={{ color: "#9900ef" }}>SKU: {item.sku}</strong>
                        {item.skuName && ` | ${item.skuName}`}
                        <br />
                        {item.packed && `Packed: ${item.packed}`}
                        {item.batch && ` | Batch: ${item.batch}`}
                      </div>
                    </div>
                    <div style={{
                      backgroundColor: "white",
                      padding: "10px",
                      borderRadius: "8px",
                      border: "2px dashed #9900ef",
                      textAlign: "center"
                    }}>
                      <Barcode
                        value={item.sku}
                        width={1.5}
                        height={50}
                        fontSize={14}
                        margin={5}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={{ fontSize: "48px", marginBottom: "10px" }}>📭</div>
              <div>No products available</div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {!isScanning && scannedBarcodes.length === 0 && (
        <div style={{ ...styles.card, backgroundColor: "rgba(255, 255, 255, 0.9)" }}>
          <h4 style={{ color: "#666", marginBottom: "10px" }}>💡 How to use:</h4>
          <ol style={{ textAlign: "left", color: "#666", lineHeight: "1.8" }}>
            <li>Click "Start Scanning" to activate the scanner</li>
            <li><strong>Select from dropdown</strong> - Choose product by name (easier!)</li>
            <li><strong>Or scan with device</strong> - Use barcode scanner</li>
            <li><strong>Or click from list</strong> - Click "Show All Products" and click any product</li>
            <li>Each barcode is automatically saved</li>
            <li>Duplicate barcodes are prevented automatically</li>
            <li>Click "Stop & Clear" to end the session</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default SelectForm;
