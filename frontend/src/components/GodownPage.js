import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { showToast } from "../utils/toastNotifications";

const GodownPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const godown = location.state?.godown || null;

  const [despatchData, setDespatchData] = useState([]);
  const [deliveryData, setDeliveryData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Barcode scanning state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedItem, setScannedItem] = useState(null);
  const [showScannedResult, setShowScannedResult] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanHistory, setScanHistory] = useState([]);
  const inputRef = useRef(null);

  // Stock verification/tally state
  const [expectedItems, setExpectedItems] = useState([]);
  const [scannedItems, setScannedItems] = useState([]);
  const [missingItems, setMissingItems] = useState([]);
  const [verificationMode, setVerificationMode] = useState(false);

  // Backend URL from environment variable
  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

  useEffect(() => {
    if (godown) {
      fetchInventoryData();
    }
  }, [godown]);

  // Auto-scan when barcode is entered (IoT scanner integration)
  useEffect(() => {
    if (isScanning && barcodeInput.trim()) {
      const timer = setTimeout(() => {
        handleBarcodeSearch(barcodeInput.trim());
      }, 500); // 500ms delay to ensure complete barcode entry
      return () => clearTimeout(timer);
    }
  }, [barcodeInput, isScanning]);

  const fetchInventoryData = async () => {
    if (!godown) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Fetch despatch data (items in godown)
      const despatchRes = await axios.get(`${backendUrl}/api/despatch`);
      const filteredDespatch = despatchRes.data.filter(
        (item) => item.godownName === godown.name
      );
      setDespatchData(filteredDespatch);

      // Fetch delivery data (items ready for delivery)
      const deliveryRes = await axios.get(`${backendUrl}/api/products3`);
      const filteredDelivery = deliveryRes.data.filter(
        (item) => item.godownName === godown.name
      );
      setDeliveryData(filteredDelivery);

      // Set expected items for verification (all items that should be in godown)
      const allExpectedItems = [...filteredDespatch, ...filteredDelivery].map(item => ({
        barcode: item.inputValue,
        itemCode: item.selectedOption,
        godownName: item.godownName,
        scanned: false
      }));
      setExpectedItems(allExpectedItems);
      setMissingItems(allExpectedItems);

      setLoading(false);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      showToast.error("Error loading inventory data");
      setLoading(false);
    }
  };

  const handleDeliveryClick = () => {
    navigate("/delivery", { state: { godown } });
  };

  const handleInventoryClick = () => {
    navigate("/inventory", { state: { godown } });
  };

  const handleDispatchClick = () => {
    navigate("/dgodowndetails", { state: { godown } });
  };

  // Group data by item code prefix
  const groupData = (dataArray) => {
    const grouped = {};
    dataArray.forEach((item) => {
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

  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minHeight: "100vh",
      background: "linear-gradient(-45deg, #fcb900, #9900ef, #ff6900, #00ff07)",
      backgroundSize: "400% 400%",
      animation: "gradientAnimation 12s ease infinite",
      padding: "20px",
    },
    content: {
      width: "100%",
      maxWidth: "1200px",
      backgroundColor: "rgba(218, 216, 224, 0.95)",
      borderRadius: "15px",
      padding: "30px",
      boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
    },
    header: {
      color: "white",
      marginBottom: "10px",
      fontSize: "3rem",
      fontFamily: "'Poppins', sans-serif",
      fontWeight: "bold",
      textShadow: "2px 2px 5px rgba(0, 0, 0, 0.3)",
      textAlign: "center",
    },
    subtitle: {
      fontSize: "1.3rem",
      color: "white",
      marginBottom: "20px",
      textAlign: "center",
    },
    infoCard: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      padding: "15px",
      borderRadius: "10px",
      marginBottom: "20px",
      textAlign: "center",
    },
    infoText: {
      fontSize: "1.2rem",
      color: "white",
      marginBottom: "5px",
    },
    buttonContainer: {
      display: "flex",
      gap: "15px",
      justifyContent: "center",
      marginTop: "20px",
      marginBottom: "30px",
      flexWrap: "wrap",
    },
    button: {
      backgroundColor: "rgba(218, 216, 224, 0.8)",
      color: "#fff",
      padding: "12px 24px",
      border: "none",
      borderRadius: "28px",
      fontSize: "1.2rem",
      fontWeight: "bold",
      cursor: "pointer",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 10px rgba(0, 0, 0, 0.2)",
    },
    statsContainer: {
      display: "flex",
      justifyContent: "space-around",
      marginBottom: "30px",
      gap: "15px",
      flexWrap: "wrap",
    },
    statCard: {
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      padding: "20px",
      borderRadius: "10px",
      minWidth: "150px",
      textAlign: "center",
    },
    statLabel: {
      fontSize: "14px",
      color: "rgba(255, 255, 255, 0.8)",
      marginBottom: "5px",
      textTransform: "uppercase",
    },
    statValue: {
      fontSize: "32px",
      fontWeight: "bold",
      color: "white",
    },
    tableContainer: {
      marginTop: "20px",
    },
    tableTitle: {
      color: "white",
      fontSize: "1.5rem",
      marginBottom: "15px",
      textAlign: "center",
      fontWeight: "bold",
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

  const handleBarcodeSearch = async (barcode) => {
    if (!barcode || barcode.trim() === '') return;

    // Check if already scanned in this session
    if (scanHistory.some(item => item.barcode === barcode)) {
      showToast.warning(`⚠️ Already scanned: ${barcode}`);
      setBarcodeInput('');
      inputRef.current?.focus();
      return;
    }

    try {
      // Search in current godown inventory
      const response = await axios.get(`${backendUrl}/api/product-details/${barcode}`);

      if (response.data.success) {
        const itemData = response.data.data;
        setScannedItem(itemData);
        setShowScannedResult(true);

        // Add to scan history
        setScanHistory(prev => [{
          barcode: barcode,
          data: itemData,
          time: new Date().toLocaleTimeString(),
          source: response.data.source
        }, ...prev]);

        // If in verification mode, mark item as scanned and remove from missing
        if (verificationMode) {
          // Add to scanned items
          setScannedItems(prev => [...prev, {
            barcode: barcode,
            data: itemData,
            time: new Date().toLocaleTimeString()
          }]);

          // Remove from missing items
          setMissingItems(prev => prev.filter(item => item.barcode !== barcode));

          showToast.success(`✓ Verified: ${barcode} - Removed from missing list`);
        } else {
          showToast.success(`✓ Scanned: ${barcode}`);
        }

        // Auto-clear input for next scan
        setBarcodeInput('');
        inputRef.current?.focus();
      } else {
        showToast.error('Item not found in inventory');
        setScannedItem(null);
        setBarcodeInput('');
        inputRef.current?.focus();
      }
    } catch (error) {
      console.error('Error searching barcode:', error);
      showToast.error('Item not found');
      setScannedItem(null);
      setBarcodeInput('');
      inputRef.current?.focus();
    }
  };

  const handleBarcodeKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBarcodeSearch(barcodeInput);
    }
  };

  const handleStartScanning = () => {
    setIsScanning(true);
    showToast.success('📷 Scanner activated! Ready to scan barcodes.');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleStopScanning = () => {
    setIsScanning(false);
    setScanHistory([]);
    setBarcodeInput('');
    setScannedItem(null);
    setShowScannedResult(false);
    showToast.info('Scanner stopped. Session cleared.');
  };

  const handleClearResult = () => {
    setBarcodeInput('');
    setScannedItem(null);
    setShowScannedResult(false);
    inputRef.current?.focus();
  };

  const handleStartVerification = () => {
    setVerificationMode(true);
    setIsScanning(true);
    setScannedItems([]);
    // Reset missing items to all expected items
    setMissingItems(expectedItems);
    showToast.success('📋 Stock Verification Started! Scan items to verify.');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleStopVerification = () => {
    setVerificationMode(false);
    setIsScanning(false);
    showToast.info('Stock verification stopped.');
  };

  const handleMarkAsFound = (barcode) => {
    // Remove from missing items without scanning
    setMissingItems(prev => prev.filter(item => item.barcode !== barcode));
    setScannedItems(prev => [...prev, {
      barcode: barcode,
      data: { barcode: barcode },
      time: new Date().toLocaleTimeString(),
      manuallyMarked: true
    }]);
    showToast.success(`✓ Marked as found: ${barcode}`);
  };

  if (!godown) {
    return (
      <div style={styles.container}>
        <style>{globalStyles}</style>
        <div style={styles.content}>
          <h2 style={styles.header}>⚠️ No Godown Selected</h2>
          <p style={{ textAlign: 'center', fontSize: '1.2rem', marginTop: '20px' }}>
            Please select a godown from the dashboard to view inventory.
          </p>
          <button
            onClick={() => navigate('/godown')}
            style={{
              ...styles.button,
              margin: '20px auto',
              display: 'block'
            }}
          >
            ← Back to Godown Selection
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <style>{globalStyles}</style>
        <div style={styles.content}>
          <h2 style={styles.header}>Loading...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <style>{globalStyles}</style>
      <div style={styles.content}>
        <h2 style={styles.header}>Godown Dashboard - {godown.name}</h2>



        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
          }
        `}</style>

        {/* Stock Verification Tally Section */}
        {verificationMode && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#FF9800', fontSize: '1.3rem' }}>
              📋 Stock Verification Tally
            </h3>

            {/* Tally Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '15px',
              marginBottom: '20px'
            }}>
              <div style={{
                padding: '15px',
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                textAlign: 'center',
                borderLeft: '4px solid #2196F3'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>EXPECTED</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196F3' }}>
                  {expectedItems.length}
                </div>
              </div>

              <div style={{
                padding: '15px',
                backgroundColor: '#e8f5e9',
                borderRadius: '8px',
                textAlign: 'center',
                borderLeft: '4px solid #4CAF50'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>SCANNED</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4CAF50' }}>
                  {scannedItems.length}
                </div>
              </div>

              <div style={{
                padding: '15px',
                backgroundColor: '#ffebee',
                borderRadius: '8px',
                textAlign: 'center',
                borderLeft: '4px solid #f44336'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>MISSING</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f44336' }}>
                  {missingItems.length}
                </div>
              </div>

              <div style={{
                padding: '15px',
                backgroundColor: '#fff3e0',
                borderRadius: '8px',
                textAlign: 'center',
                borderLeft: '4px solid #FF9800'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>ACCURACY</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF9800' }}>
                  {expectedItems.length > 0 ? Math.round((scannedItems.length / expectedItems.length) * 100) : 0}%
                </div>
              </div>
            </div>

            {/* Missing Items List */}
            {missingItems.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#f44336' }}>
                  ⚠️ Missing Items ({missingItems.length})
                </h4>
                <div style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  backgroundColor: '#ffebee',
                  borderRadius: '8px',
                  padding: '10px'
                }}>
                  {missingItems.map((item, index) => (
                    <div key={index} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      borderLeft: '4px solid #f44336',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <strong style={{ color: '#f44336' }}>#{index + 1}</strong>
                        {' '}
                        <strong>{item.barcode}</strong>
                        {' - '}
                        {item.itemCode || 'Unknown'}
                      </div>
                      <button
                        onClick={() => handleMarkAsFound(item.barcode)}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: '600'
                        }}
                      >
                        ✓ Mark as Found
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scanned/Verified Items List */}
            {scannedItems.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>
                  ✓ Verified Items ({scannedItems.length})
                </h4>
                <div style={{
                  maxHeight: '300px',
                  overflowY: 'auto',
                  backgroundColor: '#e8f5e9',
                  borderRadius: '8px',
                  padding: '10px'
                }}>
                  {scannedItems.map((item, index) => (
                    <div key={index} style={{
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      borderLeft: '4px solid #4CAF50',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <strong style={{ color: '#4CAF50' }}>#{index + 1}</strong>
                        {' '}
                        <strong>{item.barcode}</strong>
                        {' - '}
                        {item.data?.product || item.data?.itemName || 'Unknown'}
                        {item.manuallyMarked && (
                          <span style={{
                            marginLeft: '10px',
                            fontSize: '0.8rem',
                            color: '#FF9800',
                            fontWeight: 'bold'
                          }}>
                            (Manually Marked)
                          </span>
                        )}
                      </div>
                      <small style={{ color: '#666' }}>{item.time}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Completion Message */}
            {missingItems.length === 0 && scannedItems.length > 0 && (
              <div style={{
                padding: '20px',
                backgroundColor: '#e8f5e9',
                borderRadius: '8px',
                textAlign: 'center',
                marginTop: '20px',
                border: '2px solid #4CAF50'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎉</div>
                <h3 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>
                  Stock Verification Complete!
                </h3>
                <p style={{ margin: 0, color: '#666' }}>
                  All {expectedItems.length} items have been verified. No missing items!
                </p>
                <button
                  onClick={handleStopVerification}
                  style={{
                    marginTop: '15px',
                    padding: '12px 24px',
                    backgroundColor: '#4CAF50',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: '600'
                  }}
                >
                  ✓ Finish Verification
                </button>
              </div>
            )}
          </div>
        )}

        {/* Godown Info */}
        <div style={styles.infoCard}>
          <p style={styles.infoText}>
            <strong>Name:</strong> {godown.name}
          </p>
          <p style={styles.infoText}>
            <strong>Address:</strong> {godown.address}
          </p>
        </div>

        {/* Statistics */}
        <div style={styles.statsContainer}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>In Godown</div>
            <div style={styles.statValue}>{despatchData.length}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Ready for Delivery</div>
            <div style={styles.statValue}>{deliveryData.length}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>Total Items</div>
            <div style={styles.statValue}>
              {despatchData.length + deliveryData.length}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={styles.buttonContainer}>
          <button
            onClick={handleDispatchClick}
            style={styles.button}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-3px)";
              e.target.style.boxShadow = "0 6px 15px rgba(0, 0, 0, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)";
            }}
          >
            Dispatch Items
          </button>
          <button
            onClick={handleDeliveryClick}
            style={styles.button}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-3px)";
              e.target.style.boxShadow = "0 6px 15px rgba(0, 0, 0, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)";
            }}
          >
            Process Delivery
          </button>
          <button
            onClick={() => navigate('/stock-checking')}
            style={{
              ...styles.button,
              background: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-3px)";
              e.target.style.boxShadow = "0 6px 15px rgba(255, 152, 0, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)";
            }}
          >
            📦 Stock Checking
          </button>
          <button
            onClick={() => navigate('/stock-check-reports')}
            style={{
              ...styles.button,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-3px)";
              e.target.style.boxShadow = "0 6px 15px rgba(102, 126, 234, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)";
            }}
          >
            📊 Stock Reports
          </button>
          <button
            onClick={handleInventoryClick}
            style={styles.button}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-3px)";
              e.target.style.boxShadow = "0 6px 15px rgba(0, 0, 0, 0.3)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.2)";
            }}
          >
            View Full Inventory
          </button>
        </div>

        {/* Godown Inventory Table */}
        <div style={styles.tableContainer}>
          <h3 style={styles.tableTitle}>Items in Godown</h3>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
              backgroundColor: "white",
              borderRadius: "10px",
              overflow: "hidden",
              marginBottom: "30px",
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
              {groupData(despatchData).length === 0 ? (
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
                    No items in godown yet
                  </td>
                </tr>
              ) : (
                groupData(despatchData).map((group, index) => (
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

        {/* Delivery Ready Table */}
        <div style={styles.tableContainer}>
          <h3 style={styles.tableTitle}>Items Ready for Delivery</h3>
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
                  backgroundColor: "rgba(33, 150, 243, 0.8)",
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
              {groupData(deliveryData).length === 0 ? (
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
                groupData(deliveryData).map((group, index) => (
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
                        color: "#2196F3",
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
      </div >
    </div >
  );
};

export default GodownPage;
