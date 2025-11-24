import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { showToast } from "../utils/toastNotifications";

const SelectForm = () => {
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [savedValues, setSavedValues] = useState([]);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [availableBarcodes, setAvailableBarcodes] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredBarcodes, setFilteredBarcodes] = useState([]);
  const [barcodeMap, setBarcodeMap] = useState({}); // Map of SKU to product info
  const inputRef = useRef(null);

  // Backend URL from environment variable
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  // Fetch available barcodes on component mount
  useEffect(() => {
    fetchAvailableBarcodes();
  }, []);

  const fetchAvailableBarcodes = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/barcodes`);
      const skuCodes = [];
      const mapping = {};

      // Extract SKU codes and create mapping to product info
      response.data.forEach((barcode) => {
        const productName = barcode.product || "Unknown Product";
        const packed = barcode.packed || "";
        const batch = barcode.batch || "";

        // Get all batchNumbers if they exist
        if (barcode.batchNumbers && Array.isArray(barcode.batchNumbers)) {
          barcode.batchNumbers.forEach((bn) => {
            // Format: skuc + batchNumber
            if (barcode.skuc && bn) {
              const skuCode = String(barcode.skuc) + String(bn);
              skuCodes.push(skuCode);
              mapping[skuCode] = {
                product: productName,
                packed: packed,
                batch: batch,
                sku: skuCode,
              };
            }
          });
        }

        // If no batchNumbers, try skuc + skun format
        if (
          barcode.batchNumbers?.length === 0 &&
          barcode.skuc &&
          barcode.skun
        ) {
          const skuCode = String(barcode.skuc) + String(barcode.skun);
          skuCodes.push(skuCode);
          mapping[skuCode] = {
            product: productName,
            packed: packed,
            batch: batch,
            sku: skuCode,
          };
        }
      });

      // Get unique SKU codes
      const uniqueSkus = [...new Set(skuCodes)].filter(
        (code) => code && String(code).trim()
      );
      setAvailableBarcodes(uniqueSkus);
      setFilteredBarcodes(uniqueSkus);
      setBarcodeMap(mapping);
    } catch (error) {
      console.error("Error fetching barcodes:", error);
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

  // Auto-save effect when started and input changes
  useEffect(() => {
    const inputStr = String(inputValue || "");
    if (isStarted && inputStr.trim()) {
      const timer = setTimeout(() => {
        // Check if already scanned in this session
        if (savedValues.includes(inputStr)) {
          showToast.warning(`Already scanned: ${inputStr}`);
          setInputValue("");
          if (inputRef.current) {
            inputRef.current.focus();
          }
          return;
        }

        // Save the current input value
        axios
          .post(`${backendUrl}/api/save`, {
            inputValue: inputStr,
          })
          .then((response) => {
            // Add to saved values list at the beginning (top)
            setSavedValues((prev) => [inputStr, ...prev]);

            // Remove the scanned barcode from available list
            setAvailableBarcodes((prev) =>
              prev.filter((code) => code !== inputStr)
            );
            setFilteredBarcodes((prev) =>
              prev.filter((code) => code !== inputStr)
            );

            // Clear the input field after saving
            setInputValue("");
            showToast.success(`Saved: ${inputStr}`);

            // Auto-focus input for next scan
            if (inputRef.current) {
              inputRef.current.focus();
            }
          })
          .catch((error) => {
            const errorMsg =
              error.response?.data?.message ||
              error.message ||
              "Error saving data";
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
      }, 800); // Save after 0.8 second of no typing

      return () => clearTimeout(timer);
    }
  }, [inputValue, isStarted, backendUrl]);

  // Handle the start action - Start auto-saving
  const handleStart = () => {
    if (!inputValue && savedValues.length === 0) {
      setIsStarted(true);
      setIsSaving(true);
      showToast.success(
        "📊 Auto-saving activated! Scan or type barcode numbers."
      );
      // Focus input
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
      return;
    }

    if (inputValue) {
      // Save the current input value immediately
      const inputStr = String(inputValue || "");
      axios
        .post(`${backendUrl}/api/save`, {
          inputValue: inputStr,
        })
        .then((response) => {
          // Add to saved values list at the beginning (top)
          setSavedValues((prev) => [inputStr, ...prev]);

          // Remove the scanned barcode from available list
          setAvailableBarcodes((prev) =>
            prev.filter((code) => code !== inputStr)
          );
          setFilteredBarcodes((prev) =>
            prev.filter((code) => code !== inputStr)
          );

          // Clear the input field after saving
          setInputValue("");
          setIsSaving(true);
          setIsStarted(true);
          showToast.success("Auto-saving started! Scan or type values.");
          // Focus input
          if (inputRef.current) {
            inputRef.current.focus();
          }
        })
        .catch((error) => {
          console.error("Error saving data:", error);
          const errorMsg =
            error.response?.data?.message ||
            error.message ||
            "Error saving data";
          showToast.error(errorMsg);
        });
    }
  };

  // Stop saving
  const handleStop = () => {
    setIsSaving(false);
    setIsStarted(false);
    setSavedValues([]);
    showToast.info("Auto-saving stopped");
  };

  // Toggle camera scanner
  const toggleScanner = () => {
    setIsScannerActive(!isScannerActive);
    if (!isScannerActive) {
      showToast.info(
        " Scanner mode activated. Use a barcode scanner device or type manually."
      );
    } else {
      showToast.info("Scanner mode deactivated");
    }
  };

  // Handle selecting from dropdown
  const handleSelectBarcode = (barcode) => {
    setInputValue(barcode);
    setShowDropdown(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Toggle dropdown visibility
  const toggleBarcodeList = () => {
    setShowDropdown(!showDropdown);
  };

  // Handle keyboard input (for barcode scanners that act as keyboards)
  useEffect(() => {
    if (isStarted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isStarted, savedValues]);

  // Styles
  const styles = {
    container: {
      background: "linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)",
      backgroundSize: "400% 400%",
      animation: "gradientAnimation 12s ease infinite",
      minHeight: "100vh",
      padding: "20px",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      fontFamily: "'Roboto', sans-serif",
      color: "#333",
    },
    formContainer: {
      backgroundColor: "rgba(218, 216, 224, 0.9)",
      padding: "30px",
      borderRadius: "15px",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.3)",
      textAlign: "center",
      width: "90%",
      maxWidth: "600px",
    },
    title: {
      fontSize: "2.5rem",
      color: "white",
      textShadow: "2px 2px 4px rgba(0, 0, 0, 0.4)",
      marginBottom: "10px",
    },
    subtitle: {
      fontSize: "1rem",
      color: "rgba(255, 255, 255, 0.9)",
      marginBottom: "20px",
    },
    input: {
      width: "90%",
      padding: "15px",
      margin: "10px 0",
      borderRadius: "28px",
      border: "2px solid #ccc",
      fontSize: "18px",
      backgroundColor: "white",
      textAlign: "center",
      fontWeight: "bold",
      position: "relative",
    },
    inputActive: {
      border: "3px solid #4CAF50",
      boxShadow: "0 0 10px rgba(76, 175, 80, 0.5)",
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
      margin: "5px",
      border: "none",
      borderRadius: "28px",
      fontSize: "18px",
      cursor: "pointer",
      transition: "all 0.3s",
      fontWeight: "bold",
    },
    buttonActive: {
      backgroundColor: "#4CAF50",
      boxShadow: "0 0 15px rgba(76, 175, 80, 0.6)",
    },
    scannerButton: {
      backgroundColor: "#2196F3",
    },
    savedValuesList: {
      marginTop: "20px",
      textAlign: "left",
      maxHeight: "250px",
      overflowY: "auto",
      backgroundColor: "rgba(255, 255, 255, 0.9)",
      padding: "15px",
      borderRadius: "8px",
    },
    savedValue: {
      padding: "8px",
      margin: "5px 0",
      backgroundColor: "rgba(76, 175, 80, 0.2)",
      borderRadius: "4px",
      borderLeft: "4px solid #4CAF50",
      fontWeight: "bold",
    },
    status: {
      color: "white",
      fontSize: "16px",
      marginTop: "10px",
      fontStyle: "italic",
      fontWeight: "bold",
    },
    statsContainer: {
      display: "flex",
      justifyContent: "space-around",
      marginTop: "20px",
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
    },
    statValue: {
      fontSize: "24px",
      fontWeight: "bold",
      color: "white",
    },
    dropdownContainer: {
      position: "relative",
      width: "90%",
      margin: "0 auto",
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
    },
    barcodeListButton: {
      backgroundColor: "#FF9800",
      color: "white",
      padding: "12px 24px",
      margin: "10px auto",
      border: "none",
      borderRadius: "28px",
      fontSize: "16px",
      cursor: "pointer",
      fontWeight: "bold",
      display: "block",
    },
    barcodeCount: {
      color: "white",
      fontSize: "14px",
      marginTop: "10px",
      fontStyle: "italic",
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
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `;

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      <div style={styles.formContainer}>
        <h2 style={styles.title}>
          {isScannerActive ? "" : ""} Barcode Scanner
        </h2>
        <p style={styles.subtitle}>
          {isStarted
            ? "Scan barcode with scanner device or type manually"
            : "Click Start to begin scanning"}
        </p>

        {/* Available Barcodes Info */}
        <div style={styles.barcodeCount}>
          {availableBarcodes.length} products available in factory
        </div>

        <button
          type="button"
          style={styles.barcodeListButton}
          onClick={toggleBarcodeList}
        >
          {showDropdown ? "Hide Product List" : "View Available Products"}
        </button>

        <form onSubmit={(e) => e.preventDefault()}>
          {/* Input field - works with barcode scanner devices */}
          <div style={styles.dropdownContainer}>
            <input
              ref={inputRef}
              style={{
                ...styles.input,
                ...(isStarted ? styles.inputActive : {}),
              }}
              type="text"
              placeholder={
                isStarted
                  ? "📷 Ready to scan... (or type manually)"
                  : "Enter barcode value"
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={!isStarted && savedValues.length === 0}
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

          {/* Button Container */}
          <div style={styles.buttonContainer}>
            {/* Start Button */}
            <button
              type="button"
              style={{
                ...styles.button,
                ...(isStarted ? styles.buttonActive : {}),
              }}
              onClick={handleStart}
              disabled={isStarted}
            >
              {isStarted ? "✓ Scanning Active" : "▶ Start Scanning"}
            </button>

            {/* Stop Button */}
            <button
              type="button"
              style={styles.button}
              onClick={handleStop}
              disabled={!isStarted}
            >
              Stop
            </button>

            {/* Scanner Mode Toggle */}
            <button
              type="button"
              style={{
                ...styles.button,
                ...(isScannerActive
                  ? { ...styles.scannerButton, ...styles.buttonActive }
                  : styles.scannerButton),
              }}
              onClick={toggleScanner}
            >
              {isScannerActive ? " Scanner ON" : " Scanner Mode"}
            </button>
          </div>
        </form>

        {/* Status message */}
        {isStarted && (
          <div style={styles.status}>
            {isScannerActive
              ? " Scanner Active - Use barcode scanner device"
              : "Auto-save active - Type or scan barcodes"}
          </div>
        )}

        {/* Statistics */}
        {isStarted && (
          <div style={styles.statsContainer}>
            <div style={styles.stat}>
              <div style={styles.statLabel}>SCANNED</div>
              <div style={styles.statValue}>{savedValues.length}</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statLabel}>STATUS</div>
              <div style={styles.statValue}>
                {isSaving ? "✓ ACTIVE" : "○ PAUSED"}
              </div>
            </div>
          </div>
        )}

        {/* Show saved values */}
        {savedValues.length > 0 && (
          <div style={styles.savedValuesList}>
            <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
              ✓ Scanned Barcodes ({savedValues.length}):
            </h4>
            {savedValues.map((value, index) => (
              <div key={index} style={styles.savedValue}>
                #{savedValues.length - index}: {value}
              </div>
            ))}
          </div>
        )}

        {/* Help Text */}
        <div
          style={{
            marginTop: "20px",
            fontSize: "14px",
            color: "rgba(255, 255, 255, 0.8)",
          }}
        >
          <p>
            <strong>Tip:</strong> Most barcode scanners work like keyboards.
            Just scan and the barcode will appear in the input field!
          </p>
        </div>
      </div>
    </div>
  );
};

export default SelectForm;
