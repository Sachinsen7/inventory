import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { showToast } from "../utils/toastNotifications";

function Dgodowndetails() {
  const location = useLocation();
  const { godown } = location.state; // Access godown data from the state
  const [inputValue, setInputValue] = useState(""); // Input field value
  const [isSaving, setIsSaving] = useState(false); // Flag to track if data is being saved
  const [isStarted, setIsStarted] = useState(false); // Auto-save mode
  const [message, setMessage] = useState("");
  const [data, setData] = useState([]);
  const [dispatchedCount, setDispatchedCount] = useState(0);
  const [availableBarcodes, setAvailableBarcodes] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredBarcodes, setFilteredBarcodes] = useState([]);
  const [barcodeMap, setBarcodeMap] = useState({}); // Map of SKU to product info
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [scannedItems, setScannedItems] = useState([]); // Track scanned items in this session
  const inputRef = useRef(null); // Ref for the input field

  // Backend URL from environment variable
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  // Fetch available barcodes from factory inventory (selects collection)
  useEffect(() => {
    fetchAvailableBarcodes();
  }, []);

  const fetchAvailableBarcodes = async () => {
    try {
      // Fetch from selects collection (factory inventory)
      const selectsResponse = await axios.get(`${backendUrl}/api/products1`);
      const skuCodes = selectsResponse.data
        .map((item) => {
          const inputVal = item.inputValue || "";
          return String(inputVal).trim();
        })
        .filter((code) => code && code.length > 0);

      // Fetch barcodes collection to get product names
      const barcodesResponse = await axios.get(`${backendUrl}/api/barcodes`);
      const mapping = {};

      // Create mapping of SKU to product info
      barcodesResponse.data.forEach((barcode) => {
        const productName = barcode.product || "Unknown Product";
        const packed = barcode.packed || "";
        const batch = barcode.batch || "";

        if (barcode.batchNumbers && Array.isArray(barcode.batchNumbers)) {
          barcode.batchNumbers.forEach((bn) => {
            if (barcode.skuc && bn) {
              const skuCode = String(barcode.skuc) + String(bn);
              mapping[skuCode] = {
                product: productName,
                packed: packed,
                batch: batch,
                sku: skuCode,
              };
            }
          });
        }

        if (
          barcode.batchNumbers?.length === 0 &&
          barcode.skuc &&
          barcode.skun
        ) {
          const skuCode = String(barcode.skuc) + String(barcode.skun);
          mapping[skuCode] = {
            product: productName,
            packed: packed,
            batch: batch,
            sku: skuCode,
          };
        }
      });

      const uniqueSkus = [...new Set(skuCodes)];
      setAvailableBarcodes(uniqueSkus);
      setFilteredBarcodes(uniqueSkus);
      setBarcodeMap(mapping);
    } catch (error) {
      console.error("Error fetching available barcodes:", error);
      showToast.warning("Could not load barcode list");
    }
  };

  // Filter barcodes based on input
  useEffect(() => {
    const inputStr = String(inputValue || "");
    if (inputStr.trim()) {
      const filtered = availableBarcodes.filter((barcode) => {
        const barcodeStr = String(barcode || "");
        return barcodeStr.toLowerCase().includes(inputStr.toLowerCase());
      });
      setFilteredBarcodes(filtered);
      setShowDropdown(filtered.length > 0 && inputStr.length > 0);
    } else {
      setFilteredBarcodes(availableBarcodes);
      setShowDropdown(false);
    }
  }, [inputValue, availableBarcodes]);

  // Fetch data from backend (MongoDB) and filter by godown name
  useEffect(() => {
    fetchGodownData();
  }, [godown]);

  const fetchGodownData = () => {
    axios
      .get(`${backendUrl}/api/despatch`)
      .then((response) => {
        const filteredData = response.data.filter(
          (item) => item.godownName === godown?.name
        );
        setData(filteredData);
      })
      .catch((error) => {
        setMessage("Error fetching data.");
        const errorMsg =
          error.response?.data?.message ||
          error.message ||
          "Error fetching data";
        if (
          error.code === "ECONNABORTED" ||
          error.message.includes("timeout")
        ) {
          showToast.error(
            "Connection timeout. Please check your internet connection."
          );
        } else if (error.response) {
          showToast.error(
            `Backend error: ${error.response.status} - ${errorMsg}`
          );
        } else if (error.request) {
          showToast.error(
            "Unable to connect to the server. Please check if the backend is running."
          );
        } else {
          showToast.error(errorMsg);
        }
      });
  };

  // Group selected options and count their occurrences (unchanged)
  const groupData = () => {
    const grouped = {};
    data.forEach((item) => {
      const prefix = item.inputValue.substring(0, 3); // First 3 digits
      if (grouped[prefix]) {
        grouped[prefix].count += 1;
        // Add the value to the list if it's not already there
        if (!grouped[prefix].allValues.includes(item.inputValue)) {
          grouped[prefix].allValues.push(item.inputValue);
        }
      } else {
        grouped[prefix] = {
          option: prefix, // First 3 digits for Item
          allValues: [item.inputValue], // Array of all values with same prefix
          count: 1,
        };
      }
    });
    return Object.values(grouped);
  };

  // Auto-check and save on input change (only when started)
  useEffect(() => {
    const inputStr = String(inputValue || "");
    if (!isStarted || inputStr.trim() === "") return;
    const timer = setTimeout(async () => {
      setIsSaving(true);
      setMessage("");
      try {
        // Check if already dispatched in this session
        const alreadyDispatched = data.some(
          (item) => item.inputValue === inputStr.trim()
        );
        if (alreadyDispatched) {
          showToast.warning(`Already in godown: ${inputStr}`);
          setInputValue("");
          if (inputRef.current) inputRef.current.focus();
          setIsSaving(false);
          return;
        }

        // Check if inputValue exists in selects
        const selectsRes = await axios.get(`${backendUrl}/api/products1`);
        const match = selectsRes.data.find(
          (item) => item.inputValue === inputStr.trim()
        );
        if (match) {
          // Move to despatch and remove from selects (also creates transit entry)
          await axios.post(`${backendUrl}/api/save/select`, {
            inputValue: inputStr.trim(),
            godownName: godown.name,
          });
          setMessage("Item dispatched successfully!");
          showToast.success(
            `Item dispatched to ${godown.name}! Now in transit.`
          );

          // Add to scanned items list with product info
          const productInfo = barcodeMap[inputStr.trim()] || {
            product: "Unknown Product",
            packed: "",
            batch: "",
            sku: inputStr.trim(),
          };

          setScannedItems((prev) => [
            {
              ...productInfo,
              time: new Date().toLocaleTimeString(),
              destination: godown.name,
            },
            ...prev,
          ]);

          // Remove from available barcodes list
          setAvailableBarcodes((prev) =>
            prev.filter((code) => code !== inputStr.trim())
          );
          setFilteredBarcodes((prev) =>
            prev.filter((code) => code !== inputStr.trim())
          );

          setInputValue("");
          setDispatchedCount((prev) => prev + 1);
          // Refresh godown data
          fetchGodownData();
          // Focus the input field after clearing
          if (inputRef.current) inputRef.current.focus();
        } else {
          setMessage("Item not found in factory inventory.");
          showToast.warning("Item not found in factory inventory.");
        }
      } catch (err) {
        setMessage("Error during dispatch operation.");
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Error during dispatch operation";
        if (err.code === "ECONNABORTED" || err.message.includes("timeout")) {
          showToast.error(
            "Connection timeout. Please check your internet connection."
          );
        } else if (err.response) {
          showToast.error(
            `Backend error: ${err.response.status} - ${errorMsg}`
          );
        } else if (err.request) {
          showToast.error(
            "Unable to connect to the server. Please check if the backend is running."
          );
        } else {
          showToast.error(errorMsg);
        }
      }
      setIsSaving(false);
    }, 700);
    return () => clearTimeout(timer);
  }, [inputValue, isStarted, godown.name, backendUrl]);

  // Always focus input after clearing (for fast repeated entry)
  useEffect(() => {
    if (isStarted && inputValue === "" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputValue, isStarted]);

  // Start auto-save
  const handleStart = () => {
    setIsStarted(true);
    setIsScannerActive(true);
    setDispatchedCount(0);
    setMessage(
      "Scanner active! Scan barcodes to dispatch items to " + godown.name
    );
    showToast.success(`Scanner activated for ${godown.name}`);
    // Focus the input field when auto-save starts
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  // Stop auto-save
  const handleStop = () => {
    setIsStarted(false);
    setIsScannerActive(false);
    showToast.info(
      `Scanner stopped. ${dispatchedCount} items dispatched to transit.`
    );
    setMessage(`Stopped. ${dispatchedCount} items dispatched.`);
    setScannedItems([]); // Clear scanned items
  };

  // Print function for individual items
  const handlePrintItem = (item) => {
    const printWindow = window.open("", "_blank", "width=800,height=600");
    printWindow.document.write(`
      <html>
        <head>
          <title>Dispatch Details - ${item.sku}</title>
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
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🚚 Dispatch Details</h1>
            <p style="color: #666; margin: 10px 0 0 0;">Dispatched at: ${item.time}</p>
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
              <div class="detail-label">Destination</div>
              <div class="detail-value">${item.destination || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Dispatch Time</div>
              <div class="detail-value">${item.time || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Packed By</div>
              <div class="detail-value">${item.packed || "N/A"}</div>
            </div>
            <div class="detail-item">
              <div class="detail-label">Batch No</div>
              <div class="detail-value">${item.batch || "N/A"}</div>
            </div>
          </div>

          <div class="footer">
            <p>Generated by Inventory Management System</p>
          </div>

          <script>
            setTimeout(() => window.print(), 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Toggle dropdown visibility
  const toggleBarcodeList = () => {
    setShowDropdown(!showDropdown);
  };

  // Handle selecting from dropdown
  const handleSelectBarcode = (barcode) => {
    setInputValue(barcode);
    setShowDropdown(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
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
      cursor: "pointer",
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
    scannedSection: {
      marginTop: "30px",
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      borderRadius: "15px",
      padding: "20px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
    },
    scannedTitle: {
      fontSize: "1.5rem",
      color: "#4CAF50",
      marginBottom: "15px",
      fontWeight: "bold",
    },
    scannedList: {
      maxHeight: "400px",
      overflowY: "auto",
    },
    scannedItem: {
      padding: "15px",
      marginBottom: "10px",
      backgroundColor: "#e8f5e9",
      borderRadius: "10px",
      borderLeft: "4px solid #4CAF50",
      boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
    },
    scannedItemHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "10px",
    },
    scannedItemTitle: {
      fontWeight: "bold",
      color: "#333",
      fontSize: "16px",
    },
    scannedItemDetails: {
      fontSize: "14px",
      color: "#666",
      lineHeight: "1.6",
    },
    printButton: {
      padding: "8px 16px",
      backgroundColor: "#4CAF50",
      color: "white",
      border: "none",
      borderRadius: "8px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "bold",
      transition: "all 0.3s ease",
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
        <h1 style={styles.title}>🚚 Dispatch Scanner</h1>
        <p style={styles.subtitle}>
          Destination: <strong>{godown.name}</strong> | {godown.address}
        </p>
        <p style={styles.subtitle}>
          {isStarted
            ? "Scan barcodes to dispatch items"
            : "Click 'Start Dispatch' to begin"}
        </p>

        {/* Product Selector Dropdown */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "10px", fontWeight: "bold", color: "#666" }}>
            Select Product to Dispatch:
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
              if (e.target.value && isStarted) {
                setInputValue(e.target.value);
              }
            }}
            disabled={!isStarted}
            value=""
          >
            <option value="">-- Select a product to dispatch --</option>
            {availableBarcodes.map((barcode, index) => {
              const info = barcodeMap[barcode] || {};
              return (
                <option key={index} value={barcode}>
                  {info.product || "Unknown"} - SKU: {barcode}
                </option>
              );
            })}
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
            placeholder={isStarted ? "📷 Scan with device..." : "Click Start to begin"}
            disabled={!isStarted}
            style={{
              ...styles.input,
              ...(isStarted ? styles.inputActive : {}),
            }}
            autoFocus={isStarted}
          />
        </div>

        {/* Buttons */}
        <div style={styles.buttonContainer}>
          {!isStarted ? (
            <button
              style={{ ...styles.button, ...styles.startButton }}
              onClick={handleStart}
            >
              ▶️ Start Dispatch
            </button>
          ) : (
            <button
              style={{ ...styles.button, ...styles.stopButton }}
              onClick={handleStop}
            >
              ⏹️ Stop & Clear
            </button>
          )}

          <button
            style={{ ...styles.button, ...styles.showProductsButton }}
            onClick={toggleBarcodeList}
          >
            {showDropdown ? "Hide Products" : "📋 Show All Products"}
          </button>
        </div>

        {/* Statistics */}
        {isStarted && (
          <div style={styles.statsCard}>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Dispatched</div>
              <div style={styles.statValue}>{dispatchedCount}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Available</div>
              <div style={styles.statValue}>{availableBarcodes.length}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Status</div>
              <div style={{ ...styles.statValue, color: "#4CAF50" }}>✓ ACTIVE</div>
            </div>
          </div>
        )}
      </div>

      {/* Scanned Items List */}
      {scannedItems.length > 0 && (
        <div style={styles.card}>
          <h3 style={{ color: "#4CAF50", marginBottom: "15px" }}>
            ✓ Dispatched Items ({scannedItems.length})
          </h3>
          <div style={styles.productList}>
            {scannedItems.map((item, index) => (
              <div key={index} style={styles.scannedItem}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "15px" }}>
                  <div style={{ flex: 1, minWidth: "250px" }}>
                    <div style={styles.productName}>
                      #{scannedItems.length - index}: {item.product}
                    </div>
                    <div style={styles.productDetails}>
                      <strong>SKU:</strong> {item.sku} | <strong>Time:</strong> {item.time}
                      <br />
                      <strong>Destination:</strong> {item.destination}
                      {item.packed && (
                        <>
                          <br />
                          <strong>Packed By:</strong> {item.packed}
                          {item.batch && ` | `}
                          {item.batch && <><strong>Batch:</strong> {item.batch}</>}
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handlePrintItem(item)}
                    style={styles.printButton}
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
            ))}
          </div>
        </div>
      )}

      {/* Available Products List */}
      {showDropdown && (
        <div style={styles.card}>
          <h3 style={{ color: "#9900ef", marginBottom: "15px" }}>
            📋 Available Products ({availableBarcodes.length})
          </h3>
          {availableBarcodes.length > 0 ? (
            <div style={styles.productList}>
              {availableBarcodes.map((barcode, index) => {
                const info = barcodeMap[barcode] || {};
                return (
                  <div
                    key={index}
                    style={{
                      ...styles.productItem,
                      cursor: isStarted ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (isStarted) {
                        setInputValue(barcode);
                        setShowDropdown(false);
                      }
                    }}
                    onMouseEnter={(e) => {
                      if (isStarted) {
                        e.currentTarget.style.backgroundColor = "#f0e6ff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "white";
                    }}
                  >
                    <div style={styles.productName}>
                      {info.product || "Unknown Product"}
                      {isStarted && <span style={{ color: "#4CAF50", marginLeft: "10px", fontSize: "14px" }}>← Click to dispatch</span>}
                    </div>
                    <div style={styles.productDetails}>
                      <strong style={{ color: "#9900ef" }}>SKU: {barcode}</strong>
                      {info.packed && ` | Packed: ${info.packed}`}
                      {info.batch && ` | Batch: ${info.batch}`}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={{ fontSize: "48px", marginBottom: "10px" }}>📭</div>
              <div>No products available in factory</div>
            </div>
          )}
        </div>
      )}

      {/* Help Text */}
      {!isStarted && scannedItems.length === 0 && (
        <div style={{ ...styles.card, backgroundColor: "rgba(255, 255, 255, 0.9)" }}>
          <h4 style={{ color: "#666", marginBottom: "10px" }}>💡 How to use:</h4>
          <ol style={{ textAlign: "left", color: "#666", lineHeight: "1.8" }}>
            <li>Click "Start Dispatch" to activate the scanner</li>
            <li><strong>Select from dropdown</strong> - Choose product by name (easier!)</li>
            <li><strong>Or scan with device</strong> - Use barcode scanner</li>
            <li><strong>Or click from list</strong> - Click "Show All Products" and click any product</li>
            <li>Each item is automatically dispatched to {godown.name}</li>
            <li>Items are tracked in the Transit page</li>
            <li>Click "Stop & Clear" to end the session</li>
          </ol>
        </div>
      )}

      {/* Godown Inventory Table - Moved to bottom */}
      {data.length > 0 && (
        <div style={styles.card}>
          <h3 style={{ color: "#9900ef", marginBottom: "15px" }}>
            Current Godown Inventory
          </h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              backgroundColor: "white",
              borderRadius: "10px",
              overflow: "hidden",
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "rgba(76, 175, 80, 0.8)",
                  color: "white",
                }}
              >
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  Serial No.
                </th>
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  Item Code
                </th>
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  All Values
                </th>
                <th style={{ border: "1px solid #ddd", padding: "12px" }}>
                  Count
                </th>
              </tr>
            </thead>
            <tbody>
              {groupData().length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    style={{
                      padding: "20px",
                      textAlign: "center",
                      color: "#666",
                      fontStyle: "italic",
                    }}
                  >
                    No items in this godown yet. Start dispatching!
                  </td>
                </tr>
              ) : (
                groupData().map((group, index) => (
                  <tr
                    key={index}
                    style={{
                      textAlign: "center",
                      backgroundColor: index % 2 === 0 ? "#f9f9f9" : "white",
                    }}
                  >
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                      {index + 1}
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        fontWeight: "bold",
                      }}
                    >
                      {group.option}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "10px" }}>
                      <select
                        style={{
                          width: "100%",
                          padding: "8px",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                        }}
                      >
                        {group.allValues.map((value, subIndex) => (
                          <option key={subIndex} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "10px",
                        fontWeight: "bold",
                        color: "#4CAF50",
                      }}
                    >
                      {group.count}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Dgodowndetails;
