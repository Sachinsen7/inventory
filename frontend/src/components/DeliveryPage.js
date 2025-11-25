import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import { showToast } from "../utils/toastNotifications";

const DeliveryPage = () => {
  const location = useLocation();
  const godown = location.state ? location.state.godown : null;
  const displayedGodownName = godown ? godown.name : "";

  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [message, setMessage] = useState("");
  const [deliveredCount, setDeliveredCount] = useState(0);
  const [data, setData] = useState([]);
  const [availableBarcodes, setAvailableBarcodes] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredBarcodes, setFilteredBarcodes] = useState([]);
  const [barcodeMap, setBarcodeMap] = useState({}); // Map of SKU to product info
  const inputRef = useRef(null);

  // Backend URL from environment variable
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  // Fetch available barcodes from despatch collection (godown inventory)
  useEffect(() => {
    if (displayedGodownName) {
      fetchAvailableBarcodes();
      fetchGodownInventory();
    }
  }, [displayedGodownName]);

  const fetchAvailableBarcodes = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/despatch`);
      // Filter by current godown and extract inputValues
      const skuCodes = response.data
        .filter((item) => item.godownName === displayedGodownName)
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
                sku: skuCode
              };
            }
          });
        }
        
        if (barcode.batchNumbers?.length === 0 && barcode.skuc && barcode.skun) {
          const skuCode = String(barcode.skuc) + String(barcode.skun);
          mapping[skuCode] = {
            product: productName,
            packed: packed,
            batch: batch,
            sku: skuCode
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

  const fetchGodownInventory = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/products3`);
      // Filter by current godown (delevery1 collection)
      const filteredData = response.data.filter(
        (item) => item.godownName === displayedGodownName
      );
      setData(filteredData);
    } catch (error) {
      console.error("Error fetching godown inventory:", error);
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Error fetching inventory";
      showToast.error(errorMsg);
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

  // Group data for inventory table
  const groupData = () => {
    const grouped = {};
    data.forEach((item) => {
      const prefix = item.inputValue.substring(0, 3);
      if (grouped[prefix]) {
        grouped[prefix].count += 1;
        if (!grouped[prefix].allValues.includes(item.inputValue)) {
          grouped[prefix].allValues.push(item.inputValue);
        }
      } else {
        grouped[prefix] = {
          option: prefix,
          allValues: [item.inputValue],
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
        // Check if already processed in this session
        const alreadyProcessed = data.some(
          (item) => item.inputValue === inputStr.trim()
        );
        if (alreadyProcessed) {
          showToast.warning(`Already processed: ${inputStr}`);
          setInputValue("");
          if (inputRef.current) inputRef.current.focus();
          setIsSaving(false);
          return;
        }
        
        // Check if inputValue exists in despatch collection
        const despatchRes = await axios.get(`${backendUrl}/api/products2`);
        const match = despatchRes.data.find(
          (item) =>
            item.inputValue === inputStr.trim() &&
            item.godownName === displayedGodownName
        );

        if (match) {
          // Move to delevery1 and remove from despatch
          await axios.post(`${backendUrl}/api/save/despatch`, {
            selectedOption: "default",
            inputValue: inputStr.trim(),
            godownName: displayedGodownName,
          });
          setMessage("Item processed for delivery!");
          showToast.success(
            `Item processed from ${displayedGodownName} for delivery!`
          );
          
          // Remove from available barcodes list
          setAvailableBarcodes((prev) => 
            prev.filter((code) => code !== inputStr.trim())
          );
          setFilteredBarcodes((prev) => 
            prev.filter((code) => code !== inputStr.trim())
          );
          
          setInputValue("");
          setDeliveredCount((prev) => prev + 1);
          // Refresh data
          fetchGodownInventory();
          if (inputRef.current) inputRef.current.focus();
        } else {
          setMessage("Item not found in godown inventory.");
          showToast.warning("Item not found in godown inventory.");
        }
      } catch (err) {
        setMessage("Error during delivery operation.");
        const errorMsg =
          err.response?.data?.message ||
          err.message ||
          "Error during delivery operation";
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
  }, [inputValue, isStarted, displayedGodownName, backendUrl]);

  // Always focus input after clearing
  useEffect(() => {
    if (isStarted && inputValue === "" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputValue, isStarted]);

  // Start auto-save
  const handleStart = () => {
    setIsStarted(true);
    setIsScannerActive(true);
    setDeliveredCount(0);
    setMessage("Scanner active! Scan items from " + displayedGodownName);
    showToast.success(`Delivery scanner activated for ${displayedGodownName}`);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  // Stop auto-save
  const handleStop = () => {
    setIsStarted(false);
    setIsScannerActive(false);
    showToast.info(
      `Scanner stopped. ${deliveredCount} items processed for delivery.`
    );
    setMessage(`Stopped. ${deliveredCount} items processed.`);
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
      margin: 0,
      padding: "20px",
      fontFamily: "'Roboto', sans-serif",
      textAlign: "center",
      background: "linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)",
      backgroundSize: "400% 400%",
      animation: "gradientAnimation 12s ease infinite",
      minHeight: "100vh",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    deliveryContainer: {
      padding: "30px",
      border: "1px solid #ddd",
      borderRadius: "15px",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
      backgroundColor: "rgba(218, 216, 224, 0.95)",
      width: "100%",
      maxWidth: "900px",
    },
    title: {
      fontSize: "2.5rem",
      color: "white",
      fontWeight: "bold",
      marginBottom: "10px",
      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.3)",
    },
    subtitle: {
      fontSize: "1.3rem",
      color: "white",
      marginBottom: "20px",
    },
    barcodeCount: {
      color: "white",
      fontSize: "16px",
      marginTop: "10px",
      marginBottom: "10px",
      fontStyle: "italic",
      fontWeight: "bold",
    },
    barcodeListButton: {
      backgroundColor: "#FF9800",
      color: "white",
      padding: "10px 20px",
      margin: "10px auto",
      border: "none",
      borderRadius: "28px",
      fontSize: "14px",
      cursor: "pointer",
      fontWeight: "bold",
      display: "block",
    },
    dropdownContainer: {
      position: "relative",
      width: "90%",
      margin: "10px auto",
    },
    input: {
      padding: "15px",
      width: "100%",
      border: "2px solid #ccc",
      borderRadius: "28px",
      fontSize: "18px",
      textAlign: "center",
      fontWeight: "bold",
      backgroundColor: "white",
    },
    inputActive: {
      border: "3px solid #4CAF50",
      boxShadow: "0 0 10px rgba(76, 175, 80, 0.5)",
    },
    dropdown: {
      position: "absolute",
      top: "100%",
      left: "5%",
      right: "5%",
      maxHeight: "200px",
      overflowY: "auto",
      backgroundColor: "white",
      border: "2px solid #4CAF50",
      borderRadius: "10px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
      zIndex: 1000,
      marginTop: "5px",
    },
    dropdownItem: {
      padding: "10px 15px",
      cursor: "pointer",
      borderBottom: "1px solid #eee",
      transition: "background-color 0.2s",
      textAlign: "left",
    },
    buttonContainer: {
      display: "flex",
      gap: "10px",
      justifyContent: "center",
      flexWrap: "wrap",
      margin: "15px 0",
    },
    button: {
      backgroundColor: "rgba(218, 216, 224, 0.8)",
      color: "white",
      padding: "12px 24px",
      border: "none",
      borderRadius: "28px",
      fontSize: "18px",
      fontWeight: "bold",
      cursor: "pointer",
      transition: "all 0.3s",
    },
    buttonActive: {
      backgroundColor: "#4CAF50",
      boxShadow: "0 0 15px rgba(76, 175, 80, 0.6)",
    },
    buttonDisabled: {
      backgroundColor: "rgba(180, 180, 190, 0.95)",
      color: "white",
      cursor: "not-allowed",
      opacity: 0.6,
    },
    message: {
      color: "white",
      fontWeight: "bold",
      margin: "15px 0",
      fontSize: "1.1rem",
      padding: "10px",
      backgroundColor: "rgba(0, 0, 0, 0.2)",
      borderRadius: "10px",
    },
    statsContainer: {
      display: "flex",
      justifyContent: "space-around",
      marginTop: "20px",
      marginBottom: "20px",
      padding: "15px",
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: "10px",
    },
    stat: {
      textAlign: "center",
    },
    statLabel: {
      fontSize: "12px",
      color: "rgba(255, 255, 255, 0.8)",
      marginBottom: "5px",
      textTransform: "uppercase",
    },
    statValue: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "white",
    },
    errorText: {
      color: "white",
      fontSize: "1.5rem",
      fontWeight: "bold",
      backgroundColor: "rgba(255, 0, 0, 0.3)",
      padding: "20px",
      borderRadius: "10px",
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

  if (!godown) {
    return (
      <div style={styles.container}>
        <style>{globalStyles}</style>
        <p style={styles.errorText}>No Godown Data Available</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      <div style={styles.deliveryContainer}>
        <h2 style={styles.title}>Delivery Processing</h2>
        <h3 style={styles.subtitle}>From: {displayedGodownName}</h3>
        <p style={{ color: "white", fontSize: "16px", marginBottom: "10px" }}>
          Address: {godown.address}
        </p>

        {/* Available Barcodes Info */}
        <div style={styles.barcodeCount}>
          {availableBarcodes.length} products available in {displayedGodownName}
        </div>

        <button
          type="button"
          style={styles.barcodeListButton}
          onClick={toggleBarcodeList}
        >
          {showDropdown
            ? "Hide Product List"
            : "View Available Products"}
        </button>

        {/* Input with Dropdown */}
        <div style={styles.dropdownContainer}>
          <input
            ref={inputRef}
            type="text"
            placeholder={
              isStarted
                ? "Ready to scan... (or type manually)"
                : "Enter barcode for delivery"
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            style={{
              ...styles.input,
              ...(isStarted ? styles.inputActive : {}),
            }}
            disabled={isSaving || !isStarted}
            autoFocus={isStarted}
            onFocus={() => {
              const inputStr = String(inputValue || "");
              if (inputStr.trim() && filteredBarcodes.length > 0) {
                setShowDropdown(true);
              }
            }}
          />

          {/* Dropdown for barcode suggestions */}
          {showDropdown && filteredBarcodes.length > 0 && (
            <div style={styles.dropdown}>
              {filteredBarcodes.slice(0, 50).map((barcode, index) => {
                const info = barcodeMap[barcode] || {};
                return (
                  <div
                    key={index}
                    style={styles.dropdownItem}
                    onClick={() => handleSelectBarcode(barcode)}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f0f0f0";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "white";
                    }}
                  >
                    <div style={{ fontWeight: "bold", color: "#333" }}>
                      {info.product || "Unknown Product"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                      SKU: {barcode}
                      {info.packed && ` | Packed: ${info.packed}`}
                      {info.batch && ` | Batch: ${info.batch}`}
                    </div>
                  </div>
                );
              })}
              {filteredBarcodes.length > 50 && (
                <div
                  style={{
                    ...styles.dropdownItem,
                    fontStyle: "italic",
                    color: "#666",
                  }}
                >
                  ... and {filteredBarcodes.length - 50} more
                </div>
              )}
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={styles.buttonContainer}>
          <button
            style={{
              ...styles.button,
              ...(isStarted ? styles.buttonActive : {}),
            }}
            onClick={handleStart}
            disabled={isStarted}
          >
            {isStarted ? "Scanning Active" : "Start Delivery Processing"}
          </button>
          <button
            style={{
              ...styles.button,
              ...(!isStarted ? styles.buttonDisabled : {}),
            }}
            onClick={handleStop}
            disabled={!isStarted}
          >
            Stop
          </button>
        </div>

        {/* Status Message */}
        {message && <div style={styles.message}>{message}</div>}

        {/* Statistics */}
        {isStarted && (
          <div style={styles.statsContainer}>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Processed</div>
              <div style={styles.statValue}>{deliveredCount}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Ready for Delivery</div>
              <div style={styles.statValue}>{data.length}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>Status</div>
              <div style={styles.statValue}>
                {isSaving ? "..." : "ACTIVE"}
              </div>
            </div>
          </div>
        )}

        {/* Delivery Inventory Table */}
        <div style={{ marginTop: "30px" }}>
          <h3 style={{ color: "white", marginBottom: "15px" }}>
            Items Ready for Delivery
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
                    No items ready for delivery yet
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

        {/* Help Text */}
        <div
          style={{
            marginTop: "20px",
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.9)",
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            padding: "10px",
            borderRadius: "10px",
          }}
        >
          <p>
            <strong>Tip:</strong> Scan items from {displayedGodownName} to
            process them for customer delivery. Items will be moved from godown
            inventory to delivery ready status.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryPage;
