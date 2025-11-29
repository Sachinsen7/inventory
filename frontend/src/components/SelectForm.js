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
      // Fetch only unscanned barcodes
      const response = await axios.get(`${backendUrl}/api/barcodes?is_scanned=false`);
      const products = [];
      const mapping = {};

      response.data.forEach((barcode) => {
        const productName = barcode.product || "Unknown Product";
        const skuName = barcode.skun || "";
        const packed = barcode.packed || "";
        const batch = barcode.batch || "";
        const shift = barcode.shift || "";
        const location = barcode.location || "";
        const currentTime = barcode.currentTime || "";
        const rewinder = barcode.rewinder || "";
        const edge = barcode.edge || "";
        const winder = barcode.winder || "";
        const mixer = barcode.mixer || "";

        // Get individual barcode weights (Map object)
        const barcodeWeights = barcode.barcodeWeights || {};

        if (barcode.batchNumbers && Array.isArray(barcode.batchNumbers)) {
          barcode.batchNumbers.forEach((bn) => {
            if (barcode.skuc && bn) {
              const skuCode = String(barcode.skuc) + String(bn);

              // Get individual weight for this specific barcode
              const individualWeight = barcodeWeights[skuCode] || barcode.weight || "";

              products.push({
                sku: skuCode,
                product: productName,
                skuName: skuName,
                packed: packed,
                batch: batch,
                weight: individualWeight, // Individual weight for this barcode
                shift: shift,
                location: location,
                currentTime: currentTime,
                rewinder: rewinder,
                edge: edge,
                winder: winder,
                mixer: mixer,
              });
              mapping[skuCode] = {
                product: productName,
                skuName: skuName,
                packed: packed,
                batch: batch,
                weight: individualWeight, // Individual weight for this barcode
                shift: shift,
                location: location,
                currentTime: currentTime,
                rewinder: rewinder,
                edge: edge,
                winder: winder,
                mixer: mixer,
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
        weight: "",
        shift: "",
        location: "",
        currentTime: "",
        rewinder: "",
        edge: "",
        winder: "",
        mixer: "",
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
    setShowAllProducts(true); // Automatically show available products
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

  const handlePrintItem = (item) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    printWindow.document.write(`
      <html>
        <head>
          <title>Print Product Details - ${item.sku}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #4CAF50;
              padding-bottom: 20px;
            }
            .header h1 {
              color: #4CAF50;
              margin: 0;
              font-size: 28px;
            }
            .barcode-section {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background: #f5f5f5;
              border-radius: 10px;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin: 20px 0;
            }
            .detail-item {
              padding: 12px;
              background: #f9f9f9;
              border-left: 4px solid #4CAF50;
              border-radius: 5px;
            }
            .detail-label {
              font-weight: bold;
              color: #666;
              font-size: 12px;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            .detail-value {
              color: #333;
              font-size: 16px;
              font-weight: 600;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              color: #999;
              font-size: 12px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📦 Product Details</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Scanned on: ${item.time}</p>
          </div>
          
          <div class="barcode-section">
            <h2 style="margin: 0 0 10px 0; color: #333;">Barcode: ${item.sku}</h2>
            <svg id="barcode"></svg>
          </div>

          <div class="details-grid">
            <div class="detail-item">
              <div class="detail-label">Product Name</div>
              <div class="detail-value">${item.product || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">SKU Code</div>
              <div class="detail-value">${item.sku || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">SKU Name</div>
              <div class="detail-value">${item.skuName || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Weight</div>
              <div class="detail-value">${item.weight || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Packed By</div>
              <div class="detail-value">${item.packed || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Batch No</div>
              <div class="detail-value">${item.batch || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Shift</div>
              <div class="detail-value">${item.shift || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Location</div>
              <div class="detail-value">${item.location || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Packing Date</div>
              <div class="detail-value">${item.currentTime || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Rewinder Operator</div>
              <div class="detail-value">${item.rewinder || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Edge Cut Operator</div>
              <div class="detail-value">${item.edge || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Winder Operator</div>
              <div class="detail-value">${item.winder || "N/A"}</div>
            </div>
            <div class="detail-item" style="grid-column: 1 / -1;">
              <div class="detail-label">Mixer Operator</div>
              <div class="detail-value">${item.mixer || "N/A"}</div>
            </div>
          </div>

          <div class="footer">
            <p>Generated by Inventory Management System</p>
          </div>

          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            JsBarcode("#barcode", "${item.sku}", {
              format: "CODE128",
              width: 2,
              height: 80,
              displayValue: true,
              fontSize: 20,
              margin: 10
            });
            setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      padding: "20px",
      marginBottom: "15px",
      backgroundColor: "#e8f5e9",
      borderRadius: "12px",
      borderLeft: "6px solid #4CAF50",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
    },
    productName: {
      fontWeight: "bold",
      color: "#333",
      marginBottom: "10px",
      fontSize: "20px",
    },
    productDetails: {
      fontSize: "16px",
      color: "#333",
      lineHeight: "1.8",
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

    /* Mobile responsive styles */
    @media (max-width: 768px) {
      .scanned-product-name {
        font-size: 22px !important;
      }
      .scanned-product-details {
        font-size: 17px !important;
        line-height: 2 !important;
      }
      .detail-row-mobile {
        display: block !important;
        margin-bottom: 8px !important;
        padding: 8px 0 !important;
        border-bottom: 1px solid #ddd;
      }
      .detail-label-mobile {
        font-weight: bold !important;
        color: #4CAF50 !important;
        display: inline-block !important;
        min-width: 120px !important;
      }
      .detail-value-mobile {
        color: #333 !important;
        font-weight: 600 !important;
      }
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
            ? "Recently generated barcodes shown below - Use IoT scanner or click to scan"
            : "Click 'Start Scanning' to see recently generated barcodes"}
        </p>

        {/* Hidden input for IoT scanner device */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          style={{
            position: "absolute",
            left: "-9999px",
            width: "1px",
            height: "1px",
          }}
          autoFocus={isScanning}
        />

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
                    <div style={styles.productName} className="scanned-product-name">
                      #{scannedBarcodes.length - index}: {item.product}
                    </div>
                    <div style={styles.productDetails} className="scanned-product-details">
                      <div className="detail-row-mobile">
                        <span className="detail-label-mobile">🏷️ SKU Code:</span>
                        <span className="detail-value-mobile"> {item.sku}</span>
                      </div>
                      <div className="detail-row-mobile">
                        <span className="detail-label-mobile">🕐 Scan Time:</span>
                        <span className="detail-value-mobile"> {item.time}</span>
                      </div>
                      {item.skuName && (
                        <div className="detail-row-mobile">
                          <span className="detail-label-mobile">📦 SKU Name:</span>
                          <span className="detail-value-mobile"> {item.skuName}</span>
                        </div>
                      )}
                      {item.weight && (
                        <div className="detail-row-mobile">
                          <span className="detail-label-mobile">⚖️ Weight:</span>
                          <span className="detail-value-mobile"> {item.weight}</span>
                        </div>
                      )}
                      {item.packed && (
                        <div className="detail-row-mobile">
                          <span className="detail-label-mobile">👤 Packed By:</span>
                          <span className="detail-value-mobile"> {item.packed}</span>
                        </div>
                      )}
                      {item.batch && (
                        <div className="detail-row-mobile">
                          <span className="detail-label-mobile">🔢 Batch No:</span>
                          <span className="detail-value-mobile"> {item.batch}</span>
                        </div>
                      )}
                      {item.shift && (
                        <div className="detail-row-mobile">
                          <span className="detail-label-mobile">🌓 Shift:</span>
                          <span className="detail-value-mobile"> {item.shift}</span>
                        </div>
                      )}
                      {item.location && (
                        <div className="detail-row-mobile">
                          <span className="detail-label-mobile">📍 Location:</span>
                          <span className="detail-value-mobile"> {item.location}</span>
                        </div>
                      )}
                      {item.currentTime && (
                        <div className="detail-row-mobile">
                          <span className="detail-label-mobile">📅 Packing Date:</span>
                          <span className="detail-value-mobile"> {item.currentTime}</span>
                        </div>
                      )}
                      {item.rewinder && (
                        <div className="detail-row-mobile">
                          <span className="detail-label-mobile">👷 Rewinder:</span>
                          <span className="detail-value-mobile"> {item.rewinder}</span>
                        </div>
                      )}
                      {item.edge && (
                        <div className="detail-row-mobile">
                          <span className="detail-label-mobile">✂️ Edge Cut:</span>
                          <span className="detail-value-mobile"> {item.edge}</span>
                        </div>
                      )}
                      {item.winder && (
                        <div className="detail-row-mobile">
                          <span className="detail-label-mobile">🔄 Winder:</span>
                          <span className="detail-value-mobile"> {item.winder}</span>
                        </div>
                      )}
                      {item.mixer && (
                        <div className="detail-row-mobile">
                          <span className="detail-label-mobile">🥣 Mixer:</span>
                          <span className="detail-value-mobile"> {item.mixer}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
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
                    <button
                      onClick={() => handlePrintItem(item)}
                      style={{
                        padding: "12px 24px",
                        backgroundColor: "#4CAF50",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "16px",
                        transition: "all 0.3s ease",
                        boxShadow: "0 2px 8px rgba(76, 175, 80, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#45a049";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#4CAF50";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      🖨️ Print Details
                    </button>
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
                        {item.weight && ` | Weight: ${item.weight}`}
                        <br />
                        {item.packed && `Packed: ${item.packed}`}
                        {item.batch && ` | Batch: ${item.batch}`}
                        {item.shift && ` | Shift: ${item.shift}`}
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
            <li>Click <strong>"Start Scanning"</strong> to begin</li>
            <li>All <strong>recently generated unscanned barcodes</strong> will appear automatically</li>
            <li><strong>Scan with your IoT device</strong> - Barcode scanner will capture automatically</li>
            <li><strong>Or click any barcode</strong> from the list to mark as scanned</li>
            <li>Already scanned barcodes are <strong>hidden automatically</strong></li>
            <li>Scanned barcodes disappear from the list immediately</li>
            <li>Click "Stop & Clear" to end the session</li>
          </ol>
        </div>
      )}
    </div>
  );
};

export default SelectForm;
