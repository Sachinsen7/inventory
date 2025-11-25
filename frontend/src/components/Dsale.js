import React, { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { showToast } from "../utils/toastNotifications";

const Dsale = () => {
  const [message, setMessage] = useState('');
  const location = useLocation();
  const godown = location.state ? location.state.godown : null;
  const displayedGodownName = godown ? godown.name : "";

  const [inputValue, setInputValue] = useState("");
  const [username, setUsername] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [availableBarcodes, setAvailableBarcodes] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredBarcodes, setFilteredBarcodes] = useState([]);
  const [barcodeMap, setBarcodeMap] = useState({});
  const [salesCount, setSalesCount] = useState(0);
  const [godownInventory, setGodownInventory] = useState([]);
  const inputRef = useRef(null);
  const usernameRef = useRef(null);
  const mobileRef = useRef(null);

  // Backend URL from environment variable
  const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

  // Fetch godown inventory and available barcodes on component mount
  useEffect(() => {
    fetchGodownInventory();
    fetchAvailableBarcodes();
  }, [displayedGodownName]);

  const fetchGodownInventory = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/delevery1`);
      // Filter by current godown
      const godownItems = response.data.filter(
        (item) => item.godownName === displayedGodownName
      );
      setGodownInventory(godownItems);
    } catch (error) {
      console.error("Error fetching godown inventory:", error);
      showToast.warning("Could not load godown inventory");
    }
  };

  const fetchAvailableBarcodes = async () => {
    try {
      // Fetch inventory from delevery1 for this specific godown
      const deleveryResponse = await axios.get(`${backendUrl}/api/delevery1`);
      const godownItems = deleveryResponse.data.filter(
        (item) => item.godownName === displayedGodownName
      );
      
      const skuCodes = godownItems
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
        const info = barcodeMap[barcode] || {};
        const productName = (info.product || "").toLowerCase();
        const searchTerm = inputStr.toLowerCase();
        return (
          barcodeStr.toLowerCase().includes(searchTerm) ||
          productName.includes(searchTerm)
        );
      });
      setFilteredBarcodes(filtered);
      setShowDropdown(filtered.length > 0 && inputStr.length > 0);
    } else {
      setFilteredBarcodes(availableBarcodes);
      setShowDropdown(false);
    }
  }, [inputValue, availableBarcodes, barcodeMap]);

  // Auto-check and save on input change (only when started)
  useEffect(() => {
    if (!isStarted || inputValue.trim() === "" || username.trim() === "" || mobileNumber.trim() === "") return;
    
    const timer = setTimeout(async () => {
      setIsSaving(true);
      setMessage("Processing sale...");
      
      try {
        // Check if item exists in godown inventory
        const itemExists = godownInventory.some(
          (item) => item.inputValue === inputValue.trim()
        );
        
        if (!itemExists) {
          showToast.warning(`Item "${inputValue}" not found in ${displayedGodownName} inventory!`);
          setIsSaving(false);
          setMessage("");
          return;
        }

        // Process the sale
        await axios.post(`${backendUrl}/api/save/delevery1`, {
          selectedOption: "default",
          inputValue: inputValue.trim(),
          username: username.trim(),
          mobileNumber: mobileNumber.trim(),
          godownName: displayedGodownName,
        });
        
        const productInfo = barcodeMap[inputValue.trim()];
        const productName = productInfo ? productInfo.product : inputValue.trim();
        
        setMessage(`Sale recorded for ${productName}!`);
        showToast.success(`Sale recorded: ${productName} to ${username.trim()}`);
        
        // Remove from available barcodes
        setAvailableBarcodes((prev) =>
          prev.filter((code) => code !== inputValue.trim())
        );
        setFilteredBarcodes((prev) =>
          prev.filter((code) => code !== inputValue.trim())
        );
        
        // Refresh inventory
        fetchGodownInventory();
        
        // Increment sales count
        setSalesCount((prev) => prev + 1);
        
        // Clear fields
        setInputValue("");
        setUsername("");
        setMobileNumber("");
        
        // Focus the input field for next sale
        setTimeout(() => {
          if (inputRef.current) inputRef.current.focus();
        }, 100);
        
      } catch (error) {
        const errorMsg = error.response?.data?.message || error.message || 'Error processing sale';
        setMessage("Error processing sale.");
        
        if (errorMsg.includes("No matching data found")) {
          showToast.error(`Item not found in ${displayedGodownName} inventory`);
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          showToast.error('Connection timeout. Please check your internet connection.');
        } else if (error.response) {
          showToast.error(`Backend error: ${error.response.status} - ${errorMsg}`);
        } else if (error.request) {
          showToast.error('Unable to connect to the server. Please check if the backend is running.');
        } else {
          showToast.error(errorMsg);
        }
      }
      
      setIsSaving(false);
    }, 1000); // 1 second delay after all fields are filled
    
    return () => clearTimeout(timer);
  }, [inputValue, username, mobileNumber, isStarted, displayedGodownName, godownInventory, barcodeMap]);

  // Always focus input after clearing (for fast repeated entry)
  useEffect(() => {
    if (isStarted && inputValue === "" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [inputValue, isStarted]);

  // Handle selecting from dropdown
  const handleSelectBarcode = (barcode) => {
    setInputValue(barcode);
    setShowDropdown(false);
    // Focus the username field after selecting barcode
    setTimeout(() => {
      if (usernameRef.current) usernameRef.current.focus();
    }, 100);
  };

  // Toggle dropdown visibility
  const toggleBarcodeList = () => {
    setShowDropdown(!showDropdown);
  };

  // Start auto-save
  const handleStart = () => {
    if (availableBarcodes.length === 0) {
      showToast.warning(`No items available in ${displayedGodownName} to sell!`);
      return;
    }
    
    setIsStarted(true);
    setSalesCount(0);
    setMessage(`Sales scanner active for ${displayedGodownName}! Fill all 3 fields to record sale.`);
    showToast.success(`Sales scanner activated for ${displayedGodownName}`);
    
    // Focus the input field when auto-save starts
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 100);
  };

  // Stop auto-save
  const handleStop = () => {
    setIsStarted(false);
    showToast.info(`Sales scanner stopped. ${salesCount} sales recorded.`);
    setMessage(`Stopped. ${salesCount} sales recorded.`);
  };

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      <div style={styles.formContainer}>
        <h2 style={styles.header}>Sales Page - {displayedGodownName}</h2>
        {godown ? (
          <div style={styles.godownDetails}>
            <p style={styles.godownText}>
              <strong>Address:</strong> {godown.address}
            </p>

            {/* Inventory Summary */}
            <div style={styles.inventoryInfo}>
              {availableBarcodes.length} products available to sell
            </div>

            <button
              type="button"
              style={styles.barcodeListButton}
              onClick={toggleBarcodeList}
            >
              {showDropdown ? "Hide Product List" : "View Available Products"}
            </button>

            {!isStarted && (
              <div style={styles.warningBox}>
                Click "Start Sales Scanner" to begin recording sales
              </div>
            )}

            {/* Barcode Input with Dropdown */}
            <div style={styles.dropdownContainer}>
              <input
                ref={inputRef}
                type="text"
                placeholder={
                  isStarted
                    ? "Scan or type product barcode..."
                    : "Enter product barcode"
                }
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                style={{
                  ...styles.input,
                  ...(isStarted ? styles.inputActive : {}),
                }}
                disabled={!isStarted || isSaving}
                autoFocus={isStarted}
                onFocus={() => {
                  const inputStr = String(inputValue || "");
                  if (inputStr.trim() && filteredBarcodes.length > 0) {
                    setShowDropdown(true);
                  }
                }}
              />

              {/* Dropdown for product suggestions */}
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

            {/* Customer Name */}
            <input
              ref={usernameRef}
              type="text"
              placeholder="Enter customer name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                ...styles.input,
                ...(isStarted ? styles.inputActive : {}),
              }}
              disabled={!isStarted || isSaving}
            />

            {/* Customer Mobile */}
            <input
              ref={mobileRef}
              type="tel"
              placeholder="Enter customer mobile number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              style={{
                ...styles.input,
                ...(isStarted ? styles.inputActive : {}),
              }}
              disabled={!isStarted || isSaving}
            />

            {/* Action Buttons */}
            <div style={styles.buttonContainer}>
              <button
                style={{
                  ...styles.button,
                  ...(isStarted ? styles.buttonActive : {}),
                }}
                onClick={handleStart}
                disabled={isStarted}
              >
                {isStarted ? "Scanner Active" : "Start Sales Scanner"}
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
                  <div style={styles.statLabel}>SALES RECORDED</div>
                  <div style={styles.statValue}>{salesCount}</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>AVAILABLE</div>
                  <div style={styles.statValue}>{availableBarcodes.length}</div>
                </div>
                <div style={styles.stat}>
                  <div style={styles.statLabel}>STATUS</div>
                  <div style={styles.statValue}>
                    {isSaving ? "PROCESSING" : "READY"}
                  </div>
                </div>
              </div>
            )}

            {/* Help Text */}
            <div style={styles.helpText}>
              <p>
                <strong>How to use:</strong>
              </p>
              <ol style={{ textAlign: "left", marginTop: "10px" }}>
                <li>Click "Start Sales Scanner"</li>
                <li>Scan or select a product</li>
                <li>Enter customer name and mobile</li>
                <li>Sale will be recorded automatically!</li>
              </ol>
            </div>
          </div>
        ) : (
          <p style={styles.errorText}>No Godown Data Available</p>
        )}
      </div>
    </div>
  );
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

const styles = {
  container: {
    background: 'linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)',
    backgroundSize: '400% 400%',
    animation: 'gradientAnimation 12s ease infinite',
    minHeight: '100vh',
    padding: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "'Roboto', sans-serif",
  },
  formContainer: {
    backgroundColor: 'rgba(218, 216, 224, 0.9)',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
    textAlign: 'center',
    width: '90%',
    maxWidth: '700px',
  },
  header: {
    fontSize: '2rem',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.4)',
    marginBottom: '15px',
  },
  godownDetails: {
    width: '100%',
  },
  godownText: {
    color: 'white',
    fontSize: '1rem',
    marginBottom: '15px',
  },
  inventoryInfo: {
    color: 'white',
    fontSize: '16px',
    fontStyle: 'italic',
    fontWeight: 'bold',
    marginBottom: '10px',
  },
  barcodeListButton: {
    backgroundColor: '#FF9800',
    color: 'white',
    padding: '10px 20px',
    margin: '10px auto',
    border: 'none',
    borderRadius: '28px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 'bold',
    display: 'block',
  },
  warningBox: {
    color: '#ffeb3b',
    fontWeight: 'bold',
    margin: '15px 0',
    fontSize: '0.95rem',
    backgroundColor: 'rgba(255, 235, 59, 0.2)',
    padding: '12px',
    borderRadius: '10px',
  },
  dropdownContainer: {
    position: 'relative',
    width: '90%',
    margin: '10px auto',
  },
  input: {
    width: '100%',
    padding: '15px',
    margin: '10px 0',
    borderRadius: '28px',
    border: '2px solid #ccc',
    fontSize: '16px',
    backgroundColor: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  inputActive: {
    border: '3px solid #4CAF50',
    boxShadow: '0 0 10px rgba(76, 175, 80, 0.5)',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    maxHeight: '200px',
    overflowY: 'auto',
    backgroundColor: 'white',
    border: '2px solid #4CAF50',
    borderRadius: '10px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
    marginTop: '5px',
  },
  dropdownItem: {
    padding: '10px 15px',
    cursor: 'pointer',
    borderBottom: '1px solid #eee',
    transition: 'background-color 0.2s',
    textAlign: 'left',
  },
  buttonContainer: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    flexWrap: 'wrap',
    margin: '15px 0',
  },
  button: {
    backgroundColor: 'rgba(218, 216, 224, 0.8)',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '28px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  buttonActive: {
    backgroundColor: '#4CAF50',
    boxShadow: '0 0 15px rgba(76, 175, 80, 0.6)',
  },
  buttonDisabled: {
    backgroundColor: 'rgba(180, 180, 190, 0.95)',
    color: 'white',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '28px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  message: {
    color: 'white',
    fontWeight: 'bold',
    margin: '15px 0',
    fontSize: '1rem',
    padding: '10px',
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderRadius: '10px',
  },
  statsContainer: {
    display: 'flex',
    justifyContent: 'space-around',
    marginTop: '20px',
    padding: '15px',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '10px',
  },
  stat: {
    textAlign: 'center',
  },
  statLabel: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: '5px',
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
  },
  helpText: {
    marginTop: '20px',
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: '15px',
    borderRadius: '10px',
    textAlign: 'center',
  },
  errorText: {
    color: '#ff1744',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    padding: '20px',
  },
};

export default Dsale;
